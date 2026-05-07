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

// Convert step count to calories burned. Standard estimate ~0.04 kcal/step
// at 70 kg, scaled linearly by body weight.
export function stepsToKcal(steps, weightKg) {
  const w = Number(weightKg) || 70;
  return Math.round((Number(steps) || 0) * 0.04 * (w / 70));
}

// Approx weight change from a calorie surplus/deficit. 7700 kcal ≈ 1 kg of
// fat (3500 kcal/lb). Returns kg (positive = gain, negative = loss).
export function kcalToKg(kcal) {
  return (Number(kcal) || 0) / 7700;
}

// Estimated training calories for a planned program day (before any sets are
// logged). Uses the same time-budget heuristic as Workout.jsx: ~3 sec/rep,
// 5 sec setup, plus 5 min warm-up.
const SEC_PER_REP = 3;
const SETUP_SEC = 5;
const WARMUP_SEC = 5 * 60;

export function estimateMinutesForDay(day) {
  if (!day) return 0;
  const total = day.exercises.reduce(
    (s, ex) =>
      s + (ex.sets || 0) * ((ex.reps || 0) * SEC_PER_REP + SETUP_SEC + (ex.restSec || 0)),
    WARMUP_SEC,
  );
  return Math.round(total / 60);
}

export function expectedTrainingKcal({ day, weightKg }) {
  if (!day) return 0;
  const minutes = estimateMinutesForDay(day);
  return estimateWorkoutKcal({
    durationSec: minutes * 60,
    weightKg,
    // Volume unknown until sets are logged — use a mid-range estimate so the
    // expected number is in the right ballpark (not 0).
    totalVolume: minutes * 80,
  });
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
