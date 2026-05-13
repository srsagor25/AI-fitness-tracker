import { useState } from "react";
import { Modal } from "./ui/Modal.jsx";
import { Button } from "./ui/Button.jsx";
import { Field, TextInput } from "./ui/Field.jsx";
import { useApp } from "../store/AppContext.jsx";
import { estimateSportKcal } from "../store/sports.js";

// One-tap log popup for the Today reminders. Two flavors:
//   - "meal"   → picks a preset for a slot OR enters a custom name/kcal
//   - "sports" → picks a sport + duration
//
// Either flavor logs and closes on a single tap of a tile. The custom
// path is the fallback for off-plan entries the user still wants to
// track (vs the markedDone flag which leaves no record at all).

export function QuickLogModal({ open, kind, slot, onClose }) {
  const {
    profile,
    addMealToSlot,
    sportsList,
    addSportSession,
    calc,
  } = useApp();
  const weightKg = profile?.stats?.weightKg || 70;

  if (!open) return null;
  if (kind === "meal") {
    return <MealQuickLog slot={slot} onClose={onClose} profile={profile} addMealToSlot={addMealToSlot} calc={calc} />;
  }
  if (kind === "sports") {
    return <SportsQuickLog onClose={onClose} sportsList={sportsList} addSportSession={addSportSession} weightKg={weightKg} />;
  }
  return null;
}

function MealQuickLog({ slot, onClose, profile, addMealToSlot, calc }) {
  const presetsMap = profile?.[`${slot}Presets`] || {};
  const presets = Object.values(presetsMap);
  const [customName, setCustomName] = useState("");
  const [customKcal, setCustomKcal] = useState("");
  const [customProtein, setCustomProtein] = useState("");

  const slotLabel = slot[0].toUpperCase() + slot.slice(1);

  function logPreset(p) {
    addMealToSlot(slot, {
      name: p.name,
      presetKey: p.key,
      items: p.items,
    });
    onClose();
  }
  function logCustom() {
    const name = customName.trim() || "Custom meal";
    const kcal = Number(customKcal) || 0;
    const protein = Number(customProtein) || 0;
    if (kcal <= 0) return;
    // direct:true items embed their macros and are summed verbatim by
    // calcMeal — no FOODS table lookup needed.
    addMealToSlot(slot, {
      name,
      items: [
        {
          direct: true,
          name,
          amount: 1,
          kcal,
          protein,
          fat: 0,
          carbs: 0,
        },
      ],
    });
    onClose();
  }

  return (
    <Modal open={true} onClose={onClose} title={`Quick log ${slotLabel}`}>
      {presets.length > 0 ? (
        <>
          <div className="font-mono text-[10px] uppercase tracking-[0.25em] text-ink-muted mb-2">
            Tap a preset
          </div>
          <ul className="grid grid-cols-1 sm:grid-cols-2 gap-2 mb-4">
            {presets.map((p) => {
              const t = calc(p.items);
              return (
                <li key={p.key}>
                  <button
                    type="button"
                    onClick={() => logPreset(p)}
                    className="w-full text-left border-2 border-ink p-3 hover:bg-ink hover:text-paper transition-colors"
                  >
                    <div className="flex items-center gap-2">
                      <span className="text-xl shrink-0">{p.icon || "🍽️"}</span>
                      <div className="min-w-0 flex-1">
                        <div className="font-display text-base font-bold truncate">
                          {p.name}
                        </div>
                        <div className="font-mono text-[10px] uppercase tracking-[0.2em] opacity-70">
                          {Math.round(t.kcal)} kcal · {Math.round(t.protein)} g protein
                        </div>
                      </div>
                    </div>
                  </button>
                </li>
              );
            })}
          </ul>
        </>
      ) : (
        <div className="border-2 border-ink bg-ink/5 p-3 mb-4 font-body text-sm italic">
          No presets saved for {slotLabel} yet. Add one from the Diet tab, or use the custom entry below.
        </div>
      )}

      <div className="border-t-2 border-ink/30 pt-3 mt-2">
        <div className="font-mono text-[10px] uppercase tracking-[0.25em] text-ink-muted mb-2">
          Or log something custom
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-[1fr_100px_100px] gap-2 items-end">
          <Field label="Name">
            <TextInput
              value={customName}
              onChange={(e) => setCustomName(e.target.value)}
              placeholder="e.g. Sandwich"
            />
          </Field>
          <Field label="kcal">
            <TextInput
              type="number"
              min="0"
              value={customKcal}
              onChange={(e) => setCustomKcal(e.target.value)}
              placeholder="0"
            />
          </Field>
          <Field label="Protein (g)">
            <TextInput
              type="number"
              min="0"
              value={customProtein}
              onChange={(e) => setCustomProtein(e.target.value)}
              placeholder="0"
            />
          </Field>
        </div>
        <div className="flex justify-end mt-3">
          <Button
            variant="primary"
            size="sm"
            disabled={!customKcal || Number(customKcal) <= 0}
            onClick={logCustom}
          >
            Log custom
          </Button>
        </div>
      </div>
    </Modal>
  );
}

function SportsQuickLog({ onClose, sportsList, addSportSession, weightKg }) {
  const [duration, setDuration] = useState(30);
  const DURATIONS = [15, 30, 45, 60, 90];

  function logSport(sport) {
    addSportSession({
      sportId: sport.id,
      durationMin: duration,
      intensity: "moderate",
    });
    onClose();
  }

  return (
    <Modal open={true} onClose={onClose} title="Quick log sports">
      <div className="font-mono text-[10px] uppercase tracking-[0.25em] text-ink-muted mb-2">
        Duration
      </div>
      <div className="flex flex-wrap gap-2 mb-4">
        {DURATIONS.map((d) => (
          <button
            key={d}
            type="button"
            onClick={() => setDuration(d)}
            className={`px-3 py-1.5 border-2 font-mono text-[10px] uppercase tracking-[0.2em] ${
              duration === d
                ? "bg-ink text-paper border-ink"
                : "border-ink hover:bg-ink hover:text-paper"
            }`}
          >
            {d} min
          </button>
        ))}
      </div>

      <div className="font-mono text-[10px] uppercase tracking-[0.25em] text-ink-muted mb-2">
        Tap the sport you did
      </div>
      <ul className="grid grid-cols-2 sm:grid-cols-3 gap-2">
        {(sportsList || []).map((s) => {
          const kcal = estimateSportKcal({
            met: s.met,
            weightKg,
            durationMin: duration,
            intensity: "moderate",
          });
          return (
            <li key={s.id}>
              <button
                type="button"
                onClick={() => logSport(s)}
                className="w-full text-left border-2 border-ink p-3 hover:bg-ink hover:text-paper transition-colors"
              >
                <div className="flex items-center gap-2">
                  <span className="text-xl shrink-0">{s.icon || "🏃"}</span>
                  <div className="min-w-0 flex-1">
                    <div className="font-display text-base font-bold truncate">
                      {s.name}
                    </div>
                    <div className="font-mono text-[10px] uppercase tracking-[0.2em] opacity-70">
                      ~{kcal} kcal
                    </div>
                  </div>
                </div>
              </button>
            </li>
          );
        })}
      </ul>
    </Modal>
  );
}
