import { useMemo, useRef, useState } from "react";
import { useApp } from "../store/AppContext.jsx";
import { Card, CardHeader, Stat } from "../components/ui/Card.jsx";
import { Button, IconButton } from "../components/ui/Button.jsx";
import { Field, TextInput, Select, Chip, ProgressBar } from "../components/ui/Field.jsx";
import { Modal } from "../components/ui/Modal.jsx";
import { FOODS } from "../store/profiles.js";
import { analyzeFoodPhoto, suggestEatOut, fileToResizedBase64 } from "../lib/aiVision.js";
import {
  Plus,
  Trash2,
  Coffee,
  Footprints,
  Camera,
  Sparkles,
  AlertTriangle,
  Loader2,
  Lightbulb,
  Droplet,
  Minus,
} from "lucide-react";

const SLOTS = [
  { id: "lunch", label: "Lunch", icon: "🍱" },
  { id: "shake", label: "Shake", icon: "🥤" },
  { id: "dinner", label: "Dinner", icon: "🍽️" },
  { id: "snack", label: "Snack", icon: "🥜" },
];

export function Diet() {
  const {
    profile,
    meals,
    addMealToSlot,
    removeMealFromSlot,
    cheats,
    cheatSurplus,
    coffee,
    toggleCoffee,
    steps,
    setSteps,
    stepAdjustKcal,
    water,
    incrementWater,
    decrementWater,
    dayTypeId,
    setDayTypeId,
    dayType,
    dayTotals,
    dailyTargetKcal,
    todaysWorkoutKcal,
    apiKey,
    showSnack,
    shouldSuggestLightDinner,
    clearDay,
    calc,
  } = useApp();

  const [presetModal, setPresetModal] = useState(null);
  const [photoModal, setPhotoModal] = useState(null);
  const [eatOutModal, setEatOutModal] = useState(null);
  const [customModal, setCustomModal] = useState(null);

  const remaining = dailyTargetKcal - dayTotals.kcal;
  const proteinPct = profile.proteinTarget ? Math.round((dayTotals.protein / profile.proteinTarget) * 100) : 0;

  function logPreset(slot, preset) {
    addMealToSlot(slot, {
      name: preset.name,
      icon: preset.icon,
      presetKey: preset.key,
      items: preset.items.map((i) => ({ ...i })),
      note: preset.note,
    });
    setPresetModal(null);
  }

  function logCustomMeal(slot, meal) {
    addMealToSlot(slot, meal);
    setCustomModal(null);
  }

  function logPhotoMeal(slot, photoMeal) {
    addMealToSlot(slot, {
      name: photoMeal.name,
      icon: "📷",
      items: [
        {
          direct: true,
          name: photoMeal.name,
          amount: 1,
          kcal: photoMeal.kcal,
          protein: photoMeal.protein_g,
          fat: photoMeal.fat_g,
          carbs: photoMeal.carbs_g,
        },
      ],
      note: photoMeal.notes,
    });
    setPhotoModal(null);
  }

  function logEatOutSuggestion(slot, sug) {
    addMealToSlot(slot, {
      name: sug.name,
      icon: "🍴",
      items: [
        {
          direct: true,
          name: sug.name,
          amount: 1,
          kcal: sug.kcal,
          protein: sug.protein_g,
          fat: sug.fat_g,
          carbs: sug.carbs_g,
        },
      ],
      note: sug.why,
    });
    setEatOutModal(null);
  }

  return (
    <>
      {/* Day-type + Steps + Energy summary */}
      <Card>
        <CardHeader
          kicker="Today"
          title="Day Type & Energy"
          subtitle="Pick your day type — target adjusts automatically."
          right={
            <Button variant="ghost" size="sm" onClick={() => {
              if (confirm("Clear today's meals, coffee, and steps?")) clearDay();
            }}>
              Reset Day
            </Button>
          }
        />

        {/* Day-type chips */}
        <div className="flex flex-wrap gap-2 mb-4">
          {profile.dayTypes.map((dt) => (
            <button
              key={dt.id}
              onClick={() => setDayTypeId(dt.id)}
              className={`border-2 px-3 py-1.5 font-mono text-[10px] uppercase tracking-[0.2em] flex items-center gap-1 ${
                dayTypeId === dt.id ? "text-paper" : "text-ink hover:bg-ink/10"
              }`}
              style={{
                borderColor: dt.color,
                backgroundColor: dayTypeId === dt.id ? dt.color : "transparent",
              }}
            >
              <span>{dt.icon}</span>
              {dt.label}
              <span className="opacity-70">{dt.target}</span>
            </button>
          ))}
        </div>

        {/* Step counter */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-4">
          <div className="border-2 border-ink p-3 md:col-span-2">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <Footprints size={14} />
                <span className="font-mono text-[10px] uppercase tracking-[0.25em] text-ink-muted">
                  Steps Today
                </span>
              </div>
              {stepAdjustKcal !== 0 && (
                <Chip color={stepAdjustKcal > 0 ? "#4a6b3e" : "#c44827"}>
                  {stepAdjustKcal > 0 ? "+" : ""}
                  {stepAdjustKcal} kcal
                </Chip>
              )}
            </div>
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" onClick={() => setSteps(Math.max(0, steps - 1000))}>
                −1k
              </Button>
              <input
                type="number"
                value={steps}
                onChange={(e) => setSteps(Math.max(0, Number(e.target.value) || 0))}
                className="flex-1 border-2 border-ink bg-paper px-2 py-1.5 font-display text-2xl font-black text-center"
              />
              <Button variant="outline" size="sm" onClick={() => setSteps(steps + 1000)}>
                +1k
              </Button>
            </div>
            <div className="font-mono text-[10px] uppercase tracking-[0.2em] text-ink-muted mt-1 italic">
              Baseline {profile.stepAdjust?.baseline?.toLocaleString() || "—"} ·{" "}
              {profile.stepAdjust?.lowThreshold?.toLocaleString() || "—"} low ·{" "}
              {profile.stepAdjust?.highThreshold?.toLocaleString() || "—"} high
            </div>
          </div>
          <Stat label="Daily Target" value={dailyTargetKcal} suffix="kcal" accent="#3b6aa3" />
        </div>

        {/* Macros */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <Stat label="Eaten" value={Math.round(dayTotals.kcal)} suffix="kcal" />
          <Stat
            label="Protein"
            value={Math.round(dayTotals.protein)}
            suffix={`/ ${profile.proteinTarget}g`}
            accent={dayTotals.protein >= profile.proteinTarget ? "#4a6b3e" : "#c44827"}
          />
          <Stat
            label={remaining >= 0 ? "Remaining" : "Over"}
            value={Math.abs(Math.round(remaining))}
            suffix="kcal"
            accent={remaining >= 0 ? "#4a6b3e" : "#c44827"}
          />
          <Stat
            label="Workout +"
            value={Math.round(todaysWorkoutKcal)}
            suffix="kcal"
            accent="#6b5a3e"
          />
        </div>

        <div className="mt-3">
          <ProgressBar value={dayTotals.kcal} max={dailyTargetKcal} />
          <div className="flex items-center justify-between mt-1">
            <span className="font-mono text-[10px] uppercase tracking-[0.25em] text-ink-muted">
              {Math.round(dayTotals.kcal)} / {dailyTargetKcal} kcal · {proteinPct}% protein
            </span>
            {cheats.length > 0 && (
              <span className="font-mono text-[10px] uppercase tracking-[0.25em] text-accent">
                Cheats: {cheats.length} · Surplus +{Math.round(cheatSurplus)} kcal
              </span>
            )}
          </div>
        </div>
      </Card>

      {/* Light dinner banner */}
      {shouldSuggestLightDinner && (
        <div className="border-2 border-accent bg-accent/5 px-4 py-3 flex items-start gap-2">
          <Lightbulb size={16} className="text-accent mt-0.5 shrink-0" />
          <div className="flex-1">
            <div className="font-mono text-[10px] uppercase tracking-[0.25em] text-accent">
              Light dinner suggested
            </div>
            <div className="font-body text-sm">
              Heavy lunch logged — {profile.dinnerPresets[shouldSuggestLightDinner]?.name}{" "}
              recommended to balance the day.
            </div>
          </div>
          <Button
            variant="accent"
            size="sm"
            onClick={() => logPreset("dinner", profile.dinnerPresets[shouldSuggestLightDinner])}
          >
            Log it
          </Button>
        </div>
      )}

      {/* Coffee tracker */}
      {profile.coffeeSchedule.length > 0 && (
        <Card>
          <CardHeader
            kicker="Caffeine"
            title="Coffee Tracker"
            subtitle="Tap each cup as you have it."
          />
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2">
            {profile.coffeeSchedule.map((c, i) => {
              const had = !!coffee[i];
              return (
                <button
                  key={i}
                  onClick={() => toggleCoffee(i)}
                  className={`border-2 border-ink px-3 py-2 text-left flex items-center gap-2 ${
                    had ? "bg-ink text-paper" : "bg-paper hover:bg-ink/5"
                  }`}
                >
                  <Coffee size={14} className={had ? "text-paper" : "text-ink-muted"} />
                  <div className="flex-1 min-w-0">
                    <div className="font-body text-base">{c.label}</div>
                    <div className={`font-mono text-[10px] uppercase tracking-[0.2em] ${had ? "text-paper/70" : "text-ink-muted"}`}>
                      {c.time}
                    </div>
                  </div>
                  {had && <span className="font-mono text-[10px]">✓</span>}
                </button>
              );
            })}
          </div>
        </Card>
      )}

      {/* Water tracker */}
      <Card>
        <CardHeader
          kicker="Hydration"
          title={`${water} / ${profile.waterTarget || 8} cups`}
          subtitle={
            water >= (profile.waterTarget || 8)
              ? "Hydration goal hit — nice."
              : `${(profile.waterTarget || 8) - water} cup${(profile.waterTarget || 8) - water === 1 ? "" : "s"} to go.`
          }
          right={
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" onClick={decrementWater}>
                <Minus size={12} /> Cup
              </Button>
              <Button variant="primary" size="sm" onClick={incrementWater}>
                <Plus size={12} /> Cup
              </Button>
            </div>
          }
        />
        <div className="flex flex-wrap gap-1.5">
          {Array.from({ length: profile.waterTarget || 8 }).map((_, i) => {
            const filled = i < water;
            return (
              <button
                key={i}
                onClick={() => (filled ? decrementWater() : incrementWater())}
                aria-label={filled ? "Remove cup" : "Add cup"}
                className="w-10 h-10 border-2 border-ink flex items-center justify-center transition-colors hover:bg-ink/10"
                style={{
                  backgroundColor: filled ? "#3b6aa3" : "transparent",
                  color: filled ? "#f4ede0" : "#3b6aa3",
                }}
              >
                <Droplet size={18} fill={filled ? "#f4ede0" : "none"} />
              </button>
            );
          })}
          {water > (profile.waterTarget || 8) && (
            <span className="font-mono text-[10px] uppercase tracking-[0.25em] text-good self-center ml-2">
              +{water - (profile.waterTarget || 8)} bonus
            </span>
          )}
        </div>
      </Card>

      {/* Meal slots */}
      {SLOTS.map((slot) => {
        const items = meals[slot.id];
        const totalKcal = items.reduce((s, m) => s + calc(m.items).kcal, 0);
        const totalProtein = items.reduce((s, m) => s + calc(m.items).protein, 0);

        const presetMap =
          slot.id === "lunch"
            ? profile.lunchPresets
            : slot.id === "shake"
              ? profile.shakePresets
              : slot.id === "dinner"
                ? profile.dinnerPresets
                : {};
        const hasPresets = Object.keys(presetMap).length > 0;
        const suggestedShake = slot.id === "shake" && dayType?.suggestShake;

        return (
          <Card key={slot.id}>
            <CardHeader
              kicker={`${slot.icon} ${slot.label}`}
              title={`${Math.round(totalKcal)} kcal`}
              subtitle={`${items.length} meal${items.length === 1 ? "" : "s"} · ${Math.round(totalProtein)}g protein${suggestedShake ? ` · suggested: ${profile.shakePresets[suggestedShake]?.name}` : ""}`}
              right={
                <div className="flex flex-wrap gap-2 justify-end">
                  {hasPresets && (
                    <Button variant="primary" size="sm" onClick={() => setPresetModal({ slot: slot.id, presets: presetMap })}>
                      <Plus size={12} /> Preset
                    </Button>
                  )}
                  <Button variant="outline" size="sm" onClick={() => setCustomModal({ slot: slot.id })}>
                    <Plus size={12} /> Custom
                  </Button>
                  <Button variant="outline" size="sm" onClick={() => setPhotoModal({ slot: slot.id })}>
                    <Camera size={12} /> Photo
                  </Button>
                  <Button variant="outline" size="sm" onClick={() => setEatOutModal({ slot: slot.id })}>
                    <Sparkles size={12} /> Eat-Out
                  </Button>
                </div>
              }
            />
            {items.length === 0 ? (
              <p className="font-body text-ink-muted italic">Nothing logged.</p>
            ) : (
              <ul className="divide-y divide-ink/30 border-y border-ink/30">
                {items.map((m) => {
                  const t = calc(m.items);
                  return (
                    <li key={m.id} className="py-2 flex items-start gap-3">
                      <span className="text-2xl">{m.icon || "🍽️"}</span>
                      <div className="flex-1 min-w-0">
                        <div className="font-body text-base">{m.name}</div>
                        <div className="font-mono text-[10px] uppercase tracking-[0.2em] text-ink-muted">
                          {Math.round(t.kcal)} kcal · {Math.round(t.protein)}g protein
                          {t.fat ? ` · ${Math.round(t.fat)}f` : ""}
                          {t.carbs ? ` · ${Math.round(t.carbs)}c` : ""}
                        </div>
                        <ItemList items={m.items} />
                        {m.note && (
                          <p className="font-body text-sm italic text-ink-muted mt-1">
                            {m.note}
                          </p>
                        )}
                      </div>
                      <IconButton onClick={() => removeMealFromSlot(slot.id, m.id)} aria-label="Remove">
                        <Trash2 size={14} />
                      </IconButton>
                    </li>
                  );
                })}
              </ul>
            )}
          </Card>
        );
      })}

      {presetModal && (
        <PresetPickerModal
          slot={presetModal.slot}
          presets={presetModal.presets}
          onClose={() => setPresetModal(null)}
          onPick={(p) => logPreset(presetModal.slot, p)}
        />
      )}
      {customModal && (
        <CustomMealModal
          slot={customModal.slot}
          onClose={() => setCustomModal(null)}
          onSave={(m) => logCustomMeal(customModal.slot, m)}
        />
      )}
      {photoModal && (
        <PhotoMealModal
          slot={photoModal.slot}
          apiKey={apiKey}
          onClose={() => setPhotoModal(null)}
          onConfirm={(m) => logPhotoMeal(photoModal.slot, m)}
        />
      )}
      {eatOutModal && (
        <EatOutModal
          slot={eatOutModal.slot}
          apiKey={apiKey}
          target={{ kcal: dailyTargetKcal, protein: profile.proteinTarget }}
          logged={dayTotals}
          eatingWindow={profile.eatingWindow}
          onClose={() => setEatOutModal(null)}
          onPick={(s) => logEatOutSuggestion(eatOutModal.slot, s)}
        />
      )}
    </>
  );
}

function ItemList({ items }) {
  if (!items || items.length === 0) return null;
  return (
    <div className="flex flex-wrap gap-1.5 mt-1">
      {items.map((it, i) => {
        if (it.direct) {
          return (
            <Chip key={i} color="#6b5a3e">
              {it.name} ×{it.amount}
            </Chip>
          );
        }
        const f = FOODS[it.food];
        if (!f) return null;
        return (
          <Chip key={i} color="#6b5a3e">
            {f.display.split("(")[0].trim()} {it.amount}
            {f.unit}
          </Chip>
        );
      })}
    </div>
  );
}

function PresetPickerModal({ slot, presets, onClose, onPick }) {
  const { calc } = useApp();
  return (
    <Modal open onClose={onClose} title={`Pick a ${slot} preset`}>
      <div className="space-y-2">
        {Object.values(presets).map((p) => {
          const t = calc(p.items);
          return (
            <button
              key={p.key}
              onClick={() => onPick(p)}
              className="w-full text-left border-2 border-ink p-3 hover:bg-ink hover:text-paper transition-colors group"
            >
              <div className="flex items-baseline gap-2">
                <span className="text-2xl">{p.icon}</span>
                <div className="flex-1">
                  <div className="font-display text-xl font-bold">{p.name}</div>
                  <div className="font-mono text-[10px] uppercase tracking-[0.2em] text-ink-muted group-hover:text-paper/70">
                    {Math.round(t.kcal)} kcal · {Math.round(t.protein)}g protein
                  </div>
                  {p.note && (
                    <div className="font-body text-sm italic mt-1">{p.note}</div>
                  )}
                </div>
              </div>
            </button>
          );
        })}
        {Object.keys(presets).length === 0 && (
          <p className="italic text-ink-muted">No presets — add some in Profile.</p>
        )}
      </div>
    </Modal>
  );
}

function CustomMealModal({ slot, onClose, onSave }) {
  const { calc } = useApp();
  const [name, setName] = useState("");
  const [items, setItems] = useState([{ food: Object.keys(FOODS)[0], amount: 100 }]);
  const [direct, setDirect] = useState(false);
  const [directKcal, setDirectKcal] = useState("");
  const [directProtein, setDirectProtein] = useState("");
  const [directFat, setDirectFat] = useState("");
  const [directCarbs, setDirectCarbs] = useState("");

  function addItem() {
    setItems([...items, { food: Object.keys(FOODS)[0], amount: 100 }]);
  }
  function updateItem(idx, patch) {
    const copy = [...items];
    copy[idx] = { ...copy[idx], ...patch };
    setItems(copy);
  }
  function removeItem(idx) {
    setItems(items.filter((_, i) => i !== idx));
  }

  function handleSave() {
    if (!name.trim()) return;
    if (direct) {
      onSave({
        name: name.trim(),
        icon: "✏️",
        items: [
          {
            direct: true,
            name: name.trim(),
            amount: 1,
            kcal: Number(directKcal) || 0,
            protein: Number(directProtein) || 0,
            fat: Number(directFat) || 0,
            carbs: Number(directCarbs) || 0,
          },
        ],
      });
    } else {
      onSave({ name: name.trim(), icon: "✏️", items });
    }
  }

  return (
    <Modal
      open
      onClose={onClose}
      title={`Custom ${slot}`}
      maxWidth="max-w-2xl"
      footer={
        <>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button variant="primary" onClick={handleSave} disabled={!name.trim()}>
            Log
          </Button>
        </>
      }
    >
      <div className="space-y-3">
        <Field label="Meal name">
          <TextInput value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Chipotle bowl" />
        </Field>

        <div className="flex gap-2">
          <button
            onClick={() => setDirect(false)}
            className={`flex-1 border-2 border-ink py-2 font-mono text-[10px] uppercase tracking-[0.2em] ${
              !direct ? "bg-ink text-paper" : "hover:bg-ink/10"
            }`}
          >
            Compose from foods
          </button>
          <button
            onClick={() => setDirect(true)}
            className={`flex-1 border-2 border-ink py-2 font-mono text-[10px] uppercase tracking-[0.2em] ${
              direct ? "bg-ink text-paper" : "hover:bg-ink/10"
            }`}
          >
            Type macros directly
          </button>
        </div>

        {direct ? (
          <div className="grid grid-cols-2 gap-3">
            <Field label="kcal">
              <TextInput type="number" value={directKcal} onChange={(e) => setDirectKcal(e.target.value)} />
            </Field>
            <Field label="protein (g)">
              <TextInput type="number" value={directProtein} onChange={(e) => setDirectProtein(e.target.value)} />
            </Field>
            <Field label="fat (g)">
              <TextInput type="number" value={directFat} onChange={(e) => setDirectFat(e.target.value)} />
            </Field>
            <Field label="carbs (g)">
              <TextInput type="number" value={directCarbs} onChange={(e) => setDirectCarbs(e.target.value)} />
            </Field>
          </div>
        ) : (
          <div className="space-y-2">
            {items.map((it, i) => {
              const f = FOODS[it.food];
              const t = calc([it]);
              return (
                <div key={i} className="flex gap-2 items-end">
                  <Select
                    value={it.food}
                    onChange={(e) => updateItem(i, { food: e.target.value })}
                    className="flex-1"
                  >
                    {Object.values(FOODS).map((f) => (
                      <option key={f.key} value={f.key}>
                        {f.display}
                      </option>
                    ))}
                  </Select>
                  <TextInput
                    type="number"
                    className="!w-24"
                    value={it.amount}
                    onChange={(e) => updateItem(i, { amount: Number(e.target.value) || 0 })}
                  />
                  <span className="font-mono text-[10px] uppercase tracking-[0.2em] text-ink-muted w-10">
                    {f?.unit}
                  </span>
                  <span className="font-mono text-[10px] uppercase tracking-[0.2em] text-ink-muted w-20 text-right">
                    {Math.round(t.kcal)}k {Math.round(t.protein)}p
                  </span>
                  <IconButton onClick={() => removeItem(i)} aria-label="Remove">
                    <Trash2 size={12} />
                  </IconButton>
                </div>
              );
            })}
            <Button variant="ghost" size="sm" onClick={addItem}>
              <Plus size={12} /> Add ingredient
            </Button>
            <div className="font-mono text-[10px] uppercase tracking-[0.2em] text-ink-muted text-right">
              Total: {Math.round(calc(items).kcal)} kcal · {Math.round(calc(items).protein)}g protein
            </div>
          </div>
        )}
      </div>
    </Modal>
  );
}

function PhotoMealModal({ slot, apiKey, onClose, onConfirm }) {
  const [preview, setPreview] = useState(null);
  const [base64, setBase64] = useState(null);
  const [mediaType, setMediaType] = useState("image/jpeg");
  const [quantity, setQuantity] = useState("");
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);
  const inputRef = useRef(null);

  async function handleFile(file) {
    if (!file) return;
    setError(null);
    setResult(null);
    try {
      const { dataUrl, base64, mediaType } = await fileToResizedBase64(file);
      setPreview(dataUrl);
      setBase64(base64);
      setMediaType(mediaType);
    } catch (e) {
      setError(e.message);
    }
  }

  async function analyze() {
    if (!apiKey) {
      setError("Add your Anthropic API key on the Profile tab first.");
      return;
    }
    if (!base64) {
      setError("Choose a photo first.");
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const r = await analyzeFoodPhoto({ apiKey, base64, mediaType, quantity });
      setResult(r);
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <Modal
      open
      onClose={onClose}
      title={`Photo → ${slot}`}
      maxWidth="max-w-xl"
      footer={
        <>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          {result ? (
            <Button variant="primary" onClick={() => onConfirm(result)}>
              Log {result.name} ({result.kcal} kcal)
            </Button>
          ) : (
            <Button variant="primary" onClick={analyze} disabled={busy || !base64}>
              {busy ? <Loader2 size={12} className="animate-spin" /> : <Sparkles size={12} />}
              {busy ? "Analyzing…" : "Analyze"}
            </Button>
          )}
        </>
      }
    >
      <div className="space-y-3">
        {!apiKey && (
          <div className="border-2 border-accent bg-accent/5 px-3 py-2 flex items-start gap-2">
            <AlertTriangle size={14} className="text-accent mt-0.5 shrink-0" />
            <p className="font-body text-sm">
              No API key set. Add an Anthropic API key on the <strong>Profile</strong> tab.
            </p>
          </div>
        )}
        <input
          ref={inputRef}
          type="file"
          accept="image/*"
          capture="environment"
          onChange={(e) => handleFile(e.target.files?.[0])}
          className="hidden"
        />
        {preview ? (
          <button
            onClick={() => inputRef.current?.click()}
            className="border-2 border-ink w-full aspect-video bg-ink/5 overflow-hidden"
          >
            <img src={preview} alt="meal" className="w-full h-full object-contain" />
          </button>
        ) : (
          <button
            onClick={() => inputRef.current?.click()}
            className="border-2 border-dashed border-ink w-full aspect-video flex flex-col items-center justify-center gap-2 hover:bg-ink/5"
          >
            <Camera size={24} />
            <span className="font-mono text-[10px] uppercase tracking-[0.25em]">
              Tap to take or choose a photo
            </span>
          </button>
        )}
        <Field label="Quantity hint (optional)">
          <TextInput
            value={quantity}
            onChange={(e) => setQuantity(e.target.value)}
            placeholder="e.g. 1 plate, 2 slices, 250g"
          />
        </Field>
        {error && (
          <div className="border-2 border-accent bg-accent/5 px-3 py-2 font-body text-sm text-accent">
            {error}
          </div>
        )}
        {result && (
          <div className="border-2 border-good bg-good/5 px-3 py-2 space-y-1">
            <div className="flex items-center justify-between">
              <h4 className="font-display text-xl font-bold">{result.name}</h4>
              <Chip color="#4a6b3e">conf: {result.confidence}</Chip>
            </div>
            <div className="font-mono text-[10px] uppercase tracking-[0.2em]">
              {result.kcal} kcal · {result.protein_g}p · {result.fat_g}f · {result.carbs_g}c
            </div>
            {result.notes && <p className="font-body text-sm italic">{result.notes}</p>}
          </div>
        )}
      </div>
    </Modal>
  );
}

function EatOutModal({ slot, apiKey, target, logged, eatingWindow, onClose, onPick }) {
  const [location, setLocation] = useState("");
  const [notes, setNotes] = useState("");
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);

  async function go() {
    if (!apiKey) {
      setError("Add your Anthropic API key on the Profile tab first.");
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const r = await suggestEatOut({
        apiKey,
        target,
        logged: { kcal: logged.kcal, protein: logged.protein },
        slot,
        location,
        notes,
        eatingWindow,
      });
      setResult(r);
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <Modal
      open
      onClose={onClose}
      title="Eating-out suggestions"
      maxWidth="max-w-2xl"
      footer={
        <Button variant="primary" onClick={go} disabled={busy}>
          {busy ? <Loader2 size={12} className="animate-spin" /> : <Sparkles size={12} />}
          {busy ? "Thinking…" : result ? "Re-suggest" : "Suggest 3 orders"}
        </Button>
      }
    >
      <div className="space-y-3">
        {!apiKey && (
          <div className="border-2 border-accent bg-accent/5 px-3 py-2 flex items-start gap-2">
            <AlertTriangle size={14} className="text-accent mt-0.5 shrink-0" />
            <p className="font-body text-sm">
              Set your Anthropic API key on the <strong>Profile</strong> tab.
            </p>
          </div>
        )}
        <Field label="Restaurant or cuisine">
          <TextInput
            value={location}
            onChange={(e) => setLocation(e.target.value)}
            placeholder="e.g. Chipotle, Bengali biryani"
          />
        </Field>
        <Field label="Notes (optional)">
          <TextInput
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="e.g. avoid dairy, want extra protein"
          />
        </Field>
        {error && (
          <div className="border-2 border-accent bg-accent/5 px-3 py-2 font-body text-sm text-accent">
            {error}
          </div>
        )}
        {result && (
          <div className="space-y-2">
            <div className="font-mono text-[10px] uppercase tracking-[0.25em] text-ink-muted">
              Remaining today: {result.remaining.kcal} kcal · {result.remaining.protein}g protein
            </div>
            {result.suggestions.map((s, i) => (
              <button
                key={i}
                onClick={() => onPick(s)}
                className="w-full text-left border-2 border-ink p-3 hover:bg-ink hover:text-paper transition-colors group"
              >
                <div className="flex items-baseline justify-between gap-2">
                  <h4 className="font-display text-xl font-bold">{s.name}</h4>
                  <span className="font-mono text-[10px] uppercase tracking-[0.2em] text-ink-muted group-hover:text-paper/70">
                    {s.kcal} kcal · {s.protein_g}p
                  </span>
                </div>
                <p className="font-body text-sm italic">{s.why}</p>
              </button>
            ))}
            {result.advice && (
              <div className="border-2 border-good bg-good/5 px-3 py-2">
                <div className="font-mono text-[10px] uppercase tracking-[0.25em] text-good mb-1">
                  Rest-of-day advice
                </div>
                <p className="font-body text-sm">{result.advice}</p>
              </div>
            )}
          </div>
        )}
      </div>
    </Modal>
  );
}
