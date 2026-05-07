import { useMemo, useState } from "react";
import { useApp } from "../store/AppContext.jsx";
import { Card, CardHeader } from "../components/ui/Card.jsx";
import { Button, IconButton } from "../components/ui/Button.jsx";
import { Field, TextInput, Select, Chip } from "../components/ui/Field.jsx";
import { Modal } from "../components/ui/Modal.jsx";
import { FOODS, getAllFoods } from "../store/profiles.js";
import { Plus, RotateCcw, Trash2 } from "lucide-react";

const UNIT_OPTIONS = ["g", "ml", "pc", "tbsp", "tsp", "cup", "slice", "bottle"];

export function Foods() {
  const { customFoods, updateCustomFood, resetCustomFood } = useApp();
  const [search, setSearch] = useState("");
  const [adding, setAdding] = useState(false);

  const allFoods = useMemo(() => getAllFoods(customFoods), [customFoods]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return allFoods.filter((f) => !q || f.display.toLowerCase().includes(q));
  }, [allFoods, search]);

  const editedCount = Object.keys(customFoods).filter((k) => FOODS[k]).length;
  const addedCount = Object.keys(customFoods).filter(
    (k) => !FOODS[k] && customFoods[k]?.display,
  ).length;

  function handleAddFood(payload) {
    const key = (payload.key || payload.display)
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "_")
      .replace(/^_|_$/g, "");
    if (!key) return;
    if (FOODS[key] || customFoods[key]) {
      alert(`A food with key "${key}" already exists.`);
      return;
    }
    updateCustomFood(key, {
      display: payload.display,
      unit: payload.unit,
      kcal: Number(payload.kcal) || 0,
      protein: Number(payload.protein) || 0,
      fat: Number(payload.fat) || 0,
      carbs: Number(payload.carbs) || 0,
      groceryKey: payload.groceryKey || null,
    });
    setAdding(false);
  }

  return (
    <Card>
      <CardHeader
        kicker="Foods Database"
        title="Edit & Add Foods"
        subtitle={
          [
            editedCount > 0 && `${editedCount} edited`,
            addedCount > 0 && `${addedCount} added`,
          ]
            .filter(Boolean)
            .join(" · ") ||
          "Edit existing foods or add new ones with full macro details."
        }
        right={
          <Button variant="primary" size="sm" onClick={() => setAdding(true)}>
            <Plus size={12} /> Add Food
          </Button>
        }
      />

      <Field label="Search">
        <TextInput
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="rice, beef, milk…"
        />
      </Field>

      <div className="mt-4 overflow-x-auto">
        <table className="w-full border-collapse">
          <thead>
            <tr>
              <th className="border-b-2 border-ink p-2 text-left font-mono text-[10px] uppercase tracking-[0.25em] text-ink-muted">
                Food
              </th>
              <th className="border-b-2 border-ink p-2 text-right font-mono text-[10px] uppercase tracking-[0.25em] text-ink-muted">
                kcal/unit
              </th>
              <th className="border-b-2 border-ink p-2 text-right font-mono text-[10px] uppercase tracking-[0.25em] text-ink-muted">
                Protein
              </th>
              <th className="border-b-2 border-ink p-2 text-right font-mono text-[10px] uppercase tracking-[0.25em] text-ink-muted">
                Fat
              </th>
              <th className="border-b-2 border-ink p-2 text-right font-mono text-[10px] uppercase tracking-[0.25em] text-ink-muted">
                Carbs
              </th>
              <th className="border-b-2 border-ink p-2"></th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((f) => (
              <FoodRow
                key={f.key}
                food={f}
                isUserAdded={!FOODS[f.key]}
                override={customFoods[f.key]}
                onUpdate={(patch) => updateCustomFood(f.key, patch)}
                onReset={() => resetCustomFood(f.key)}
                onDelete={() => {
                  if (confirm(`Delete "${f.display}"?`)) resetCustomFood(f.key);
                }}
              />
            ))}
          </tbody>
        </table>
      </div>

      <p className="font-body text-sm italic text-ink-muted mt-4">
        Values are <strong>per unit</strong> (per gram, per piece, per slice — see the unit
        column). Edited rows show a green tint and a Custom chip; user-added rows show a
        blue Added chip.
      </p>

      {adding && (
        <AddFoodModal onClose={() => setAdding(false)} onSave={handleAddFood} />
      )}
    </Card>
  );
}

