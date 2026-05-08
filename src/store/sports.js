// Sports library — defaults shipped with every profile. Each entry has a
// MET value used to estimate calories burned (kcal = MET × weightKg × hours)
// when the user logs a session. Values are mid-range averages so a moderate
// game maps to ~MET, vigorous play scales up via the intensity selector.

export const DEFAULT_SPORTS = [
  { id: "football", name: "Football", icon: "⚽", met: 7.0, color: "#4a6b3e" },
  { id: "cricket", name: "Cricket", icon: "🏏", met: 5.0, color: "#3b6aa3" },
  { id: "padel", name: "Padel", icon: "🎾", met: 7.0, color: "#c44827" },
  { id: "tennis", name: "Tennis", icon: "🎾", met: 7.3, color: "#c44827" },
  { id: "badminton", name: "Badminton", icon: "🏸", met: 5.5, color: "#3b6aa3" },
  { id: "basketball", name: "Basketball", icon: "🏀", met: 6.5, color: "#c44827" },
  { id: "swimming", name: "Swimming", icon: "🏊", met: 6.0, color: "#3b6aa3" },
  { id: "cycling", name: "Cycling", icon: "🚴", met: 7.5, color: "#4a6b3e" },
  { id: "running", name: "Running", icon: "🏃", met: 9.8, color: "#c44827" },
  { id: "hiking", name: "Hiking", icon: "🥾", met: 6.0, color: "#6b5a3e" },
  { id: "yoga", name: "Yoga", icon: "🧘", met: 2.5, color: "#6b5a3e" },
  { id: "walking", name: "Walking", icon: "🚶", met: 3.5, color: "#6b5a3e" },
  { id: "dancing", name: "Dancing", icon: "💃", met: 5.0, color: "#c44827" },
  { id: "boxing", name: "Boxing", icon: "🥊", met: 9.0, color: "#c44827" },
  { id: "rowing", name: "Rowing", icon: "🚣", met: 7.0, color: "#3b6aa3" },
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
