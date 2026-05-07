import { useMemo, useState } from "react";
import { useApp } from "../store/AppContext.jsx";
import { Card, CardHeader, Stat } from "../components/ui/Card.jsx";
import { Button, IconButton } from "../components/ui/Button.jsx";
import { Field, TextInput, Select, Chip } from "../components/ui/Field.jsx";
import { Modal } from "../components/ui/Modal.jsx";
import { GROCERY_CATEGORIES } from "../store/profiles.js";
import {
  Plus,
  Trash2,
  Edit3,
  RefreshCw,
  AlertTriangle,
  PackagePlus,
} from "lucide-react";

function uid() {
  return "g_" + Math.random().toString(36).slice(2, 9);
}

export function Grocery() {
  const {
    grocery,
    adjustGrocery,
    restockGrocery,
    setGroceryQty,
    saveGroceryItem,
    removeGroceryItem,
    resetGroceryToTemplate,
    manualShopping,
    addManualShopping,
    toggleManualShopping,
    removeManualShopping,
  } = useApp();

  const [view, setView] = useState("inventory");
  const [editing, setEditing] = useState(null);
  const [manualInput, setManualInput] = useState("");

  const grouped = useMemo(() => {
    const out = {};
    for (const it of grocery) {
      const cat = it.category || "Other";
      if (!out[cat]) out[cat] = [];
      out[cat].push(it);
    }
    return out;
  }, [grocery]);

  const lowStock = grocery.filter((it) => it.qty <= it.lowThreshold);

  return (
    <>
      <Card>
        <CardHeader
          kicker="Pantry"
          title="Grocery & Inventory"
          subtitle={`${grocery.length} items · ${lowStock.length} low`}
          right={
            <div className="flex gap-2">
              <Button
                variant="primary"
                size="sm"
                onClick={() =>
                  setEditing({
                    key: uid(),
                    name: "",
                    category: "Pantry",
                    unit: "g",
                    initialQty: 100,
                    qty: 100,
                    packetSize: 100,
                    lowThreshold: 50,
                    icon: "🛒",
                  })
                }
              >
                <Plus size={12} /> Add
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  if (confirm("Reset inventory to profile template? Custom items remain but quantities are reset.")) {
                    resetGroceryToTemplate();
                  }
                }}
              >
                <RefreshCw size={12} /> Reset
              </Button>
            </div>
          }
        />

        <div className="flex gap-2 mb-4">
          {[
            { id: "inventory", label: "Inventory" },
            { id: "shopping", label: "Auto-shopping" },
            { id: "manual", label: "Manual list" },
          ].map((v) => (
            <button
              key={v.id}
              onClick={() => setView(v.id)}
              className={`px-3 py-1.5 border-2 font-mono text-[10px] uppercase tracking-[0.2em] ${
                view === v.id ? "bg-ink text-paper border-ink" : "border-ink hover:bg-ink hover:text-paper"
              }`}
            >
              {v.label}
            </button>
          ))}
        </div>

        {lowStock.length > 0 && (
          <div className="border-2 border-accent bg-accent/5 px-3 py-2 mb-4 flex items-start gap-2">
            <AlertTriangle size={16} className="text-accent mt-0.5 shrink-0" />
            <div className="flex-1">
              <div className="font-mono text-[10px] uppercase tracking-[0.25em] text-accent">
                Low stock ({lowStock.length})
              </div>
              <div className="font-body text-sm">
                {lowStock.map((it) => `${it.icon} ${it.name}`).join(", ")}
              </div>
            </div>
          </div>
        )}

        {view === "inventory" ? (
          <div className="space-y-4">
            {GROCERY_CATEGORIES.filter((c) => grouped[c]).map((cat) => (
              <section key={cat}>
                <h4 className="font-mono text-[10px] uppercase tracking-[0.25em] text-ink-muted mb-2">
                  {cat}
                </h4>
                <ul className="divide-y divide-ink/30 border-y border-ink/30">
                  {grouped[cat].map((it) => {
                    const isLow = it.qty <= it.lowThreshold;
                    const pctOfPacket = (it.qty / Math.max(1, it.initialQty)) * 100;
                    return (
                      <li key={it.key} className="py-2 flex items-center gap-3 flex-wrap">
                        <span className="text-2xl">{it.icon}</span>
                        <div className="flex-1 min-w-0">
                          <div className="font-body text-base flex items-center gap-2 flex-wrap">
                            {it.name}
                            {isLow && <Chip color="#c44827">Low</Chip>}
                            {it.perishable && (
                              <Chip color="#c44827">Perishable · {it.maxDays || 7}d max</Chip>
                            )}
                            {it.optional && <Chip color="#6b5a3e">Optional</Chip>}
                          </div>
                          <div className="font-mono text-[10px] uppercase tracking-[0.2em] text-ink-muted">
                            Threshold {it.lowThreshold}{it.unit} · Packet {it.packetSize}{it.unit}
                            {it.perishable && ` · keep ≤ ${it.maxDays || 7} days of stock`}
                          </div>
                        </div>
                        <div className="flex items-center gap-1">
                          <IconButton
                            onClick={() => adjustGrocery(it.key, -1 * (it.unit === "pc" ? 1 : 50))}
                            aria-label="Decrease"
                          >
                            −
                          </IconButton>
                          <input
                            type="number"
                            value={it.qty}
                            onChange={(e) =>
                              setGroceryQty(it.key, Number(e.target.value) || 0)
                            }
                            className="w-20 border-2 border-ink bg-paper px-2 py-1 font-display text-base text-center"
                          />
                          <span className="font-mono text-[9px] uppercase tracking-[0.2em] text-ink-muted">
                            {it.unit}
                          </span>
                          <IconButton
                            onClick={() => adjustGrocery(it.key, it.unit === "pc" ? 1 : 50)}
                            aria-label="Increase"
                          >
                            +
                          </IconButton>
                          <IconButton
                            onClick={() => restockGrocery(it.key)}
                            aria-label="Restock packet"
                          >
                            <PackagePlus size={14} />
                          </IconButton>
                          <IconButton
                            onClick={() => setEditing({ ...it })}
                            aria-label="Edit"
                          >
                            <Edit3 size={14} />
                          </IconButton>
                          <IconButton
                            onClick={() => {
                              if (confirm(`Remove ${it.name}?`)) removeGroceryItem(it.key);
                            }}
                            aria-label="Delete"
                          >
                            <Trash2 size={14} />
                          </IconButton>
                        </div>
                      </li>
                    );
                  })}
                </ul>
              </section>
            ))}
          </div>
        ) : view === "shopping" ? (
          <div>
            {lowStock.length === 0 ? (
              <p className="font-body italic text-ink-muted">
                Nothing below threshold — pantry's good.
              </p>
            ) : (
              <ul className="divide-y divide-ink/30 border-y border-ink/30">
                {lowStock.map((it) => {
                  // Perishables top up to lowThreshold (one fresh packet's
                  // worth) so we never carry more than ~maxDays of stock.
                  // Non-perishables top up to 2× threshold for headroom.
                  const need = it.perishable
                    ? Math.max(0, it.lowThreshold - it.qty)
                    : Math.max(0, it.lowThreshold * 2 - it.qty);
                  const packets = Math.ceil(need / Math.max(1, it.packetSize));
                  return (
                    <li key={it.key} className="py-2 flex items-center gap-3">
                      <span className="text-2xl">{it.icon}</span>
                      <div className="flex-1">
                        <div className="font-body text-base flex items-center gap-2 flex-wrap">
                          {it.name}
                          {it.perishable && (
                            <Chip color="#c44827">Perishable · {it.maxDays || 7}d</Chip>
                          )}
                        </div>
                        <div className="font-mono text-[10px] uppercase tracking-[0.2em] text-ink-muted">
                          Have {it.qty}{it.unit} · Buy {packets} packet{packets === 1 ? "" : "s"} ({it.packetSize}{it.unit} each)
                          {it.perishable && " · top up only"}
                        </div>
                      </div>
                      <Button variant="primary" size="sm" onClick={() => restockGrocery(it.key)}>
                        Bought
                      </Button>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        ) : (
          <div>
            <form
              onSubmit={(e) => {
                e.preventDefault();
                if (manualInput.trim()) {
                  addManualShopping(manualInput);
                  setManualInput("");
                }
              }}
              className="flex gap-2 mb-3"
            >
              <TextInput
                value={manualInput}
                onChange={(e) => setManualInput(e.target.value)}
                placeholder="e.g. Toilet paper, batteries"
              />
              <Button variant="primary" type="submit" disabled={!manualInput.trim()}>
                <Plus size={12} /> Add
              </Button>
            </form>
            {manualShopping.length === 0 ? (
              <p className="font-body italic text-ink-muted">
                No manual items. Add anything that's not nutrition (toiletries, batteries, etc.)
              </p>
            ) : (
              <ul className="divide-y divide-ink/30 border-y border-ink/30">
                {manualShopping.map((it) => (
                  <li key={it.id} className="py-2 flex items-center gap-3">
                    <input
                      type="checkbox"
                      checked={it.done}
                      onChange={() => toggleManualShopping(it.id)}
                      className="w-4 h-4 accent-accent"
                    />
                    <span
                      className={`flex-1 font-body text-base ${it.done ? "line-through text-ink-muted" : ""}`}
                    >
                      {it.text}
                    </span>
                    <IconButton onClick={() => removeManualShopping(it.id)} aria-label="Remove">
                      <Trash2 size={14} />
                    </IconButton>
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}
      </Card>

      {editing && (
        <ItemModal item={editing} onClose={() => setEditing(null)} onSave={(it) => {
          saveGroceryItem(it);
          setEditing(null);
        }} />
      )}
    </>
  );
}

function ItemModal({ item, onClose, onSave }) {
  const [draft, setDraft] = useState(item);
  return (
    <Modal
      open
      onClose={onClose}
      title={item.name ? `Edit ${item.name}` : "New item"}
      footer={
        <>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button variant="primary" onClick={() => onSave(draft)} disabled={!draft.name.trim()}>Save</Button>
        </>
      }
    >
      <div className="space-y-3">
        <div className="grid grid-cols-3 gap-3">
          <Field label="Icon (emoji)">
            <TextInput value={draft.icon} onChange={(e) => setDraft({ ...draft, icon: e.target.value })} maxLength={4} />
          </Field>
          <div className="col-span-2">
            <Field label="Name">
              <TextInput value={draft.name} onChange={(e) => setDraft({ ...draft, name: e.target.value })} />
            </Field>
          </div>
        </div>
        <Field label="Category">
          <Select value={draft.category} onChange={(e) => setDraft({ ...draft, category: e.target.value })}>
            {GROCERY_CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
          </Select>
        </Field>
        <div className="grid grid-cols-4 gap-3">
          <Field label="Unit">
            <TextInput value={draft.unit} onChange={(e) => setDraft({ ...draft, unit: e.target.value })} />
          </Field>
          <Field label="Quantity">
            <TextInput type="number" value={draft.qty} onChange={(e) => setDraft({ ...draft, qty: Number(e.target.value) || 0 })} />
          </Field>
          <Field label="Packet size">
            <TextInput type="number" value={draft.packetSize} onChange={(e) => setDraft({ ...draft, packetSize: Number(e.target.value) || 0 })} />
          </Field>
          <Field label="Low at">
            <TextInput type="number" value={draft.lowThreshold} onChange={(e) => setDraft({ ...draft, lowThreshold: Number(e.target.value) || 0 })} />
          </Field>
        </div>
      </div>
    </Modal>
  );
}
