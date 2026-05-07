import { useMemo } from "react";
import { useApp } from "../store/AppContext.jsx";
import { Card, CardHeader, Stat } from "../components/ui/Card.jsx";
import { Button } from "../components/ui/Button.jsx";
import { Chip, ProgressBar } from "../components/ui/Field.jsx";
import { bmr, tdee, dailyTarget, suggestedProtein } from "../lib/calories.js";
import {
  TrendingUp,
  TrendingDown,
  Target,
  Dumbbell,
  Utensils,
  Footprints,
  CheckCircle2,
  ArrowRight,
} from "lucide-react";

const GOAL_LABEL = {
  cut: "Cut · Fat loss",
  maintain: "Maintain",
  bulk: "Bulk · Surplus",
  muscle_build: "Muscle build · Hypertrophy",
};

// Per-goal weekly weight change targets (kg/week). Used to estimate ETA
// when the user has a target weight set.
const WEEKLY_RATE = {
  cut: -0.5,
  maintain: 0,
  bulk: 0.25,
  muscle_build: 0.3,
};

export function Physique({ setTab }) {
  const {
    profile,
    weightLog,
    bodyPhotos,
    activeProgram,
    history,
    dayType,
    dayTotals,
    dailyTargetKcal,
    todaysWorkoutKcal,
    steps,
  } = useApp();

  const goalKey = profile.goalKey || "maintain";
  const sortedLog = useMemo(
    () => [...weightLog].sort((a, b) => a.date - b.date),
    [weightLog],
  );
  const latest = sortedLog[sortedLog.length - 1];
  const earliest30 = useMemo(() => {
    const cutoff = Date.now() - 30 * 86400000;
    return sortedLog.find((e) => e.date >= cutoff);
  }, [sortedLog]);
  const weight30dDelta =
    latest?.weightKg && earliest30?.weightKg ? latest.weightKg - earliest30.weightKg : null;

  // Latest values per metric — fall back across the log if a metric wasn't logged in the latest entry.
  function latestValue(key) {
    for (let i = sortedLog.length - 1; i >= 0; i--) {
      const v = sortedLog[i][key];
      if (v != null) return { value: v, date: sortedLog[i].date };
    }
    return null;
  }
  const m = {
    weight: latestValue("weightKg"),
    neck: latestValue("neckCm"),
    chest: latestValue("chestCm"),
    pelvic: latestValue("pelvicCm"),
    bmr: latestValue("bmr"),
    bodyFat: latestValue("bodyFatPct"),
  };

  // Body weight metrics (estimated)
  const heightM = (profile.stats?.heightCm || 0) / 100;
  const currentWeight = m.weight?.value || profile.stats?.weightKg;
  const computedBmi = currentWeight && heightM ? currentWeight / (heightM * heightM) : null;
  const bmiBand = computedBmi
    ? computedBmi < 18.5
      ? "Underweight"
      : computedBmi < 25
        ? "Healthy"
        : computedBmi < 30
          ? "Overweight"
          : "Obese"
    : "—";

  // Goal targets
  const targetWeight = Number(profile.targetWeightKg) || null;
  const weeksToGoal =
    targetWeight && currentWeight
      ? (() => {
          const rate = WEEKLY_RATE[goalKey];
          if (!rate) return null;
          const diff = targetWeight - currentWeight;
          // If signs disagree (e.g. cutting but already below target), no ETA
          if ((rate > 0 && diff < 0) || (rate < 0 && diff > 0)) return null;
          if (Math.abs(diff) < 0.05) return 0;
          return Math.abs(diff / rate);
        })()
      : null;

  const calTarget = dailyTarget(profile);
  const proTarget = suggestedProtein(profile);

  // Today snapshot
  const sessionsToday = history.filter(
    (h) => new Date(h.date).toDateString() === new Date().toDateString(),
  ).length;
  const caloriesIn = Math.round(dayTotals.kcal);
  const caloriesBurned = Math.round(todaysWorkoutKcal);
  const caloriesNet = caloriesIn - caloriesBurned;

  const plan = buildPlan({ goalKey, profile, sessionsToday, steps, caloriesIn, calTarget });

  return (
    <>
      {/* Hero — current snapshot + goal */}
      <Card>
        <CardHeader
          kicker="Current Physique"
          title={profile.name}
          subtitle={profile.publicLabel}
          right={
            <Chip color="#c44827">
              <Target size={10} className="inline mr-1" /> Goal: {GOAL_LABEL[goalKey] || goalKey}
            </Chip>
          }
        />
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <Stat
            label="Weight"
            value={currentWeight ? Number(currentWeight).toFixed(1) : "—"}
            suffix="kg"
            accent="#c44827"
          />
          <Stat
            label="Height"
            value={profile.stats?.heightCm || "—"}
            suffix="cm"
            accent="#6b5a3e"
          />
          <Stat
            label="BMI"
            value={computedBmi ? computedBmi.toFixed(1) : "—"}
            suffix={bmiBand}
            accent="#3b6aa3"
          />
          <Stat
            label="BMR"
            value={m.bmr?.value || bmr(profile)}
            suffix="kcal"
            accent="#4a6b3e"
          />
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-3">
          <Stat label="Neck" value={m.neck?.value ?? "—"} suffix={m.neck ? "cm" : ""} />
          <Stat label="Chest" value={m.chest?.value ?? "—"} suffix={m.chest ? "cm" : ""} />
          <Stat label="Pelvic" value={m.pelvic?.value ?? "—"} suffix={m.pelvic ? "cm" : ""} />
          <Stat
            label="Body fat"
            value={m.bodyFat?.value ?? "—"}
            suffix={m.bodyFat ? "%" : ""}
          />
        </div>

        {weight30dDelta != null && (
          <div className="mt-4 border-2 border-ink p-3 flex items-center gap-3 flex-wrap bg-ink/5">
            <span className="font-mono text-[10px] uppercase tracking-[0.25em] text-ink-muted">
              Weight 30d
            </span>
            <span
              className="font-display text-2xl font-bold inline-flex items-center gap-1"
              style={{ color: weight30dDelta > 0 ? "#c44827" : weight30dDelta < 0 ? "#4a6b3e" : "#6b5a3e" }}
            >
              {weight30dDelta > 0 ? <TrendingUp size={16} /> : weight30dDelta < 0 ? <TrendingDown size={16} /> : null}
              {weight30dDelta > 0 ? "+" : ""}
              {weight30dDelta.toFixed(1)} kg
            </span>
            <Button variant="outline" size="sm" onClick={() => setTab("progress")}>
              Open Progress →
            </Button>
          </div>
        )}
      </Card>

      {/* Goal panel */}
      <Card>
        <CardHeader kicker="Goal" title={GOAL_LABEL[goalKey] || goalKey} />
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <div className="border-2 border-ink p-3">
            <div className="font-mono text-[10px] uppercase tracking-[0.25em] text-ink-muted">
              Daily calories
            </div>
            <div className="font-display text-3xl font-black mt-1">
              {calTarget}
              <span className="font-mono text-xs uppercase tracking-widest text-ink-muted ml-1">
                kcal
              </span>
            </div>
            <div className="font-mono text-[10px] uppercase tracking-[0.2em] text-ink-muted mt-1">
              TDEE {tdee(profile)} → goal "{goalKey}"
            </div>
          </div>
          <div className="border-2 border-ink p-3">
            <div className="font-mono text-[10px] uppercase tracking-[0.25em] text-ink-muted">
              Daily protein
            </div>
            <div className="font-display text-3xl font-black mt-1" style={{ color: "#c44827" }}>
              {proTarget}
              <span className="font-mono text-xs uppercase tracking-widest text-ink-muted ml-1">
                g
              </span>
            </div>
            <div className="font-mono text-[10px] uppercase tracking-[0.2em] text-ink-muted mt-1">
              Currently set: {profile.proteinTarget} g
            </div>
          </div>
          <div className="border-2 border-ink p-3">
            <div className="font-mono text-[10px] uppercase tracking-[0.25em] text-ink-muted">
              Target weight
            </div>
            {targetWeight ? (
              <>
                <div className="font-display text-3xl font-black mt-1">
                  {targetWeight}
                  <span className="font-mono text-xs uppercase tracking-widest text-ink-muted ml-1">
                    kg
                  </span>
                </div>
                <div className="font-mono text-[10px] uppercase tracking-[0.2em] text-ink-muted mt-1">
                  {currentWeight && (
                    <>
                      {currentWeight.toFixed(1)} → {targetWeight} kg ·{" "}
                      {weeksToGoal == null
                        ? "no ETA at maintain rate"
                        : weeksToGoal === 0
                          ? "at goal"
                          : `~${Math.ceil(weeksToGoal)} wk at ${WEEKLY_RATE[goalKey]} kg/wk`}
                    </>
                  )}
                </div>
                {targetWeight && currentWeight && (
                  <ProgressBar
                    value={Math.abs(currentWeight - sortedLog[0]?.weightKg || 0)}
                    max={Math.abs(targetWeight - (sortedLog[0]?.weightKg || currentWeight))}
                    color="#c44827"
                  />
                )}
              </>
            ) : (
              <>
                <div className="font-display text-2xl text-ink-muted mt-1">—</div>
                <div className="font-mono text-[10px] uppercase tracking-[0.2em] text-ink-muted mt-1">
                  Set on Profile tab to see ETA
                </div>
              </>
            )}
          </div>
        </div>
      </Card>

      {/* Today snapshot */}
      <Card>
        <CardHeader kicker="Today" title="Where you stand" />
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <Stat label="Eaten" value={caloriesIn} suffix="kcal" />
          <Stat label="Target" value={Math.round(dailyTargetKcal)} suffix="kcal" accent="#3b6aa3" />
          <Stat label="Burned" value={caloriesBurned} suffix="kcal" accent="#4a6b3e" />
          <Stat
            label="Net"
            value={caloriesNet >= 0 ? `+${caloriesNet}` : caloriesNet}
            suffix="kcal"
            accent={caloriesNet > 0 ? "#c44827" : "#4a6b3e"}
          />
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-3">
          <Stat label="Day type" value={dayType?.label || "—"} />
          <Stat label="Workouts today" value={sessionsToday} suffix="× sessions" />
          <Stat label="Steps" value={steps.toLocaleString()} accent="#6b5a3e" />
          <Stat label="Photos" value={bodyPhotos.length} accent="#3b6aa3" />
        </div>
      </Card>

      {/* What to do */}
      <Card>
        <CardHeader
          kicker="Action plan"
          title="What to do to reach your goal"
          subtitle={`Tailored to ${GOAL_LABEL[goalKey] || goalKey}.`}
        />
        <div className="space-y-3">
          {plan.map((step, i) => (
            <div key={i} className="border-2 border-ink p-3 flex items-start gap-3 flex-wrap">
              <div
                className="w-8 h-8 border-2 border-ink flex items-center justify-center font-display text-sm font-black shrink-0"
                style={{ backgroundColor: step.done ? "#4a6b3e" : "transparent", color: step.done ? "#f4ede0" : "#2a2419" }}
              >
                {step.done ? <CheckCircle2 size={14} /> : i + 1}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <h4 className="font-display text-lg font-bold">{step.title}</h4>
                  {step.tag && <Chip color={step.tagColor || "#6b5a3e"}>{step.tag}</Chip>}
                </div>
                <p className="font-body text-sm text-ink-muted mt-0.5">{step.body}</p>
                {step.action && step.targetTab && setTab && (
                  <Button
                    variant="outline"
                    size="sm"
                    className="mt-2"
                    onClick={() => setTab(step.targetTab)}
                  >
                    {step.action} <ArrowRight size={12} />
                  </Button>
                )}
              </div>
            </div>
          ))}
        </div>
      </Card>

      <Card>
        <CardHeader kicker="Active program" title={activeProgram?.name || "—"} subtitle={activeProgram?.subtitle} />
        <Button variant="outline" size="sm" onClick={() => setTab && setTab("programs")}>
          <Dumbbell size={12} /> Edit / switch program
        </Button>
      </Card>
    </>
  );
}

