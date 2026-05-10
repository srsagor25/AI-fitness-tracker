// Auto-sync engine. When a user is signed in, every localStorage write
// is mirrored to Postgres (debounced, fire-and-forget). On sign-in the
// local cache is wiped and rehydrated from the server so the DB is the
// source of truth.
//
// Public flow:
//   initSync()   — call once on app boot. Probes /api/auth/status. If
//                  authed, attaches the write hook so subsequent saves
//                  push to the server.
//   login()      — POST creds. On success, hydrate-and-reload (full
//                  page reload after hydration so React re-reads
//                  localStorage from scratch).
//   register()   — same flow as login.
//   logout()     — clears local cache + cookie, reloads.
//
// Skipped keys (notify dedupe set, anything else with side effects we
// don't want shared across devices):
//   - notify:*     — browser-notification fired-today set

import {
  setWriteHook,
  clearAllLocal,
  listKeys,
  load,
  save,
} from "../store/storage.js";

// ----- HTTP helpers -----

async function jfetch(url, init) {
  const r = await fetch(url, {
    credentials: "include",
    ...init,
    headers: { "Content-Type": "application/json", ...(init?.headers || {}) },
  });
  let body;
  try { body = await r.json(); } catch { body = null; }
  if (!r.ok) {
    const msg = body?.error || `${r.status} ${r.statusText}`;
    throw new Error(msg);
  }
  return body;
}

export async function authStatus() {
  try {
    const r = await fetch("/api/auth/status", { credentials: "include" });
    if (!r.ok) return { authed: false };
    return await r.json();
  } catch {
    return { authed: false, configured: false };
  }
}

export async function login(email, password) {
  const r = await jfetch("/api/auth/login", {
    method: "POST",
    body: JSON.stringify({ email, password }),
  });
  await afterAuth();
  return r;
}

export async function register(email, password) {
  const r = await jfetch("/api/auth/register", {
    method: "POST",
    body: JSON.stringify({ email, password }),
  });
  await afterAuth();
  return r;
}

export async function logout() {
  await jfetch("/api/auth/logout", { method: "POST" });
  setWriteHook(null);
  clearAllLocal();
  // Reload so any in-memory React state from the previous session is gone.
  if (typeof window !== "undefined") window.location.reload();
}

// ----- Sync engine internals -----

const SKIP_PREFIXES = ["notify:"];

function isSyncableKey(k) {
  for (const p of SKIP_PREFIXES) if (k.startsWith(p)) return false;
  return true;
}

// Coalesce repeated writes to the same key into a single network call.
// Each entry: { op: "put" | "delete", value? }.
const pending = new Map();
let flushTimer = null;
let flushing = false;

function scheduleFlush() {
  if (flushTimer) return;
  flushTimer = setTimeout(flush, 600);
}

async function flush() {
  flushTimer = null;
  if (flushing) {
    // Re-schedule; don't fire two flushes concurrently.
    scheduleFlush();
    return;
  }
  flushing = true;
  try {
    const puts = [];
    const deletes = [];
    for (const [key, op] of pending.entries()) {
      if (op.op === "delete") deletes.push(key);
      else puts.push({ key, value: op.value });
    }
    pending.clear();

    if (puts.length > 0) {
      try {
        await jfetch("/api/kv/bulk", {
          method: "POST",
          body: JSON.stringify({ items: puts }),
        });
      } catch (e) {
        // Fire-and-forget — don't block UI. We surface to console so
        // a real failure (auth expired, network) is debuggable.
        console.warn("[sync] bulk push failed:", e.message);
      }
    }
    for (const key of deletes) {
      try {
        await jfetch("/api/kv/delete", {
          method: "POST",
          body: JSON.stringify({ key }),
        });
      } catch (e) {
        console.warn("[sync] delete failed:", e.message);
      }
    }
  } finally {
    flushing = false;
    if (pending.size > 0) scheduleFlush();
  }
}

function attachHook() {
  setWriteHook((op, key, value) => {
    if (!isSyncableKey(key)) return;
    pending.set(key, op === "delete" ? { op } : { op, value });
    scheduleFlush();
  });
}

// Pull every kv row for the signed-in user and replace the local cache.
// Used on sign-in / sign-up so the DB is the source of truth.
async function hydrateFromServer() {
  const r = await jfetch("/api/kv/list?prefix=&withValues=1");
  const rows = r.rows || [];
  // Wipe local first so any stale keys not present on the server are gone.
  clearAllLocal();
  for (const row of rows) {
    if (!isSyncableKey(row.key)) continue;
    save(row.key, row.value);
  }
  return rows.length;
}

// Called after a successful login/register: hydrate from server, attach
// the auto-sync hook for future writes, then reload so React reads the
// fresh localStorage from scratch.
async function afterAuth() {
  await hydrateFromServer();
  attachHook();
  if (typeof window !== "undefined") window.location.reload();
}

// Called once on app boot from src/main.jsx (or App.jsx). If a session
// is already valid (returning user), wires up the write hook so
// subsequent changes auto-push. Does NOT re-hydrate on every boot —
// the local cache is already in sync because every change writes through.
export async function initSync() {
  const s = await authStatus();
  if (s?.authed) attachHook();
  return s;
}