function FoodRow({ food, isUserAdded, override, onUpdate, onReset, onDelete }) {
  const ovr = override || {};
  const kcal = ovr.kcal ?? food.kcal;
  const protein = ovr.protein ?? food.protein;
  const fat = ovr.fat ?? food.fat ?? 0;
  const carbs = ovr.carbs ?? food.carbs ?? 0;
  const isEdited = !!override && !isUserAdded;

  return (
    <tr className={isUserAdded ? "bg-sky/5" : isEdited ? "bg-good/5" : ""}>
      <td className="border-b border-ink/30 p-2">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="font-body text-base">{food.display}</span>
          <Chip>per {food.unit}</Chip>
          {isUserAdded && <Chip color="#3b6aa3">Added</Chip>}
          {isEdited && <Chip color="#4a6b3e">Custom</Chip>}
        </div>
      </td>
      <td className="border-b border-ink/30 p-2 text-right">
        <input
          type="number"
          step="0.01"
          value={kcal}
          onChange={(e) => onUpdate({ kcal: Number(e.target.value) })}
          className="w-20 border border-ink/40 bg-paper px-2 py-1 font-mono text-sm text-right focus:outline-none focus:border-accent"
        />
      </td>
      <td className="border-b border-ink/30 p-2 text-right">
        <input
          type="number"
          step="0.01"
          value={protein}
          onChange={(e) => onUpdate({ protein: Number(e.target.value) })}
          className="w-20 border border-ink/40 bg-paper px-2 py-1 font-mono text-sm text-right focus:outline-none focus:border-accent"
        />
      </td>
      <td className="border-b border-ink/30 p-2 text-right">
        <input
          type="number"
          step="0.01"
          value={fat}
          onChange={(e) => onUpdate({ fat: Number(e.target.value) })}
          className="w-20 border border-ink/40 bg-paper px-2 py-1 font-mono text-sm text-right focus:outline-none focus:border-accent"
        />
      </td>
      <td className="border-b border-ink/30 p-2 text-right">
        <input
          type="number"
          step="0.01"
          value={carbs}
          onChange={(e) => onUpdate({ carbs: Number(e.target.value) })}
          className="w-20 border border-ink/40 bg-paper px-2 py-1 font-mono text-sm text-right focus:outline-none focus:border-accent"
        />
      </td>
      <td className="border-b border-ink/30 p-2 text-right">
        {isUserAdded ? (
          <IconButton onClick={onDelete} aria-label="Delete">
            <Trash2 size={12} />
          </IconButton>
        ) : isEdited ? (
          <IconButton onClick={onReset} aria-label="Reset to default">
            <RotateCcw size={12} />
          </IconButton>
        ) : null}
      </td>
    </tr>
  );
}

function AddFoodModal({ onClose, onSave }) {
  const [draft, setDraft] = useState({
    display: "",
    unit: "g",
    kcal: "",
    protein: "",
    fat: "",
    carbs: "",
  });

  function update(patch) {
    setDraft((d) => ({ ...d, ...patch }));
  }

  function handleSave() {
    if (!draft.display.trim()) {
      alert("Food needs a display name.");
      return;
    }
    onSave(draft);
  }

  return (
    <Modal
      open
      onClose={onClose}
      title="Add a New Food"
      footer={
        <>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button variant="primary" onClick={handleSave} disabled={!draft.display.trim()}>
            Save
          </Button>
        </>
      }
    >
      <div className="space-y-3">
        <Field label="Display name">
          <TextInput
            value={draft.display}
            onChange={(e) => update({ display: e.target.value })}
            placeholder="e.g. Greek Yogurt (full fat)"
          />
        </Field>
        <Field label="Unit">
          <Select value={draft.unit} onChange={(e) => update({ unit: e.target.value })}>
            {UNIT_OPTIONS.map((u) => (
              <option key={u} value={u}>
                {u}
              </option>
            ))}
          </Select>
        </Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="kcal per unit">
            <TextInput
              type="number"
              step="0.01"
              value={draft.kcal}
              onChange={(e) => update({ kcal: e.target.value })}
            />
          </Field>
          <Field label="Protein (g) per unit">
            <TextInput
              type="number"
              step="0.01"
              value={draft.protein}
              onChange={(e) => update({ protein: e.target.value })}
            />
          </Field>
          <Field label="Fat (g) per unit">
            <TextInput
              type="number"
              step="0.01"
              value={draft.fat}
              onChange={(e) => update({ fat: e.target.value })}
            />
          </Field>
          <Field label="Carbs (g) per unit">
            <TextInput
              type="number"
              step="0.01"
              value={draft.carbs}
              onChange={(e) => update({ carbs: e.target.value })}
            />
          </Field>
        </div>
        <p className="font-body text-sm italic text-ink-muted">
          The new food is immediately available in the Diet "Add Ingredients" picker and
          the Build tab. Macros entered here are per <strong>{draft.unit || "unit"}</strong> —
          the calculator multiplies by the amount you log.
        </p>
      </div>
    </Modal>
  );
}
