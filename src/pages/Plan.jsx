import { useMemo, useState } from "react";
import { useApp } from "../store/AppContext.jsx";
import { Card, CardHeader, Stat } from "../components/ui/Card.jsx";
import { Button } from "../components/ui/Button.jsx";
import { Select, Chip } from "../components/ui/Field.jsx";
import { calcMeal, FOODS, ingredientDeltas } from "../store/profiles.js";
import { todayKey, fromKey, DAYS_SHORT } from "../lib/time.js";
import { Calendar, ShoppingCart } from "lucide-react";

const SLOTS = [
  { id: "lunch", label: "Lunch" },
  { id: "shake", label: "Shake" },
  { id: "dinner", label: "Dinner" },
];

function nDaysFromToday(n) {
  const out = [];
  for (let i = 0; i < n; i++) {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    d.setDate(d.getDate() + i);
    out.push(d);
  }
  return out;
}

export function Plan() {
  const {
    profile,
    plan,
    setPlanForDate,
    clearPlan,
    grocery,
    addManualShopping,
  } = useApp();
  const [horizon, setHorizon] = useState(7);

  const days = useMemo(() => nDaysFromToday(horizon), [horizon]);

  const presetsBySlot = {
    lunch: profile.lunchPresets,
    shake: profile.shakePresets,
    dinner: profile.dinnerPresets,
  };

  function getPreset(slot, key) {
    return presetsBySlot[slot]?.[key];
  }

  // Compute total ingredients needed by the plan
  const planTotals = useMemo(() => {
    const totals = {};
    let totalKcal = 0;
    let totalProtein = 0;
    let mealCount = 0;
    for (const date of Object.keys(plan)) {
      for (const slot of SLOTS) {
        const key = plan[date]?.[slot.id];
        if (!key) continue;
        const preset = getPreset(slot.id, key);
        if (!preset) continue;
        mealCount++;
        const t = calcMeal(preset.items);
        totalKcal += t.kcal;
        totalProtein += t.protein;
        const deltas = ingredientDeltas(preset.items);
        for (const k in deltas) {
          totals[k] = (totals[k] || 0) + deltas[k];
        }
      }
    }
    return { ingredients: totals, totalKcal, totalProtein, mealCount };
  }, [plan, presetsBySlot]);

  // Convert ingredient totals → shopping suggestions: have qty in inventory, need delta
  const shoppingList = useMemo(() => {
    const list = [];
    const groceryByKey = Object.fromEntries(grocery.map((it) => [it.key, it]));
    for (const k in planTotals.ingredients) {
      const need = planTotals.ingredients[k];
      const inv = groceryByKey[k];
      const have = inv?.qty || 0;
      const buy = Math.max(0, need - have);
      const packetSize = inv?.packetSize || 1;
      const packetsToBuy = Math.ceil(buy / packetSize);
      list.push({
        key: k,
        name: inv?.name || k,
        unit: inv?.unit || "",
        category: inv?.category || "Other",
        icon: inv?.icon || "🛒",
        need,
        have,
        buy,
        packetSize,
        packetsToBuy,
      });
    }
    return list.sort((a, b) => (a.category > b.category ? 1 : -1));
  }, [planTotals.ingredients, grocery]);

  function autoFill(slot, key) {
    days.forEach((d) => setPlanForDate(todayKey(d), slot, key));
  }

  function addAllToManualShopping() {
    shoppingList
      .filter((it) => it.buy > 0)
      .forEach((it) => addManualShopping(`${it.name} — ${it.packetsToBuy} packets (${it.buy}${it.unit} needed)`));
  }

  return (
    <>
      <Card>
        <CardHeader
          kicker="Plan"
          title="Meal Planner"
          subtitle="Map meals to days. Use the auto-shopping list when you're ready to shop."
          right={
            <div className="flex gap-2">
              <Select value={horizon} onChange={(e) => setHorizon(Number(e.target.value))} className="!w-32">
                <option value={7}>Next 7 days</option>
                <option value={14}>Next 14 days</option>
                <option value={28}>Next 28 days</option>
              </Select>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  if (confirm("Clear the entire plan?")) clearPlan();
                }}
              >
                Clear
              </Button>
            </div>
          }
        />

        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
          <Stat label="Days planned" value={Object.keys(plan).length} />
          <Stat label="Meals" value={planTotals.mealCount} accent="#3b6aa3" />
          <Stat label="Total kcal" value={Math.round(planTotals.totalKcal).toLocaleString()} accent="#6b5a3e" />
          <Stat label="Total protein" value={Math.round(planTotals.totalProtein).toLocaleString()} suffix="g" accent="#c44827" />
        </div>

        {/* Auto-fill row */}
        <div className="flex flex-wrap gap-2 mb-4">
          {SLOTS.map((slot) => {
            const presets = presetsBySlot[slot.id] || {};
            return (
              <Select
                key={slot.id}
                onChange={(e) => {
                  if (e.target.value) {
                    autoFill(slot.id, e.target.value);
                    e.target.value = "";
                  }
                }}
                className="!w-auto !text-xs"
                defaultValue=""
              >
                <option value="">Auto-fill all {slot.label}…</option>
                {Object.values(presets).map((p) => (
                  <option key={p.key} value={p.key}>
                    {p.icon} {p.name}
                  </option>
                ))}
              </Select>
            );
          })}
        </div>

        {/* Day grid */}
        <div className="overflow-x-auto">
          <table className="w-full border-collapse">
            <thead>
              <tr>
                <th className="border-b-2 border-ink p-2 text-left font-mono text-[10px] uppercase tracking-[0.25em] text-ink-muted">
                  Date
                </th>
                {SLOTS.map((s) => (
                  <th key={s.id} className="border-b-2 border-ink p-2 text-left font-mono text-[10px] uppercase tracking-[0.25em] text-ink-muted">
                    {s.label}
                  </th>
                ))}
                <th className="border-b-2 border-ink p-2 text-right font-mono text-[10px] uppercase tracking-[0.25em] text-ink-muted">
                  kcal
                </th>
              </tr>
            </thead>
            <tbody>
              {days.map((d) => {
                const dk = todayKey(d);
                const isToday = dk === todayKey();
                let dayKcal = 0;
                for (const s of SLOTS) {
                  const k = plan[dk]?.[s.id];
                  if (k) {
                    const p = getPreset(s.id, k);
                    if (p) dayKcal += calcMeal(p.items).kcal;
                  }
                }
                return (
                  <tr key={dk} className={isToday ? "bg-accent/5" : ""}>
                    <td className="border-b border-ink/30 p-2">
                      <div className="font-display text-base font-bold">
                        {DAYS_SHORT[d.getDay()]} {d.getDate()}
                      </div>
                      <div className="font-mono text-[9px] uppercase tracking-[0.2em] text-ink-muted">
                        {d.toLocaleDateString("en-US", { month: "short" })}
                      </div>
                    </td>
                    {SLOTS.map((s) => {
                      const presets = presetsBySlot[s.id] || {};
                      const k = plan[dk]?.[s.id] || "";
                      return (
                        <td key={s.id} className="border-b border-ink/30 p-1">
                          <Select
                            value={k}
                            onChange={(e) => setPlanForDate(dk, s.id, e.target.value)}
                            className="!text-xs !py-1"
                          >
                            <option value="">—</option>
                            {Object.values(presets).map((p) => (
                              <option key={p.key} value={p.key}>
                                {p.icon} {p.name}
                              </option>
                            ))}
                          </Select>
                        </td>
                      );
                    })}
                    <td className="border-b border-ink/30 p-2 text-right font-mono text-[10px] uppercase tracking-[0.2em] text-ink-muted tabular-nums">
                      {dayKcal ? Math.round(dayKcal) : "—"}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </Card>

      <Card>
        <CardHeader
          kicker="Shopping"
          title="Generated Shopping List"
          subtitle={`Compares planned meals (${planTotals.mealCount}) to current pantry.`}
          right={
            shoppingList.some((it) => it.buy > 0) && (
              <Button variant="primary" size="sm" onClick={addAllToManualShopping}>
                <ShoppingCart size={12} /> Add to Shopping
              </Button>
            )
          }
        />
        {shoppingList.length === 0 ? (
          <p className="font-body italic text-ink-muted">
            Plan some meals to generate a shopping list.
          </p>
        ) : (
          <ul className="divide-y divide-ink/30 border-y border-ink/30">
            {shoppingList.map((it) => (
              <li key={it.key} className="py-2 flex items-center gap-3">
                <span className="text-2xl">{it.icon}</span>
                <div className="flex-1 min-w-0">
                  <div className="font-body text-base flex items-center gap-2 flex-wrap">
                    {it.name}
                    <Chip>{it.category}</Chip>
                    {it.buy > 0 ? (
                      <Chip color="#c44827">Buy {it.packetsToBuy} packets</Chip>
                    ) : (
                      <Chip color="#4a6b3e">In stock</Chip>
                    )}
                  </div>
                  <div className="font-mono text-[10px] uppercase tracking-[0.2em] text-ink-muted">
                    Need {Math.round(it.need)}{it.unit} · Have {Math.round(it.have)}{it.unit}
                    {it.buy > 0 && ` · Buy ${Math.round(it.buy)}${it.unit}`}
                  </div>
                </div>
              </li>
            ))}
          </ul>
        )}
      </Card>
    </>
  );
}
