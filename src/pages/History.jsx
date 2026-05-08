import { useMemo, useState } from "react";
import { useApp } from "../store/AppContext.jsx";
import { Card, CardHeader, Stat } from "../components/ui/Card.jsx";
import { Button } from "../components/ui/Button.jsx";
import { Chip, ProgressBar } from "../components/ui/Field.jsx";
import { DateRangeFilter, filterRange, filterLabel } from "../components/ui/DateRangeFilter.jsx";
import { formatMMSS, todayKey } from "../lib/time.js";
import { estimateWorkoutKcal } from "../lib/calories.js";
import { calcMeal } from "../store/profiles.js";
import { stepsToKcal, kcalToKg } from "../lib/calories.js";
import { dailyTarget } from "../lib/calories.js";
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
  Footprints,
} from "lucide-react";

const MEAL_SLOTS = ["lunch", "shake", "dinner", "snack"];

const VIEWS = [
  { id: "training", label: "Training", icon: Dumbbell },
  { id: "sports",   label: "Sports",   icon: Flame },
  { id: "steps",    label: "Steps",    icon: Footprints },
  { id: "diet",     label: "Diet",     icon: Utensils },
  { id: "pantry",   label: "Pantry",   icon: ShoppingBag },
  { id: "you",      label: "You",      icon: User },
  { id: "meds",     label: "Meds",     icon: Pill },
  { id: "supps",    label: "Supps",    icon: Pill },
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
    sportsLog,
    sportsList,
    removeSportSession,
    clearSportsLog,
  } = useApp();
  const [view, setView] = useState("training");
  const [filter, setFilter] = useState({ mode: "preset", days: 30 });

  return (
    <>
      <Card>
        <CardHeader
          kicker="Global Log"
          title="History"
          subtitle={`Per-section history & summary · ${filterLabel(filter)}`}
        />
        {/* Tab pills */}
        <div className="grid grid-cols-3 md:grid-cols-4 lg:grid-cols-8 gap-2 mb-3">
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

        <DateRangeFilter filter={filter} setFilter={setFilter} />
      </Card>

      {view === "training" && (
        <WorkoutHistory
          history={history}
          clearHistory={clearHistory}
          profile={profile}
          filter={filter}
        />
      )}
      {view === "sports" && (
        <SportsHistory
          sportsLog={sportsLog}
          sportsList={sportsList}
          onRemove={removeSportSession}
          onClear={clearSportsLog}
          filter={filter}
        />
      )}
      {view === "steps" && <StepsHistory profile={profile} filter={filter} />}
      {view === "diet" && <MealHistory profile={profile} customFoods={customFoods} filter={filter} />}
      {view === "pantry" && (
        <PantryHistory
          grocery={grocery}
          activity={groceryActivity}
          onClearActivity={clearGroceryActivity}
          filter={filter}
        />
      )}
      {view === "you" && (
        <YouHistory profile={profile} weightLog={weightLog} meds={meds} filter={filter} />
      )}
      {view === "meds" && <PharmaHistory category="med" label="Meds" meds={meds} filter={filter} />}
      {view === "supps" && (
        <PharmaHistory category="supplement" label="Supplements" meds={meds} filter={filter} />
      )}
    </>
  );
}

