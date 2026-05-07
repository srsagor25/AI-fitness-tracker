import { useMemo, useState } from "react";
import { useApp } from "../store/AppContext.jsx";
import { Card, CardHeader, Stat } from "../components/ui/Card.jsx";
import { Button, IconButton } from "../components/ui/Button.jsx";
import { Field, TextInput, Chip } from "../components/ui/Field.jsx";
import { bmr, tdee } from "../lib/calories.js";
import { Plus, Trash2, TrendingDown, TrendingUp, Minus } from "lucide-react";

const WINDOWS = [
  { id: 7, label: "7 days" },
  { id: 30, label: "30 days" },
  { id: 90, label: "90 days" },
  { id: 0, label: "All" },
];

export function Body() {
  const { profile, weightLog, addWeightEntry, removeWeightEntry, latestWeight } = useApp();
  const [draftWeight, setDraftWeight] = useState("");
  const [draftNote, setDraftNote] = useState("");
  const [windowDays, setWindowDays] = useState(30);

  const sorted = useMemo(
    () => [...weightLog].sort((a, b) => a.date - b.date),
    [weightLog],
  );

  const inWindow = useMemo(() => {
    if (!windowDays) return sorted;
    const cutoff = Date.now() - windowDays * 86400000;
    return sorted.filter((e) => e.date >= cutoff);
  }, [sorted, windowDays]);

  const stats = useMemo(() => {
    if (!sorted.length) return null;
    const first = sorted[0];
    const last = sorted[sorted.length - 1];
    const min = sorted.reduce((m, e) => (e.weightKg < m.weightKg ? e : m), sorted[0]);
    const max = sorted.reduce((m, e) => (e.weightKg > m.weightKg ? e : m), sorted[0]);
    const change = last.weightKg - first.weightKg;
    let windowChange = null;
    if (inWindow.length >= 2) {
      windowChange = inWindow[inWindow.length - 1].weightKg - inWindow[0].weightKg;
    }
    return { first, last, min, max, change, windowChange };
  }, [sorted, inWindow]);

  function submit(e) {
    e.preventDefault();
    const w = Number(draftWeight);
    if (!w) return;
    addWeightEntry(w, draftNote);
    setDraftWeight("");
    setDraftNote("");
  }

  return (
    <>
      <Card>
        <CardHeader
          kicker="Body"
          title="Weight Log"
          subtitle={
            latestWeight
              ? `Latest: ${latestWeight.weightKg} kg (${new Date(latestWeight.date).toLocaleDateString()})`
              : "Log your first weight to start tracking."
          }
        />
        <form onSubmit={submit} className="grid grid-cols-1 md:grid-cols-3 gap-3 items-end">
          <Field label="Weight (kg)">
            <TextInput
              type="number"
              step="0.1"
              value={draftWeight}
              onChange={(e) => setDraftWeight(e.target.value)}
              placeholder={latestWeight ? String(latestWeight.weightKg) : "75.0"}
            />
          </Field>
          <Field label="Note (optional)">
            <TextInput
              value={draftNote}
              onChange={(e) => setDraftNote(e.target.value)}
              placeholder="morning, post-cardio, etc."
            />
          </Field>
          <Button variant="primary" type="submit" disabled={!draftWeight}>
            <Plus size={12} /> Log Weight
          </Button>
        </form>
      </Card>

      {stats && (
        <Card>
          <CardHeader kicker="Trends" title="Movement" />
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
            <Stat label="Latest" value={stats.last.weightKg} suffix="kg" />
            <Stat
              label="Change (all)"
              value={`${stats.change >= 0 ? "+" : ""}${stats.change.toFixed(1)}`}
              suffix="kg"
              accent={stats.change > 0 ? "#c44827" : stats.change < 0 ? "#4a6b3e" : "#6b5a3e"}
            />
            <Stat
              label={`Last ${windowDays || "∞"}d`}
              value={
                stats.windowChange == null
                  ? "—"
                  : `${stats.windowChange >= 0 ? "+" : ""}${stats.windowChange.toFixed(1)}`
              }
              suffix="kg"
              accent={
                stats.windowChange == null
                  ? "#6b5a3e"
                  : stats.windowChange > 0
                    ? "#c44827"
                    : stats.windowChange < 0
                      ? "#4a6b3e"
                      : "#6b5a3e"
              }
            />
            <Stat
              label="Range"
              value={`${stats.min.weightKg}–${stats.max.weightKg}`}
              suffix="kg"
              accent="#3b6aa3"
            />
          </div>

          <div className="flex gap-2 mb-3">
            {WINDOWS.map((w) => (
              <button
                key={w.id}
                onClick={() => setWindowDays(w.id)}
                className={`px-3 py-1.5 border-2 font-mono text-[10px] uppercase tracking-[0.2em] ${
                  windowDays === w.id ? "bg-ink text-paper border-ink" : "border-ink hover:bg-ink hover:text-paper"
                }`}
              >
                {w.label}
              </button>
            ))}
          </div>

          <WeightChart entries={inWindow} />
        </Card>
      )}

      <Card>
        <CardHeader kicker="Computed" title="Energy from Latest Weight" />
        <div className="grid grid-cols-3 gap-3">
          <Stat label="BMR" value={bmr(profile)} suffix="kcal" />
          <Stat label="TDEE" value={tdee(profile)} suffix="kcal" accent="#3b6aa3" />
          <Stat label="Weight in profile" value={profile.stats?.weightKg || "—"} suffix="kg" accent="#6b5a3e" />
        </div>
        <p className="font-body text-sm italic text-ink-muted mt-3">
          Each new weight entry updates the profile automatically so BMR/TDEE/workout
          calorie burn stay accurate.
        </p>
      </Card>

      <Card>
        <CardHeader kicker="Log" title="History" />
        {sorted.length === 0 ? (
          <p className="font-body italic text-ink-muted">No entries yet.</p>
        ) : (
          <ul className="divide-y divide-ink/30 border-y border-ink/30">
            {[...sorted].reverse().map((e, i, arr) => {
              const prev = arr[i + 1];
              const delta = prev ? e.weightKg - prev.weightKg : 0;
              return (
                <li key={e.id} className="py-2 flex items-center gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="font-display text-xl font-bold flex items-center gap-2">
                      {e.weightKg} kg
                      {prev && (
                        <span
                          className="font-mono text-[10px] uppercase tracking-[0.2em] flex items-center gap-1"
                          style={{
                            color: delta > 0 ? "#c44827" : delta < 0 ? "#4a6b3e" : "#6b5a3e",
                          }}
                        >
                          {delta > 0 ? <TrendingUp size={12} /> : delta < 0 ? <TrendingDown size={12} /> : <Minus size={12} />}
                          {delta > 0 ? "+" : ""}
                          {delta.toFixed(1)} kg
                        </span>
                      )}
                    </div>
                    <div className="font-mono text-[10px] uppercase tracking-[0.2em] text-ink-muted">
                      {new Date(e.date).toLocaleString("en-US", {
                        month: "short",
                        day: "numeric",
                        year: "numeric",
                        hour: "numeric",
                        minute: "2-digit",
                      })}
                    </div>
                    {e.note && (
                      <p className="font-body text-sm italic text-ink-muted mt-1">{e.note}</p>
                    )}
                  </div>
                  <IconButton onClick={() => removeWeightEntry(e.id)} aria-label="Delete">
                    <Trash2 size={14} />
                  </IconButton>
                </li>
              );
            })}
          </ul>
        )}
      </Card>
    </>
  );
}

