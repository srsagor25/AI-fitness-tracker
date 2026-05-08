import { useMemo, useState } from "react";
import { useApp } from "../store/AppContext.jsx";
import { Card, CardHeader, Stat } from "../components/ui/Card.jsx";
import { Button } from "../components/ui/Button.jsx";
import { Chip } from "../components/ui/Field.jsx";
import { DateRangeFilter, filterRange, filterLabel } from "../components/ui/DateRangeFilter.jsx";
import { todayKey } from "../lib/time.js";
import { stepsToKcal } from "../lib/calories.js";
import { load } from "../store/storage.js";
import { Footprints } from "lucide-react";

export function Steps() {
  const { profile, steps, setSteps, stepAdjustKcal } = useApp();
  const [filter, setFilter] = useState({ mode: "preset", days: 30 });
  const userWeightKg = profile.stats?.weightKg || 70;
  const todaysKcal = stepsToKcal(steps, userWeightKg);

  const data = useMemo(() => {
    const range = filterRange(filter);
    const out = [];
    const cursor = new Date();
    cursor.setHours(0, 0, 0, 0);
    let total = 0;
    let nonZero = 0;
    const cap = 730; // safety cap for "All time"
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
      total += v;
      if (v > 0) nonZero++;
      cursor.setDate(cursor.getDate() - 1);
    }
    out.reverse();
    const avg = nonZero > 0 ? Math.round(total / nonZero) : 0;
    const max = out.reduce((m, d) => (d.steps > m ? d.steps : m), 0);
    const baseline = profile?.stepAdjust?.baseline || 10000;
    const hitGoalDays = out.filter((d) => d.steps >= baseline).length;
    return { entries: out, total, avg, max, nonZero, baseline, hitGoalDays };
  }, [filter, profile?.stepAdjust?.baseline]);

  return (
    <>
      {/* Today's input — moved here from Workout's "Today's Movement" card. */}
      <Card>
        <CardHeader
          kicker="Activity"
          title="Steps Today"
          subtitle="Adjusts your eating target via the step-adjust thresholds in your profile."
          right={
            <div className="flex flex-wrap gap-2 items-end">
              {stepAdjustKcal !== 0 && (
                <Chip color={stepAdjustKcal > 0 ? "#4a6b3e" : "#c44827"}>
                  {stepAdjustKcal > 0 ? "+" : ""}
                  {stepAdjustKcal} kcal adjust
                </Chip>
              )}
              <Chip color="#3b6aa3">~{todaysKcal} kcal burned</Chip>
            </div>
          }
        />
        {/* min-w-0 + text-2xl keeps the input from pushing the buttons out
            of the card on a phone-width viewport. */}
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            className="shrink-0"
            onClick={() => setSteps(Math.max(0, steps - 1000))}
          >
            −1k
          </Button>
          <input
            type="number"
            value={steps}
            onChange={(e) => setSteps(Math.max(0, Number(e.target.value) || 0))}
            className="flex-1 min-w-0 w-full border-2 border-ink bg-paper px-2 py-1.5 font-display text-2xl font-black text-center"
          />
          <Button
            variant="outline"
            size="sm"
            className="shrink-0"
            onClick={() => setSteps(steps + 1000)}
          >
            +1k
          </Button>
        </div>
        <div className="font-mono text-[10px] uppercase tracking-[0.2em] text-ink-muted mt-2 italic">
          Baseline {profile.stepAdjust?.baseline?.toLocaleString() || "—"} ·{" "}
          {profile.stepAdjust?.lowThreshold?.toLocaleString() || "—"} low ·{" "}
          {profile.stepAdjust?.highThreshold?.toLocaleString() || "—"} high · weight {userWeightKg} kg
        </div>
      </Card>

      {/* History — chart + summary tiles + per-day list. */}
      <Card>
        <CardHeader
          kicker="History"
          title="Step History"
          subtitle={
            data.nonZero === 0
              ? `Log steps to start tracking your trend · ${filterLabel(filter)}`
              : `${data.nonZero} day${data.nonZero === 1 ? "" : "s"} logged · avg ${data.avg.toLocaleString()} · best ${data.max.toLocaleString()} · ${filterLabel(filter)}`
          }
        />
        <div className="mb-3">
          <DateRangeFilter filter={filter} setFilter={setFilter} compact />
        </div>

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
                <Footprints size={14} className="text-ink-muted shrink-0" />
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
    </>
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
