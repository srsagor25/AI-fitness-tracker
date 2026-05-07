import { useMemo, useState } from "react";
import { useApp } from "../store/AppContext.jsx";
import { Card, CardHeader, Stat } from "../components/ui/Card.jsx";
import { Button } from "../components/ui/Button.jsx";
import { Chip } from "../components/ui/Field.jsx";
import { formatMMSS, todayKey } from "../lib/time.js";
import { estimateWorkoutKcal } from "../lib/calories.js";
import { calcMeal } from "../store/profiles.js";
import { load } from "../store/storage.js";
import { Trash2, Flame, Dumbbell, Utensils } from "lucide-react";

const MEAL_SLOTS = ["lunch", "shake", "dinner", "snack"];

export function History() {
  const { history, clearHistory, profile, customFoods } = useApp();
  const [view, setView] = useState("workouts");

  return (
    <>
      <Card>
        <CardHeader
          kicker="Global Log"
          title="History"
          subtitle="Workouts and meals — all in one place."
        />
        <div className="flex gap-2">
          <button
            onClick={() => setView("workouts")}
            className={`flex-1 px-3 py-2 border-2 font-mono text-[10px] uppercase tracking-[0.2em] inline-flex items-center justify-center gap-2 ${
              view === "workouts" ? "bg-ink text-paper border-ink" : "border-ink hover:bg-ink hover:text-paper"
            }`}
          >
            <Dumbbell size={12} /> Workouts ({history.length})
          </button>
          <button
            onClick={() => setView("meals")}
            className={`flex-1 px-3 py-2 border-2 font-mono text-[10px] uppercase tracking-[0.2em] inline-flex items-center justify-center gap-2 ${
              view === "meals" ? "bg-ink text-paper border-ink" : "border-ink hover:bg-ink hover:text-paper"
            }`}
          >
            <Utensils size={12} /> Meals
          </button>
        </div>
      </Card>

      {view === "workouts" ? (
        <WorkoutHistory
          history={history}
          clearHistory={clearHistory}
          profile={profile}
        />
      ) : (
        <MealHistory profile={profile} customFoods={customFoods} />
      )}
    </>
  );
}

function WorkoutHistory({ history, clearHistory, profile }) {
  const totalSessions = history.length;
  const totalDuration = history.reduce((s, h) => s + (h.durationSec || 0), 0);
  const totalVolume = history.reduce((s, h) => s + (h.totalVolume || 0), 0);
  const totalKcal = history.reduce(
    (s, h) =>
      s +
      estimateWorkoutKcal({
        durationSec: h.durationSec,
        weightKg: profile.stats?.weightKg || profile.weightKg || 70,
        totalVolume: h.totalVolume,
      }),
    0,
  );

  return (
    <Card>
      <CardHeader
        kicker="Training Log"
        title={totalSessions === 0 ? "No sessions yet" : `${totalSessions} sessions`}
        subtitle={
          totalSessions === 0
            ? "Finish a workout to see it here."
            : "Tap a session to expand."
        }
        right={
          history.length > 0 && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                if (confirm("Clear all training history? This cannot be undone."))
                  clearHistory();
              }}
            >
              <Trash2 size={12} /> Clear
            </Button>
          )
        }
      />

      {totalSessions > 0 && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
          <Stat label="Sessions" value={totalSessions} />
          <Stat label="Time" value={Math.round(totalDuration / 60)} suffix="min" accent="#3b6aa3" />
          <Stat label="Volume" value={Math.round(totalVolume).toLocaleString()} suffix="kg" accent="#6b5a3e" />
          <Stat label="Kcal" value={Math.round(totalKcal).toLocaleString()} suffix="kcal" accent="#c44827" />
        </div>
      )}

      <ul className="space-y-3">
        {history.map((h) => {
          const kcal = estimateWorkoutKcal({
            durationSec: h.durationSec,
            weightKg: profile.stats?.weightKg || profile.weightKg || 70,
            totalVolume: h.totalVolume,
          });
          return (
            <li key={h.id} className="border-2 border-ink p-3">
              <div className="flex items-baseline justify-between gap-2 flex-wrap">
                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <Chip color="#3b6aa3">{h.programName}</Chip>
                    <Chip color="#c44827">{h.dayName}</Chip>
                  </div>
                  <h3 className="font-display text-xl font-bold mt-1">
                    {new Date(h.date).toLocaleDateString("en-US", {
                      weekday: "long",
                      month: "short",
                      day: "numeric",
                    })}
                  </h3>
                  <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-ink-muted">
                    {new Date(h.date).toLocaleTimeString("en-US", {
                      hour: "numeric",
                      minute: "2-digit",
                    })}
                  </p>
                </div>
                <div className="text-right">
                  <div className="font-display text-2xl font-black tabular-nums">
                    {formatMMSS(h.durationSec)}
                  </div>
                  <div className="font-mono text-[10px] uppercase tracking-[0.2em] text-ink-muted">
                    {h.totalSets} sets · {h.totalReps} reps
                  </div>
                  <div className="font-mono text-[10px] uppercase tracking-[0.25em] text-accent mt-1 flex items-center justify-end gap-1">
                    <Flame size={10} />
                    {kcal} kcal · {h.totalVolume.toLocaleString()} kg
                  </div>
                </div>
              </div>
              {h.exercises.some((ex) => ex.sets.length > 0) && (
                <div className="mt-3 pt-3 border-t border-ink/30">
                  <div className="grid gap-1">
                    {h.exercises
                      .filter((ex) => ex.sets.length > 0)
                      .map((ex) => {
                        const top = ex.sets.reduce(
                          (best, s) =>
                            (s.weight || 0) > (best.weight || 0) ? s : best,
                          ex.sets[0],
                        );
                        const totalReps = ex.sets.reduce(
                          (s, x) => s + (x.reps || 0),
                          0,
                        );
                        return (
                          <div
                            key={ex.id}
                            className="flex justify-between font-body text-sm"
                          >
                            <span>{ex.name}</span>
                            <span className="text-ink-muted">
                              {ex.sets.length} sets · {totalReps} reps · top{" "}
                              {top.weight || 0}kg
                            </span>
                          </div>
                        );
                      })}
                  </div>
                </div>
              )}
            </li>
          );
        })}
        {totalSessions === 0 && (
          <p className="font-body italic text-ink-muted">No workouts yet.</p>
        )}
      </ul>
    </Card>
  );
}

