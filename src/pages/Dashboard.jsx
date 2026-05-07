import { useApp } from "../store/AppContext.jsx";
import { Card, CardHeader, Stat } from "../components/ui/Card.jsx";
import { Button } from "../components/ui/Button.jsx";
import { Chip, ProgressBar } from "../components/ui/Field.jsx";
import { bmr, tdee } from "../lib/calories.js";
import { formatMMSS, DAYS_LONG, dayOfWeek } from "../lib/time.js";
import { Dumbbell, Coffee, Footprints, Flame, Droplet, Flame as FireIcon, Timer, Clock } from "lucide-react";

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
  } = useApp();

  const remaining = dailyTargetKcal - dayTotals.kcal;
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
