import { useEffect, useMemo, useState } from "react";
import { useApp } from "../store/AppContext.jsx";
import { Card, CardHeader, Stat } from "../components/ui/Card.jsx";
import { Button, IconButton } from "../components/ui/Button.jsx";
import { Chip, ProgressBar, TextInput } from "../components/ui/Field.jsx";
import { Modal } from "../components/ui/Modal.jsx";
import { DAYS_SHORT, formatMMSS, dayOfWeek, todayKey } from "../lib/time.js";
import { load } from "../store/storage.js";
import {
  estimateWorkoutKcal,
  expectedTrainingKcal,
  stepsToKcal,
} from "../lib/calories.js";
import { suggestionsForDay } from "../lib/coach.js";
import { getDailySuggestions } from "../lib/dailyCoach.js";
import {
  Play,
  Pause,
  RotateCcw,
  Check,
  CheckCircle,
  X,
  Youtube,
  Timer,
  Flame,
  TrendingUp,
  Target,
  Zap,
  Save,
  Trash2,
} from "lucide-react";

const SEC_PER_REP = 3;
const SETUP_SEC = 5;
const WARMUP_SEC = 5 * 60;

function estimateMinutes(day) {
  if (!day) return 0;
  const total = day.exercises.reduce(
    (s, ex) => s + ex.sets * (ex.reps * SEC_PER_REP + SETUP_SEC + ex.restSec),
    WARMUP_SEC,
  );
  return Math.round(total / 60);
}

// ----------------------------------------------------------------------------
// Goal-aware coaching: rep range, rest, intensity targeting per goal direction.
// ----------------------------------------------------------------------------
const GOAL_TUNING = {
  cut: {
    label: "Cut",
    repsDelta: +2,         // higher reps to maintain workload at lighter loads
    restMultiplier: 0.85,  // shorter rest, density work
    intensityCue: "65–75% 1RM · same weight, +1 rep each session",
    overloadKind: "reps",
  },
  maintain: {
    label: "Maintain",
    repsDelta: 0,
    restMultiplier: 1.0,
    intensityCue: "70–80% 1RM · alternate +rep one week, +weight next",
    overloadKind: "alternate",
  },
  bulk: {
    label: "Bulk",
    repsDelta: -1,
    restMultiplier: 1.15,
    intensityCue: "75–85% 1RM · +2.5 kg when you hit all reps",
    overloadKind: "weight",
  },
  muscle_build: {
    label: "Muscle build",
    repsDelta: -2,
    restMultiplier: 1.2,
    intensityCue: "75–85% 1RM hypertrophy · +2.5 kg when you nail reps",
    overloadKind: "weight",
  },
};

// Look back through history for the most recent best (heaviest) logged set
// of this exercise. Returns null if never trained.
function lastBestSet(history, exerciseId) {
  for (const h of history) {
    const ex = h.exercises.find((e) => e.id === exerciseId);
    if (ex && ex.sets.length) {
      return ex.sets.reduce(
        (best, s) => ((s.weight || 0) > (best.weight || 0) ? s : best),
        ex.sets[0],
      );
    }
  }
  return null;
}

// Conservative first-session starting weight, derived from bodyweight +
// exercise classification. Rough but better than an empty input — the user
// can adjust on the fly and subsequent sessions use real history.
function startingWeight(exerciseName, weightKg) {
  if (!weightKg) return null;
  const n = (exerciseName || "").toLowerCase();
  let frac;
  if (/deadlift/.test(n)) frac = 0.7;
  else if (/squat|hip thrust|leg press|front squat|back squat/.test(n)) frac = 0.5;
  else if (/bench|chest press|shoulder press|overhead press|incline/.test(n)) frac = 0.4;
  else if (/row|pulldown|pull-?up|seated row|lat/.test(n)) frac = 0.4;
  else if (/dip/.test(n)) frac = 0.0; // bodyweight-anchored, assisted to 0
  else if (/curl|extension|raise|fly|flye|kickback|pushdown|face pull/.test(n)) frac = 0.1;
  else if (/calf/.test(n)) frac = 0.3;
  else if (/plank|hanging leg raise|crunch|sit-?up/.test(n)) return 0; // bodyweight
  else frac = 0.25;
  // Round to nearest 2.5 kg (standard plate increment)
  return Math.round((weightKg * frac) / 2.5) * 2.5;
}

// Suggest target weight + reps for the next session based on last best,
// the goal direction, and the program's prescribed reps. When there's no
// history yet, derives a starting weight from bodyweight + exercise type
// so the user always sees a suggested number to work from.
function suggestNextSet({ lastBest, goalKey, baseReps, exerciseName, userWeightKg }) {
  const tuning = GOAL_TUNING[goalKey] || GOAL_TUNING.maintain;
  const targetReps = Math.max(3, baseReps + tuning.repsDelta);

  if (!lastBest) {
    const startW = startingWeight(exerciseName, userWeightKg);
    if (startW == null) return null;
    return {
      weight: startW,
      reps: targetReps,
      note:
        startW === 0
          ? "First time — start with bodyweight, scale next session"
          : "First time — conservative start (≈ ratio of body weight)",
      firstTime: true,
    };
  }
  const w = Number(lastBest.weight) || 0;
  const r = Number(lastBest.reps) || 0;

  // Did they hit (or exceed) the program's target reps last time?
  const hitTarget = r >= targetReps;

  if (tuning.overloadKind === "weight") {
    if (hitTarget) {
      return { weight: w + 2.5, reps: targetReps, note: "+2.5 kg from last best" };
    }
    return { weight: w, reps: r + 1, note: `Same weight, push for ${r + 1} reps` };
  }
  if (tuning.overloadKind === "reps") {
    return { weight: w, reps: r + 1, note: `Same weight, ${r + 1} reps today` };
  }
  // Alternate weeks
  if (hitTarget) {
    return { weight: w + 2.5, reps: targetReps, note: "+2.5 kg, drop reps to base" };
  }
  return { weight: w, reps: r + 1, note: "Same weight, +1 rep" };
}

// Days since the user last trained the same day-id.
function daysSinceLast(history, dayId) {
  const last = history.find((h) => h.dayId === dayId);
  if (!last) return Infinity;
  return Math.floor((Date.now() - last.date) / 86400000);
}

