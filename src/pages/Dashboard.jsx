import { useMemo, useState } from "react";
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
    coffeeLog,
    steps,
    waterLog,
    dayType,
    streak,
    ifStatus,
    now,
    meds,
    medsTakenToday,
    grocery,
    customFoods,
    addWaterEntry,
    addCoffeeEntry,
    setSteps,
    addMeasurement,
    sleep,
    setSleepEntry,
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
  const coffeeHad = coffeeLog.length;
  const waterCups = waterLog.reduce((s, e) => {
    const q = Number(e.qty) || 1;
    if (e.unit === "cup") return s + q;
    if (e.unit === "ml") return s + q / 240;
    if (e.unit === "oz") return s + q / 8;
    if (e.unit === "L") return s + q * 4.16;
    if (e.unit === "bottle") return s + q * 2;
    if (e.unit === "glass") return s + q;
    return s + q;
  }, 0);

  // Burn target: scaled with goal — clear, separable from intake.
  // Default burn target = TDEE − BMR (i.e. activity-driven calories the
  // body should "spend" daily). Goal scales it: bulk demands less, cut more.
  const baseBurnTarget = Math.max(0, tdee(profile) - bmr(profile));
  const goalKey = profile.goalKey || profile.goal || "maintain";
  const burnMult = goalKey === "cut" ? 1.2 : goalKey === "bulk" ? 0.8 : goalKey === "muscle_build" ? 1.0 : 1.0;
  const burnTarget = Math.round(baseBurnTarget * burnMult);
  const burned = Math.round(todaysWorkoutKcal); // workout kcal counts as deliberate burn
  const eaten = Math.round(dayTotals.kcal);
  const eatTarget = Math.round(dailyTargetKcal);
  const overEat = eaten - eatTarget;
  const burnRemaining = burnTarget - burned;

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

        <EnergyHero
          eaten={eaten}
          eatTarget={eatTarget}
          burned={burned}
          burnTarget={burnTarget}
          dayType={dayType}
          dailyTargetKcal={dailyTargetKcal}
          todaysWorkoutKcal={todaysWorkoutKcal}
          goalKey={goalKey}
          overEat={overEat}
          burnRemaining={burnRemaining}
        />
        <EnergyHeroFooter eaten={eaten} burned={burned} />
      </Card>

      <QuickLog
        addWaterEntry={addWaterEntry}
        addCoffeeEntry={addCoffeeEntry}
        steps={steps}
        setSteps={setSteps}
        addMeasurement={addMeasurement}
        sleep={sleep}
        setSleepEntry={setSleepEntry}
        latestWeight={profile.stats?.weightKg}
        setTab={setTab}
      />

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
          <HabitTile icon={Coffee} label="Coffee" value={coffeeHad} suffix={profile.coffeeSchedule.length ? `/ ${profile.coffeeSchedule.length}` : "cups"} />
          <HabitTile icon={Droplet} label="Water" value={waterCups.toFixed(1)} suffix={`/ ${profile.waterTarget || 8} cups`} accent="#3b6aa3" />
          <HabitTile icon={Footprints} label="Steps" value={steps.toLocaleString()} suffix="" />
          <HabitTile
            icon={Clock}
            label="Sleep"
            value={sleep?.hours ? sleep.hours.toFixed(1) : "—"}
            suffix={sleep?.hours ? "hrs" : "log it"}
            accent={sleep?.hours >= 7 ? "#4a6b3e" : sleep?.hours ? "#c44827" : "#6b5a3e"}
          />
          <MedsHabitTile
            kicker="Meds"
            meds={meds.filter((m) => (m.category || "med") === "med")}
            doses={medsTakenToday.filter((d) => (d.category || "med") === "med")}
            onClick={() => setTab("meds")}
          />
          <MedsHabitTile
            kicker="Supps"
            meds={meds.filter((m) => (m.category || "med") === "supplement")}
            doses={medsTakenToday.filter((d) => (d.category || "med") === "supplement")}
            onClick={() => setTab("supplements")}
          />
          <HabitTile icon={Flame} label="Workout +" value={`+${Math.round(todaysWorkoutKcal)}`} suffix="kcal" accent="#4a6b3e" />
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

function HabitTile({ icon: Icon, label, value, suffix, accent }) {
  return (
    <div className="border-2 border-ink p-3">
      <div className="flex items-center gap-2 mb-1">
        <Icon size={14} className={accent ? "text-sky" : ""} />
        <span className="font-mono text-[10px] uppercase tracking-[0.25em] text-ink-muted">
          {label}
        </span>
      </div>
      <div className="font-display text-2xl font-black" style={{ color: accent || "#2a2419" }}>
        {value}
        {suffix && (
          <span className="font-mono text-xs text-ink-muted ml-1">{suffix}</span>
        )}
      </div>
    </div>
  );
}

