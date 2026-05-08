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