// Coach uses workout history + today's diet + last night's sleep + recent
// weight trend to give a personalised note. Returns the highest-priority
// tip; if nothing flags, falls back to recovery-based guidance.
function coachNote({
  goalKey,
  dayRecovery,
  hasDay,
  caloriesEaten,
  calorieTarget,
  sleep,
  weightTrend14d, // { delta, weighIns } or null
}) {
  // Rest day suggestions (no scheduled training)
  if (!hasDay) {
    if (goalKey === "muscle_build" || goalKey === "bulk") {
      return "Rest fully — eat the surplus, sleep ≥7h. Light walking is plenty.";
    }
    if (goalKey === "cut") {
      return "Rest day — walk to step goal, hit protein, stay near calorie target.";
    }
    return "Active recovery: a long walk + good food + sleep.";
  }

  // ---- Highest priority: red flags from sleep + diet ----
  if (sleep?.hours != null && sleep.hours < 5.5) {
    return `Only ${sleep.hours.toFixed(1)}h sleep — pull back today: 1 fewer set, focus on form, no PR attempts.`;
  }
  // Big calorie deficit on a non-cut day → low-fuel session warning
  if (calorieTarget && caloriesEaten < calorieTarget - 600 && goalKey !== "cut") {
    return `Under-fuelled today (${Math.round(caloriesEaten)} of ${Math.round(calorieTarget)} kcal). Hit a snack pre-workout or drop one set.`;
  }
  // Big calorie surplus on cut → easy to over-eat training afterwards
  if (calorieTarget && goalKey === "cut" && caloriesEaten > calorieTarget + 400) {
    return `Already ${Math.round(caloriesEaten - calorieTarget)} kcal over — train hard but skip post-workout extras.`;
  }

  // ---- Weight trend signal (14d) ----
  if (weightTrend14d && weightTrend14d.weighIns >= 2) {
    const d = weightTrend14d.delta;
    if (goalKey === "cut" && Math.abs(d) < 0.3) {
      return "Cut plateau — weight steady ≥14d. Consider tightening diet 100–200 kcal or adding a step day.";
    }
    if (goalKey === "muscle_build" || goalKey === "bulk") {
      if (d < 0.1) {
        return "No gain in 14d on a bulk — surplus may be too small. Add ~150 kcal/day or extra carbs around training.";
      }
      if (d > 1.0) {
        return "Gaining fast (>1 kg in 14d) — ease the surplus a touch to keep gains lean.";
      }
    }
  }

  // ---- Recovery-based fallback (existing behaviour, slightly polished) ----
  if (dayRecovery === Infinity) {
    return "First time on this day — pick conservative weights, learn the form, ramp next session.";
  }
  if (dayRecovery === 0) {
    return "Already trained this day today. Consider rest or a different muscle group.";
  }
  if (dayRecovery <= 1) {
    return "Same muscles ≤ 24h ago. Keep volume modest, focus on form, use the suggested weights.";
  }
  if (dayRecovery <= 3) {
    return goalKey === "muscle_build" || goalKey === "bulk"
      ? "Fresh enough — push for a small weight bump on the main lifts."
      : "Good window — same weight, aim for an extra rep or two.";
  }
  return "Long gap since this day — drop ~5% load, focus on technique, then build.";
}

