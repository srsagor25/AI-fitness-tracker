import { useApp } from "../store/AppContext.jsx";
import { Card, CardHeader, Stat } from "../components/ui/Card.jsx";
import { Button } from "../components/ui/Button.jsx";
import { Chip } from "../components/ui/Field.jsx";
import { formatMMSS } from "../lib/time.js";
import { estimateWorkoutKcal } from "../lib/calories.js";
import { Trash2, Flame } from "lucide-react";

export function History() {
  const { history, clearHistory, profile } = useApp();

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
        title="History"
        subtitle={
          totalSessions === 0
            ? "No sessions yet — finish a workout to see it here."
            : `${totalSessions} sessions logged`
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
          <Stat
            label="Time"
            value={Math.round(totalDuration / 60)}
            suffix="min"
            accent="#3b6aa3"
          />
          <Stat
            label="Volume"
            value={Math.round(totalVolume).toLocaleString()}
            suffix="kg"
            accent="#6b5a3e"
          />
          <Stat
            label="Kcal"
            value={Math.round(totalKcal).toLocaleString()}
            suffix="kcal"
            accent="#c44827"
          />
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
      </ul>
    </Card>
  );
}
