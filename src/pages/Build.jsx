import { useMemo, useState } from "react";
import { useApp } from "../store/AppContext.jsx";
import { Card, CardHeader, Stat } from "../components/ui/Card.jsx";
import { Button, IconButton } from "../components/ui/Button.jsx";
import { Field, TextInput, Select, Chip } from "../components/ui/Field.jsx";
import { FOODS, getAllFoods } from "../store/profiles.js";
import { Plus, Trash2, Save, BookOpen } from "lucide-react";

const SLOTS = ["lunch", "shake", "dinner", "snack"];

export function Build({ setTab }) {
  const { addMealToSlot, dayTotals, dailyTargetKcal, profile, calc, customFoods } = useApp();
  const allFoods = useMemo(() => getAllFoods(customFoods), [customFoods]);

  const [name, setName] = useState("");
  const [icon, setIcon] = useState("✏️");
  const [slot, setSlot] = useState("lunch");
  const [items, setItems] = useState([]);

  function addItem(foodKey) {
    const f = allFoods.find((x) => x.key === foodKey);
    if (!f) return;
    const defaultAmount = f.unit === "pc" || f.unit === "tbsp" || f.unit === "tsp" || f.unit === "cup" || f.unit === "slice" ? 1 : 100;
    setItems((prev) => [...prev, { food: foodKey, amount: defaultAmount }]);
  }
  function updateAmount(idx, amount) {
    setItems((prev) => {
      const copy = [...prev];
      copy[idx] = { ...copy[idx], amount: Number(amount) || 0 };
      return copy;
    });
  }
  function removeItem(idx) {
    setItems((prev) => prev.filter((_, i) => i !== idx));
  }
  function clear() {
    setName("");
    setItems([]);
    setIcon("✏️");
  }

  const totals = useMemo(() => calc(items), [items, calc]);
  const remaining = dailyTargetKcal - dayTotals.kcal;
  const wouldBe = dayTotals.kcal + totals.kcal;
  const wouldExceed = wouldBe > dailyTargetKcal;

  // Group foods by their natural categories for the picker
  const grouped = useMemo(() => {
    const out = {
      Protein: ["chicken_thigh", "chicken_legs", "chicken_breast", "beef_lean", "fish", "egg"],
      "Carbs / Pantry": ["rice", "khichuri_mix", "tehari_rice", "pizza_regular", "pizza_chicken_thin"],
      "Fats / Oils": ["bhuna_oil", "ghee", "oil_spray"],
      "Dairy / Nuts": ["milk", "cashew", "dates", "peanut"],
      "Fresh / Sauce": ["cucumber", "fruit_mixed", "sauce"],
    };
    const userAdded = Object.keys(customFoods).filter(
      (k) => !FOODS[k] && customFoods[k]?.display,
    );
    if (userAdded.length) out["Your Added Foods"] = userAdded;
    return out;
  }, [customFoods]);

  function logIt() {
    if (!name.trim() || items.length === 0) return;
    addMealToSlot(slot, {
      name: name.trim(),
      icon,
      items: items.map((i) => ({ ...i })),
    });
    clear();
  }

  return (
    <>
      <Card>
        <CardHeader
          kicker="Build"
          title="Custom Meal Composer"
          subtitle="Compose any meal from the food library and log it directly to a slot."
        />
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-4">
          <Stat label="Meal kcal" value={Math.round(totals.kcal)} suffix="kcal" />
          <Stat label="Protein" value={Math.round(totals.protein)} suffix="g" accent="#c44827" />
          <Stat
            label={wouldExceed ? "Would Exceed" : "After Logging"}
            value={Math.round(wouldExceed ? wouldBe - dailyTargetKcal : remaining - totals.kcal)}
            suffix="kcal"
            accent={wouldExceed ? "#c44827" : "#4a6b3e"}
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <Field label="Meal name">
            <TextInput
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Big lunch"
            />
          </Field>
          <Field label="Icon (emoji)">
            <TextInput value={icon} onChange={(e) => setIcon(e.target.value)} maxLength={4} />
          </Field>
          <Field label="Log to slot">
            <Select value={slot} onChange={(e) => setSlot(e.target.value)}>
              {SLOTS.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </Select>
          </Field>
        </div>
      </Card>

      <Card>
        <CardHeader kicker="Ingredients" title={`${items.length} items`} />
        {items.length === 0 ? (
          <p className="font-body italic text-ink-muted">
            Pick foods below to start composing.
          </p>
        ) : (
          <ul className="divide-y divide-ink/30 border-y border-ink/30 mb-3">
            {items.map((it, i) => {
              const f = allFoods.find((x) => x.key === it.food) || { display: it.food, unit: "" };
              const t = calc([it]);
              return (
                <li key={i} className="py-2 flex items-center gap-2">
                  <div className="flex-1 min-w-0">
                    <div className="font-body text-base">{f.display}</div>
                    <div className="font-mono text-[10px] uppercase tracking-[0.2em] text-ink-muted">
                      {Math.round(t.kcal)} kcal · {Math.round(t.protein)}g protein
                    </div>
                  </div>
                  <TextInput
                    type="number"
                    className="!w-24"
                    value={it.amount}
                    onChange={(e) => updateAmount(i, e.target.value)}
                  />
                  <span className="font-mono text-[10px] uppercase tracking-[0.2em] text-ink-muted w-8">
                    {f.unit}
                  </span>
                  <IconButton onClick={() => removeItem(i)} aria-label="Remove">
                    <Trash2 size={14} />
                  </IconButton>
                </li>
              );
            })}
          </ul>
        )}
        <div className="flex gap-2">
          <Button variant="primary" onClick={logIt} disabled={!name.trim() || items.length === 0}>
            <Save size={12} /> Log to {slot}
          </Button>
          {items.length > 0 && (
            <Button variant="outline" onClick={clear}>
              Clear
            </Button>
          )}
        </div>
      </Card>

      <Card>
        <CardHeader
          kicker="Library"
          title="Add Ingredients"
          subtitle="Tap any food to add it. Need a food that's not here? Add it on the Foods tab."
          right={
            setTab && (
              <Button variant="outline" size="sm" onClick={() => setTab("foods")}>
                <BookOpen size={12} /> Add Food
              </Button>
            )
          }
        />
        <div className="space-y-4">
          {Object.entries(grouped).map(([cat, keys]) => {
            const items = keys
              .map((k) => allFoods.find((x) => x.key === k))
              .filter(Boolean);
            if (items.length === 0) return null;
            return (
              <div key={cat}>
                <h4 className="font-mono text-[10px] uppercase tracking-[0.25em] text-ink-muted mb-2">
                  {cat}
                </h4>
                <div className="flex flex-wrap gap-2">
                  {items.map((f) => (
                    <button
                      key={f.key}
                      onClick={() => addItem(f.key)}
                      className="border-2 border-ink px-3 py-1.5 hover:bg-ink hover:text-paper transition-colors text-left group"
                    >
                      <div className="font-body text-base">{f.display}</div>
                      <div className="font-mono text-[10px] uppercase tracking-[0.2em] text-ink-muted group-hover:text-paper/70">
                        {f.kcal}k/{f.unit} · {f.protein}p/{f.unit}
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            );
          })}
          {/* User-added foods shown in their own group */}
          {(() => {
            const baseKeys = new Set(Object.keys(FOODS));
            const userFoods = allFoods.filter((f) => !baseKeys.has(f.key));
            if (userFoods.length === 0) return null;
            return (
              <div>
                <h4 className="font-mono text-[10px] uppercase tracking-[0.25em] text-ink-muted mb-2">
                  Your custom foods
                </h4>
                <div className="flex flex-wrap gap-2">
                  {userFoods.map((f) => (
                    <button
                      key={f.key}
                      onClick={() => addItem(f.key)}
                      className="border-2 border-sky px-3 py-1.5 hover:bg-sky hover:text-paper transition-colors text-left group"
                    >
                      <div className="font-body text-base">{f.display}</div>
                      <div className="font-mono text-[10px] uppercase tracking-[0.2em] text-ink-muted group-hover:text-paper/70">
                        {f.kcal}k/{f.unit} · {f.protein}p/{f.unit}
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            );
          })()}
        </div>
      </Card>
    </>
  );
}