export function Workout() {
  const {
    activeProgram,
    weeks,
    setProgramWeek,
    resetProgramWeek,
    todaysDayId,
    profile,
    currentSession,
    startSession,
    pauseSession,
    resumeSession,
    finishSession,
    cancelSession,
    logSet,
    unlogSet,
    history,
    steps,
    setSteps,
    stepAdjustKcal,
    todaysWorkoutKcal,
    dayTotals,
    dailyTargetKcal,
    sleep,
    weightLog,
    sportsList,
  } = useApp();
  // When the user cycles a day chip to "Sports & Others" we pop a modal
  // so they can pick which specific sport that day represents.
  const [sportPickerForDay, setSportPickerForDay] = useState(null);

  const programWeek =
    weeks[activeProgram.id] || activeProgram.defaultWeek;

  // The day being trained is either the in-progress session day, the today's
  // scheduled day, or the user's manual selection.
  const initialDayId = useMemo(() => {
    if (currentSession) return currentSession.dayId;
    if (todaysDayId && todaysDayId !== "rest") return todaysDayId;
    return activeProgram.days[0]?.id;
  }, [currentSession, todaysDayId, activeProgram]);

  const [selectedDayId, setSelectedDayId] = useState(initialDayId);
  useEffect(() => setSelectedDayId(initialDayId), [initialDayId]);

  const selectedDay =
    activeProgram.days.find((d) => d.id === selectedDayId) ||
    activeProgram.days[0];

  // Live elapsed time
  const [, setTick] = useState(0);
  useEffect(() => {
    if (!currentSession || currentSession.paused) return;
    const t = setInterval(() => setTick((n) => n + 1), 1000);
    return () => clearInterval(t);
  }, [currentSession]);

  const elapsedSec = currentSession
    ? currentSession.paused
      ? currentSession.accumSec
      : currentSession.accumSec + (Date.now() - currentSession.resumedAt) / 1000
    : 0;

  // Toggle a day on the week chip. Cycle: rest → program day 1 → … →
  // program day N → Sports & Others → rest. When we land on the sports
  // step we don't pick blindly — we open the picker so the user chooses
  // which specific sport this day represents. Tapping a chip that's
  // already on a sport re-opens the picker so the sport can be changed.
  function cycleWeekDay(dayIdx) {
    const cur = programWeek[dayIdx] || "rest";
    if (typeof cur === "string" && cur.startsWith("sports:")) {
      setSportPickerForDay(dayIdx);
      return;
    }
    const programIds = activeProgram.days.map((d) => d.id);
    const ids = ["rest", ...programIds, "_sports"];
    const idx = ids.indexOf(cur);
    const nextId = ids[(idx === -1 ? -1 : idx) + 1] || "rest";
    if (nextId === "_sports") {
      setSportPickerForDay(dayIdx);
      return;
    }
    const newWeek = [...programWeek];
    newWeek[dayIdx] = nextId === "_sports" ? "rest" : nextId;
    setProgramWeek(activeProgram.id, newWeek);
  }

  function pickSportForDay(sportId) {
    if (sportPickerForDay == null) return;
    const newWeek = [...programWeek];
    newWeek[sportPickerForDay] = `sports:${sportId}`;
    setProgramWeek(activeProgram.id, newWeek);
    setSportPickerForDay(null);
  }

  function dayChipLabel(id) {
    if (id === "rest") return "Rest";
    if (typeof id === "string" && id.startsWith("sports:")) {
      const sid = id.slice("sports:".length);
      const sport = (sportsList || []).find((s) => s.id === sid);
      return sport ? `${sport.icon || "⚽"} ${sport.name}` : "Sports";
    }
    return activeProgram.days.find((d) => d.id === id)?.name || "—";
  }

  const [summary, setSummary] = useState(null);
  function handleFinish() {
    const program = activeProgram;
    const day = selectedDay;
    let totalSets = 0;
    let totalReps = 0;
    let totalVolume = 0;
    for (const ex of day.exercises) {
      const sets = (currentSession.log[ex.id] || []).filter(Boolean);
      totalSets += sets.length;
      for (const set of sets) {
        totalReps += Number(set.reps) || 0;
        totalVolume += (Number(set.weight) || 0) * (Number(set.reps) || 0);
      }
    }
    const durationSec = Math.round(elapsedSec);
    const kcalBurned = estimateWorkoutKcal({
      durationSec,
      weightKg: profile.stats?.weightKg || profile.weightKg || 70,
      totalVolume,
    });
    setSummary({
      programName: program.name,
      dayName: day.name,
      durationSec,
      totalSets,
      totalReps,
      totalVolume: Math.round(totalVolume),
      kcalBurned,
    });
    finishSession();
  }

  function lastBest(exerciseId) {
    for (const h of history) {
      const ex = h.exercises.find((e) => e.id === exerciseId);
      if (ex && ex.sets.length) {
        const top = ex.sets.reduce(
          (best, s) => ((s.weight || 0) > (best.weight || 0) ? s : best),
          ex.sets[0],
        );
        return top;
      }
    }
    return null;
  }

  const estDuration = estimateMinutes(selectedDay);

  // Coaching context — used by the Coach card and per-exercise prescriptions.
  const goalKey = profile.goalKey || "maintain";
  const goalTuning = GOAL_TUNING[goalKey] || GOAL_TUNING.maintain;
  const userWeightKg = profile.stats?.weightKg || 70;
  const expectedKcal = expectedTrainingKcal({ day: selectedDay, weightKg: userWeightKg });
  const expectedSteps = stepsToKcal(profile.stepAdjust?.baseline || 10000, userWeightKg);
  const totalBurnTarget = expectedKcal + expectedSteps;
  const dayRecovery = selectedDay ? daysSinceLast(history, selectedDay.id) : Infinity;

  // 14-day weight trend (uses Progress measurements). Returns delta kg from
  // first to last weigh-in inside the window so the coach can flag plateaus
  // or runaway gains.
  const weightTrend14d = useMemo(() => {
    if (!weightLog || weightLog.length === 0) return null;
    const cutoff = Date.now() - 14 * 86400000;
    const inWindow = weightLog
      .filter((e) => e.weightKg != null && e.date >= cutoff)
      .sort((a, b) => a.date - b.date);
    if (inWindow.length < 2) return null;
    return {
      weighIns: inWindow.length,
      delta: inWindow[inWindow.length - 1].weightKg - inWindow[0].weightKg,
    };
  }, [weightLog]);

  return (
    <>
      {/* Coach — goal-aware overview of today's session, recovery, and what
          intensity / overload approach to use. */}
      <Card>
        <CardHeader
          kicker="Coach"
          title={
            selectedDay
              ? `${goalTuning.label} · ${selectedDay.name}`
              : `${goalTuning.label} · Rest day`
          }
          subtitle={
            selectedDay
              ? `${selectedDay.exercises.length} exercises · ~${estDuration} min · ${goalTuning.intensityCue}`
              : "Recovery day. Walk, hydrate, eat target calories."
          }
          right={
            <Chip color="#c44827">
              <Target size={10} className="inline mr-1" /> Goal: {goalTuning.label}
            </Chip>
          }
        />
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <Stat
            label="Burn target"
            value={Math.round(totalBurnTarget)}
            suffix="kcal"
            accent="#4a6b3e"
          />
          <Stat
            label="From training"
            value={`~${expectedKcal}`}
            suffix="kcal"
            accent="#3b6aa3"
          />
          <Stat
            label="From steps"
            value={`~${expectedSteps}`}
            suffix="kcal"
            accent="#6b5a3e"
          />
          <Stat
            label="Recovery"
            value={
              dayRecovery === Infinity
                ? "First time"
                : dayRecovery === 0
                  ? "Today"
                  : `${dayRecovery}d`
            }
            suffix="ago"
          />
        </div>
        <div className="mt-3 grid grid-cols-1 md:grid-cols-2 gap-3">
          <div className="border-2 border-ink p-3">
            <div className="font-mono text-[10px] uppercase tracking-[0.25em] text-ink-muted">
              Today's intensity
            </div>
            <p className="font-body text-sm mt-1">{goalTuning.intensityCue}</p>
          </div>
          <div className="border-2 border-ink p-3">
            <div className="font-mono text-[10px] uppercase tracking-[0.25em] text-ink-muted">
              Coach's note
            </div>
            <p className="font-body text-sm mt-1">
              {coachNote({
                goalKey,
                dayRecovery,
                hasDay: !!selectedDay,
                caloriesEaten: dayTotals.kcal,
                calorieTarget: dailyTargetKcal,
                sleep,
                weightTrend14d,
              })}
            </p>
            <div className="flex flex-wrap gap-1.5 mt-2">
              <span className="font-mono text-[9px] uppercase tracking-[0.2em] text-ink-muted">
                Considering
              </span>
              <Chip color="#3b6aa3">Goal: {goalTuning.label}</Chip>
              <Chip color="#6b5a3e">
                {dayRecovery === Infinity
                  ? "First time"
                  : `Recovery ${dayRecovery}d`}
              </Chip>
              <Chip color={dayTotals.kcal && dailyTargetKcal ? "#3b6aa3" : "#6b5a3e"}>
                Diet {Math.round(dayTotals.kcal)}/{Math.round(dailyTargetKcal)} kcal
              </Chip>
              <Chip
                color={
                  sleep?.hours == null
                    ? "#6b5a3e"
                    : sleep.hours < 6
                      ? "#c44827"
                      : "#4a6b3e"
                }
              >
                Sleep {sleep?.hours != null ? `${sleep.hours.toFixed(1)}h` : "not logged"}
              </Chip>
              {weightTrend14d ? (
                <Chip color="#6b5a3e">
                  Δ14d {weightTrend14d.delta >= 0 ? "+" : ""}
                  {weightTrend14d.delta.toFixed(1)}kg
                </Chip>
              ) : (
                <Chip color="#6b5a3e">Weight trend: log on Progress</Chip>
              )}
            </div>
          </div>
        </div>
      </Card>

      <RealTimeCoachCard />
      <CoachPeriodisationCard day={selectedDay} history={history} />

      {/* Training kcal today — workout sessions only. Steps now have their
          own Activity → Steps tab; Sports go to Activity → Sports. */}
      <Card>
        <CardHeader
          kicker="Activity"
          title="Training Today"
          subtitle="Calories burned from logged workout sessions only. Steps & sports live on their own Activity tabs."
          right={
            todaysWorkoutKcal > 0 ? (
              <Chip color="#4a6b3e">+{Math.round(todaysWorkoutKcal)} kcal</Chip>
            ) : null
          }
        />
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <Stat
            label="Training kcal today"
            value={`+${Math.round(todaysWorkoutKcal)}`}
            suffix="kcal"
            accent="#4a6b3e"
          />
          {stepAdjustKcal !== 0 && (
            <Stat
              label="Step adjustment"
              value={`${stepAdjustKcal > 0 ? "+" : ""}${stepAdjustKcal}`}
              suffix="kcal"
              accent={stepAdjustKcal > 0 ? "#4a6b3e" : "#c44827"}
            />
          )}
        </div>
      </Card>

      <Card>
        <CardHeader
          kicker="Your Week"
          title={activeProgram.name}
          subtitle={activeProgram.subtitle}
          right={
            <Button
              variant="ghost"
              size="sm"
              onClick={() => resetProgramWeek(activeProgram.id)}
            >
              <RotateCcw size={12} /> Reset
            </Button>
          }
        />
        <div className="grid grid-cols-7 gap-2">
          {programWeek.map((id, i) => {
            const isToday = i === dayOfWeek();
            const isRest = id === "rest";
            return (
              <button
                key={i}
                onClick={() => cycleWeekDay(i)}
                className={`border-2 py-2 px-1 text-center transition-colors ${
                  isToday ? "border-accent" : "border-ink"
                } ${isRest ? "bg-paper text-ink-muted" : "bg-ink text-paper"}`}
              >
                <div className="font-mono text-[9px] uppercase tracking-[0.2em] opacity-80">
                  {DAYS_SHORT[i]}
                </div>
                <div className="font-display text-sm font-bold mt-1">
                  {dayChipLabel(id)}
                </div>
              </button>
            );
          })}
        </div>
        <p className="font-body text-sm italic text-ink-muted mt-3">
          Tap a day to cycle: Rest → training days → Sports & Others → Rest.
          Sports days open a picker so you can choose which sport.
        </p>
      </Card>

      {/* Sport picker modal — shown when cycleWeekDay lands on the
          Sports & Others step, or when the user re-taps a sports chip
          to change which sport. */}
      {sportPickerForDay != null && (
        <Modal
          open
          onClose={() => setSportPickerForDay(null)}
          title={`Sports & Others · ${DAYS_SHORT[sportPickerForDay]}`}
          maxWidth="max-w-xl"
          footer={
            <>
              <Button
                variant="outline"
                onClick={() => {
                  // Cancel without saving — leave the slot at whatever
                  // it was before. If user is moving INTO sports from
                  // a non-sports slot, set it to rest so we don't leave
                  // a half-state.
                  const cur = programWeek[sportPickerForDay] || "rest";
                  if (typeof cur === "string" && !cur.startsWith("sports:")) {
                    const newWeek = [...programWeek];
                    newWeek[sportPickerForDay] = "rest";
                    setProgramWeek(activeProgram.id, newWeek);
                  }
                  setSportPickerForDay(null);
                }}
              >
                Cancel
              </Button>
            </>
          }
        >
          <p className="font-body text-sm italic text-ink-muted mb-3">
            Pick which sport you do on {DAYS_SHORT[sportPickerForDay]}s.
            This day will tag as a Sports day in Diet too, so eating + step
            targets adjust automatically.
          </p>
          <ul className="grid grid-cols-2 md:grid-cols-3 gap-2 max-h-[60vh] overflow-y-auto">
            {(sportsList || []).map((s) => (
              <li key={s.id}>
                <button
                  type="button"
                  onClick={() => pickSportForDay(s.id)}
                  className="w-full text-left border-2 border-ink p-3 hover:bg-ink/5 transition-colors flex items-center gap-2"
                  style={{ borderLeftColor: s.color || "#c44827", borderLeftWidth: 6 }}
                >
                  <span className="text-2xl shrink-0">{s.icon}</span>
                  <span className="font-display text-base font-bold break-words">
                    {s.name}
                  </span>
                </button>
              </li>
            ))}
          </ul>
        </Modal>
      )}

      <Card>
        <CardHeader
          kicker={selectedDay?.name || "Rest"}
          title="Today's Session"
          subtitle={
            selectedDay
              ? `${selectedDay.exercises.length} exercises · ~${estDuration} min`
              : "Active recovery"
          }
          right={
            <div className="flex flex-col items-end gap-1">
              <div className="font-mono text-[10px] uppercase tracking-[0.25em] text-ink-muted">
                Session
              </div>
              <div className="font-display text-3xl font-black tabular-nums">
                {formatMMSS(elapsedSec)}
              </div>
              <ProgressBar value={elapsedSec / 60} max={60} />
              <div className="flex gap-2 mt-2">
                {!currentSession ? (
                  <Button
                    variant="primary"
                    size="sm"
                    onClick={() => startSession(activeProgram.id, selectedDay.id)}
                  >
                    <Play size={12} /> Start
                  </Button>
                ) : currentSession.paused ? (
                  <Button variant="primary" size="sm" onClick={resumeSession}>
                    <Play size={12} /> Resume
                  </Button>
                ) : (
                  <Button variant="outline" size="sm" onClick={pauseSession}>
                    <Pause size={12} /> Pause
                  </Button>
                )}
                {currentSession && (
                  <>
                    <Button variant="primary" size="sm" onClick={handleFinish}>
                      <CheckCircle size={12} /> Finish
                    </Button>
                    <Button variant="danger" size="sm" onClick={cancelSession}>
                      <X size={12} /> Cancel
                    </Button>
                  </>
                )}
              </div>
            </div>
          }
        />

        {/* Day tabs */}
        <div className="flex flex-wrap gap-2 mb-4">
          {activeProgram.days.map((d) => (
            <button
              key={d.id}
              onClick={() => setSelectedDayId(d.id)}
              className={`px-3 py-1.5 border-2 font-mono text-[10px] uppercase tracking-[0.2em] ${
                selectedDayId === d.id
                  ? "bg-ink text-paper border-ink"
                  : "border-ink hover:bg-ink hover:text-paper"
              }`}
              style={
                selectedDayId === d.id ? { backgroundColor: d.accent, borderColor: d.accent } : {}
              }
            >
              {d.name}
            </button>
          ))}
        </div>

        {selectedDay && (
          <ul className="space-y-3">
            {selectedDay.exercises.map((ex) => {
              const lb = lastBest(ex.id);
              const suggestion = suggestNextSet({
                lastBest: lb,
                goalKey,
                baseReps: ex.reps,
                exerciseName: ex.name,
                userWeightKg,
              });
              return (
                <ExerciseRow
                  key={ex.id}
                  exercise={ex}
                  accent={selectedDay.accent}
                  inSession={!!currentSession}
                  log={currentSession?.log?.[ex.id] || []}
                  lastBest={lb}
                  suggestion={suggestion}
                  goalTuning={goalTuning}
                  onLog={(setIndex, data) => logSet(ex.id, setIndex, data)}
                  onUnlog={(setIndex) => unlogSet(ex.id, setIndex)}
                />
              );
            })}
          </ul>
        )}
      </Card>

      <RestTimer />

      <FinishSummaryModal summary={summary} onClose={() => setSummary(null)} />
    </>
  );
}

