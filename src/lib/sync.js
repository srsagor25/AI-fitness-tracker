// Thin client wrapper around the /api/auth and /api/kv routes. The DB
// is opt-in: by default the app keeps running on localStorage alone, and
// only when the user logs in via the Profile sync card do we start
// pulling/pushing data through this module.
//
// We intentionally DON'T try to be clever about real-time sync — those
// flows are gnarly (last-writer-wins, merge conflicts, photo blobs).
// Instead we expose explicit "Pull all" / "Push all" actions that the
// user triggers from the UI. Everyday usage stays local.

import { listKeys, load, save } from "../store/storage.js";

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

// ----- Auth -----

export async function authStatus() {
  try {
    const r = await fetch("/api/auth/status", { credentials: "include" });
    if (!r.ok) return { authed: false };
    return await r.json();
  } catch {
    // Network down / API not deployed → treat as logged-out, no error.
    return { authed: false, configured: false };
  }
}

export async function login(email, password) {
  return jfetch("/api/auth/login", {
    method: "POST",
    body: JSON.stringify({ email, password }),
  });
}

export async function register(email, password) {
  return jfetch("/api/auth/register", {
    method: "POST",
    body: JSON.stringify({ email, password }),
  });
}

export async function logout() {
  return jfetch("/api/auth/logout", { method: "POST" });
}

// ----- KV CRUD -----

export async function kvGet(key) {
  const r = await jfetch(`/api/kv/get?key=${encodeURIComponent(key)}`);
  return r.value;
}

export async function kvPut(key, value) {
  return jfetch("/api/kv/put", {
    method: "POST",
    body: JSON.stringify({ key, value }),
  });
}

export async function kvDelete(key) {
  return jfetch("/api/kv/delete", {
    method: "POST",
    body: JSON.stringify({ key }),
  });
}

export async function kvList(prefix = "", withValues = false) {
  const params = new URLSearchParams({ prefix });
  if (withValues) params.set("withValues", "1");
  return jfetch(`/api/kv/list?${params.toString()}`);
}

export async function kvBulkPush(items) {
  return jfetch("/api/kv/bulk", {
    method: "POST",
    body: JSON.stringify({ items }),
  });
}

// ----- High-level push / pull operations used by the UI -----

// Push every aift:* localStorage entry to the server. Skips a few keys
// that don't make sense to sync (active workout session, notify-fired
// dedupe set). Returns { count, bytes }.
const SKIP_PREFIXES = ["notify:"];

function shouldSyncKey(k) {
  for (const p of SKIP_PREFIXES) if (k.startsWith(p)) return false;
  return true;
}

export async function pushAll() {
  const keys = listKeys("");
  const items = [];
  let bytes = 0;
  for (const k of keys) {
    if (!shouldSyncKey(k)) continue;
    const v = load(k, undefined);
    if (v === undefined) continue;
    items.push({ key: k, value: v });
    bytes += k.length + JSON.stringify(v).length;
  }
  if (items.length === 0) return { count: 0, bytes: 0 };
  // Chunk to keep payloads reasonable; bulk endpoint runs each chunk in
  // a transaction so partial failures don't corrupt the server state.
  const CHUNK_BYTES = 800_000; // ~1 MB per request
  let cursor = 0;
  let pushedBytes = 0;
  while (cursor < items.length) {
    const chunk = [];
    let chunkBytes = 0;
    while (cursor < items.length && chunkBytes < CHUNK_BYTES) {
      const it = items[cursor];
      const sz = it.key.length + JSON.stringify(it.value).length;
      // Always include at least one item even if it's larger than the
      // budget — the server's body-size limit will reject it cleanly.
      if (chunk.length > 0 && chunkBytes + sz > CHUNK_BYTES) break;
      chunk.push(it);
      chunkBytes += sz;
      cursor++;
    }
    await kvBulkPush(chunk);
    pushedBytes += chunkBytes;
  }
  return { count: items.length, bytes: pushedBytes };
}

// Pull every kv row from the server and write it into localStorage,
// overwriting any local entries with the same key. Returns the count.
export async function pullAll({ overwrite = true } = {}) {
  const r = await kvList("", true);
  const rows = r.rows || [];
  let written = 0;
  for (const row of rows) {
    if (!shouldSyncKey(row.key)) continue;
    if (!overwrite && load(row.key, undefined) !== undefined) continue;
    save(row.key, row.value);
    written++;
  }
  return { count: written };
}
