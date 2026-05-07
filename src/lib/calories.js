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
  return t;
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