function ExerciseRow({
  exercise,
  accent,
  inSession,
  log,
  lastBest,
  suggestion,
  goalTuning,
  onLog,
  onUnlog,
}) {
  const sets = Array.from({ length: exercise.sets });
  // Goal-adjusted reps: shifted by the goal direction (e.g. cut +2 reps,
  // muscle build −2 reps for heavier load). Rest is also goal-scaled.
  const goalReps = Math.max(3, exercise.reps + (goalTuning?.repsDelta || 0));
  const goalRest = Math.max(30, Math.round(exercise.restSec * (goalTuning?.restMultiplier || 1)));
  const repsAdjusted = goalReps !== exercise.reps;
  const restAdjusted = goalRest !== exercise.restSec;
  const defaultRepsForInputs = suggestion?.reps || goalReps;

  return (
    <li className="border-2 border-ink p-3">
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1">
          <div className="flex items-center gap-2 flex-wrap">
            <span
              className="font-mono text-[9px] uppercase tracking-[0.2em] border px-1.5 py-0.5"
              style={{ color: accent, borderColor: accent }}
            >
              {exercise.sets} × {exercise.reps}
            </span>
            {repsAdjusted && (
              <Chip color="#c44827">
                {goalTuning.label}: {exercise.sets} × {goalReps}
              </Chip>
            )}
            <Chip>Rest {goalRest}s{restAdjusted ? ` (${goalTuning.label})` : ""}</Chip>
            {lastBest && (
              <Chip color="#6b5a3e">
                Last {lastBest.weight || 0}kg × {lastBest.reps}
              </Chip>
            )}
          </div>
          <h3 className="font-display text-xl font-bold mt-1">{exercise.name}</h3>
          {suggestion && (
            <div className="mt-1 inline-flex items-start flex-wrap gap-x-1.5 gap-y-0.5 font-mono text-[10px] uppercase tracking-[0.2em]">
              {suggestion.firstTime ? (
                <Zap size={11} className="text-good mt-[3px]" />
              ) : (
                <TrendingUp size={11} className="text-good mt-[3px]" />
              )}
              <span className="text-good font-bold">
                {suggestion.firstTime ? "Start at" : "Try"} {suggestion.weight} kg × {suggestion.reps}
              </span>
              <span className="text-ink-muted normal-case font-body italic">
                — {suggestion.note}
              </span>
            </div>
          )}
          {!suggestion && !lastBest && (
            <div className="mt-1 inline-flex items-center gap-1.5 font-mono text-[10px] uppercase tracking-[0.2em] text-ink-muted">
              <Zap size={11} />
              First time — set your bodyweight on Profile to get a starting suggestion
            </div>
          )}
        </div>
        {exercise.url && (
          <a
            href={exercise.url}
            target="_blank"
            rel="noopener noreferrer"
            className="border-2 border-ink p-1.5 hover:bg-ink hover:text-paper transition-colors"
            aria-label="Watch demo"
          >
            <Youtube size={14} />
          </a>
        )}
      </div>

      {inSession && (
        <div className="mt-3 grid gap-2">
          {sets.map((_, i) => (
            <SetRow
              key={i}
              index={i}
              entry={log[i]}
              defaultReps={defaultRepsForInputs}
              placeholderWeight={suggestion?.weight ?? lastBest?.weight}
              onLog={(data) => onLog(i, data)}
              onUnlog={() => onUnlog(i)}
            />
          ))}
        </div>
      )}
    </li>
  );
}

