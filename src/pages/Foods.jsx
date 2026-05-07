import { useMemo, useState } from "react";
import { useApp } from "../store/AppContext.jsx";
import { Card, CardHeader } from "../components/ui/Card.jsx";
import { Button, IconButton } from "../components/ui/Button.jsx";
import { Field, TextInput, Chip } from "../components/ui/Field.jsx";
import { FOODS } from "../store/profiles.js";
import { RotateCcw, Save } from "lucide-react";

export function Foods() {
  const { customFoods, updateCustomFood, resetCustomFood } = useApp();
  const [search, setSearch] = useState("");

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return Object.values(FOODS).filter(
      (f) => !q || f.display.toLowerCase().includes(q),
    );
  }, [search]);

  const editedCount = Object.keys(customFoods).length;

  return (
    <Card>
      <CardHeader
        kicker="Foods Database"
        title="Edit Macros per Food"
        subtitle={
          editedCount > 0
            ? `${editedCount} food${editedCount === 1 ? "" : "s"} customized — your overrides apply to every meal calculation.`
            : "Fill in carbs and fat per unit so meal totals show full macros."
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
                Protein (g)
              </th>
              <th className="border-b-2 border-ink p-2 text-right font-mono text-[10px] uppercase tracking-[0.25em] text-ink-muted">
                Fat (g)
              </th>
              <th className="border-b-2 border-ink p-2 text-right font-mono text-[10px] uppercase tracking-[0.25em] text-ink-muted">
                Carbs (g)
              </th>
              <th className="border-b-2 border-ink p-2"></th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((f) => (
              <FoodRow
                key={f.key}
                food={f}
                override={customFoods[f.key]}
                onUpdate={(patch) => updateCustomFood(f.key, patch)}
                onReset={() => resetCustomFood(f.key)}
              />
            ))}
          </tbody>
        </table>
      </div>

      <p className="font-body text-sm italic text-ink-muted mt-4">
        Values are <strong>per unit</strong> (per gram, per piece, per slice — see the unit
        column). E.g. rice has unit "g" and base 1.30 kcal/g, so 200 g = 260 kcal. Carbs
        and fat default to 0 until you fill them in here.
      </p>
    </Card>
  );
}

function FoodRow({ food, override, onUpdate, onReset }) {
  const ovr = override || {};
  const kcal = ovr.kcal ?? food.kcal;
  const protein = ovr.protein ?? food.protein;
  const fat = ovr.fat ?? food.fat ?? 0;
  const carbs = ovr.carbs ?? food.carbs ?? 0;
  const isEdited = !!override;

  return (
    <tr className={isEdited ? "bg-good/5" : ""}>
      <td className="border-b border-ink/30 p-2">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="font-body text-base">{food.display}</span>
          <Chip>per {food.unit}</Chip>
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
        {isEdited && (
          <IconButton onClick={onReset} aria-label="Reset to default">
            <RotateCcw size={12} />
          </IconButton>
        )}
      </td>
    </tr>
  );
}