function MealHistory({ profile, customFoods }) {
  const [windowDays, setWindowDays] = useState(14);

  const days = useMemo(() => {
    const out = [];
    for (let i = 0; i < windowDays; i++) {
      const d = new Date();
      d.setHours(0, 0, 0, 0);
      d.setDate(d.getDate() - i);
      const k = todayKey(d);
      const meals = load(`meals:${k}`, null);
      const cheats = load(`cheats:${k}`, null);
      if (!meals && !cheats) continue;
      const slotItems = {};
      let kcal = 0;
      let protein = 0;
      let mealCount = 0;
      for (const slot of MEAL_SLOTS) {
        slotItems[slot] = (meals?.[slot] || []).map((m) => {
          const t = calcMeal(m.items, customFoods);
          kcal += t.kcal;
          protein += t.protein;
          mealCount++;
          return { ...m, totals: t };
        });
      }
      const cheatItems = (cheats || []).map((c) => {
        const t = calcMeal(c.items, customFoods);
        kcal += t.kcal;
        protein += t.protein;
        mealCount++;
        return { ...c, totals: t };
      });
      out.push({
        date: d,
        key: k,
        slots: slotItems,
        cheats: cheatItems,
        totals: { kcal, protein, mealCount },
      });
    }
    return out;
  }, [windowDays, customFoods]);

  const grandKcal = days.reduce((s, d) => s + d.totals.kcal, 0);
  const grandMeals = days.reduce((s, d) => s + d.totals.mealCount, 0);

  return (
    <Card>
      <CardHeader
        kicker="Meal Log"
        title={`${days.length} day${days.length === 1 ? "" : "s"}`}
        subtitle={`${grandMeals} meals · ${Math.round(grandKcal).toLocaleString()} kcal in the last ${windowDays} days`}
        right={
          <div className="flex gap-2">
            {[7, 14, 30, 60].map((d) => (
              <button
                key={d}
                onClick={() => setWindowDays(d)}
                className={`px-3 py-1.5 border-2 font-mono text-[10px] uppercase tracking-[0.2em] ${
                  windowDays === d ? "bg-ink text-paper border-ink" : "border-ink hover:bg-ink hover:text-paper"
                }`}
              >
                {d}d
              </button>
            ))}
          </div>
        }
      />

      {days.length === 0 ? (
        <p className="font-body italic text-ink-muted">
          No meals logged in the last {windowDays} days.
        </p>
      ) : (
        <ul className="space-y-3">
          {days.map((d) => {
            const isToday = d.key === todayKey();
            return (
              <li
                key={d.key}
                className={`border-2 p-3 ${isToday ? "border-accent" : "border-ink"}`}
              >
                <div className="flex items-baseline justify-between gap-2 flex-wrap mb-2">
                  <div>
                    {isToday && <Chip color="#c44827">Today</Chip>}
                    <h3 className="font-display text-xl font-bold mt-1">
                      {d.date.toLocaleDateString("en-US", {
                        weekday: "long",
                        month: "short",
                        day: "numeric",
                      })}
                    </h3>
                  </div>
                  <div className="text-right">
                    <div className="font-display text-2xl font-black tabular-nums">
                      {Math.round(d.totals.kcal)}
                      <span className="font-mono text-[10px] uppercase tracking-widest text-ink-muted ml-1">
                        kcal
                      </span>
                    </div>
                    <div className="font-mono text-[10px] uppercase tracking-[0.2em] text-ink-muted">
                      {Math.round(d.totals.protein)}g protein · {d.totals.mealCount} meals
                    </div>
                  </div>
                </div>
                <div className="grid gap-1 mt-2">
                  {MEAL_SLOTS.map((slot) =>
                    d.slots[slot].map((m, i) => (
                      <div
                        key={`${slot}-${i}`}
                        className="flex justify-between font-body text-sm gap-2"
                      >
                        <span className="flex items-center gap-2 min-w-0">
                          <span className="text-base">{m.icon || "🍽️"}</span>
                          <span className="font-mono text-[9px] uppercase tracking-[0.2em] text-ink-muted shrink-0">
                            {slot}
                          </span>
                          <span className="truncate">{m.name}</span>
                        </span>
                        <span className="text-ink-muted shrink-0">
                          {Math.round(m.totals.kcal)} kcal · {Math.round(m.totals.protein)}g
                        </span>
                      </div>
                    )),
                  )}
                  {d.cheats.map((c, i) => (
                    <div
                      key={`cheat-${i}`}
                      className="flex justify-between font-body text-sm gap-2"
                    >
                      <span className="flex items-center gap-2 min-w-0">
                        <span className="text-base">{c.icon || "🍔"}</span>
                        <span className="font-mono text-[9px] uppercase tracking-[0.2em] text-accent shrink-0">
                          cheat
                        </span>
                        <span className="truncate">{c.name}</span>
                      </span>
                      <span className="text-accent shrink-0">
                        {Math.round(c.totals.kcal)} kcal · {Math.round(c.totals.protein)}g
                      </span>
                    </div>
                  ))}
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </Card>
  );
}