function SetRow({ index, entry, defaultReps, placeholderWeight, onLog, onUnlog }) {
  // Prefill the weight input with the coach's suggestion (not just as a
  // placeholder) so the user can confirm with one tap. If they want a
  // different weight they can edit before logging.
  const [weight, setWeight] = useState(
    entry?.weight ?? (placeholderWeight != null ? String(placeholderWeight) : ""),
  );
  const [reps, setReps] = useState(entry?.reps ?? defaultReps);
  useEffect(() => {
    setWeight(
      entry?.weight ?? (placeholderWeight != null ? String(placeholderWeight) : ""),
    );
    setReps(entry?.reps ?? defaultReps);
  }, [entry, defaultReps, placeholderWeight]);

  const done = !!entry;
  // The user can edit logged sets after the fact. "dirty" means the inputs
  // diverge from the saved entry — show a Save button to commit the update.
  const dirty =
    done &&
    (Number(weight) !== Number(entry.weight) || Number(reps) !== Number(entry.reps));

  return (
    <div
      className={`flex items-center gap-2 border px-2 py-1.5 ${
        done ? (dirty ? "border-accent bg-accent/5" : "border-good bg-good/5") : "border-ink/40"
      }`}
    >
      <span className="font-mono text-[10px] uppercase tracking-[0.2em] text-ink-muted w-12">
        Set {index + 1}
      </span>
      <TextInput
        type="number"
        step="0.5"
        value={weight}
        placeholder={placeholderWeight ? String(placeholderWeight) : "kg"}
        onChange={(e) => setWeight(e.target.value)}
        className="!w-20 !py-1 !text-sm"
      />
      <span className="font-mono text-[10px] uppercase tracking-[0.2em] text-ink-muted">
        ×
      </span>
      <TextInput
        type="number"
        value={reps}
        onChange={(e) => setReps(e.target.value)}
        className="!w-16 !py-1 !text-sm"
      />
      {!done && (
        <IconButton
          onClick={() =>
            onLog({ weight: Number(weight) || 0, reps: Number(reps) || 0 })
          }
          aria-label="Log set"
        >
          <Check size={14} />
        </IconButton>
      )}
      {done && dirty && (
        <IconButton
          onClick={() =>
            onLog({ weight: Number(weight) || 0, reps: Number(reps) || 0 })
          }
          aria-label="Update set"
          className="!border-accent !text-accent hover:!bg-accent hover:!text-paper"
        >
          <Save size={14} />
        </IconButton>
      )}
      {done && !dirty && (
        <IconButton
          onClick={onUnlog}
          aria-label="Undo set"
          className="!border-good !text-good hover:!bg-good hover:!text-paper"
        >
          <Check size={14} />
        </IconButton>
      )}
    </div>
  );
}

