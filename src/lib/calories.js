// Helpers that compute energy figures from a profile. Profile may have flat
// fields or a nested `stats` object — we handle both.

function flat(profile) {
  if (!profile) return {};
  const s = profile.stats || {};
  return {
    weightKg: profile.weightKg ?? s.weightKg ?? 0,
    heightCm: profile.heightCm ?? s.heightCm ?? 0,
    age: profile.age ?? s.age ?? 0,
    sex: profile.sex ?? s.sex ?? "male",
    activity: profile.activity ?? s.activity ?? "moderate",
    goal: profile.goalKey ?? profile.goal ?? "maintain",
  };
}

export function bmr(profile) {
  const { weightKg, heightCm, age, sex } = flat(profile);
  const w = Number(weightKg) || 0;
  const h = Number(heightCm) || 0;
  const a = Number(age) || 0;
  if (!w || !h || !a) return 0;
  const base = 10 * w + 6.25 * h - 5 * a;
  return Math.round(sex === "female" ? base - 161 : base + 5);
}

const ACTIVITY_MULT = {
  sedentary: 1.2,
  light: 1.375,
  moderate: 1.55,
  active: 1.725,
  athlete: 1.9,
};

export function tdee(profile) {
  const b = bmr(profile);
  const { activity } = flat(profile);
  return Math.round(b * (ACTIVITY_MULT[activity] ?? 1.375));
}

export function dailyTarget(profile) {
  const t = tdee(profile);
  const { goal } = flat(profile);
  if (goal === "cut") return Math.max(1200, t - 500);
  if (goal === "bulk") return t + 300;
  if (goal === "muscle_build") return t + 400; // larger surplus for muscle gain
  return t;
}

// Suggested protein per kg for a given goal. Returns g/day given weightKg.
export function suggestedProtein(profile) {
  const { goal, weightKg } = flat(profile);
  const w = Number(weightKg) || 70;
  if (goal === "muscle_build") return Math.round(w * 2.0); // 2.0 g/kg
  if (goal === "cut") return Math.round(w * 2.2);          // higher to preserve LBM
  if (goal === "bulk") return Math.round(w * 1.8);
  return Math.round(w * 1.6);
}

export function estimateWorkoutKcal({ durationSec, weightKg, totalVolume }) {
  const w = Number(weightKg) || 70;
  const hours = Math.max(0, (durationSec || 0) / 3600);
  const baseMet = 5;
  const volBump = Math.min(1, (totalVolume || 0) / 8000);
  const met = baseMet + volBump;
  return Math.round(met * w * hours);
}

export function netEnergy({ kcalIn, target, workoutKcal }) {
  return {
    kcalIn,
    target,
    workoutKcal,
    adjustedTarget: target + (workoutKcal || 0),
    delta: kcalIn - (target + (workoutKcal || 0)),
  };
}
