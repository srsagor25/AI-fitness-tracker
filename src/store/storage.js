const NS = "aift:";

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
}

export function remove(key) {
  localStorage.removeItem(NS + key);
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