function WorkoutHistory({ history, clearHistory, profile, filter }) {
  const range = filterRange(filter);
  const filtered = useMemo(
    () => history.filter((h) => h.date >= range.from && h.date <= range.to),
    [history, range.from, range.to],
  );
  const totalSessions = filtered.length;
  const totalDuration = filtered.reduce((s, h) => s + (h.durationSec || 0), 0);
  const totalVolume = filtered.reduce((s, h) => s + (h.totalVolume || 0), 0);
  const totalKcal = filtered.reduce(
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
        {filtered.map((h) => {
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

function MealHistory({ profile, customFoods, filter }) {
  const range = filterRange(filter);

  const days = useMemo(() => {
    const out = [];
    // Iterate calendar days from `to` back to `from`. Cap at 365 so all-time
    // doesn't try to scan the entire history of localStorage.
    const start = new Date(range.to);
    start.setHours(0, 0, 0, 0);
    const fromDay = new Date(range.from);
    fromDay.setHours(0, 0, 0, 0);
    const maxDays = 365;
    let day = 0;
    const cursor = new Date(start);
    while (cursor >= fromDay && day < maxDays) {
      const k = todayKey(cursor);
      const meals = load(`meals:${k}`, null);
      const cheats = load(`cheats:${k}`, null);
      if (meals || cheats) {
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
          date: new Date(cursor),
          key: k,
          slots: slotItems,
          cheats: cheatItems,
          totals: { kcal, protein, mealCount },
        });
      }
      cursor.setDate(cursor.getDate() - 1);
      day++;
    }
    return out;
  }, [range.from, range.to, customFoods]);

  const grandKcal = days.reduce((s, d) => s + d.totals.kcal, 0);
  const grandMeals = days.reduce((s, d) => s + d.totals.mealCount, 0);

  return (
    <Card>
      <CardHeader
        kicker="Meal Log"
        title={`${days.length} day${days.length === 1 ? "" : "s"} with food logged`}
        subtitle={`${grandMeals} meals · ${Math.round(grandKcal).toLocaleString()} kcal in window`}
      />

      {days.length === 0 ? (
        <p className="font-body italic text-ink-muted">
          No meals logged in this window.
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

function PantryHistory({ grocery, activity, onClearActivity, filter }) {
  const range = filterRange(filter);
  const recent = useMemo(
    () => activity.filter((e) => e.ts >= range.from && e.ts <= range.to),
    [activity, range.from, range.to],
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
          title={filterLabel(filter)}
          subtitle={`${recent.length} activity event${recent.length === 1 ? "" : "s"} in window`}
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
          subtitle={`${recent.length} events in window (${filterLabel(filter)})`}
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

function YouHistory({ profile, weightLog, meds, filter }) {
  const range = filterRange(filter);

  const dosesInWindow = useMemo(() => {
    const keys = listKeys("meds:taken:");
    const out = [];
    for (const k of keys) {
      const day = k.replace("meds:taken:", "");
      const entries = load(k, []);
      for (const e of entries) {
        if (e.takenAt >= range.from && e.takenAt <= range.to) out.push({ ...e, day });
      }
    }
    return out.sort((a, b) => b.takenAt - a.takenAt);
  }, [range.from, range.to, meds]);

  const sortedWeights = useMemo(
    () => [...weightLog].sort((a, b) => b.date - a.date),
    [weightLog],
  );
  const weightsInWindow = sortedWeights.filter(
    (e) => e.date >= range.from && e.date <= range.to,
  );

  const sessionsInWindow = useMemo(() => {
    const k = "workout:history";
    const all = load(k, []);
    return all.filter((s) => s.date >= range.from && s.date <= range.to).length;
  }, [range.from, range.to]);

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
          title={filterLabel(filter)}
          subtitle={`${sortedWeights.length} weigh-ins · ${dosesInWindow.length} dose${dosesInWindow.length === 1 ? "" : "s"} in window`}
        />
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <Stat label="Weight" value={latestWeight?.weightKg || "—"} suffix="kg" />
          <Stat
            label="Δ in window"
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

      {dosesInWindow.length > 0 && (
        <Card>
          <CardHeader
            kicker="See also"
            title="Detailed dose logs"
            subtitle="Per-med adherence and dose-by-dose lists live on the dedicated tabs."
          />
          <p className="font-body text-sm text-ink-muted">
            {dosesInWindow.filter((d) => (d.category || "med") === "med").length} medication
            dose{dosesInWindow.filter((d) => (d.category || "med") === "med").length === 1 ? "" : "s"}{" "}
            ·{" "}
            {dosesInWindow.filter((d) => (d.category || "med") === "supplement").length}{" "}
            supplement dose
            {dosesInWindow.filter((d) => (d.category || "med") === "supplement").length === 1 ? "" : "s"}{" "}
            in window. Switch to the <strong>Meds</strong> or <strong>Supps</strong>{" "}
            tabs above for adherence summaries and per-dose timestamps.
          </p>
        </Card>
      )}
    </>
  );
}

// ============================================================================
// PharmaHistory — single component, used by both Meds and Supps tabs via the
// `category` prop. Loads dose entries across all `meds:taken:*` localStorage
// keys, filters to the active category, and renders adherence + dose log.
// ============================================================================

function PharmaHistory({ category, label, meds, filter }) {
  const range = filterRange(filter);

  const dosesInWindow = useMemo(() => {
    const keys = listKeys("meds:taken:");
    const out = [];
    for (const k of keys) {
      const day = k.replace("meds:taken:", "");
      const entries = load(k, []);
      for (const e of entries) {
        if ((e.category || "med") !== category) continue;
        if (e.takenAt >= range.from && e.takenAt <= range.to) {
          out.push({ ...e, day });
        }
      }
    }
    return out.sort((a, b) => b.takenAt - a.takenAt);
  }, [range.from, range.to, category, meds]);

  // Aggregate per-med stats
  const dosesByMed = useMemo(() => {
    const out = {};
    for (const d of dosesInWindow) {
      if (!out[d.medId]) {
        out[d.medId] = {
          name: d.medName,
          type: d.type,
          count: 0,
          qty: 0,
          unit: d.unit,
          lastAt: 0,
        };
      }
      out[d.medId].count++;
      out[d.medId].qty += Number(d.quantity) || 0;
      if (d.takenAt > out[d.medId].lastAt) out[d.medId].lastAt = d.takenAt;
    }
    return out;
  }, [dosesInWindow]);

  // Active items in this category from the live meds list (for the Active row)
  const itemsInCategory = useMemo(
    () => meds.filter((m) => (m.category || "med") === category),
    [meds, category],
  );

  // Days with at least one dose
  const daysWithDose = useMemo(() => {
    const set = new Set();
    for (const d of dosesInWindow) set.add(d.day);
    return set.size;
  }, [dosesInWindow]);

  const totalDoses = dosesInWindow.length;

  return (
    <>
      <Card>
        <CardHeader
          kicker={`${label} log`}
          title={filterLabel(filter)}
          subtitle={`${totalDoses} dose${totalDoses === 1 ? "" : "s"} across ${daysWithDose} day${daysWithDose === 1 ? "" : "s"}${itemsInCategory.length > 0 ? ` · ${itemsInCategory.length} ${label.toLowerCase()} configured` : ""}`}
        />
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <Stat label="Doses" value={totalDoses} accent="#3b6aa3" />
          <Stat label="Days with a dose" value={daysWithDose} accent="#4a6b3e" />
          <Stat
            label="Unique items"
            value={Object.keys(dosesByMed).length}
            accent="#6b5a3e"
          />
          <Stat label="Configured" value={itemsInCategory.length} />
        </div>
      </Card>

      {Object.keys(dosesByMed).length > 0 && (
        <Card>
          <CardHeader
            kicker="Adherence"
            title={`Per ${label.toLowerCase().replace(/s$/, "")}`}
          />
          <ul className="divide-y divide-ink/30 border-y border-ink/30">
            {Object.values(dosesByMed)
              .sort((a, b) => b.count - a.count)
              .map((m, i) => (
                <li key={i} className="py-2 flex items-center gap-3">
                  <Pill size={16} className="text-accent" />
                  <div className="flex-1 min-w-0">
                    <div className="font-body text-base">{m.name}</div>
                    <div className="font-mono text-[10px] uppercase tracking-[0.2em] text-ink-muted">
                      {m.type}
                      {" · last "}
                      {new Date(m.lastAt).toLocaleDateString("en-US", {
                        month: "short",
                        day: "numeric",
                      })}
                    </div>
                  </div>
                  <span className="font-mono text-[10px] uppercase tracking-[0.2em] text-right">
                    {m.count} dose{m.count === 1 ? "" : "s"}
                    <br />
                    {m.qty.toFixed(1)} {m.unit}
                  </span>
                </li>
              ))}
          </ul>
        </Card>
      )}

      <Card>
        <CardHeader kicker="Recent" title={`${label} dose log`} />
        {dosesInWindow.length === 0 ? (
          <p className="font-body italic text-ink-muted">
            No {label.toLowerCase()} doses logged in this window.
          </p>
        ) : (
          <ul className="divide-y divide-ink/30 border-y border-ink/30 max-h-[28rem] overflow-y-auto">
            {dosesInWindow.slice(0, 100).map((d) => (
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
                      year: "numeric",
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

// ============================================================================
// SportsHistory — list of sports sessions (football, padel, etc.) within
// the global filter window. Stats: total sessions, minutes, kcal.
// ============================================================================

function SportsHistory({ sportsLog, sportsList, onRemove, onClear, filter }) {
  const range = filterRange(filter);
  const filtered = (sportsLog || []).filter((s) => {
    const t = new Date(s.date).getTime();
    return t >= range.from && t <= range.to;
  });

  const totalSessions = filtered.length;
  const totalMin = filtered.reduce((s, x) => s + (Number(x.durationMin) || 0), 0);
  const totalKcal = filtered.reduce((s, x) => s + (Number(x.kcal) || 0), 0);

  // Per-sport breakdown
  const bySport = useMemo(() => {
    const out = {};
    for (const s of filtered) {
      const k = s.sportId || s.sportName;
      if (!out[k]) out[k] = { name: s.sportName, icon: s.sportIcon, count: 0, min: 0, kcal: 0 };
      out[k].count++;
      out[k].min += Number(s.durationMin) || 0;
      out[k].kcal += Number(s.kcal) || 0;
    }
    return Object.values(out).sort((a, b) => b.count - a.count);
  }, [filtered]);

  return (
    <Card>
      <CardHeader
        kicker="Sports Log"
        title={totalSessions === 0 ? "No sports yet" : `${totalSessions} sessions`}
        subtitle={totalSessions === 0 ? "Log a session on Activity → Sports." : "Tap × to remove."}
        right={
          (sportsLog || []).length > 0 && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                if (confirm("Clear all sports history? This cannot be undone.")) onClear();
              }}
            >
              <Trash2 size={12} /> Clear
            </Button>
          )
        }
      />
      {totalSessions > 0 && (
        <>
          <div className="grid grid-cols-3 gap-3 mb-4">
            <Stat label="Sessions" value={totalSessions} />
            <Stat label="Minutes" value={Math.round(totalMin)} suffix="min" accent="#3b6aa3" />
            <Stat label="Kcal" value={Math.round(totalKcal).toLocaleString()} suffix="kcal" accent="#c44827" />
          </div>
          {bySport.length > 1 && (
            <div className="border-2 border-ink p-3 mb-4">
              <div className="font-mono text-[10px] uppercase tracking-[0.25em] text-ink-muted mb-2">
                By sport
              </div>
              <ul className="space-y-1">
                {bySport.map((b) => (
                  <li key={b.name} className="flex items-center justify-between gap-2 font-body text-sm">
                    <span>{b.icon} {b.name}</span>
                    <span className="font-mono text-[10px] uppercase tracking-[0.2em] text-ink-muted">
                      {b.count}× · {Math.round(b.min)}m · {Math.round(b.kcal).toLocaleString()} kcal
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </>
      )}
      <ul className="divide-y divide-ink/30 border-y border-ink/30">
        {filtered.map((s) => (
          <li key={s.id} className="py-2 flex items-center gap-3">
            <span className="text-2xl shrink-0">{s.sportIcon || "🏃"}</span>
            <div className="flex-1 min-w-0">
              <div className="font-display text-base font-bold">
                {s.sportName} <span className="font-mono text-xs text-ink-muted">· {s.intensity || "moderate"}</span>
              </div>
              <div className="font-mono text-[10px] uppercase tracking-[0.2em] text-ink-muted">
                {new Date(s.date).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                {" · "}
                {Math.round(s.durationMin)}m · {Math.round(s.kcal)} kcal
                {s.notes && ` · ${s.notes}`}
              </div>
            </div>
            <Button variant="ghost" size="sm" onClick={() => onRemove(s.id)}>
              <Trash2 size={12} />
            </Button>
          </li>
        ))}
      </ul>
    </Card>
  );
}

// ============================================================================
// StepsHistory — reads each day's steps:YYYY-MM-DD value within the filter
// window, aggregates totals + averages + goal-hit count.
// ============================================================================

function StepsHistory({ profile, filter }) {
  const range = filterRange(filter);
  const baseline = profile?.stepAdjust?.baseline || 10000;
  const weightKg = profile.stats?.weightKg || profile.weightKg || 70;

  const entries = useMemo(() => {
    const out = [];
    const cursor = new Date();
    cursor.setHours(0, 0, 0, 0);
    // Walk backwards day by day until before range.from. Cap at 2 years to
    // avoid unbounded loops if the user picks "all time" with sparse data.
    const cap = 730;
    for (let i = 0; i < cap; i++) {
      const t = cursor.getTime();
      if (t < range.from) break;
      if (t > range.to) {
        cursor.setDate(cursor.getDate() - 1);
        continue;
      }
      const k = todayKey(cursor);
      const v = Number(load(`steps:${k}`, 0)) || 0;
      out.push({ date: new Date(cursor), key: k, steps: v });
      cursor.setDate(cursor.getDate() - 1);
    }
    return out;
  }, [range.from, range.to]);

  const total = entries.reduce((s, e) => s + e.steps, 0);
  const nonZero = entries.filter((e) => e.steps > 0).length;
  const avg = nonZero > 0 ? Math.round(total / nonZero) : 0;
  const max = entries.reduce((m, e) => (e.steps > m ? e.steps : m), 0);
  const hit = entries.filter((e) => e.steps >= baseline).length;
  const totalKcal = stepsToKcal(total, weightKg);

  return (
    <Card>
      <CardHeader
        kicker="Steps Log"
        title={nonZero === 0 ? "No steps logged in range" : `${nonZero} day${nonZero === 1 ? "" : "s"} logged`}
        subtitle={
          nonZero === 0
            ? "Track steps on Activity → Steps."
            : `Avg ${avg.toLocaleString()} · best ${max.toLocaleString()} · goal ${baseline.toLocaleString()}`
        }
      />
      {nonZero > 0 && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-3">
          <Stat label="Total" value={total.toLocaleString()} suffix="steps" />
          <Stat label="Avg/day" value={avg.toLocaleString()} suffix="steps" accent="#3b6aa3" />
          <Stat
            label={`Hit ${(baseline / 1000).toFixed(0)}k`}
            value={`${hit}/${entries.length}`}
            suffix="days"
            accent="#4a6b3e"
          />
          <Stat label="Kcal" value={totalKcal.toLocaleString()} suffix="kcal" accent="#c44827" />
        </div>
      )}
      <ul className="divide-y divide-ink/30 border-y border-ink/30 max-h-96 overflow-y-auto">
        {entries.map((e) => {
          const hitGoal = e.steps >= baseline && e.steps > 0;
          const c = hitGoal ? "#4a6b3e" : e.steps > 0 ? "#6b5a3e" : "#aaa";
          return (
            <li key={e.key} className="py-2 flex items-center gap-3">
              <Footprints size={14} className="text-ink-muted shrink-0" />
              <div className="flex-1 min-w-0">
                <div className="font-body text-base">
                  {e.date.toLocaleDateString("en-US", {
                    weekday: "short",
                    month: "short",
                    day: "numeric",
                    year: "numeric",
                  })}
                </div>
              </div>
              <span className="font-display text-lg font-bold tabular-nums" style={{ color: c }}>
                {e.steps.toLocaleString()}
              </span>
              <span className="font-mono text-[9px] uppercase tracking-[0.2em] text-ink-muted w-16 text-right">
                {e.steps === 0 ? "no log" : hitGoal ? "goal hit" : "below"}
              </span>
            </li>
          );
        })}
      </ul>
    </Card>
  );
}
