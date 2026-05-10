// LocalStorage layer. Everything in the app reads/writes through here.
//
// When a user is signed in, the cloud-sync engine (src/lib/sync.js)
// registers a write hook so each save/remove also gets pushed to
// Postgres. The hook is fire-and-forget; UI keeps working sync against
// localStorage, the network call happens in the background.

const NS = "aift:";

let writeHook = null;

// Called by sync.js on auth init. Pass null to clear.
export function setWriteHook(fn) {
  writeHook = typeof fn === "function" ? fn : null;
}

export function load(key, fallback) {
  try {
    const raw = localStorage.getItem(NS + key);
    if (raw === null) return fallback;
    return JSON.parse(raw);
  } catch {
    return fallback;
  }
}

export function save(key, value) {
  localStorage.setItem(NS + key, JSON.stringify(value));
  if (writeHook) {
    try { writeHook("put", key, value); } catch { /* never break UI */ }
  }
}

export function remove(key) {
  localStorage.removeItem(NS + key);
  if (writeHook) {
    try { writeHook("delete", key); } catch { /* ignore */ }
  }
}

export function listKeys(prefix = "") {
  const out = [];
  const fullPrefix = NS + prefix;
  for (let i = 0; i < localStorage.length; i++) {
    const k = localStorage.key(i);
    if (k && k.startsWith(fullPrefix)) out.push(k.slice(NS.length));
  }
  return out;
}

// Wipe every aift:* key. Used during sign-in (before hydrating from the
// server) and sign-out so two accounts don't see each other's cached data.
export function clearAllLocal() {
  const keys = listKeys("");
  for (const k of keys) localStorage.removeItem(NS + k);
}