function RestTimer() {
  const [duration, setDuration] = useState(90);
  const [remaining, setRemaining] = useState(90);
  const [running, setRunning] = useState(false);
  const presets = [45, 60, 90, 120, 180];

  useEffect(() => {
    if (!running) return;
    const t = setInterval(() => {
      setRemaining((r) => {
        if (r <= 1) {
          setRunning(false);
          if (navigator.vibrate) navigator.vibrate([200, 100, 200, 100, 400]);
          return 0;
        }
        return r - 1;
      });
    }, 1000);
    return () => clearInterval(t);
  }, [running]);

  function start() {
    if (remaining === 0) setRemaining(duration);
    setRunning(true);
  }
  function pause() {
    setRunning(false);
  }
  function reset() {
    setRemaining(duration);
    setRunning(false);
  }
  function setPreset(secs) {
    setDuration(secs);
    setRemaining(secs);
    setRunning(false);
  }

  const isAlarming = remaining === 0;

  return (
    <div
      className={`fixed bottom-4 right-4 md:bottom-6 md:right-6 border-2 border-ink bg-paper p-3 w-64 shadow-lg z-30 ${isAlarming ? "pulse-ring" : ""}`}
    >
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-1.5">
          <Timer size={14} />
          <span className="font-mono text-[10px] uppercase tracking-[0.25em] text-ink-muted">
            Rest Timer
          </span>
        </div>
        <span
          className="font-display text-2xl font-black tabular-nums"
          style={{ color: isAlarming ? "#c44827" : "#2a2419" }}
        >
          {formatMMSS(remaining)}
        </span>
      </div>
      <div className="flex flex-wrap gap-1 mb-2">
        {presets.map((s) => (
          <button
            key={s}
            onClick={() => setPreset(s)}
            className={`flex-1 border font-mono text-[10px] uppercase tracking-[0.18em] py-1 ${
              duration === s
                ? "bg-ink text-paper border-ink"
                : "border-ink hover:bg-ink hover:text-paper"
            }`}
          >
            {s < 120 ? `${s}s` : `${s / 60}m`}
          </button>
        ))}
      </div>
      <div className="flex gap-1">
        <Button variant="primary" size="sm" className="flex-1" onClick={running ? pause : start}>
          {running ? <Pause size={12} /> : <Play size={12} />}
          {running ? "Pause" : "Start"}
        </Button>
        <IconButton onClick={reset} aria-label="Reset">
          <RotateCcw size={14} />
        </IconButton>
      </div>
    </div>
  );
}

function FinishSummaryModal({ summary, onClose }) {
  if (!summary) return null;
  return (
    <Modal
      open={!!summary}
      onClose={onClose}
      title="Workout complete"
      footer={
        <Button variant="primary" onClick={onClose}>
          Done
        </Button>
      }
    >
      <div className="grid grid-cols-2 gap-3">
        <Stat label="Duration" value={formatMMSS(summary.durationSec)} />
        <Stat label="Sets" value={summary.totalSets} />
        <Stat label="Reps" value={summary.totalReps} accent="#3b6aa3" />
        <Stat
          label="Volume"
          value={summary.totalVolume.toLocaleString()}
          suffix="kg"
          accent="#6b5a3e"
        />
        <Stat
          label="Kcal Burned"
          value={summary.kcalBurned}
          suffix="kcal"
          accent="#c44827"
        />
        <Stat label={summary.dayName} value={summary.programName} />
      </div>
      <p className="font-body text-base italic text-ink-muted mt-4">
        Calories burned have been added to today's diet budget — you've got{" "}
        <strong className="not-italic font-medium" style={{ color: "#c44827" }}>
          {summary.kcalBurned} kcal
        </strong>{" "}
        more to play with on the plate today.
      </p>
    </Modal>
  );
}

// ============================================================================
// Steps history — line chart + per-day list with a window picker.
// Loads `steps:YYYY-MM-DD` keys directly from localStorage so it covers
// past days even before steps state hooks were attached.
// ============================================================================

const STEPS_WINDOWS = [
  { id: 7, label: "7d" },
  { id: 30, label: "30d" },
  { id: 90, label: "90d" },
  { id: 365, label: "1y" },
  { id: 0, label: "All" },
];

