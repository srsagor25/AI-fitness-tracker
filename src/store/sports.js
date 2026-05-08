// Sports & Others library — defaults shipped with every profile. Covers
// team sports, outdoor activity, and general movement. Each entry has a
// MET value used to estimate calories burned (kcal = MET × weightKg × hours)
// when the user logs a session. Values are mid-range averages so a
// moderate session maps to ~MET; vigorous scales up via intensity.
//
// `kind` is a soft category for grouping in pickers; the calc only uses
// MET so adding more kinds is purely cosmetic.

export const DEFAULT_SPORTS = [
  // Team / racket sports
  { id: "football",    name: "Football",       icon: "⚽", met: 7.0, color: "#4a6b3e", kind: "sport" },
  { id: "cricket",     name: "Cricket",        icon: "🏏", met: 5.0, color: "#3b6aa3", kind: "sport" },
  { id: "padel",       name: "Padel",          icon: "🎾", met: 7.0, color: "#c44827", kind: "sport" },
  { id: "tennis",      name: "Tennis",         icon: "🎾", met: 7.3, color: "#c44827", kind: "sport" },
  { id: "pickleball",  name: "Pickleball",     icon: "🏓", met: 5.5, color: "#c44827", kind: "sport" },
  { id: "badminton",   name: "Badminton",      icon: "🏸", met: 5.5, color: "#3b6aa3", kind: "sport" },
  { id: "basketball",  name: "Basketball",     icon: "🏀", met: 6.5, color: "#c44827", kind: "sport" },
  { id: "volleyball",  name: "Volleyball",     icon: "🏐", met: 4.0, color: "#c44827", kind: "sport" },
  { id: "table_tennis", name: "Table Tennis",  icon: "🏓", met: 4.0, color: "#3b6aa3", kind: "sport" },
  { id: "frisbee",     name: "Frisbee",        icon: "🥏", met: 3.5, color: "#4a6b3e", kind: "sport" },
  { id: "boxing",      name: "Boxing",         icon: "🥊", met: 9.0, color: "#c44827", kind: "sport" },
  { id: "martial_arts", name: "Martial arts",  icon: "🥋", met: 10.0, color: "#c44827", kind: "sport" },

  // Outdoor / endurance
  { id: "running",       name: "Running",        icon: "🏃", met: 9.8, color: "#c44827", kind: "outdoor" },
  { id: "cycling",       name: "Cycling",        icon: "🚴", met: 7.5, color: "#4a6b3e", kind: "outdoor" },
  { id: "mtb",           name: "Mountain biking", icon: "🚵", met: 8.5, color: "#4a6b3e", kind: "outdoor" },
  { id: "hiking",        name: "Hiking",         icon: "🥾", met: 6.0, color: "#6b5a3e", kind: "outdoor" },
  { id: "trekking",      name: "Trekking",       icon: "⛰️", met: 7.5, color: "#6b5a3e", kind: "outdoor" },
  { id: "walking",       name: "Walking",        icon: "🚶", met: 3.5, color: "#6b5a3e", kind: "outdoor" },
  { id: "swimming",      name: "Swimming",       icon: "🏊", met: 6.0, color: "#3b6aa3", kind: "outdoor" },
  { id: "rowing",        name: "Rowing",         icon: "🚣", met: 7.0, color: "#3b6aa3", kind: "outdoor" },
  { id: "kayaking",      name: "Kayaking",       icon: "🛶", met: 5.0, color: "#3b6aa3", kind: "outdoor" },
  { id: "surfing",       name: "Surfing",        icon: "🏄", met: 5.0, color: "#3b6aa3", kind: "outdoor" },
  { id: "climbing",      name: "Climbing",       icon: "🧗", met: 8.0, color: "#6b5a3e", kind: "outdoor" },
  { id: "skating",       name: "Skating",        icon: "⛸️", met: 7.0, color: "#3b6aa3", kind: "outdoor" },
  { id: "skiing",        name: "Skiing",         icon: "⛷️", met: 7.5, color: "#3b6aa3", kind: "outdoor" },
  { id: "snowboarding",  name: "Snowboarding",   icon: "🏂", met: 5.5, color: "#3b6aa3", kind: "outdoor" },
  { id: "horseback",     name: "Horseback ride", icon: "🏇", met: 5.5, color: "#6b5a3e", kind: "outdoor" },
  { id: "gardening",     name: "Gardening",      icon: "🌱", met: 4.0, color: "#4a6b3e", kind: "outdoor" },

  // Studio / cardio / mobility
  { id: "hiit",        name: "HIIT",           icon: "🔥", met: 9.0, color: "#c44827", kind: "studio" },
  { id: "jump_rope",   name: "Jump rope",      icon: "🪢", met: 11.0, color: "#c44827", kind: "studio" },
  { id: "stair_climb", name: "Stair climbing", icon: "🪜", met: 8.8, color: "#c44827", kind: "studio" },
  { id: "elliptical",  name: "Elliptical",     icon: "🏋️", met: 5.0, color: "#3b6aa3", kind: "studio" },
  { id: "spin",        name: "Spin class",     icon: "🚴", met: 8.5, color: "#3b6aa3", kind: "studio" },
  { id: "dancing",     name: "Dancing",        icon: "💃", met: 5.0, color: "#c44827", kind: "studio" },
  { id: "yoga",        name: "Yoga",           icon: "🧘", met: 2.5, color: "#6b5a3e", kind: "studio" },
  { id: "pilates",     name: "Pilates",        icon: "🤸", met: 3.0, color: "#6b5a3e", kind: "studio" },
  { id: "stretching",  name: "Stretching",     icon: "🙆", met: 2.3, color: "#6b5a3e", kind: "studio" },
];

// Intensity multipliers applied on top of the sport's base MET.
export const INTENSITY = {
  low: { id: "low", label: "Light", multiplier: 0.8 },
  moderate: { id: "moderate", label: "Moderate", multiplier: 1.0 },
  vigorous: { id: "vigorous", label: "Vigorous", multiplier: 1.2 },
};

export function estimateSportKcal({ met, weightKg, durationMin, intensity = "moderate" }) {
  const m = Number(met) || 0;
  const w = Number(weightKg) || 70;
  const hours = Math.max(0, (Number(durationMin) || 0) / 60);
  const mult = INTENSITY[intensity]?.multiplier || 1.0;
  return Math.round(m * w * hours * mult);
}
