import { useMemo } from "react";
import { useApp } from "../store/AppContext.jsx";
import { Card, CardHeader, Stat } from "../components/ui/Card.jsx";
import { Chip, ProgressBar } from "../components/ui/Field.jsx";
import { calcMeal } from "../store/profiles.js";
// Note: Week reads past days directly from localStorage. We pass customFoods
// from context into calcMeal so user-edited macros apply retroactively.
import { load } from "../store/storage.js";
import { todayKey, DAYS_SHORT, fromKey } from "../lib/time.js";
import { estimateWorkoutKcal } from "../lib/calories.js";

function lastNDays(n) {
  const out = [];
  for (let i = n - 1; i >= 0; i--) {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    d.setDate(d.getDate() - i);
    out.push(d);
  }
  return out;
}

export function Week() {
  const { profile, history, customFoods } = useApp();
  const days = lastNDays(7);

  // Pull each day's data from storage
  const week = useMemo(() => {
    return days.map((d) => {
      const k = todayKey(d);
      const meals = load(`meals:${k}`, { lunch: [], shake: [], dinner: [], snack: [] });
      const cheats = load(`cheats:${k}`, []);
      const dayTypeId = load(`dayType:${k}`, profile.dayTypes[0]?.id || "rest");
      const steps = load(`steps:${k}`, 0);
      const dayType = profile.dayTypes.find((dt) => dt.id === dayTypeId) || profile.dayTypes[0];

      const allMeals = [...meals.lunch, ...meals.shake, ...meals.dinner, ...meals.snack, ...cheats];
      let kcal = 0;
      let protein = 0;
      for (const m of allMeals) {
        const t = calcMeal(m.items, customFoods);
        kcal += t.kcal;
        protein += t.protein;
      }

      const sessions = history.filter((h) => todayKey(new Date(h.date)) === k);
      const workoutKcal = sessions.reduce(
        (s, h) =>
          s +
          estimateWorkoutKcal({
            durationSec: h.durationSec,
            weightKg: profile.stats?.weightKg || 70,
            totalVolume: h.totalVolume,
          }),
        0,
      );

      return {
        date: d,
        key: k,
        dayType,
        target: dayType?.target || 2000,
        kcal,
        protein,
        cheatCount: cheats.length,
        workoutKcal,
        sessionCount: sessions.length,
        steps,
      };
    });
  }, [days, profile, history, customFoods]);

  const totals = useMemo(() => {
    const out = {
      kcal: 0,
      protein: 0,
      cheats: 0,
      sessions: 0,
      workoutKcal: 0,
      steps: 0,
      activeDays: 0,
      proteinGoalDays: 0,
    };
    for (const d of week) {
      out.kcal += d.kcal;
      out.protein += d.protein;
      out.cheats += d.cheatCount;
      out.sessions += d.sessionCount;
      out.workoutKcal += d.workoutKcal;
      out.steps += d.steps;
      if (d.kcal > 0) out.activeDays++;
      if (profile.proteinTarget && d.protein >= profile.proteinTarget) out.proteinGoalDays++;
    }
    return out;
  }, [week, profile.proteinTarget]);

  const avgKcal = totals.activeDays ? Math.round(totals.kcal / totals.activeDays) : 0;
  const avgProtein = totals.activeDays ? Math.round(totals.protein / totals.activeDays) : 0;

  return (
    <>
      <Card>
        <CardHeader
          kicker="Week"
          title="Last 7 Days"
          subtitle="Snapshot of your last week of eating, training and walking."
        />
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <Stat label="Avg kcal" value={avgKcal.toLocaleString()} accent="#3b6aa3" />
          <Stat label="Avg protein" value={avgProtein} suffix="g" accent="#c44827" />
          <Stat label="Cheats" value={totals.cheats} accent="#c44827" />
          <Stat label="Sessions" value={totals.sessions} accent="#4a6b3e" />
          <Stat label="Burned" value={Math.round(totals.workoutKcal).toLocaleString()} suffix="kcal" />
          <Stat label="Steps" value={totals.steps.toLocaleString()} accent="#6b5a3e" />
          <Stat label="Active days" value={`${totals.activeDays}/7`} />
          <Stat label="Hit protein" value={`${totals.proteinGoalDays}/7`} accent="#4a6b3e" />
        </div>
      </Card>

      <Card>
        <CardHeader kicker="Daily Breakdown" title="Per-day log" />
        <ul className="space-y-3">
          {week.map((d) => {
            const isToday = d.key === todayKey();
            const pct = d.target ? Math.min(100, (d.kcal / d.target) * 100) : 0;
            return (
              <li key={d.key} className={`border-2 p-3 ${isToday ? "border-accent" : "border-ink"}`}>
                <div className="flex items-baseline justify-between gap-2 flex-wrap mb-2">
                  <div>
                    <div className="flex items-center gap-2 flex-wrap">
                      {isToday && <Chip color="#c44827">Today</Chip>}
                      <Chip color={d.dayType?.color || "#6b5a3e"}>
                        {d.dayType?.icon} {d.dayType?.label || "—"}
                      </Chip>
                      {d.cheatCount > 0 && <Chip color="#c44827">{d.cheatCount} cheat</Chip>}
                      {d.sessionCount > 0 && (
                        <Chip color="#4a6b3e">{d.sessionCount} workout</Chip>
                      )}
                    </div>
                    <h3 className="font-display text-xl font-bold mt-1">
                      {DAYS_SHORT[d.date.getDay()]}{" "}
                      {d.date.toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                    </h3>
                  </div>
                  <div className="text-right">
                    <div className="font-display text-2xl font-black tabular-nums">
                      {Math.round(d.kcal)}
                      <span className="font-mono text-[10px] uppercase tracking-widest text-ink-muted ml-1">
                        / {d.target} kcal
                      </span>
                    </div>
                    <div className="font-mono text-[10px] uppercase tracking-[0.2em] text-ink-muted">
                      {Math.round(d.protein)}g protein · {d.steps.toLocaleString()} steps
                    </div>
                  </div>
                </div>
                <ProgressBar value={d.kcal} max={d.target} />
              </li>
            );
          })}
        </ul>
      </Card>
    </>
  );
}