function StepsHistory({ profile }) {
  const [windowDays, setWindowDays] = useState(30);

  const data = useMemo(() => {
    const out = [];
    const cursor = new Date();
    cursor.setHours(0, 0, 0, 0);
    const days = windowDays || 365;
    let total = 0;
    let nonZero = 0;
    for (let i = 0; i < days; i++) {
      const k = todayKey(cursor);
      const v = Number(load(`steps:${k}`, 0)) || 0;
      out.push({ date: new Date(cursor), key: k, steps: v });
      total += v;
      if (v > 0) nonZero++;
      cursor.setDate(cursor.getDate() - 1);
      // For "All" mode, stop after we hit a streak of empty days at the end
      if (windowDays === 0 && i > 30 && v === 0 && out.slice(-7).every((d) => d.steps === 0)) {
        break;
      }
    }
    out.reverse();
    const avg = nonZero > 0 ? Math.round(total / nonZero) : 0;
    const max = out.reduce((m, d) => (d.steps > m ? d.steps : m), 0);
    const baseline = profile?.stepAdjust?.baseline || 10000;
    const hitGoalDays = out.filter((d) => d.steps >= baseline).length;
    return { entries: out, total, avg, max, nonZero, baseline, hitGoalDays };
  }, [windowDays, profile?.stepAdjust?.baseline]);

  return (
    <Card>
      <CardHeader
        kicker="Activity History"
        title="Steps"
        subtitle={
          data.nonZero === 0
            ? "Log steps to start tracking your trend."
            : `${data.nonZero} day${data.nonZero === 1 ? "" : "s"} logged · avg ${data.avg.toLocaleString()} · best ${data.max.toLocaleString()}`
        }
        right={
          <div className="flex flex-wrap gap-1">
            {STEPS_WINDOWS.map((w) => (
              <button
                key={w.id}
                onClick={() => setWindowDays(w.id)}
                className={`px-2.5 py-1 border-2 font-mono text-[10px] uppercase tracking-[0.2em] ${
                  windowDays === w.id ? "bg-ink text-paper border-ink" : "border-ink hover:bg-ink hover:text-paper"
                }`}
              >
                {w.label}
              </button>
            ))}
          </div>
        }
      />

      {data.nonZero > 0 && (
        <>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-3">
            <Stat label="Total" value={data.total.toLocaleString()} suffix="steps" />
            <Stat
              label="Avg / day"
              value={data.avg.toLocaleString()}
              suffix="steps"
              accent="#3b6aa3"
            />
            <Stat
              label="Best day"
              value={data.max.toLocaleString()}
              suffix="steps"
              accent="#4a6b3e"
            />
            <Stat
              label={`Hit ${data.baseline.toLocaleString()}`}
              value={`${data.hitGoalDays}/${data.entries.length}`}
              suffix="days"
              accent="#c44827"
            />
          </div>

          <StepsChart entries={data.entries} baseline={data.baseline} />
        </>
      )}

      <ul className="divide-y divide-ink/30 border-y border-ink/30 mt-3 max-h-96 overflow-y-auto">
        {[...data.entries].reverse().map((d) => {
          const hit = d.steps >= data.baseline && d.steps > 0;
          const c = hit ? "#4a6b3e" : d.steps > 0 ? "#6b5a3e" : "#2a2419";
          return (
            <li key={d.key} className="py-2 flex items-center gap-3">
              <div className="flex-1 min-w-0">
                <div className="font-body text-base">
                  {d.date.toLocaleDateString("en-US", {
                    weekday: "short",
                    month: "short",
                    day: "numeric",
                    year: "numeric",
                  })}
                </div>
              </div>
              <div className="text-right flex items-center gap-2">
                <span
                  className="font-display text-lg font-bold tabular-nums"
                  style={{ color: c }}
                >
                  {d.steps.toLocaleString()}
                </span>
                <span className="font-mono text-[9px] uppercase tracking-[0.2em] text-ink-muted w-16">
                  {d.steps === 0 ? "no log" : hit ? "goal hit" : "below"}
                </span>
              </div>
            </li>
          );
        })}
      </ul>
    </Card>
  );
}

function StepsChart({ entries, baseline }) {
  if (entries.length < 2) return null;
  const W = 800;
  const H = 200;
  const padX = 36;
  const padY = 24;
  const xs = entries.map((e) => e.date.getTime());
  const ys = entries.map((e) => e.steps);
  const minX = Math.min(...xs);
  const maxX = Math.max(...xs);
  const maxY = Math.max(baseline * 1.1, ...ys);
  const sx = (x) => padX + ((x - minX) / Math.max(1, maxX - minX)) * (W - padX * 2);
  const sy = (y) => H - padY - (y / maxY) * (H - padY * 2);

  return (
    <svg
      viewBox={`0 0 ${W} ${H}`}
      className="w-full h-auto border-2 border-ink"
      preserveAspectRatio="none"
    >
      <rect x="0" y="0" width={W} height={H} fill="#f4ede0" />
      {/* Goal line */}
      <line
        x1={padX}
        x2={W - padX}
        y1={sy(baseline)}
        y2={sy(baseline)}
        stroke="#c44827"
        strokeOpacity="0.4"
        strokeDasharray="4 4"
      />
      <text x={4} y={sy(baseline) + 3} fontSize="10" fontFamily="JetBrains Mono, monospace" fill="#c44827">
        {(baseline / 1000).toFixed(0)}k
      </text>
      {/* Bars per day */}
      {entries.map((e, i) => {
        if (e.steps === 0) return null;
        const x = sx(e.date.getTime());
        const w = Math.max(2, (W - padX * 2) / entries.length - 2);
        const y = sy(e.steps);
        const hit = e.steps >= baseline;
        return (
          <rect
            key={i}
            x={x - w / 2}
            y={y}
            width={w}
            height={H - padY - y}
            fill={hit ? "#4a6b3e" : "#3b6aa3"}
            opacity="0.85"
          />
        );
      })}
      <text
        x={padX}
        y={H - 4}
        fontSize="10"
        fontFamily="JetBrains Mono, monospace"
        fill="#6b5a3e"
      >
        {entries[0].date.toLocaleDateString("en-US", { month: "short", day: "numeric" })}
      </text>
      <text
        x={W - padX}
        y={H - 4}
        textAnchor="end"
        fontSize="10"
        fontFamily="JetBrains Mono, monospace"
        fill="#6b5a3e"
      >
        {entries[entries.length - 1].date.toLocaleDateString("en-US", {
          month: "short",
          day: "numeric",
        })}
      </text>
    </svg>
  );
}

// ============================================================================
// RealTimeCoachCard — context-aware suggestions that aggregate today's
// workout + sports + steps + diet + sleep state and tell the user the
// single most useful thing they could do right now. Ranks by priority
// (urgent → routine), caps at 6 items. Hides itself when no signal.
// ============================================================================