function MedsHabitTile({ kicker, meds, doses, onClick }) {
  // Compute "due today" count by checking each med's repeat cycle.
  const today = new Date();
  const todayDateKey = (() => {
    const y = today.getFullYear();
    const m = String(today.getMonth() + 1).padStart(2, "0");
    const d = String(today.getDate()).padStart(2, "0");
    return `${y}-${m}-${d}`;
  })();
  const dueCount = meds.filter((m) => {
    const every = Math.max(1, Number(m.repeatEveryDays) || 1);
    if (every === 1) return true;
    const start = m.startDate || todayDateKey;
    const days = Math.floor((new Date(todayDateKey) - new Date(start)) / 86400000);
    return days >= 0 && days % every === 0;
  }).length;
  const takenIds = new Set(doses.map((d) => d.medId));
  const takenDueCount = meds.filter((m) => takenIds.has(m.id)).length;

  return (
    <button
      onClick={onClick}
      className="border-2 border-ink p-3 text-left hover:bg-ink/5 transition-colors"
    >
      <div className="flex items-center gap-2 mb-1">
        <span className="font-mono text-[10px] uppercase tracking-[0.25em] text-ink-muted">
          {kicker}
        </span>
      </div>
      <div className="font-display text-2xl font-black">
        {takenDueCount}
        <span className="font-mono text-xs text-ink-muted ml-1">
          / {dueCount} due
        </span>
      </div>
      {meds.length === 0 && (
        <div className="font-mono text-[9px] uppercase tracking-[0.2em] text-ink-muted mt-0.5 italic">
          tap to add
        </div>
      )}
    </button>
  );
}

// ============================================================================
// Energy hero — bigger, clearer eating/burning display with a unified visual.
// ============================================================================

function EnergyRing({ value, max, color, size = 140, stroke = 14 }) {
  const r = (size - stroke) / 2;
  const cx = size / 2;
  const cy = size / 2;
  const circumference = 2 * Math.PI * r;
  const pct = Math.max(0, Math.min(1, value / Math.max(1, max)));
  const dashOffset = circumference * (1 - pct);
  return (
    <svg width={size} height={size} className="shrink-0">
      <circle
        cx={cx}
        cy={cy}
        r={r}
        fill="none"
        stroke="#2a2419"
        strokeOpacity="0.12"
        strokeWidth={stroke}
      />
      <circle
        cx={cx}
        cy={cy}
        r={r}
        fill="none"
        stroke={color}
        strokeWidth={stroke}
        strokeLinecap="round"
        strokeDasharray={circumference}
        strokeDashoffset={dashOffset}
        transform={`rotate(-90 ${cx} ${cy})`}
        style={{ transition: "stroke-dashoffset 400ms ease" }}
      />
    </svg>
  );
}

function EnergyPanel({
  kicker,
  value,
  target,
  color,
  state,
  stateColor,
  details,
  ringValue,
  ringMax,
  ringColor,
}) {
  return (
    <div className="border-2 border-ink p-4 bg-paper">
      <div className="flex items-start gap-4">
        <div className="relative shrink-0">
          <EnergyRing value={ringValue} max={ringMax} color={ringColor} size={120} stroke={12} />
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <span
              className="font-display text-2xl font-black leading-none tabular-nums"
              style={{ color }}
            >
              {value}
            </span>
            <span className="font-mono text-[9px] uppercase tracking-[0.2em] text-ink-muted mt-0.5">
              of {target}
            </span>
          </div>
        </div>
        <div className="flex-1 min-w-0">
          <div className="font-mono text-[10px] uppercase tracking-[0.25em] text-ink-muted">
            {kicker}
          </div>
          <div
            className="font-display text-2xl md:text-3xl font-black mt-1 leading-tight"
            style={{ color: stateColor }}
          >
            {state}
          </div>
          <div className="font-mono text-[10px] uppercase tracking-[0.2em] text-ink-muted mt-2 leading-relaxed">
            {details}
          </div>
        </div>
      </div>
    </div>
  );
}

