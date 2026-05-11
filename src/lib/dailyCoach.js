// Real-time coach suggestions for the Workout tab. Aggregates today's
// signals — workout in progress / done, sports scheduled vs logged,
// steps progress, diet vs target, sleep, day-type choice — and emits
// a short prioritized list of "what should I do right now" cards.
//
// Pure / side-effect-free so it's easy to test. Consumers pass in the
// raw state from AppContext; this module decides which suggestions are
// relevant + ranks them.

import { todayKey } from "./time.js";

const URGENT = 0;
const HIGH = 1;
const MED = 2;
const LOW = 3;

// Build a list of suggestions for the current moment. Each one:
//   { id, priority, icon, color, title, detail, action?: { label, tab } }
//
// `state` shape:
//   {
//     now: number (epoch ms),
//     dayType: { id, label },
//     manualDayTypeId: "rest" | "workout" | "sports" | null,
//     todaysDay: program day object | null,
//     todaysScheduledSport: sport object | null,
//     currentSession: in-progress workout | null,
//     workoutHistory: full history array,
//     sportsLog: full sports log array,
//     steps: number,
//     effectiveStepGoal: number,
//     baseStepGoal: number,
//     sportsStepCredit: number,
//     dayTotals: { kcal, protein, ... },
//     dailyTargetKcal: number,
//     todaysActivityKcal: number,
//     sleep: { hours } | null,
//     profile: { workoutTime, mealTimes, goalKey, ... },
//     streaks: { meal, workout, steps, all },
//   }
export function getDailySuggestions(state) {
  const out = [];
  const {
    now,
    dayType,
    manualDayTypeId,
    todaysDay,
    todaysScheduledSport,
    currentSession,
    workoutHistory = [],
    sportsLog = [],
    steps = 0,
    effectiveStepGoal = 10000,
    sportsStepCredit = 0,
    dayTotals = { kcal: 0 },
    dailyTargetKcal = 0,
    todaysActivityKcal = 0,
    sleep,
    profile = {},
    streaks = {},
  } = state;

  const nowDate = new Date(now);
  const hour = nowDate.getHours();
  const todayK = todayKey(nowDate);

  // ----- Workout state --------------------------------------------------
  const sessionsToday = workoutHistory.filter(
    (h) => todayKey(new Date(h.date)) === todayK,
  );
  const workoutDone = sessionsToday.length > 0;
  const sportsToday = sportsLog.filter(
    (s) => todayKey(new Date(s.date)) === todayK,
  );
  const sportsDone = sportsToday.length > 0;

  // 1. Workout in progress → URGENT, show first.
  if (currentSession) {
    const accumSec = currentSession.paused
      ? currentSession.accumSec
      : currentSession.accumSec + (Date.now() - currentSession.resumedAt) / 1000;
    const min = Math.round(accumSec / 60);
    out.push({
      id: "workout-running",
      priority: URGENT,
      icon: "🏋️",
      color: "#c44827",
      title: `Workout running · ${min} min in`,
      detail: "Log your next set when you finish it. Pause via the session card below.",
    });
  }

  // 2. Poor sleep → drop intensity hint.
  if (sleep && typeof sleep.hours === "number" && sleep.hours > 0 && sleep.hours < 6) {
    out.push({
      id: "sleep-low",
      priority: HIGH,
      icon: "😴",
      color: "#6b5a3e",
      title: `Only ${sleep.hours.toFixed(1)}h sleep last night`,
      detail: "Drop training intensity ~20% today. Hit reps, leave 1–2 in the tank, skip max-effort sets.",
    });
  }

  // 3. Workout day, before scheduled time, not done → reminder.
  if (todaysDay && !workoutDone && !currentSession) {
    const wt = profile.workoutTime;
    let timing = "";
    if (wt) {
      const [h, m] = wt.split(":").map(Number);
      const target = new Date(nowDate);
      target.setHours(h || 0, m || 0, 0, 0);
      const ms = target - nowDate;
      timing = ms > 0
        ? `Scheduled ${wt} · in ${Math.round(ms / 60000)} min`
        : `Scheduled ${wt} · overdue ${Math.round(-ms / 60000)} min`;
    } else {
      timing = "No time set — start when ready";
    }
    out.push({
      id: "workout-pending",
      priority: HIGH,
      icon: "💪",
      color: "#c44827",
      title: `Today's session: ${todaysDay.name}`,
      detail: `${todaysDay.exercises?.length || 0} exercises · ${timing}`,
      action: { label: "Start", tab: "activity/workout" },
    });
  }

  // 4. Sports day, no session logged → quick log.
  if (todaysScheduledSport && !sportsDone) {
    out.push({
      id: "sports-pending",
      priority: HIGH,
      icon: todaysScheduledSport.icon || "⚽",
      color: "#d97a2c",
      title: `${todaysScheduledSport.name} day`,
      detail: "Log your session when you finish — feeds into burn breakdown + sports history.",
      action: { label: "Log session", tab: "activity/sports" },
    });
  }

  // 5. Diet over goal AND no activity yet → suggest burn.
  const eaten = Math.round(dayTotals.kcal || 0);
  const target = Math.round(dailyTargetKcal || 0);
  const surplus = eaten - target;
  if (eaten > 200 && surplus > 200 && todaysActivityKcal < 100) {
    out.push({
      id: "diet-surplus-no-burn",
      priority: HIGH,
      icon: "⚖️",
      color: "#c44827",
      title: `+${surplus} kcal over today's target`,
      detail: "Schedule a workout or extra walk — you haven't burned anything off yet.",
      action: { label: "Pick activity", tab: "activity/workout" },
    });
  }

  // 6. Diet way under goal, evening → eat or skip workout.
  if (hour >= 17 && eaten > 200 && eaten < target - 500 && !workoutDone) {
    out.push({
      id: "diet-under-evening",
      priority: HIGH,
      icon: "🍽️",
      color: "#3b6aa3",
      title: `${target - eaten} kcal under target`,
      detail: "Eat a real meal before training — running a deficit AND lifting tonight will tank performance.",
      action: { label: "Log meal", tab: "diet" },
    });
  }

  // 7. Manual diet-day mismatch with schedule → nudge.
  if (
    manualDayTypeId &&
    manualDayTypeId === "rest" &&
    todaysDay &&
    !workoutDone &&
    hour >= 12
  ) {
    out.push({
      id: "day-type-mismatch-rest",
      priority: MED,
      icon: "🤔",
      color: "#6b5a3e",
      title: "Diet says rest, schedule says workout",
      detail: `You set today to Rest Day in Diet, but the schedule has ${todaysDay.name}. Pick which one's true so the eating target is right.`,
    });
  }

  // 8. Steps shortfall in evening.
  if (hour >= 18 && steps < effectiveStepGoal * 0.7 && steps > 0) {
    const remaining = effectiveStepGoal - steps;
    out.push({
      id: "steps-evening",
      priority: MED,
      icon: "🚶",
      color: "#3b6aa3",
      title: `${remaining.toLocaleString()} steps short of today's goal`,
      detail:
        sportsStepCredit > 0
          ? `Goal is ${effectiveStepGoal.toLocaleString()} (lowered by your sports day). 15-min walk should close it.`
          : `Goal is ${effectiveStepGoal.toLocaleString()}. ~15-min walk should close it.`,
      action: { label: "Log steps", tab: "activity/steps" },
    });
  }

  // 9. Steps goal already hit (positive feedback).
  if (steps >= effectiveStepGoal && effectiveStepGoal > 0) {
    out.push({
      id: "steps-done",
      priority: LOW,
      icon: "✅",
      color: "#4a6b3e",
      title: "Steps goal hit",
      detail: `${steps.toLocaleString()} / ${effectiveStepGoal.toLocaleString()} ✓`,
    });
  }

  // 10. Streak — every habit hit in a row.
  if ((streaks.all || 0) >= 3) {
    out.push({
      id: "streak-positive",
      priority: LOW,
      icon: "🔥",
      color: "#c44827",
      title: `${streaks.all}-day all-three streak`,
      detail: "Meal + Workout + Steps every day. Keep the momentum.",
    });
  }

  // 11. Workout done celebration (lower priority — caps the list).
  if (workoutDone && !currentSession) {
    const lastSession = sessionsToday[0];
    out.push({
      id: "workout-done",
      priority: LOW,
      icon: "✅",
      color: "#4a6b3e",
      title: `${lastSession?.dayName || "Workout"} done`,
      detail: `${Math.round((lastSession?.durationSec || 0) / 60)} min · log was saved to History.`,
    });
  }

  // 12. Sports done (positive feedback).
  if (sportsDone) {
    const totalKcal = Math.round(
      sportsToday.reduce((s, x) => s + (Number(x.kcal) || 0), 0),
    );
    out.push({
      id: "sports-done",
      priority: LOW,
      icon: "✅",
      color: "#4a6b3e",
      title: `${sportsToday.length} sport session${sportsToday.length === 1 ? "" : "s"} logged`,
      detail: `${totalKcal} kcal burned · ${sportsToday.map((s) => s.sportName).join(", ")}`,
    });
  }

  // Sort by priority (URGENT first), keep the first 6.
  out.sort((a, b) => (a.priority || 0) - (b.priority || 0));
  return out.slice(0, 6);
}
