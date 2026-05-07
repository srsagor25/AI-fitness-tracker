import { useMemo } from "react";
import { useApp } from "../store/AppContext.jsx";
import { Card, CardHeader, Stat } from "../components/ui/Card.jsx";
import { Button } from "../components/ui/Button.jsx";
import { Chip, ProgressBar } from "../components/ui/Field.jsx";
import { bmr, tdee } from "../lib/calories.js";
import { formatMMSS, DAYS_LONG, dayOfWeek } from "../lib/time.js";
import { FOODS } from "../store/profiles.js";
import {
  Dumbbell,
  Coffee,
  Footprints,
  Flame,
  Droplet,
  Flame as FireIcon,
  Timer,
  Clock,
  Utensils,
  Pill,
  ShoppingCart,
  CheckCircle2,
  AlertCircle,
  Apple,
} from "lucide-react";

function fmtHM(ms) {
  if (ms == null || ms < 0) return "—";
  const totalMin = Math.floor(ms / 60000);
  const h = Math.floor(totalMin / 60);
  const m = totalMin % 60;
  if (h > 0) return `${h}h ${String(m).padStart(2, "0")}m`;
  return `${m}m`;
}

export function Dashboard({ setTab }) {
  const {
    profile,
    dayTotals,
    dailyTargetKcal,
    todaysWorkoutKcal,
    todaysDay,
    todaysDayId,
    activeProgram,
    history,
    currentSession,
    meals,
    cheats,
    coffee,
    steps,
    water,
    dayType,
    streak,
    ifStatus,
    now,
    meds,
    medsTakenToday,
    grocery,
    customFoods,
  } = useApp();

  const remaining = dailyTargetKcal - dayTotals.kcal;

  // ----- Reminders (computed each render) -----
  const reminders = useMemo(() => {
    const list = [];
    const nowDate = new Date(now);

    function timeToToday(hhmm) {
      if (!hhmm) return null;
      const [h, m] = hhmm.split(":").map(Number);
      if (Number.isNaN(h)) return null;
      const t = new Date(nowDate);
      t.setHours(h, m || 0, 0, 0);
      return t;
    }

    function fmtCountdown(ms) {
      if (ms == null) return "—";
      const abs = Math.abs(ms);
      const totalMin = Math.floor(abs / 60000);
      const h = Math.floor(totalMin / 60);
      const m = totalMin % 60;
      const text = h > 0 ? `${h}h ${String(m).padStart(2, "0")}m` : `${m}m`;
      if (ms < 0) return `${text} late`;
      return `in ${text}`;
    }

    // Workout
    const sessionsToday = history.filter(
      (h) =>
        new Date(h.date).toDateString() === nowDate.toDateString(),
    );
    if (currentSession) {
      list.push({
        id: "workout",
        icon: Dumbbell,
        domain: "workout",
        label: "Workout in progress",
        detail: `${activeProgram.name} · ${todaysDay?.name || ""}`,
        countdown: null,
        urgency: "now",
      });
    } else if (sessionsToday.length > 0) {
      list.push({
        id: "workout",
        icon: CheckCircle2,
        domain: "workout",
        label: "Workout done",
        detail: `${sessionsToday[0].dayName} · ${formatMMSS(sessionsToday[0].durationSec)}`,
        countdown: null,
        urgency: "done",
      });
    } else if (todaysDay) {
      const wt = timeToToday(profile.workoutTime);
      const ms = wt ? wt - nowDate : null;
      list.push({
        id: "workout",
        icon: Dumbbell,
        domain: "workout",
        label: `${todaysDay.name} day`,
        detail: profile.workoutTime
          ? ms < 0
            ? "Overdue — start now"
            : `Scheduled ${profile.workoutTime}`
          : "Start when ready",
        countdown: ms,
        urgency: ms != null && ms < 0 ? "late" : ms != null && ms < 3600000 ? "soon" : "scheduled",
      });
    } else if (todaysDayId === "rest") {
      list.push({
        id: "workout",
        icon: CheckCircle2,
        domain: "workout",
        label: "Rest day",
        detail: "No training scheduled",
        countdown: null,
        urgency: "done",
      });
    }

    // Diet (per slot)
    const slotIcons = { lunch: "🍱", shake: "🥤", dinner: "🍽️" };
    const slotMealTimes = profile.mealTimes || {};
    for (const slot of ["lunch", "shake", "dinner"]) {
      const logged = (meals[slot] || []).length > 0;
      const slotKcal = (meals[slot] || []).reduce(
        (s, m) => s + (m.totals?.kcal || 0),
        0,
      );
      const t = timeToToday(slotMealTimes[slot]);
      const ms = t ? t - nowDate : null;
      list.push({
        id: `diet-${slot}`,
        icon: Utensils,
        domain: "diet",
        emoji: slotIcons[slot],
        label: slot[0].toUpperCase() + slot.slice(1),
        detail: logged
          ? `Logged ✓`
          : t
            ? `Scheduled ${slotMealTimes[slot]}`
            : "No time set",
        countdown: logged ? null : ms,
        urgency: logged
          ? "done"
          : ms != null && ms < -1800000
            ? "late"
            : ms != null && ms < 3600000
              ? "soon"
              : "scheduled",
      });
    }

    // Foods data quality
    const allKeys = Object.keys(FOODS);
    const incomplete = allKeys.filter((k) => {
      const o = customFoods[k] || {};
      const fat = o.fat ?? FOODS[k].fat ?? 0;
      const carbs = o.carbs ?? FOODS[k].carbs ?? 0;
      return fat === 0 && carbs === 0;
    });
    if (incomplete.length > 0) {
      list.push({
        id: "foods",
        icon: Apple,
        domain: "foods",
        label: "Foods data",
        detail: `${incomplete.length} food${incomplete.length === 1 ? "" : "s"} missing fat/carbs`,
        countdown: null,
        urgency: "info",
      });
    }

    // Grocery
    const lowStock = grocery.filter((it) => it.qty <= it.lowThreshold);
    const perishLow = lowStock.filter((it) => it.perishable);
    if (lowStock.length > 0) {
      list.push({
        id: "grocery",
        icon: ShoppingCart,
        domain: "grocery",
        label: `${lowStock.length} item${lowStock.length === 1 ? "" : "s"} low`,
        detail:
          lowStock
            .slice(0, 3)
            .map((it) => it.name)
            .join(", ") +
          (lowStock.length > 3 ? `, +${lowStock.length - 3} more` : "") +
          (perishLow.length > 0 ? ` · ${perishLow.length} perishable` : ""),
        countdown: null,
        urgency: perishLow.length > 0 ? "soon" : "info",
      });
    }

    // Meds
    const upcoming = [];
    for (const med of meds) {
      for (const t of med.reminderTimes || []) {
        const target = timeToToday(t);
        if (!target) continue;
        const ms = target - nowDate;
        const takenForThisTime = medsTakenToday.some(
          (d) =>
            d.medId === med.id &&
            Math.abs(new Date(d.takenAt).getTime() - target.getTime()) < 30 * 60 * 1000,
        );
        if (!takenForThisTime) {
          upcoming.push({ med, time: t, ms });
        }
      }
    }
    upcoming.sort((a, b) => a.ms - b.ms);
    const next = upcoming.find((u) => u.ms >= -30 * 60 * 1000);
    if (next) {
      list.push({
        id: "meds",
        icon: Pill,
        domain: "meds",
        label: next.med.name,
        detail: `${next.med.defaultQuantity} ${next.med.unit} at ${next.time}${
          upcoming.length > 1 ? ` · +${upcoming.length - 1} more today` : ""
        }`,
        countdown: next.ms,
        urgency: next.ms < 0 ? "late" : next.ms < 3600000 ? "soon" : "scheduled",
      });
    } else if (medsTakenToday.length > 0 && meds.length > 0) {
      list.push({
        id: "meds",
        icon: CheckCircle2,
        domain: "meds",
        label: "Meds caught up",
        detail: `${medsTakenToday.length} dose${medsTakenToday.length === 1 ? "" : "s"} taken today`,
        countdown: null,
        urgency: "done",
      });
    }

    return { list, fmtCountdown };
  }, [
    now,
    history,
    currentSession,
    activeProgram,
    todaysDay,
    todaysDayId,
    profile.workoutTime,
    profile.mealTimes,
    meals,
    customFoods,
    grocery,
    meds,
    medsTakenToday,
  ]);
  const proteinPct = profile.proteinTarget
    ? Math.round((dayTotals.protein / profile.proteinTarget) * 100)
    : 0;

  const sessionsThisWeek = history.filter((h) => {
    const d = new Date(h.date);
    return (Date.now() - d.getTime()) / 86400000 < 7;
  });
  const weekVolume = sessionsThisWeek.reduce((s, h) => s + (h.totalVolume || 0), 0);

  const totalMealsToday =
    meals.lunch.length + meals.shake.length + meals.dinner.length + meals.snack.length;
  const coffeeHad = coffee.filter(Boolean).length;

  return (
    <>
      <Card>
        <CardHeader
          kicker="Today"
          title={DAYS_LONG[dayOfWeek()]}
          subtitle={
            todaysDay
              ? `${activeProgram.name} · ${todaysDay.name} day`
              : todaysDayId === "rest"
                ? `${activeProgram.name} · Rest day`
                : "No program scheduled"
          }
          right={
            <div className="flex flex-col items-end gap-2">
              {currentSession && <Chip color="#c44827">Workout in progress</Chip>}
              <Chip color={dayType?.color}>
                {dayType?.icon} {dayType?.label}
              </Chip>
              <Button variant="outline" size="sm" onClick={() => setTab("workout")}>
                Open Training
              </Button>
            </div>
          }
        />

        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <Stat label="Eaten" value={Math.round(dayTotals.kcal)} suffix="kcal" />
          <Stat label="Burned" value={Math.round(todaysWorkoutKcal)} suffix="kcal" accent="#4a6b3e" />
          <Stat label="Target" value={Math.round(dailyTargetKcal)} suffix="kcal" accent="#3b6aa3" />
          <Stat
            label={remaining >= 0 ? "Remaining" : "Over"}
            value={Math.abs(Math.round(remaining))}
            suffix="kcal"
            accent={remaining >= 0 ? "#4a6b3e" : "#c44827"}
          />
        </div>

        <div className="mt-4">
          <div className="flex items-center justify-between mb-1">
            <span className="font-mono text-[10px] uppercase tracking-[0.25em] text-ink-muted">
              Energy balance
            </span>
            <span className="font-mono text-[10px] uppercase tracking-[0.25em] text-ink-muted">
              {Math.round(dayTotals.kcal)} / {Math.round(dailyTargetKcal)} kcal
            </span>
          </div>
          <ProgressBar value={dayTotals.kcal} max={dailyTargetKcal} />
        </div>
      </Card>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        <div className="border-2 border-ink p-3 md:p-4">
          <div className="flex items-center gap-2 mb-1">
            <FireIcon size={14} className="text-accent" />
            <span className="font-mono text-[10px] uppercase tracking-[0.25em] text-ink-muted">
              Logging streak
            </span>
          </div>
          <div className="font-display text-4xl font-black leading-none">
            {streak}
            <span className="font-mono text-xs uppercase tracking-widest ml-1 text-ink-muted">
              day{streak === 1 ? "" : "s"}
            </span>
          </div>
          <p className="font-body text-sm italic text-ink-muted mt-1">
            {streak === 0
              ? "Log a meal today to start your streak."
              : streak === 1
                ? "First day — keep it going."
                : `Consistent for ${streak} days running.`}
          </p>
        </div>

        <div className="border-2 border-ink p-3 md:p-4 md:col-span-2">
          <div className="flex items-center gap-2 mb-1">
            <Timer size={14} className="text-ink-muted" />
            <span className="font-mono text-[10px] uppercase tracking-[0.25em] text-ink-muted">
              Eating window {profile.windowStart && profile.windowEnd ? `(${profile.windowStart} – ${profile.windowEnd})` : ""}
            </span>
          </div>
          {ifStatus ? (
            <>
              <div className="flex items-baseline gap-2 flex-wrap">
                <span
                  className="font-display text-3xl md:text-4xl font-black leading-none"
                  style={{ color: ifStatus.state === "open" ? "#4a6b3e" : "#c44827" }}
                >
                  {fmtHM(ifStatus.msLeft)}
                </span>
                <span className="font-mono text-[10px] uppercase tracking-[0.25em] text-ink-muted">
                  {ifStatus.nextLabel}
                </span>
                <Chip color={ifStatus.state === "open" ? "#4a6b3e" : "#c44827"}>
                  {ifStatus.state === "open" ? "Window open" : "Fasting"}
                </Chip>
              </div>
              <div className="h-1 bg-ink/15 mt-3">
                <div
                  className="h-1 transition-all"
                  style={{
                    width: `${Math.max(0, Math.min(100, 100 - (ifStatus.msLeft / Math.max(1, ifStatus.windowMs)) * 100))}%`,
                    backgroundColor: ifStatus.state === "open" ? "#4a6b3e" : "#c44827",
                  }}
                />
              </div>
            </>
          ) : (
            <p className="font-body italic text-ink-muted">
              Set your eating window on the Profile tab to see a live timer here.
            </p>
          )}
        </div>
      </div>

      {/* Reminders & Countdowns */}
      <Card>
        <CardHeader
          kicker="Reminders"
          title="What's pending today"
          subtitle="Live countdowns across diet, training, foods, grocery and meds."
        />
        <ul className="grid grid-cols-1 md:grid-cols-2 gap-2">
          {reminders.list.map((r) => {
            const Icon = r.icon;
            const colors = {
              now: "#c44827",
              late: "#c44827",
              soon: "#c44827",
              scheduled: "#3b6aa3",
              done: "#4a6b3e",
              info: "#6b5a3e",
            };
            const c = colors[r.urgency] || "#2a2419";
            const onClick = () => setTab(
              r.domain === "diet" ? "diet"
              : r.domain === "workout" ? "workout"
              : r.domain === "foods" ? "foods"
              : r.domain === "grocery" ? "grocery"
              : r.domain === "meds" ? "meds"
              : "dashboard"
            );
            return (
              <li key={r.id}>
                <button
                  onClick={onClick}
                  className="w-full text-left border-2 border-ink p-3 hover:bg-ink/5 transition-colors flex items-start gap-3"
                  style={{ borderLeftColor: c, borderLeftWidth: 6 }}
                >
                  <span className="shrink-0 mt-0.5 text-xl" style={{ color: c }}>
                    {r.emoji || <Icon size={20} />}
                  </span>
                  <div className="flex-1 min-w-0">
                    <div className="font-display text-base font-bold flex items-center gap-2 flex-wrap">
                      {r.label}
                      {r.urgency === "late" && (
                        <Chip color="#c44827">Late</Chip>
                      )}
                      {r.urgency === "soon" && (
                        <Chip color="#c44827">Soon</Chip>
                      )}
                      {r.urgency === "now" && (
                        <Chip color="#c44827">Now</Chip>
                      )}
                      {r.urgency === "done" && (
                        <Chip color="#4a6b3e">Done</Chip>
                      )}
                    </div>
                    <div className="font-mono text-[10px] uppercase tracking-[0.2em] text-ink-muted">
                      {r.detail}
                    </div>
                  </div>
                  {r.countdown != null && (
                    <span
                      className="font-mono text-[10px] uppercase tracking-[0.25em] shrink-0 self-center"
                      style={{ color: c }}
                    >
                      {reminders.fmtCountdown(r.countdown)}
                    </span>
                  )}
                </button>
              </li>
            );
          })}
        </ul>
      </Card>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card>
          <CardHeader
            kicker="Macros"
            title="Today's Plate"
            right={
              <Button variant="ghost" size="sm" onClick={() => setTab("diet")}>
                Log Food →
              </Button>
            }
          />
          <div className="space-y-4">
            <MacroRow
              label="Protein"
              value={dayTotals.protein}
              target={profile.proteinTarget}
              unit="g"
              color="#c44827"
            />
            <MacroRow
              label="Carbs"
              value={dayTotals.carbs || 0}
              target={Math.round((dailyTargetKcal * 0.45) / 4)}
              unit="g"
              color="#3b6aa3"
            />
            <MacroRow
              label="Fat"
              value={dayTotals.fat || 0}
              target={Math.round((dailyTargetKcal * 0.3) / 9)}
              unit="g"
              color="#6b5a3e"
            />
          </div>
          <div className="mt-4 pt-4 border-t border-ink/30 text-[10px] font-mono uppercase tracking-[0.25em] text-ink-muted flex justify-between flex-wrap gap-1">
            <span>{totalMealsToday} meals · {cheats.length} cheats</span>
            <span>{proteinPct}% protein goal</span>
          </div>
        </Card>

        <Card>
          <CardHeader
            kicker="Training"
            title="This Week"
            right={
              <Button variant="ghost" size="sm" onClick={() => setTab("history")}>
                History →
              </Button>
            }
          />
          <div className="grid grid-cols-2 gap-3">
            <Stat label="Sessions" value={sessionsThisWeek.length} suffix="× 7d" />
            <Stat
              label="Volume"
              value={Math.round(weekVolume).toLocaleString()}
              suffix="kg"
              accent="#3b6aa3"
            />
          </div>
          <div className="mt-4 space-y-2">
            {sessionsThisWeek.slice(0, 3).map((s) => (
              <div
                key={s.id}
                className="flex items-center justify-between border border-ink/40 px-3 py-2"
              >
                <div className="flex items-center gap-2">
                  <Dumbbell size={14} />
                  <span className="font-body">{s.dayName}</span>
                  <span className="font-mono text-[10px] uppercase tracking-[0.2em] text-ink-muted">
                    {s.programName}
                  </span>
                </div>
                <span className="font-mono text-[10px] uppercase tracking-[0.2em] text-ink-muted">
                  {formatMMSS(s.durationSec)}
                </span>
              </div>
            ))}
            {sessionsThisWeek.length === 0 && (
              <p className="font-body text-ink-muted italic">
                No sessions logged this week.
              </p>
            )}
          </div>
        </Card>
      </div>

      <Card>
        <CardHeader kicker="Healthy Habits" title="Daily Tracking" />
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <div className="border-2 border-ink p-3">
            <div className="flex items-center gap-2 mb-1">
              <Coffee size={14} />
              <span className="font-mono text-[10px] uppercase tracking-[0.25em] text-ink-muted">
                Coffee
              </span>
            </div>
            <div className="font-display text-2xl font-black">
              {coffeeHad}
              <span className="font-mono text-xs text-ink-muted ml-1">
                / {profile.coffeeSchedule.length || "—"}
              </span>
            </div>
          </div>
          <div className="border-2 border-ink p-3">
            <div className="flex items-center gap-2 mb-1">
              <Droplet size={14} className="text-sky" />
              <span className="font-mono text-[10px] uppercase tracking-[0.25em] text-ink-muted">
                Water
              </span>
            </div>
            <div className="font-display text-2xl font-black">
              {water}
              <span className="font-mono text-xs text-ink-muted ml-1">
                / {profile.waterTarget || 8} cups
              </span>
            </div>
          </div>
          <div className="border-2 border-ink p-3">
            <div className="flex items-center gap-2 mb-1">
              <Footprints size={14} />
              <span className="font-mono text-[10px] uppercase tracking-[0.25em] text-ink-muted">
                Steps
              </span>
            </div>
            <div className="font-display text-2xl font-black">{steps.toLocaleString()}</div>
          </div>
          <div className="border-2 border-ink p-3">
            <div className="flex items-center gap-2 mb-1">
              <Flame size={14} />
              <span className="font-mono text-[10px] uppercase tracking-[0.25em] text-ink-muted">
                Workout +
              </span>
            </div>
            <div className="font-display text-2xl font-black text-good">
              +{Math.round(todaysWorkoutKcal)}
              <span className="font-mono text-xs text-ink-muted ml-1">kcal</span>
            </div>
          </div>
        </div>
      </Card>

      <Card>
        <CardHeader kicker="Body" title="Profile Snapshot" />
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <Stat label="Weight" value={profile.stats?.weightKg || "—"} suffix="kg" accent="#6b5a3e" />
          <Stat label="Height" value={profile.stats?.heightCm || "—"} suffix="cm" accent="#6b5a3e" />
          <Stat label="BMR" value={bmr(profile)} suffix="kcal" accent="#4a6b3e" />
          <Stat label="TDEE" value={tdee(profile)} suffix="kcal" accent="#3b6aa3" />
        </div>
        <p className="font-body text-ink-muted italic mt-3 text-sm">
          {profile.publicLabel}
          {profile.eatingWindow && ` · Eating window: ${profile.eatingWindow}`}
        </p>
      </Card>
    </>
  );
}

function MacroRow({ label, value, target, unit, color }) {
  const pct = target ? Math.min(100, (value / target) * 100) : 0;
  return (
    <div>
      <div className="flex items-baseline justify-between">
        <span className="font-mono text-[10px] uppercase tracking-[0.25em] text-ink-muted">
          {label}
        </span>
        <span className="font-display text-xl font-bold" style={{ color }}>
          {Math.round(value)}
          <span className="font-mono text-[10px] uppercase tracking-widest text-ink-muted ml-1">
            / {target}
            {unit}
          </span>
        </span>
      </div>
      <div className="h-px bg-ink/20 relative mt-1">
        <div
          className="absolute left-0 top-0 h-px transition-all"
          style={{ width: `${pct}%`, backgroundColor: color }}
        />
      </div>
    </div>
  );
}