function RealTimeCoachCard() {
  const {
    now,
    dayType,
    manualDayTypeId,
    todaysDay,
    todaysScheduledSport,
    currentSession,
    history: workoutHistory,
    sportsLog,
    steps,
    effectiveStepGoal,
    baseStepGoal,
    sportsStepCredit,
    dayTotals,
    dailyTargetKcal,
    todaysActivityKcal,
    sleep,
    profile,
    streaks,
  } = useApp();

  const items = useMemo(
    () =>
      getDailySuggestions({
        now,
        dayType,
        manualDayTypeId,
        todaysDay,
        todaysScheduledSport,
        currentSession,
        workoutHistory,
        sportsLog,
        steps,
        effectiveStepGoal,
        baseStepGoal,
        sportsStepCredit,
        dayTotals,
        dailyTargetKcal,
        todaysActivityKcal,
        sleep,
        profile,
        streaks,
      }),
    [
      now,
      dayType,
      manualDayTypeId,
      todaysDay,
      todaysScheduledSport,
      currentSession,
      workoutHistory,
      sportsLog,
      steps,
      effectiveStepGoal,
      baseStepGoal,
      sportsStepCredit,
      dayTotals,
      dailyTargetKcal,
      todaysActivityKcal,
      sleep,
      profile,
      streaks,
    ],
  );

  if (items.length === 0) return null;

  return (
    <Card>
      <CardHeader
        kicker="Coach · Real-time"
        title="What to do right now"
        subtitle="Combines today's workout, sports, steps, diet, sleep and schedule into a single priority list. Refreshes as you log."
      />
      <ul className="space-y-2">
        {items.map((s) => (
          <li
            key={s.id}
            className="border-2 border-ink p-3 flex items-start gap-3"
            style={{ borderLeftColor: s.color, borderLeftWidth: 6 }}
          >
            <span className="text-2xl shrink-0">{s.icon}</span>
            <div className="flex-1 min-w-0">
              <div className="font-display text-base font-bold break-words">
                {s.title}
              </div>
              <div className="font-mono text-[10px] uppercase tracking-[0.2em] text-ink-muted mt-1">
                {s.detail}
              </div>
            </div>
            {s.action && (
              <Button
                variant="outline"
                size="sm"
                className="shrink-0 self-center"
                onClick={() => {
                  // Use the global hash navigation — keeps the existing
                  // legacy-id behavior so "activity/sports" / "diet" etc.
                  // both resolve.
                  if (typeof window !== "undefined") {
                    window.location.hash = s.action.tab;
                  }
                }}
              >
                {s.action.label}
              </Button>
            )}
          </li>
        ))}
      </ul>
    </Card>
  );
}

// ============================================================================
// CoachPeriodisationCard — auto-generated variation suggestions for today's
// program day, based on the user's recent set history. Three kinds of
// nudges (variation swap when stalling, +1 set when progressing within
// the 60-min budget, +load when over budget). Hides itself when there
// are no suggestions.
// ============================================================================

function CoachPeriodisationCard({ day, history }) {
  const items = useMemo(
    () => suggestionsForDay(day, history || [], { budgetMinutes: 60, max: 4 }),
    [day, history],
  );
  if (!day || items.length === 0) return null;

  return (
    <Card>
      <CardHeader
        kicker="Coach · Periodisation"
        title="Variation & progression"
        subtitle="Auto-generated from your last few sessions on each lift. Stays inside the 60-minute session budget."
      />
      <ul className="space-y-3">
        {items.map((it, i) => {
          if (it.kind === "variation") {
            return (
              <li
                key={i}
                className="border-2 border-ink p-3"
                style={{ borderLeftColor: "#d97a2c", borderLeftWidth: 6 }}
              >
                <div className="flex items-baseline gap-2 flex-wrap">
                  <span className="font-mono text-[10px] uppercase tracking-[0.25em] text-ink-muted">
                    Stall · try a variation
                  </span>
                </div>
                <div className="font-display text-lg font-bold mt-1 break-words">
                  {it.exercise.name}{" "}
                  <span className="text-ink-muted text-base font-normal italic">
                    → {it.options.slice(0, 2).join(" or ")}
                  </span>
                </div>
                <div className="font-mono text-[10px] uppercase tracking-[0.25em] text-ink-muted mt-1">
                  {it.reason}. Swap manually in <strong>Programs → Edit</strong>.
                </div>
              </li>
            );
          }
          if (it.kind === "bump-set") {
            return (
              <li
                key={i}
                className="border-2 border-ink p-3"
                style={{ borderLeftColor: "#4a6b3e", borderLeftWidth: 6 }}
              >
                <div className="flex items-baseline gap-2 flex-wrap">
                  <span className="font-mono text-[10px] uppercase tracking-[0.25em] text-ink-muted">
                    Progressing · bump volume
                  </span>
                </div>
                <div className="font-display text-lg font-bold mt-1 break-words">
                  {it.exercise.name}{" "}
                  <span className="text-ink-muted text-base font-normal italic">
                    → {it.exercise.sets} → {it.toSets} sets
                  </span>
                </div>
                <div className="font-mono text-[10px] uppercase tracking-[0.25em] text-ink-muted mt-1">
                  Fits inside ~{it.projectedMinutes} min. Bump it in <strong>Programs → Edit</strong>.
                </div>
              </li>
            );
          }
          // bump-weight
          return (
            <li
              key={i}
              className="border-2 border-ink p-3"
              style={{ borderLeftColor: "#3b6aa3", borderLeftWidth: 6 }}
            >
              <div className="flex items-baseline gap-2 flex-wrap">
                <span className="font-mono text-[10px] uppercase tracking-[0.25em] text-ink-muted">
                  Progressing · bump load
                </span>
              </div>
              <div className="font-display text-lg font-bold mt-1 break-words">
                {it.exercise.name}{" "}
                <span className="text-ink-muted text-base font-normal italic">
                  → +2.5 kg next session
                </span>
              </div>
              <div className="font-mono text-[10px] uppercase tracking-[0.25em] text-ink-muted mt-1">
                {it.reason}. Session is already at 60-min budget — push the weight, keep the set count.
              </div>
            </li>
          );
        })}
      </ul>
    </Card>
  );
}
