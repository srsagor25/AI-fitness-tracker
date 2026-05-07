import { useMemo, useState } from "react";
import { useApp } from "../store/AppContext.jsx";
import { Card, CardHeader, Stat } from "../components/ui/Card.jsx";
import { Button } from "../components/ui/Button.jsx";
import { Chip, ProgressBar } from "../components/ui/Field.jsx";
import { formatMMSS, todayKey } from "../lib/time.js";
import { estimateWorkoutKcal } from "../lib/calories.js";
import { calcMeal } from "../store/profiles.js";
import { load, listKeys } from "../store/storage.js";
import {
  Trash2,
  Flame,
  Dumbbell,
  Utensils,
  ShoppingBag,
  User,
  Plus,
  Minus,
  RotateCcw,
  Pill,
  TrendingUp,
  TrendingDown,
} from "lucide-react";

const MEAL_SLOTS = ["lunch", "shake", "dinner", "snack"];

const VIEWS = [
  { id: "training", label: "Training", icon: Dumbbell },
  { id: "diet", label: "Diet", icon: Utensils },
  { id: "pantry", label: "Pantry", icon: ShoppingBag },
  { id: "you", label: "You", icon: User },
];

export function History() {
  const {
    history,
    clearHistory,
    profile,
    customFoods,
    grocery,
    groceryActivity,
    clearGroceryActivity,
    weightLog,
    meds,
  } = useApp();
  const [view, setView] = useState("training");

  return (
    <>
      <Card>
        <CardHeader
          kicker="Global Log"
          title="History"
          subtitle="Per-section history and summary."
        />
        <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
          {VIEWS.map((v) => {
            const Icon = v.icon;
            return (
              <button
                key={v.id}
                onClick={() => setView(v.id)}
                className={`px-3 py-2 border-2 font-mono text-[10px] uppercase tracking-[0.2em] inline-flex items-center justify-center gap-2 ${
                  view === v.id ? "bg-ink text-paper border-ink" : "border-ink hover:bg-ink hover:text-paper"
                }`}
              >
                <Icon size={12} /> {v.label}
              </button>
            );
          })}
        </div>
      </Card>

      {view === "training" && (
        <WorkoutHistory history={history} clearHistory={clearHistory} profile={profile} />
      )}
      {view === "diet" && <MealHistory profile={profile} customFoods={customFoods} />}
      {view === "pantry" && (
        <PantryHistory
          grocery={grocery}
          activity={groceryActivity}
          onClearActivity={clearGroceryActivity}
        />
      )}
      {view === "you" && (
        <YouHistory profile={profile} weightLog={weightLog} meds={meds} />
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

function PantryHistory({ grocery, activity, onClearActivity }) {
  const [windowDays, setWindowDays] = useState(14);

  const cutoff = Date.now() - windowDays * 86400000;
  const recent = useMemo(
    () => activity.filter((e) => e.ts >= cutoff),
    [activity, cutoff],
  );

  // Per-item summary: total consumed and total restocked in window
  const summary = useMemo(() => {
    const out = {};
    for (const e of recent) {
      if (e.key === "_all") continue;
      if (!out[e.key]) {
        out[e.key] = { name: e.name, unit: e.unit, consumed: 0, restocked: 0, manual: 0 };
      }
      if (e.reason === "consumed" && e.delta < 0) out[e.key].consumed += -e.delta;
      else if (e.reason === "restock") out[e.key].restocked += e.delta;
      else if (e.reason === "manual") out[e.key].manual += e.delta;
    }
    return out;
  }, [recent]);

  const lowStock = grocery.filter((it) => it.qty <= it.lowThreshold);
  const totalConsumed = Object.values(summary).reduce((s, v) => s + v.consumed, 0);
  const totalRestocked = Object.values(summary).reduce((s, v) => s + v.restocked, 0);

  return (
    <>
      <Card>
        <CardHeader
          kicker="Pantry Summary"
          title={`Last ${windowDays} days`}
          subtitle={`${recent.length} activity event${recent.length === 1 ? "" : "s"}`}
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
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <Stat label="Items" value={grocery.length} />
          <Stat label="Low stock" value={lowStock.length} accent={lowStock.length > 0 ? "#c44827" : "#4a6b3e"} />
          <Stat label="Consumed events" value={Math.round(totalConsumed)} accent="#c44827" />
          <Stat label="Restocked events" value={Math.round(totalRestocked)} accent="#4a6b3e" />
        </div>
      </Card>

      {Object.keys(summary).length > 0 && (
        <Card>
          <CardHeader kicker="Per Item" title="Usage Summary" />
          <ul className="divide-y divide-ink/30 border-y border-ink/30">
            {Object.entries(summary)
              .sort((a, b) => b[1].consumed - a[1].consumed)
              .map(([k, v]) => {
                const inv = grocery.find((it) => it.key === k);
                return (
                  <li key={k} className="py-2 flex items-center gap-3 flex-wrap">
                    <span className="text-2xl">{inv?.icon || "🛒"}</span>
                    <div className="flex-1 min-w-0">
                      <div className="font-body text-base">{v.name}</div>
                      <div className="font-mono text-[10px] uppercase tracking-[0.2em] text-ink-muted">
                        {inv ? `Have ${inv.qty}${inv.unit} · threshold ${inv.lowThreshold}${inv.unit}` : "Removed"}
                      </div>
                    </div>
                    <div className="flex items-center gap-3 text-right">
                      {v.consumed > 0 && (
                        <span className="font-mono text-[10px] uppercase tracking-[0.2em] text-accent">
                          −{Math.round(v.consumed)}{v.unit}
                        </span>
                      )}
                      {v.restocked > 0 && (
                        <span className="font-mono text-[10px] uppercase tracking-[0.2em] text-good">
                          +{Math.round(v.restocked)}{v.unit}
                        </span>
                      )}
                      {v.manual !== 0 && (
                        <span className="font-mono text-[10px] uppercase tracking-[0.2em] text-ink-muted">
                          {v.manual > 0 ? "+" : ""}
                          {Math.round(v.manual)}{v.unit} manual
                        </span>
                      )}
                    </div>
                  </li>
                );
              })}
          </ul>
        </Card>
      )}

      <Card>
        <CardHeader
          kicker="Activity Log"
          title="Recent Changes"
          subtitle={`${recent.length} events in the last ${windowDays} days`}
          right={
            activity.length > 0 && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  if (confirm("Clear pantry activity log?")) onClearActivity();
                }}
              >
                <Trash2 size={12} /> Clear
              </Button>
            )
          }
        />
        {recent.length === 0 ? (
          <p className="font-body italic text-ink-muted">
            No activity in this window. Log meals or restock items to start tracking.
          </p>
        ) : (
          <ul className="divide-y divide-ink/30 border-y border-ink/30">
            {recent.slice(0, 100).map((e) => {
              const Icon =
                e.reason === "consumed"
                  ? Minus
                  : e.reason === "restock"
                    ? Plus
                    : e.reason === "reset"
                      ? RotateCcw
                      : Plus;
              const color =
                e.reason === "consumed"
                  ? "#c44827"
                  : e.reason === "restock"
                    ? "#4a6b3e"
                    : "#6b5a3e";
              return (
                <li key={e.id} className="py-2 flex items-center gap-3">
                  <Icon size={14} style={{ color }} />
                  <div className="flex-1 min-w-0">
                    <div className="font-body text-base">
                      {e.name}
                      {e.source && (
                        <span className="font-mono text-[10px] uppercase tracking-[0.2em] text-ink-muted ml-2">
                          ← {e.source}
                        </span>
                      )}
                    </div>
                    <div className="font-mono text-[10px] uppercase tracking-[0.2em] text-ink-muted">
                      {new Date(e.ts).toLocaleString("en-US", {
                        month: "short",
                        day: "numeric",
                        hour: "numeric",
                        minute: "2-digit",
                      })}{" "}
                      · {e.reason}
                    </div>
                  </div>
                  <span
                    className="font-mono text-sm font-bold tabular-nums"
                    style={{ color }}
                  >
                    {e.delta > 0 ? "+" : ""}
                    {Math.round(e.delta)}{e.unit}
                  </span>
                </li>
              );
            })}
          </ul>
        )}
      </Card>
    </>
  );
}

function YouHistory({ profile, weightLog, meds }) {
  const [windowDays, setWindowDays] = useState(30);
  const cutoff = Date.now() - windowDays * 86400000;

  const dosesInWindow = useMemo(() => {
    const keys = listKeys("meds:taken:");
    const out = [];
    for (const k of keys) {
      const day = k.replace("meds:taken:", "");
      const entries = load(k, []);
      for (const e of entries) {
        if (e.takenAt >= cutoff) out.push({ ...e, day });
      }
    }
    return out.sort((a, b) => b.takenAt - a.takenAt);
  }, [windowDays, meds]);

  const sortedWeights = useMemo(
    () => [...weightLog].sort((a, b) => b.date - a.date),
    [weightLog],
  );
  const weightsInWindow = sortedWeights.filter((e) => e.date >= cutoff);

  const sessionsInWindow = useMemo(() => {
    const k = "workout:history";
    const all = load(k, []);
    return all.filter((s) => s.date >= cutoff).length;
  }, [windowDays]);

  // Doses by med
  const dosesByMed = useMemo(() => {
    const out = {};
    for (const d of dosesInWindow) {
      if (!out[d.medId]) out[d.medId] = { name: d.medName, type: d.type, count: 0, qty: 0, unit: d.unit };
      out[d.medId].count++;
      out[d.medId].qty += Number(d.quantity) || 0;
    }
    return out;
  }, [dosesInWindow]);

  const latestWeight = sortedWeights[0];
  const earliestInWindow = weightsInWindow[weightsInWindow.length - 1];
  const weightChange =
    latestWeight && earliestInWindow
      ? latestWeight.weightKg - earliestInWindow.weightKg
      : 0;

  return (
    <>
      <Card>
        <CardHeader
          kicker="You Summary"
          title={`Last ${windowDays} days`}
          subtitle={`${sortedWeights.length} weigh-ins · ${dosesInWindow.length} dose${dosesInWindow.length === 1 ? "" : "s"}`}
          right={
            <div className="flex gap-2">
              {[7, 30, 90, 180].map((d) => (
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
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <Stat label="Weight" value={latestWeight?.weightKg || "—"} suffix="kg" />
          <Stat
            label={`Δ in ${windowDays}d`}
            value={
              weightsInWindow.length >= 2
                ? `${weightChange >= 0 ? "+" : ""}${weightChange.toFixed(1)}`
                : "—"
            }
            suffix="kg"
            accent={weightChange > 0 ? "#c44827" : weightChange < 0 ? "#4a6b3e" : "#6b5a3e"}
          />
          <Stat label="Doses logged" value={dosesInWindow.length} accent="#3b6aa3" />
          <Stat label="Workouts" value={sessionsInWindow} accent="#4a6b3e" />
        </div>
      </Card>

      <Card>
        <CardHeader kicker="Weight" title="Weigh-ins" />
        {sortedWeights.length === 0 ? (
          <p className="font-body italic text-ink-muted">No weight entries yet — log on the Body tab.</p>
        ) : (
          <ul className="divide-y divide-ink/30 border-y border-ink/30">
            {sortedWeights.slice(0, 20).map((e, i, arr) => {
              const next = arr[i + 1];
              const delta = next ? e.weightKg - next.weightKg : 0;
              return (
                <li key={e.id} className="py-2 flex items-center gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="font-display text-lg font-bold flex items-center gap-2">
                      {e.weightKg} kg
                      {next && (
                        <span
                          className="font-mono text-[10px] uppercase tracking-[0.2em] flex items-center gap-1"
                          style={{
                            color: delta > 0 ? "#c44827" : delta < 0 ? "#4a6b3e" : "#6b5a3e",
                          }}
                        >
                          {delta > 0 ? <TrendingUp size={10} /> : delta < 0 ? <TrendingDown size={10} /> : null}
                          {delta > 0 ? "+" : ""}
                          {delta.toFixed(1)}
                        </span>
                      )}
                    </div>
                    <div className="font-mono text-[10px] uppercase tracking-[0.2em] text-ink-muted">
                      {new Date(e.date).toLocaleString("en-US", {
                        month: "short",
                        day: "numeric",
                        year: "numeric",
                      })}
                      {e.note && ` · ${e.note}`}
                    </div>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </Card>

      {Object.keys(dosesByMed).length > 0 && (
        <Card>
          <CardHeader kicker="Medications" title="Adherence by Med" />
          <ul className="divide-y divide-ink/30 border-y border-ink/30">
            {Object.values(dosesByMed)
              .sort((a, b) => b.count - a.count)
              .map((m, i) => (
                <li key={i} className="py-2 flex items-center gap-3">
                  <Pill size={16} className="text-accent" />
                  <div className="flex-1">
                    <div className="font-body text-base">{m.name}</div>
                    <div className="font-mono text-[10px] uppercase tracking-[0.2em] text-ink-muted">
                      {m.type}
                    </div>
                  </div>
                  <span className="font-mono text-[10px] uppercase tracking-[0.2em]">
                    {m.count} dose{m.count === 1 ? "" : "s"} · {m.qty.toFixed(1)} {m.unit} total
                  </span>
                </li>
              ))}
          </ul>
        </Card>
      )}

      <Card>
        <CardHeader kicker="Doses" title="Recent Dose Log" />
        {dosesInWindow.length === 0 ? (
          <p className="font-body italic text-ink-muted">No doses logged in this window.</p>
        ) : (
          <ul className="divide-y divide-ink/30 border-y border-ink/30">
            {dosesInWindow.slice(0, 30).map((d) => (
              <li key={d.id} className="py-2 flex items-center gap-3">
                <Pill size={14} />
                <div className="flex-1 min-w-0">
                  <div className="font-body text-base">
                    {d.medName}
                    <span className="font-mono text-[10px] uppercase tracking-[0.2em] text-ink-muted ml-2">
                      {d.quantity} {d.unit}
                    </span>
                  </div>
                  <div className="font-mono text-[10px] uppercase tracking-[0.2em] text-ink-muted">
                    {new Date(d.takenAt).toLocaleString("en-US", {
                      month: "short",
                      day: "numeric",
                      hour: "numeric",
                      minute: "2-digit",
                    })}
                    {d.note && ` · ${d.note}`}
                  </div>
                </div>
              </li>
            ))}
          </ul>
        )}
      </Card>
    </>
  );
}