function EnergyHero({
  eaten,
  eatTarget,
  burned,
  burnTarget,
  dayType,
  dailyTargetKcal,
  todaysWorkoutKcal,
  goalKey,
  overEat,
  burnRemaining,
}) {
  const eatState =
    overEat > 0
      ? `${overEat} OVER`
      : `${Math.abs(overEat)} LEFT`;
  const eatStateColor = overEat > 0 ? "#c44827" : "#4a6b3e";

  const burnState =
    burnRemaining <= 0
      ? `${Math.abs(burnRemaining)} BONUS`
      : `${burnRemaining} TO GO`;
  const burnStateColor = burnRemaining <= 0 ? "#4a6b3e" : "#6b5a3e";

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
      <EnergyPanel
        kicker="Eating · Calories In"
        value={eaten}
        target={eatTarget}
        color="#2a2419"
        state={eatState}
        stateColor={eatStateColor}
        details={
          todaysWorkoutKcal > 0
            ? `${dayType?.label || "Today"} ${Math.round(dailyTargetKcal - todaysWorkoutKcal)} + workout +${Math.round(todaysWorkoutKcal)} = ${eatTarget} kcal`
            : `${dayType?.label || "Today"} target ${eatTarget} kcal`
        }
        ringValue={eaten}
        ringMax={eatTarget}
        ringColor="#c44827"
      />
      <EnergyPanel
        kicker="Burning · Calories Out"
        value={burned}
        target={burnTarget}
        color="#4a6b3e"
        state={burnState}
        stateColor={burnStateColor}
        details={`Goal "${goalKey}" sets target ${burnTarget} kcal/day from training`}
        ringValue={burned}
        ringMax={burnTarget}
        ringColor="#4a6b3e"
      />
    </div>
  );
}

function EnergyHeroFooter({ eaten, burned }) {
  const net = eaten - burned;
  const color = net > 0 ? "#c44827" : net < 0 ? "#4a6b3e" : "#6b5a3e";
  return (
    <div className="mt-4 border-2 border-ink p-3 bg-ink/5 grid grid-cols-1 md:grid-cols-3 gap-2">
      <div className="md:col-span-1">
        <div className="font-mono text-[10px] uppercase tracking-[0.25em] text-ink-muted">
          Net energy
        </div>
        <div
          className="font-display text-3xl font-black tabular-nums leading-tight"
          style={{ color }}
        >
          {net >= 0 ? "+" : ""}
          {net}
          <span className="font-mono text-xs uppercase tracking-widest text-ink-muted ml-1">
            kcal
          </span>
        </div>
      </div>
      <div className="md:col-span-2 flex items-center font-mono text-[10px] uppercase tracking-[0.25em] text-ink-muted leading-relaxed">
        Eaten {eaten} − Burned {burned} = Net {net} kcal
      </div>
    </div>
  );
}

// ============================================================================
// Quick Log — one-tap shortcuts for the most common daily entries.
// ============================================================================


