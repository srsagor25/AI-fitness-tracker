// Variation / periodisation coach.
//
// Reads the user's recent workout history and suggests two flavours of
// micro-adjustment to today's program day:
//
//   1. "stall" → suggest swapping the exercise for a variation (same
//      muscle group, different stimulus) when weight hasn't moved over
//      the last N sessions. Keeps the user from grinding the same
//      pattern for months.
//
//   2. "progress" → suggest a +1 set bump when the user has been hitting
//      target reps for N sessions in a row. Only fired if the bump
//      keeps the session under the user's session budget (default 60
//      min) — no point recommending volume the user can't fit.
//
// The output is consumed by CoachPeriodisationCard on the Workout tab.
// Stays pure / side-effect-free so it's easy to test.

import { estimateMinutesForDay } from "./calories.js";

// Soft pairings — used as the swap suggestions when an exercise stalls.
// Keys + values are normalised (lowercased, common abbreviations) so
// minor naming differences ("DB Curl" vs "Dumbbell Curl") still match.
// Each entry lists 2-3 substitutes ordered by how similar the stimulus
// is — closer first.
export const VARIATIONS = {
  // Squat patterns
  "back squat":           ["Front Squat", "Bulgarian Split Squat", "Goblet Squat"],
  "front squat":          ["Back Squat", "Hack Squat", "Goblet Squat"],
  "leg press":            ["Hack Squat", "Bulgarian Split Squat", "Goblet Squat"],
  "bulgarian split squat":["Walking Lunge", "Step-Up", "Reverse Lunge"],
  "hack squat":           ["Leg Press", "Back Squat", "Bulgarian Split Squat"],
  // Hinge patterns
  "deadlift":             ["Trap Bar Deadlift", "Romanian Deadlift", "Sumo Deadlift"],
  "romanian deadlift":    ["Stiff-Leg Deadlift", "Good Morning", "Single-Leg RDL"],
  "hip thrust":           ["Glute Bridge", "Cable Pull-Through", "B-Stance Hip Thrust"],
  // Horizontal press
  "bench press":          ["Incline Bench Press", "DB Bench Press", "Close-Grip Bench Press"],
  "incline db press":     ["Incline Bench Press", "Flat DB Bench Press", "Machine Chest Press"],
  "incline bench press":  ["Bench Press", "Incline DB Press", "Decline Bench"],
  "db bench press":       ["Bench Press", "Incline DB Press", "Machine Chest Press"],
  "machine chest press":  ["Bench Press", "Incline DB Press", "Cable Chest Press"],
  "chest press machine":  ["Bench Press", "Incline DB Press", "Cable Chest Press"],
  "close-grip bench press":["Diamond Push-Up", "Skull Crusher", "Cable Tricep Pushdown"],
  "cable chest fly":      ["DB Fly", "Pec Deck", "Push-Up"],
  // Vertical press
  "overhead press":       ["Seated DB Shoulder Press", "Push Press", "Machine Shoulder Press"],
  "machine shoulder press":["Overhead Press", "Seated DB Shoulder Press", "Arnold Press"],
  // Vertical pull
  "pull-up":              ["Lat Pulldown", "Chin-Up", "Assisted Pull-Up"],
  "lat pulldown":         ["Pull-Up", "Cable Single-Arm Pulldown", "Neutral-Grip Pulldown"],
  // Horizontal pull
  "barbell row":          ["Pendlay Row", "T-Bar Row", "DB Row"],
  "db row":               ["Chest-Supported Row", "Barbell Row", "Seated Row"],
  "seated row":           ["Cable Row", "Chest-Supported Row", "DB Row"],
  // Shoulders / rear delts
  "db lateral raise":     ["Cable Lateral Raise", "Machine Lateral Raise", "Leaning Lateral Raise"],
  "lateral raise":        ["Cable Lateral Raise", "Machine Lateral Raise", "DB Lateral Raise"],
  "cable face pull":      ["Reverse Pec Deck", "Bandit Pull", "DB Reverse Fly"],
  "face pull":            ["Reverse Pec Deck", "Bandit Pull", "DB Reverse Fly"],
  "reverse pec deck":     ["Cable Face Pull", "DB Reverse Fly", "Bandit Pull"],
  // Biceps
  "barbell curl":         ["EZ Bar Curl", "Cable Curl", "DB Curl"],
  "db curl":              ["Hammer Curl", "Cable Curl", "Barbell Curl"],
  "dumbbell curl":        ["Hammer Curl", "Cable Curl", "Barbell Curl"],
  "db hammer curl":       ["Reverse Curl", "Cable Hammer Curl", "DB Curl"],
  "hammer curl":          ["Reverse Curl", "Cable Hammer Curl", "DB Curl"],
  "db scott curl":        ["Preacher Curl", "Spider Curl", "Cable Curl"],
  "spider curl":          ["Preacher Curl", "Concentration Curl", "Cable Curl"],
  // Triceps
  "rope pushdown":        ["V-Bar Pushdown", "Bench Dip", "Skull Crusher"],
  "cable tricep pushdown":["V-Bar Pushdown", "Bench Dip", "Skull Crusher"],
  "overhead tricep ext":  ["Skull Crusher", "Rope Overhead Extension", "DB Triceps Kickback"],
  "db triceps kickback":  ["Bench Dip", "Cable Kickback", "Tricep Pushdown"],
  "close-grip assisted dip":["Bench Dip", "Cable Tricep Pushdown", "Skull Crusher"],
  // Calves
  "calf raise":           ["Donkey Calf Raise", "Seated Calf Raise", "Standing Calf Raise"],
  "standing calf raise":  ["Donkey Calf Raise", "Seated Calf Raise", "Smith Calf Raise"],
  "donkey calf raise":    ["Standing Calf Raise", "Seated Calf Raise", "Smith Calf Raise"],
  // Legs accessories
  "leg curl":             ["Stiff-Leg Deadlift", "Glute-Ham Raise", "Nordic Curl"],
  "leg extension":        ["Sissy Squat", "Bulgarian Split Squat", "Cyclist Squat"],
  // Core
  "hanging leg raise":    ["Captain's Chair Leg Raise", "Lying Leg Raise", "Ab Wheel"],
  "plank hold":           ["Side Plank", "Hollow Hold", "Ab Wheel"],
  "plank hold (sec)":     ["Side Plank", "Hollow Hold", "Ab Wheel"],
  "cable crunch":         ["Hanging Leg Raise", "Ab Wheel", "Decline Sit-Up"],
  // Shrugs
  "db shrug":             ["Barbell Shrug", "Cable Shrug", "Trap Bar Shrug"],
};

