// Built-in units the inventory picker offers. Users can add their own via
// profile.customUnits (managed in the item modal); merged at use site.

export const BUILTIN_UNITS = [
  // mass
  { id: "g",      label: "g (grams)" },
  { id: "kg",     label: "kg (kilograms)" },
  // volume
  { id: "ml",     label: "ml (millilitres)" },
  { id: "L",      label: "L (litres)" },
  // count / packaging
  { id: "pc",     label: "pc (pieces)" },
  { id: "pack",   label: "pack" },
  { id: "bottle", label: "bottle" },
  { id: "can",    label: "can" },
  { id: "box",    label: "box" },
  { id: "tray",   label: "tray" },
  { id: "carton", label: "carton" },
  { id: "jar",    label: "jar" },
  { id: "bag",    label: "bag" },
  { id: "tube",   label: "tube" },
  // small portion
  { id: "cup",    label: "cup" },
  { id: "tbsp",   label: "tbsp" },
  { id: "tsp",    label: "tsp" },
  { id: "scoop",  label: "scoop" },
  { id: "slice",  label: "slice" },
  { id: "head",   label: "head (e.g. lettuce)" },
];

// Merge built-in + custom (deduped by id).
export function getAllUnits(custom = []) {
  const seen = new Set();
  const out = [];
  for (const u of [...BUILTIN_UNITS, ...custom]) {
    if (!u || !u.id) continue;
    if (seen.has(u.id)) continue;
    seen.add(u.id);
    out.push(u);
  }
  return out;
}

// Mass/volume units accept arbitrary qty values; count units (pc, pack, …)
// look weird with non-integer qty. Used by the modal to choose default
// step sizes for the +/- buttons.
export function isContinuousUnit(unit) {
  return unit === "g" || unit === "ml" || unit === "kg" || unit === "L";
}

export function defaultStep(unit) {
  if (unit === "g" || unit === "ml") return 50;
  if (unit === "kg" || unit === "L") return 1;
  return 1;
}

// Which items make sense to track in fridge packets — meat / seafood
// only. Everything else uses conventional units (g, ml, pieces, …) and
// the packet UI is hidden from the editor.
//
// Match is on the item's name OR storage key (e.g. "chicken_thigh",
// "Beef Bhuna Cut", "Salmon Fillet") so users can add custom items and
// still benefit. Spelling variants included.
const PACKET_ELIGIBLE_KEYWORDS = [
  "chicken", "beef", "fish", "mutton", "lamb", "pork",
  "prawn", "shrimp", "salmon", "tuna", "duck", "turkey",
  "mince", "kima", // bn variants
];

export function isPacketEligibleItem(item) {
  if (!item) return false;
  const hay = `${item.name || ""} ${item.key || ""}`.toLowerCase();
  return PACKET_ELIGIBLE_KEYWORDS.some((k) => hay.includes(k));
}

// Smart "conventional" formatter — turns the stored qty into how a human
// would read it. Mass: < 1000g shown as "750 g", ≥ 1000g shown as "1.5 kg".
// Volume: same with ml ↔ L. Counts (pc, eggs, packs, etc.) stay numeric.
//
// Returns { value, unit, text } so callers can either compose their own UI
// or just drop `text` in directly. Examples:
//   formatQty(750, "g")  → { value: 750,  unit: "g",  text: "750 g" }
//   formatQty(1500, "g") → { value: 1.5,  unit: "kg", text: "1.5 kg" }
//   formatQty(12, "pc")  → { value: 12,   unit: "pc", text: "12 pc" }
export function formatQty(qty, unit) {
  const q = Number(qty) || 0;
  // Mass
  if (unit === "g") {
    if (q >= 1000) {
      const v = q / 1000;
      return { value: v, unit: "kg", text: `${stripZeros(v.toFixed(2))} kg` };
    }
    return { value: q, unit: "g", text: `${Math.round(q)} g` };
  }
  if (unit === "kg") {
    if (q < 1) {
      const v = Math.round(q * 1000);
      return { value: v, unit: "g", text: `${v} g` };
    }
    return { value: q, unit: "kg", text: `${stripZeros(q.toFixed(2))} kg` };
  }
  // Volume
  if (unit === "ml") {
    if (q >= 1000) {
      const v = q / 1000;
      return { value: v, unit: "L", text: `${stripZeros(v.toFixed(2))} L` };
    }
    return { value: q, unit: "ml", text: `${Math.round(q)} ml` };
  }
  if (unit === "L") {
    if (q < 1) {
      const v = Math.round(q * 1000);
      return { value: v, unit: "ml", text: `${v} ml` };
    }
    return { value: q, unit: "L", text: `${stripZeros(q.toFixed(2))} L` };
  }
  // Everything else: keep the stored unit verbatim. For integer-feeling
  // units we round; for unknown ones we pass through with one decimal max.
  const isCount = unit === "pc" || unit === "pack" || unit === "bottle" ||
                  unit === "can" || unit === "box" || unit === "tray" ||
                  unit === "carton" || unit === "jar" || unit === "bag" ||
                  unit === "tube" || unit === "scoop" || unit === "slice" ||
                  unit === "head" || unit === "cup" || unit === "tbsp" ||
                  unit === "tsp";
  if (isCount) {
    const v = Math.round(q * 10) / 10;
    return { value: v, unit, text: `${stripZeros(v.toString())} ${unit}` };
  }
  return { value: q, unit, text: `${stripZeros((Math.round(q * 100) / 100).toString())} ${unit}` };
}

function stripZeros(s) {
  // "1.50" → "1.5", "1.00" → "1", "1.5" → "1.5"
  if (typeof s !== "string") s = String(s);
  if (!s.includes(".")) return s;
  return s.replace(/\.?0+$/, "");
}