function QuickLog({
  addWaterEntry,
  addCoffeeEntry,
  steps,
  setSteps,
  addMeasurement,
  sleep,
  setSleepEntry,
  latestWeight,
  setTab,
}) {
  const [open, setOpen] = useState(null); // null | "weight" | "sleep"
  const [weight, setWeight] = useState("");
  const [hours, setHours] = useState(sleep?.hours ?? "");
  const [bedTime, setBedTime] = useState(sleep?.bedTime ?? "");
  const [wakeTime, setWakeTime] = useState(sleep?.wakeTime ?? "");
  const [quality, setQuality] = useState(sleep?.quality ?? "");

  function commitWeight() {
    if (!weight) return;
    addMeasurement({ weightKg: weight });
    setWeight("");
    setOpen(null);
  }
  function commitSleep() {
    setSleepEntry({ hours, bedTime, wakeTime, quality });
    setOpen(null);
  }

  return (
    <Card>
      <CardHeader
        kicker="Quick Log"
        title="One-tap entries"
        subtitle="The fastest way to log today's basics."
      />
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-2">
        <button
          onClick={() => addWaterEntry({ qty: 1, unit: "cup" })}
          className="border-2 border-ink p-3 hover:bg-ink hover:text-paper transition-colors flex flex-col items-center gap-1"
        >
          <Droplet size={18} />
          <span className="font-mono text-[10px] uppercase tracking-[0.2em]">+1 cup</span>
          <span className="font-body text-xs text-ink-muted">water</span>
        </button>
        <button
          onClick={() => addWaterEntry({ qty: 500, unit: "ml" })}
          className="border-2 border-ink p-3 hover:bg-ink hover:text-paper transition-colors flex flex-col items-center gap-1"
        >
          <Droplet size={18} />
          <span className="font-mono text-[10px] uppercase tracking-[0.2em]">+500 ml</span>
          <span className="font-body text-xs text-ink-muted">water</span>
        </button>
        <button
          onClick={() => addCoffeeEntry({ qty: 1, unit: "cup" })}
          className="border-2 border-ink p-3 hover:bg-ink hover:text-paper transition-colors flex flex-col items-center gap-1"
        >
          <Coffee size={18} />
          <span className="font-mono text-[10px] uppercase tracking-[0.2em]">+1 cup</span>
          <span className="font-body text-xs text-ink-muted">coffee</span>
        </button>
        <button
          onClick={() => setSteps((steps || 0) + 1000)}
          className="border-2 border-ink p-3 hover:bg-ink hover:text-paper transition-colors flex flex-col items-center gap-1"
        >
          <Footprints size={18} />
          <span className="font-mono text-[10px] uppercase tracking-[0.2em]">+1k</span>
          <span className="font-body text-xs text-ink-muted">steps</span>
        </button>
        <button
          onClick={() => setOpen(open === "weight" ? null : "weight")}
          className={`border-2 border-ink p-3 transition-colors flex flex-col items-center gap-1 ${
            open === "weight" ? "bg-ink text-paper" : "hover:bg-ink hover:text-paper"
          }`}
        >
          <span className="text-base">⚖️</span>
          <span className="font-mono text-[10px] uppercase tracking-[0.2em]">Weight</span>
          <span className={`font-body text-xs ${open === "weight" ? "text-paper/70" : "text-ink-muted"}`}>
            log
          </span>
        </button>
        <button
          onClick={() => setOpen(open === "sleep" ? null : "sleep")}
          className={`border-2 border-ink p-3 transition-colors flex flex-col items-center gap-1 ${
            open === "sleep" ? "bg-ink text-paper" : "hover:bg-ink hover:text-paper"
          }`}
        >
          <Clock size={18} />
          <span className="font-mono text-[10px] uppercase tracking-[0.2em]">Sleep</span>
          <span className={`font-body text-xs ${open === "sleep" ? "text-paper/70" : "text-ink-muted"}`}>
            {sleep?.hours ? `${sleep.hours.toFixed(1)} h` : "log"}
          </span>
        </button>
      </div>

      {open === "weight" && (
        <div className="border-2 border-ink p-3 mt-3 grid grid-cols-1 sm:grid-cols-3 gap-2 items-end">
          <div className="sm:col-span-2">
            <div className="font-mono text-[10px] uppercase tracking-[0.25em] text-ink-muted mb-1">
              Weight (kg)
            </div>
            <input
              type="number"
              step="0.1"
              value={weight}
              onChange={(e) => setWeight(e.target.value)}
              placeholder={latestWeight ? String(latestWeight) : ""}
              className="w-full border-2 border-ink bg-paper px-2 py-1.5 font-display text-2xl font-black"
            />
          </div>
          <div className="flex gap-2">
            <Button variant="primary" onClick={commitWeight} disabled={!weight}>
              Log
            </Button>
            <Button variant="outline" onClick={() => setTab && setTab("progress")}>
              Open Progress
            </Button>
          </div>
        </div>
      )}

      {open === "sleep" && (
        <div className="border-2 border-ink p-3 mt-3 space-y-2">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
            <div>
              <div className="font-mono text-[10px] uppercase tracking-[0.25em] text-ink-muted mb-1">
                Hours
              </div>
              <input
                type="number"
                step="0.1"
                value={hours}
                onChange={(e) => setHours(e.target.value)}
                placeholder="7.5"
                className="w-full border-2 border-ink bg-paper px-2 py-1.5 font-display text-xl font-black"
              />
            </div>
            <div>
              <div className="font-mono text-[10px] uppercase tracking-[0.25em] text-ink-muted mb-1">
                Bedtime
              </div>
              <input
                type="time"
                value={bedTime}
                onChange={(e) => setBedTime(e.target.value)}
                className="w-full border-2 border-ink bg-paper px-2 py-1.5 font-body text-base"
              />
            </div>
            <div>
              <div className="font-mono text-[10px] uppercase tracking-[0.25em] text-ink-muted mb-1">
                Wake
              </div>
              <input
                type="time"
                value={wakeTime}
                onChange={(e) => setWakeTime(e.target.value)}
                className="w-full border-2 border-ink bg-paper px-2 py-1.5 font-body text-base"
              />
            </div>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-mono text-[10px] uppercase tracking-[0.25em] text-ink-muted">
              Quality
            </span>
            {[1, 2, 3, 4, 5].map((q) => (
              <button
                key={q}
                onClick={() => setQuality(String(q))}
                className={`w-8 h-8 border-2 border-ink font-display text-base font-black ${
                  Number(quality) === q ? "bg-ink text-paper" : "hover:bg-ink/10"
                }`}
              >
                {q}
              </button>
            ))}
            <Button variant="primary" onClick={commitSleep} className="ml-auto">
              Log
            </Button>
          </div>
          <p className="font-body text-sm italic text-ink-muted">
            Tip: Hours auto-calculate from Bedtime + Wake if both filled.
          </p>
        </div>
      )}
    </Card>
  );
}
