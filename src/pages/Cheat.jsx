import { useMemo, useState } from "react";
import { useApp } from "../store/AppContext.jsx";
import { Card, CardHeader, Stat } from "../components/ui/Card.jsx";
import { Button, IconButton } from "../components/ui/Button.jsx";
import { Field, TextInput, Chip } from "../components/ui/Field.jsx";
import { Modal } from "../components/ui/Modal.jsx";
import { FOODS } from "../store/profiles.js";
import { Plus, Trash2, AlertTriangle } from "lucide-react";

export function Cheat() {
  const {
    profile,
    cheats,
    addCheat,
    removeCheat,
    cheatSurplus,
    dailyTargetKcal,
    calc,
  } = useApp();

  const [picker, setPicker] = useState(null);
  const presets = profile.cheatPresets || {};

  function logCheat(preset, versionKey) {
    const version = preset.versions[versionKey];
    if (!version) return;
    addCheat({
      name: `${preset.name} — ${version.label}`,
      icon: preset.icon,
      presetKey: preset.key,
      versionKey,
      items: version.items.map((i) => ({ ...i })),
      note: version.note,
    });
    setPicker(null);
  }

  const baseline = profile.cheatBaselineKcal || 1000;

  return (
    <>
      <Card>
        <CardHeader
          kicker="Cheat Meals"
          title="Track the splurges"
          subtitle={`Anything over ${baseline} kcal counts as surplus toward weekly drift.`}
          right={
            <Button variant="primary" size="sm" onClick={() => setPicker({})}>
              <Plus size={12} /> Log Cheat
            </Button>
          }
        />

        <div className="grid grid-cols-2 md:grid-cols-3 gap-3 mb-4">
          <Stat label="Cheats Today" value={cheats.length} />
          <Stat label="Baseline" value={baseline} suffix="kcal" accent="#3b6aa3" />
          <Stat label="Surplus" value={Math.round(cheatSurplus)} suffix="kcal" accent="#c44827" />
        </div>

        {Object.keys(presets).length === 0 && (
          <div className="border-2 border-accent bg-accent/5 px-3 py-2 flex items-start gap-2">
            <AlertTriangle size={14} className="text-accent mt-0.5 shrink-0" />
            <p className="font-body text-sm">
              No cheat presets in this profile. Switch to the Saidur profile or add some.
            </p>
          </div>
        )}

        {cheats.length === 0 ? (
          <p className="font-body text-ink-muted italic">No cheat meals today — keep it clean.</p>
        ) : (
          <ul className="divide-y divide-ink/30 border-y border-ink/30">
            {cheats.map((m) => {
              const t = calc(m.items);
              const overBy = Math.max(0, t.kcal - baseline);
              return (
                <li key={m.id} className="py-2 flex items-start gap-3">
                  <span className="text-2xl">{m.icon || "🍔"}</span>
                  <div className="flex-1 min-w-0">
                    <div className="font-body text-base flex items-center gap-2 flex-wrap">
                      {m.name}
                      {overBy > 0 && (
                        <Chip color="#c44827">+{Math.round(overBy)} kcal surplus</Chip>
                      )}
                    </div>
                    <div className="font-mono text-[10px] uppercase tracking-[0.2em] text-ink-muted">
                      {Math.round(t.kcal)} kcal · {Math.round(t.protein)}g protein
                    </div>
                    {m.note && (
                      <p className="font-body text-sm italic text-ink-muted mt-1">{m.note}</p>
                    )}
                  </div>
                  <IconButton onClick={() => removeCheat(m.id)} aria-label="Remove">
                    <Trash2 size={14} />
                  </IconButton>
                </li>
              );
            })}
          </ul>
        )}
      </Card>

      <Card>
        <CardHeader kicker="Catalog" title="Cheat Presets" />
        {Object.keys(presets).length === 0 ? (
          <p className="font-body italic text-ink-muted">No cheat presets in this profile.</p>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {Object.values(presets).map((p) => {
              const v = p.versions.original || Object.values(p.versions)[0];
              const t = calc(v.items);
              return (
                <button
                  key={p.key}
                  onClick={() => setPicker({ preset: p })}
                  className="border-2 border-ink p-3 text-left hover:bg-ink hover:text-paper transition-colors group"
                >
                  <div className="flex items-baseline gap-2">
                    <span className="text-2xl">{p.icon}</span>
                    <div className="flex-1">
                      <h4 className="font-display text-xl font-bold">{p.name}</h4>
                      <div className="font-mono text-[10px] uppercase tracking-[0.2em] text-ink-muted group-hover:text-paper/70">
                        {Object.keys(p.versions).length} versions · ~{Math.round(t.kcal)} kcal
                      </div>
                      {p.note && <p className="font-body text-sm italic mt-1">{p.note}</p>}
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </Card>

      {picker && (
        <CheatPickerModal
          presets={picker.preset ? { [picker.preset.key]: picker.preset } : presets}
          onClose={() => setPicker(null)}
          onLog={logCheat}
        />
      )}
    </>
  );
}

function CheatPickerModal({ presets, onClose, onLog }) {
  const { calc } = useApp();
  return (
    <Modal open onClose={onClose} title="Pick a cheat" maxWidth="max-w-xl">
      <div className="space-y-3">
        {Object.values(presets).map((p) => (
          <div key={p.key} className="border-2 border-ink p-3">
            <div className="flex items-baseline gap-2 mb-2">
              <span className="text-2xl">{p.icon}</span>
              <div>
                <h4 className="font-display text-xl font-bold">{p.name}</h4>
                {p.note && <p className="font-body text-sm italic">{p.note}</p>}
              </div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {Object.entries(p.versions).map(([key, v]) => {
                const t = calc(v.items);
                return (
                  <button
                    key={key}
                    onClick={() => onLog(p, key)}
                    className="border-2 border-ink p-2 text-left hover:bg-ink hover:text-paper transition-colors group"
                  >
                    <div className="font-mono text-[10px] uppercase tracking-[0.25em]">{v.label}</div>
                    <div className="font-display text-lg font-bold mt-1">
                      {Math.round(t.kcal)} kcal · {Math.round(t.protein)}g
                    </div>
                    {v.note && (
                      <p className="font-body text-sm italic group-hover:text-paper/80">
                        {v.note}
                      </p>
                    )}
                    <div className="flex flex-wrap gap-1 mt-1">
                      {v.items.map((it, i) => {
                        const f = FOODS[it.food];
                        if (!f) return null;
                        return (
                          <span
                            key={i}
                            className="font-mono text-[9px] uppercase tracking-[0.2em] text-ink-muted group-hover:text-paper/70"
                          >
                            {f.display.split("(")[0].trim()} {it.amount}{f.unit}
                          </span>
                        );
                      })}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        ))}
      </div>
    </Modal>
  );
}
