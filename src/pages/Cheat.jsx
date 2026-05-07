import { useMemo, useState } from "react";
import { useApp } from "../store/AppContext.jsx";
import { Card, CardHeader, Stat } from "../components/ui/Card.jsx";
import { Button, IconButton } from "../components/ui/Button.jsx";
import { Field, TextInput, Select, Chip } from "../components/ui/Field.jsx";
import { Modal } from "../components/ui/Modal.jsx";
import { FOODS } from "../store/profiles.js";
import { Plus, Trash2, AlertTriangle, Edit3 } from "lucide-react";

const CHEAT_TYPES = [
  { id: "fast_food", label: "Fast food", icon: "🍔" },
  { id: "dessert", label: "Dessert / Sweet", icon: "🍰" },
  { id: "alcohol", label: "Alcohol", icon: "🍻" },
  { id: "restaurant", label: "Restaurant meal", icon: "🍽️" },
  { id: "snack", label: "Junk snack", icon: "🍿" },
  { id: "fried", label: "Fried", icon: "🍟" },
  { id: "other", label: "Other", icon: "🤤" },
];

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
  const [customOpen, setCustomOpen] = useState(false);
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
            <div className="flex flex-wrap gap-2">
              <Button variant="outline" size="sm" onClick={() => setCustomOpen(true)}>
                <Edit3 size={12} /> Custom Cheat
              </Button>
              <Button variant="primary" size="sm" onClick={() => setPicker({})}>
                <Plus size={12} /> From Preset
              </Button>
            </div>
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
      {customOpen && (
        <CustomCheatModal
          onClose={() => setCustomOpen(false)}
          onLog={(meal) => {
            addCheat(meal);
            setCustomOpen(false);
          }}
        />
      )}
    </>
  );
}

function CustomCheatModal({ onClose, onLog }) {
  const [name, setName] = useState("");
  const [type, setType] = useState("fast_food");
  const [qty, setQty] = useState(1);
  const [unit, setUnit] = useState("serving");
  const [kcal, setKcal] = useState("");
  const [protein, setProtein] = useState("");
  const [carbs, setCarbs] = useState("");
  const [fat, setFat] = useState("");
  const [note, setNote] = useState("");

  function handleLog() {
    if (!name.trim()) return;
    const tDef = CHEAT_TYPES.find((t) => t.id === type) || CHEAT_TYPES[0];
    const a = Number(qty) || 1;
    onLog({
      name: name.trim(),
      icon: tDef.icon,
      cheatType: type,
      items: [
        {
          direct: true,
          name: name.trim(),
          amount: a,
          kcal: Number(kcal) || 0,
          protein: Number(protein) || 0,
          carbs: Number(carbs) || 0,
          fat: Number(fat) || 0,
        },
      ],
      note: note.trim() || `${a} ${unit}`,
    });
  }

  return (
    <Modal
      open
      onClose={onClose}
      title="Custom cheat meal"
      maxWidth="max-w-xl"
      footer={
        <>
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button variant="primary" onClick={handleLog} disabled={!name.trim()}>
            Log Cheat
          </Button>
        </>
      }
    >
      <div className="space-y-3">
        <Field label="Name">
          <TextInput
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g. Burger King Whopper meal"
          />
        </Field>
        <Field label="Type">
          <Select value={type} onChange={(e) => setType(e.target.value)}>
            {CHEAT_TYPES.map((t) => (
              <option key={t.id} value={t.id}>
                {t.icon} {t.label}
              </option>
            ))}
          </Select>
        </Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Quantity">
            <TextInput
              type="number"
              step="0.5"
              value={qty}
              onChange={(e) => setQty(e.target.value)}
            />
          </Field>
          <Field label="Unit">
            <TextInput
              value={unit}
              onChange={(e) => setUnit(e.target.value)}
              placeholder="serving, slice, can, drink"
            />
          </Field>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <Field label="kcal (per qty above)">
            <TextInput type="number" value={kcal} onChange={(e) => setKcal(e.target.value)} />
          </Field>
          <Field label="Protein (g)">
            <TextInput type="number" value={protein} onChange={(e) => setProtein(e.target.value)} />
          </Field>
          <Field label="Carbs (g)">
            <TextInput type="number" value={carbs} onChange={(e) => setCarbs(e.target.value)} />
          </Field>
          <Field label="Fat (g)">
            <TextInput type="number" value={fat} onChange={(e) => setFat(e.target.value)} />
          </Field>
        </div>
        <Field label="Note (optional)">
          <TextInput
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="e.g. with friends, late night"
          />
        </Field>
        <p className="font-body text-sm italic text-ink-muted">
          The values are scaled by the quantity you set above. Surplus over your cheat
          baseline is computed automatically.
        </p>
      </div>
    </Modal>
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