function buildPlan({ goalKey, profile, sessionsToday, steps, caloriesIn, calTarget }) {
  const eatingDelta = caloriesIn - calTarget;
  const stepGoal = profile.stepAdjust?.baseline || 10000;
  const stepsBehind = stepGoal - steps;

  if (goalKey === "cut") {
    return [
      {
        title: "Stay in a deficit",
        body: `Eat at ${calTarget} kcal/day (TDEE − 500). Today: ${caloriesIn} of ${calTarget}.`,
        tag: eatingDelta > 100 ? "Over" : eatingDelta < -300 ? "Way under" : "On track",
        tagColor: eatingDelta > 100 ? "#c44827" : "#4a6b3e",
        done: caloriesIn > 100 && Math.abs(eatingDelta) <= 100,
        action: "Open Diet",
        targetTab: "diet",
      },
      {
        title: "Hit protein every day",
        body: `~${suggestedProtein(profile)} g/day (≈2.2 g/kg) preserves muscle in deficit. Use shakes if you fall short.`,
        action: "Log a meal",
        targetTab: "diet",
      },
      {
        title: "Lift 3–4× per week",
        body: "Keep strength up; reduce volume slightly if recovery suffers. Don't add cardio just to burn — eat less first.",
        done: sessionsToday > 0,
        action: "Open Workout",
        targetTab: "workout",
      },
      {
        title: `Walk to ${stepGoal.toLocaleString()} steps`,
        body: stepsBehind > 0 ? `${stepsBehind.toLocaleString()} more today.` : "You're already there.",
        done: stepsBehind <= 0,
      },
      {
        title: "Weigh in 2–3× this week",
        body: "Track the trend, not daily noise. Use morning weigh-ins for consistency.",
        action: "Log Measurement",
        targetTab: "progress",
      },
    ];
  }

  if (goalKey === "muscle_build" || goalKey === "bulk") {
    const surplus = goalKey === "muscle_build" ? 400 : 300;
    return [
      {
        title: `Eat in a controlled surplus (+${surplus})`,
        body: `Aim for ${calTarget} kcal/day. Going way over creates more fat than muscle.`,
        tag: eatingDelta < -200 ? "Under" : eatingDelta > 300 ? "Way over" : "On track",
        tagColor: eatingDelta < -200 ? "#c44827" : "#4a6b3e",
        done: eatingDelta >= 0 && eatingDelta < 300,
        action: "Open Diet",
        targetTab: "diet",
      },
      {
        title: "Hit protein every day",
        body: `~${suggestedProtein(profile)} g/day (≈2.0 g/kg) — primary muscle-building input.`,
      },
      {
        title: "Train 4–6× per week with progressive overload",
        body: "PPL or Upper/Lower splits with 2× weekly frequency per muscle. Add reps or weight every session.",
        done: sessionsToday > 0,
        action: "Open Workout",
        targetTab: "workout",
      },
      {
        title: "Sleep ≥ 7h",
        body: "Recovery is when muscle is built. Track sleep separately or in your phone's health app.",
      },
      {
        title: "Photo + measurement weekly",
        body: "Visible progress in chest, arms, and pelvic measurements is a better gauge than scale alone.",
        action: "Log Measurement",
        targetTab: "progress",
      },
    ];
  }

  // maintain
  return [
    {
      title: "Eat near TDEE",
      body: `Aim for ${calTarget} kcal/day. Today: ${caloriesIn} of ${calTarget}.`,
      tag: Math.abs(eatingDelta) <= 150 ? "On track" : eatingDelta > 0 ? "Over" : "Under",
      tagColor: Math.abs(eatingDelta) <= 150 ? "#4a6b3e" : "#c44827",
      done: Math.abs(eatingDelta) <= 150 && caloriesIn > 100,
      action: "Open Diet",
      targetTab: "diet",
    },
    {
      title: "Train 3–5× per week",
      body: "Mix strength and conditioning. Pick what you'll actually keep doing.",
      done: sessionsToday > 0,
      action: "Open Workout",
      targetTab: "workout",
    },
    {
      title: `Walk ${stepGoal.toLocaleString()}+ daily`,
      body: stepsBehind > 0 ? `${stepsBehind.toLocaleString()} steps to baseline.` : "At or above baseline.",
      done: stepsBehind <= 0,
    },
    {
      title: "Weigh in weekly",
      body: "Catch drift early. Same day, same time, same conditions.",
      action: "Log Measurement",
      targetTab: "progress",
    },
  ];
}