function norm(name) {
  return (name || "").toLowerCase().replace(/\s+/g, " ").trim();
}

export function variationsFor(exerciseName) {
  return VARIATIONS[norm(exerciseName)] || [];
}

// Pull the max weight × reps for an exercise across every session in
// `history`. Returns an array of { date, maxWeight, reps, hitTarget }
// in chronological order, oldest first. `target` is the exercise's
// programmed rep target (so "hitTarget" means user matched/exceeded
// reps on at least one of the working sets).
export function exerciseHistory(exerciseName, target, history) {
  const out = [];
  const n = norm(exerciseName);
  for (const session of history) {
    for (const ex of session.exercises || []) {
      if (norm(ex.name) !== n) continue;
      let maxWeight = 0;
      let bestReps = 0;
      let hitTarget = false;
      for (const set of ex.sets || []) {
        const w = Number(set.weight) || 0;
        const r = Number(set.reps) || 0;
        if (w > maxWeight) maxWeight = w;
        if (r > bestReps) bestReps = r;
        if (r >= (target || 0)) hitTarget = true;
      }
      if (maxWeight > 0 || bestReps > 0) {
        out.push({ date: session.date, maxWeight, reps: bestReps, hitTarget });
      }
    }
  }
  // Oldest first so "last N" can use slice(-N).
  out.sort((a, b) => a.date - b.date);
  return out;
}

// Classify the trend over the last N (default 3) sessions:
//   "new"        — fewer than 2 sessions to compare
//   "progress"   — weight has gone up OR user hit target reps every
//                  recent session (load can bump)
//   "stall"      — same weight for the whole window AND target reps
//                  not hit recently
const WINDOW = 3;

export function exerciseTrend(exerciseName, target, history) {
  const log = exerciseHistory(exerciseName, target, history);
  if (log.length < 2) return { kind: "new", log };
  const recent = log.slice(-WINDOW);
  if (recent.length < 2) return { kind: "new", log };

  const weights = recent.map((r) => r.maxWeight);
  const allSameWeight = weights.every((w) => w === weights[0]);
  const allHitTarget = recent.every((r) => r.hitTarget);
  const weightTrendingUp = weights[weights.length - 1] > weights[0];

  if (weightTrendingUp) return { kind: "progress", log, reason: "weight ↑" };
  if (allHitTarget && allSameWeight) return { kind: "progress", log, reason: "ready to bump load" };
  if (allSameWeight && !allHitTarget) return { kind: "stall", log, reason: "no PR + missing reps" };
  return { kind: "neutral", log };
}

// Build a list of coach suggestions for `day`. Three kinds:
//   - "variation": swap a stalling exercise for a similar movement
//   - "bump-set":  add a set to a progressing exercise IF the session
//                  still fits within `budgetMinutes` after the bump
//   - "bump-weight": ready to add load on a progressing exercise (info
//                    only — doesn't change the program)
//
// Returns at most `max` items so the card doesn't get spammy.
export function suggestionsForDay(day, history, { budgetMinutes = 60, max = 4 } = {}) {
  if (!day || !Array.isArray(day.exercises)) return [];
  const out = [];
  const currentMinutes = estimateMinutesForDay(day);

  for (const ex of day.exercises) {
    const trend = exerciseTrend(ex.name, ex.reps, history);
    if (trend.kind === "stall") {
      const swaps = variationsFor(ex.name);
      if (swaps.length > 0) {
        out.push({
          kind: "variation",
          exercise: ex,
          options: swaps,
          reason: trend.reason || "stalled",
        });
      }
    } else if (trend.kind === "progress") {
      // Set bump: estimate how much time one more set would add and
      // only suggest if it keeps the session under budget.
      const setSec = (ex.reps || 0) * 3 + 5 + (ex.restSec || 0);
      const projectedMinutes = currentMinutes + Math.round(setSec / 60);
      if (projectedMinutes <= budgetMinutes) {
        out.push({
          kind: "bump-set",
          exercise: ex,
          toSets: (ex.sets || 0) + 1,
          projectedMinutes,
          reason: trend.reason || "progressing",
        });
      } else {
        out.push({
          kind: "bump-weight",
          exercise: ex,
          reason: trend.reason || "progressing",
        });
      }
    }
  }

  return out.slice(0, max);
}