function WeightChart({ entries }) {
  if (entries.length < 2) {
    return (
      <p className="font-body italic text-ink-muted">
        Log at least 2 entries to see a trend chart.
      </p>
    );
  }

  const W = 800;
  const H = 220;
  const padX = 32;
  const padY = 24;

  const xs = entries.map((e) => e.date);
  const ys = entries.map((e) => e.weightKg);
  const minX = Math.min(...xs);
  const maxX = Math.max(...xs);
  const minY = Math.min(...ys);
  const maxY = Math.max(...ys);
  const yRange = Math.max(0.5, maxY - minY);
  const padYBuf = yRange * 0.1;
  const yMin = minY - padYBuf;
  const yMax = maxY + padYBuf;

  const sx = (x) => padX + ((x - minX) / Math.max(1, maxX - minX)) * (W - padX * 2);
  const sy = (y) => H - padY - ((y - yMin) / (yMax - yMin)) * (H - padY * 2);

  const path = entries
    .map((e, i) => `${i === 0 ? "M" : "L"} ${sx(e.date).toFixed(1)} ${sy(e.weightKg).toFixed(1)}`)
    .join(" ");

  // 5 horizontal grid lines
  const ticks = 5;
  const yTicks = [];
  for (let i = 0; i <= ticks; i++) {
    const v = yMin + ((yMax - yMin) * i) / ticks;
    yTicks.push(v);
  }

  return (
    <svg
      viewBox={`0 0 ${W} ${H}`}
      className="w-full h-auto border-2 border-ink"
      preserveAspectRatio="none"
    >
      <rect x="0" y="0" width={W} height={H} fill="#f4ede0" />
      {yTicks.map((v, i) => {
        const y = sy(v);
        return (
          <g key={i}>
            <line
              x1={padX}
              x2={W - padX}
              y1={y}
              y2={y}
              stroke="#2a2419"
              strokeOpacity="0.15"
              strokeDasharray="2 4"
            />
            <text
              x={4}
              y={y + 3}
              fontSize="10"
              fontFamily="JetBrains Mono, monospace"
              fill="#6b5a3e"
            >
              {v.toFixed(1)}
            </text>
          </g>
        );
      })}
      <path d={path} fill="none" stroke="#c44827" strokeWidth="2" />
      {entries.map((e, i) => (
        <circle
          key={e.id}
          cx={sx(e.date)}
          cy={sy(e.weightKg)}
          r={i === entries.length - 1 ? 5 : 3}
          fill="#2a2419"
        />
      ))}
      {/* X-axis dates: show first and last */}
      <text
        x={padX}
        y={H - 4}
        fontSize="10"
        fontFamily="JetBrains Mono, monospace"
        fill="#6b5a3e"
      >
        {new Date(entries[0].date).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
      </text>
      <text
        x={W - padX}
        y={H - 4}
        textAnchor="end"
        fontSize="10"
        fontFamily="JetBrains Mono, monospace"
        fill="#6b5a3e"
      >
        {new Date(entries[entries.length - 1].date).toLocaleDateString("en-US", {
          month: "short",
          day: "numeric",
        })}
      </text>
    </svg>
  );
}
