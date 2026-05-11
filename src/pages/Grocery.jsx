import { useMemo, useState } from "react";
import { useApp } from "../store/AppContext.jsx";
import { Card, CardHeader, Stat } from "../components/ui/Card.jsx";
import { Button, IconButton } from "../components/ui/Button.jsx";
import { Field, TextInput, Select, Chip } from "../components/ui/Field.jsx";
import { Modal } from "../components/ui/Modal.jsx";
import { GROCERY_CATEGORIES, planNeeds } from "../store/profiles.js";
import { todayKey } from "../lib/time.js";
import { getAllUnits, isContinuousUnit, defaultStep, formatQty, isPacketEligibleItem } from "../lib/units.js";
import {
  Plus,
  Trash2,
  Edit3,
  RefreshCw,
  AlertTriangle,
  PackagePlus,
  Settings,
  TrendingDown,
  Package,
} from "lucide-react";

function uid() {
  return "g_" + Math.random().toString(36).slice(2, 9);
}

// Window over which we average consumption to forecast run-out.
const CONSUMPTION_WINDOW_DAYS = 14;

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
    groceryActivity,
    profile,
    updateProfile,
    plan,
    markBought,
  } = useApp();

  const [view, setView] = useState("inventory");
  const [editing, setEditing] = useState(null);
  const [manualInput, setManualInput] = useState("");
  const [showCatalog, setShowCatalog] = useState(false);

  const bufferDays = Number(profile.groceryBufferDays) || 0;

  // Packet view is hard-gated to meat/seafood items with track-by-packets
  // turned on. No global toggle — every other item renders in plain
  // conventional units. The user controls behaviour per-item from the
  // edit modal.
  function showAsPackets(it) {
    if (!isPacketEligibleItem(it)) return false;
    const ps = Number(it.packetSize) || 0;
    return !!it.trackByPackets && ps > 1;
  }

  // Per-item average daily consumption, computed from the activity log
  // over the last CONSUMPTION_WINDOW_DAYS. Only "consumed" events count;
  // restock/manual entries are ignored. Items with no consumption have
  // avgDaily = 0 (we'll fall back to the static low threshold for them).
  const consumption = useMemo(() => {
    const cutoff = Date.now() - CONSUMPTION_WINDOW_DAYS * 86400000;
    const totals = {};
    let firstSeen = {};
    for (const e of groceryActivity) {
      if (e.ts < cutoff) continue;
      if (e.reason !== "consumed") continue;
      if (!totals[e.key]) {
        totals[e.key] = 0;
        firstSeen[e.key] = e.ts;
      }
      totals[e.key] += -e.delta; // delta is negative for consumed
      if (e.ts < firstSeen[e.key]) firstSeen[e.key] = e.ts;
    }
    const out = {};
    for (const k in totals) {
      // Days observed: from earliest event to now, capped to window length.
      // Floor at 1 day so a single big purchase doesn't divide by 0.
      const daysObserved = Math.max(
        1,
        Math.min(
          CONSUMPTION_WINDOW_DAYS,
          Math.ceil((Date.now() - firstSeen[k]) / 86400000),
        ),
      );
      out[k] = totals[k] / daysObserved;
    }
    return out;
  }, [groceryActivity]);

  // Forecast for each grocery item: avg daily, days remaining, urgency.
  const forecasts = useMemo(() => {
    return grocery.map((it) => {
      const avgDaily = consumption[it.key] || 0;
      const daysLeft = avgDaily > 0 ? it.qty / avgDaily : Infinity;
      const belowThreshold = it.qty <= it.lowThreshold;
      // Auto-shopping triggers when stock will run out within the buffer window
      // OR static threshold is hit.
      const needsBuffer = avgDaily > 0 && daysLeft <= bufferDays;
      const inAutoShopping = belowThreshold || needsBuffer;
      return { item: it, avgDaily, daysLeft, belowThreshold, needsBuffer, inAutoShopping };
    });
  }, [grocery, consumption, bufferDays]);

  // Plan-derived needs: sum of every ingredient required by the next
  // 7 days of the user's meal plan, minus what's already in inventory.
  // Items that aren't in inventory at all show up here with their full
  // need — they appear on the shopping list with metadata pulled from
  // the profile's groceryTemplate catalog when the user taps "Bought".
  const planShopping = useMemo(() => {
    const days = [];
    const cursor = new Date();
    cursor.setHours(0, 0, 0, 0);
    for (let i = 0; i < 7; i++) {
      days.push(todayKey(cursor));
      cursor.setDate(cursor.getDate() + 1);
    }
    const needs = planNeeds(plan || {}, profile || {}, days);
    const out = [];
    for (const key of Object.keys(needs)) {
      const need = needs[key];
      const existing = grocery.find((it) => it.key === key);
      const have = existing ? Number(existing.qty) || 0 : 0;
      const deficit = need - have;
      if (deficit <= 0) continue;
      const catalog = (profile.groceryTemplate || []).find((it) => it.key === key);
      const meta = existing || catalog;
      if (!meta) continue; // unknown item — skip silently
      out.push({
        key,
        item: meta,
        existing: !!existing,
        need: Math.round(need),
        have: Math.round(have),
        deficit: Math.round(deficit),
      });
    }
    return out;
  }, [plan, profile, grocery]);

  const autoShopping = forecasts.filter((f) => f.inAutoShopping);
  const lowStock = grocery.filter((it) => it.qty <= it.lowThreshold);

  const grouped = useMemo(() => {
    const out = {};
    for (const it of grocery) {
      const cat = it.category || "Other";
      if (!out[cat]) out[cat] = [];
      out[cat].push(it);
    }
    return out;
  }, [grocery]);

  return (
    <>
      <Card>
        <CardHeader
          kicker="Pantry"
          title="Grocery & Inventory"
          subtitle={`${grocery.length} items · ${lowStock.length} low`}
          right={
            <div className="flex gap-2 flex-wrap">
              <Button
                variant="primary"
                size="sm"
                onClick={() => setShowCatalog(true)}
                title="Pick items from your profile's catalog with starting quantities"
              >
                <PackagePlus size={12} /> From catalog
              </Button>
              <Button
                variant="outline"
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
                    trackByPackets: false,
                  })
                }
              >
                <Plus size={12} /> Add new
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

        <div className="flex gap-2 mb-3 flex-wrap">
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

        {/* Display mode is now per-item: meat/seafood items with
            "Track by packets" enabled render in packs, everything else
            shows plain conventional units. Removed the old global
            Per-item / Packets / Conventional toggle. */}

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
                    const ps = Math.max(1, Number(it.packetSize) || 1);
                    const packetMode = showAsPackets(it);
                    const packetCount = packetMode ? it.qty / ps : null;
                    const step = packetMode ? ps : defaultStep(it.unit);
                    const fmtTotal = formatQty(it.qty, it.unit);
                    const fmtThresh = formatQty(it.lowThreshold, it.unit);
                    const fmtPack = formatQty(ps, it.unit);
                    return (
                      <li
                        key={it.key}
                        className="py-2 flex flex-col md:flex-row md:items-center gap-2 md:gap-3"
                      >
                        <div className="flex items-start gap-3 flex-1 min-w-0">
                          <span className="text-2xl shrink-0">{it.icon}</span>
                          <div className="flex-1 min-w-0">
                            <div className="font-body text-base flex items-center gap-2 flex-wrap">
                              <span className="break-words">{it.name}</span>
                              {packetMode && (
                                <Chip color="#3b6aa3">
                                  <Package size={10} className="inline mr-1" />
                                  {fmtPack.text}/pack
                                </Chip>
                              )}
                              {isLow && <Chip color="#c44827">Low</Chip>}
                              {it.perishable && (
                                <Chip color="#c44827">Perishable · {it.maxDays || 7}d</Chip>
                              )}
                              {it.optional && <Chip color="#6b5a3e">Optional</Chip>}
                            </div>
                            <div className="font-mono text-[10px] uppercase tracking-[0.2em] text-ink-muted">
                              {packetMode ? (
                                <>
                                  {(packetCount ?? 0).toFixed(packetCount % 1 === 0 ? 0 : 1)} pack
                                  {(packetCount ?? 0) === 1 ? "" : "s"} · {fmtTotal.text} total
                                  {" · "}low at {fmtThresh.text}
                                </>
                              ) : (
                                // Non-meat items: plain conventional line, no
                                // "Packet" reference even if a packetSize is set.
                                <>Threshold {fmtThresh.text}</>
                              )}
                              {it.perishable && ` · keep ≤ ${it.maxDays || 7} days`}
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center gap-1 flex-wrap md:flex-nowrap shrink-0 self-end md:self-center">
                          <IconButton
                            onClick={() => adjustGrocery(it.key, -step)}
                            aria-label="Decrease"
                            title={packetMode ? `−1 pack (${fmtPack.text})` : `−${step}${it.unit}`}
                          >
                            −
                          </IconButton>
                          {packetMode ? (
                            <div className="flex items-center gap-1">
                              <input
                                type="number"
                                step="0.5"
                                value={Number((it.qty / ps).toFixed(2))}
                                onChange={(e) =>
                                  setGroceryQty(
                                    it.key,
                                    Math.max(0, Number(e.target.value) || 0) * ps,
                                  )
                                }
                                className="w-16 border-2 border-ink bg-paper px-2 py-1 font-display text-base text-center"
                                title="Packet count"
                              />
                              <span className="font-mono text-[9px] uppercase tracking-[0.2em] text-ink-muted">
                                packs
                              </span>
                            </div>
                          ) : (
                            <>
                              <input
                                type="number"
                                value={fmtTotal.value}
                                onChange={(e) => {
                                  const v = Math.max(0, Number(e.target.value) || 0);
                                  // Convert back to the stored unit before saving so
                                  // the underlying qty stays in canonical units (g/ml).
                                  let stored = v;
                                  if (fmtTotal.unit === "kg" && it.unit === "g") stored = v * 1000;
                                  else if (fmtTotal.unit === "L" && it.unit === "ml") stored = v * 1000;
                                  setGroceryQty(it.key, stored);
                                }}
                                step={fmtTotal.unit === "kg" || fmtTotal.unit === "L" ? "0.1" : "1"}
                                className="w-20 border-2 border-ink bg-paper px-2 py-1 font-display text-base text-center"
                              />
                              <span className="font-mono text-[9px] uppercase tracking-[0.2em] text-ink-muted">
                                {fmtTotal.unit}
                              </span>
                            </>
                          )}
                          <IconButton
                            onClick={() => adjustGrocery(it.key, step)}
                            aria-label="Increase"
                            title={packetMode ? `+1 pack (${fmtPack.text})` : `+${step}${it.unit}`}
                          >
                            +
                          </IconButton>
                          <IconButton
                            onClick={() => restockGrocery(it.key)}
                            aria-label={packetMode ? "Restock one pack" : `Restock +${fmtPack.text}`}
                            title={packetMode ? `Add one pack (${fmtPack.text})` : `Restock +${fmtPack.text}`}
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
            {/* Buffer-days setting */}
            <div className="border-2 border-ink p-3 mb-4 bg-ink/5 flex items-center gap-3 flex-wrap">
              <Settings size={16} className="text-ink-muted shrink-0" />
              <div className="flex-1 min-w-0">
                <div className="font-mono text-[10px] uppercase tracking-[0.25em] text-ink-muted">
                  Restock alert
                </div>
                <div className="font-body text-sm">
                  Surface items projected to run out within{" "}
                  <input
                    type="number"
                    min="0"
                    max="30"
                    value={bufferDays}
                    onChange={(e) =>
                      updateProfile({
                        groceryBufferDays: Math.max(0, Number(e.target.value) || 0),
                      })
                    }
                    className="w-14 mx-1 border-2 border-ink bg-paper px-2 py-1 font-display text-base text-center"
                  />
                  day{bufferDays === 1 ? "" : "s"}, based on the last {CONSUMPTION_WINDOW_DAYS}-day usage. Items below the static threshold also appear regardless of usage.
                </div>
              </div>
            </div>

            {/* Plan-driven shopping list — derived from the meals you've
                planned for the next 7 days. Shows up even when inventory
                is empty (the catalog supplies the metadata). */}
            {planShopping.length > 0 && (
              <div className="mb-4">
                <div className="font-mono text-[10px] uppercase tracking-[0.25em] text-ink-muted mb-2">
                  From your meal plan (next 7 days)
                </div>
                <ul className="divide-y divide-ink/30 border-y border-ink/30">
                  {planShopping.map((p) => {
                    const it = p.item;
                    const ps = Math.max(1, Number(it.packetSize) || 1);
                    // Round up to the next "buy multiple" (packet size)
                    // so the user buys what they actually need to cover
                    // the plan deficit.
                    const buyQty = Math.ceil(p.deficit / ps) * ps;
                    const haveFmt = formatQty(p.have, it.unit);
                    const needFmt = formatQty(p.need, it.unit);
                    const buyFmt = formatQty(buyQty, it.unit);
                    return (
                      <li
                        key={p.key}
                        className="py-2 flex flex-col md:flex-row md:items-center gap-2 md:gap-3"
                      >
                        <div className="flex items-start gap-3 flex-1 min-w-0">
                          <span className="text-2xl shrink-0">{it.icon || "🛒"}</span>
                          <div className="flex-1 min-w-0">
                            <div className="font-body text-base flex items-center gap-2 flex-wrap">
                              <span className="break-words">{it.name}</span>
                              {!p.existing && <Chip color="#3b6aa3">New</Chip>}
                              <Chip color="#c44827">Plan need</Chip>
                            </div>
                            <div className="font-mono text-[10px] uppercase tracking-[0.2em] text-ink-muted">
                              Need {needFmt.text} · have {haveFmt.text} · buy ~{buyFmt.text}
                            </div>
                          </div>
                        </div>
                        <Button
                          variant="primary"
                          size="sm"
                          className="shrink-0 self-end md:self-center"
                          onClick={() => markBought(p.key, buyQty)}
                        >
                          Bought
                        </Button>
                      </li>
                    );
                  })}
                </ul>
              </div>
            )}

            {autoShopping.length === 0 && planShopping.length === 0 ? (
              <p className="font-body italic text-ink-muted">
                Nothing on the list — plan some meals or wait for stock to dip below threshold.
              </p>
            ) : autoShopping.length === 0 ? null : (
              <div>
                {planShopping.length > 0 && (
                  <div className="font-mono text-[10px] uppercase tracking-[0.25em] text-ink-muted mb-2">
                    Low / projected to run out
                  </div>
                )}
              <ul className="divide-y divide-ink/30 border-y border-ink/30">
                {autoShopping
                  .slice()
                  .sort((a, b) => a.daysLeft - b.daysLeft)
                  .map((f) => {
                    const it = f.item;
                    // Perishables top up to lowThreshold (one fresh packet's
                    // worth) so we never carry more than ~maxDays of stock.
                    // Non-perishables top up to cover (bufferDays + 7) of usage
                    // when we have a daily-rate, else fall back to 2× threshold.
                    let need;
                    if (it.perishable) {
                      need = Math.max(0, it.lowThreshold - it.qty);
                    } else if (f.avgDaily > 0) {
                      const targetQty = f.avgDaily * (bufferDays + 7);
                      need = Math.max(0, targetQty - it.qty);
                    } else {
                      need = Math.max(0, it.lowThreshold * 2 - it.qty);
                    }
                    const packets = Math.ceil(need / Math.max(1, it.packetSize));
                    const daysLeftDisplay = isFinite(f.daysLeft)
                      ? f.daysLeft < 1
                        ? "<1 day"
                        : `${Math.round(f.daysLeft)} day${Math.round(f.daysLeft) === 1 ? "" : "s"}`
                      : "—";
                    const reasonChip =
                      f.needsBuffer && f.belowThreshold
                        ? "Below threshold + ending soon"
                        : f.needsBuffer
                          ? `Out in ${daysLeftDisplay}`
                          : "Below threshold";
                    return (
                      <li
                        key={it.key}
                        className="py-2 flex flex-col md:flex-row md:items-center gap-2 md:gap-3"
                      >
                        <div className="flex items-start gap-3 flex-1 min-w-0">
                          <span className="text-2xl shrink-0">{it.icon}</span>
                          <div className="flex-1 min-w-0">
                            <div className="font-body text-base flex items-center gap-2 flex-wrap">
                              <span className="break-words">{it.name}</span>
                              <Chip color="#c44827">{reasonChip}</Chip>
                              {it.perishable && (
                                <Chip color="#c44827">Perishable · {it.maxDays || 7}d</Chip>
                              )}
                            </div>
                            <div className="font-mono text-[10px] uppercase tracking-[0.2em] text-ink-muted">
                              {(() => {
                                const haveFmt = formatQty(it.qty, it.unit);
                                const psNum = Math.max(1, Number(it.packetSize) || 1);
                                const packFmt = formatQty(psNum, it.unit);
                                const showPack = showAsPackets(it);
                                const haveStr = showPack
                                  ? `Have ${(it.qty / psNum).toFixed(
                                      (it.qty / psNum) % 1 === 0 ? 0 : 1,
                                    )} pack${(it.qty / psNum) === 1 ? "" : "s"} (${haveFmt.text})`
                                  : `Have ${haveFmt.text}`;
                                // For meat / seafood we keep the "Buy N
                                // packs" phrasing because that's how they're
                                // physically bought. Everything else gets a
                                // plain "Buy ~X kg" / "Buy ~12 pc" line —
                                // no "packet" word.
                                const buyStr = showPack
                                  ? `Buy ${packets} pack${packets === 1 ? "" : "s"} (${packFmt.text} each)`
                                  : `Buy ~${formatQty(packets * psNum, it.unit).text}`;
                                return (
                                  <>
                                    {haveStr}
                                    {f.avgDaily > 0 && (
                                      <>
                                        {" "}
                                        · uses {formatQty(f.avgDaily, it.unit).text}/day · runs out in{" "}
                                        {daysLeftDisplay}
                                      </>
                                    )}
                                    {" · "}{buyStr}
                                    {it.perishable && " · top up only"}
                                  </>
                                );
                              })()}
                            </div>
                          </div>
                        </div>
                        <Button
                          variant="primary"
                          size="sm"
                          className="shrink-0 self-end md:self-center"
                          onClick={() => restockGrocery(it.key)}
                        >
                          Bought
                        </Button>
                      </li>
                    );
                  })}
              </ul>
              </div>
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
        <ItemModal
          item={editing}
          profile={profile}
          updateProfile={updateProfile}
          onClose={() => setEditing(null)}
          onSave={(it) => {
            // Defensive: never persist trackByPackets on a non-meat item.
            // The toggle is hidden in the modal but the field may carry
            // over from older saves or template imports.
            const cleaned = isPacketEligibleItem(it)
              ? it
              : { ...it, trackByPackets: false };
            saveGroceryItem(cleaned);
            setEditing(null);
          }}
        />
      )}

      {showCatalog && (
        <CatalogPickerModal
          catalog={profile.groceryTemplate || []}
          grocery={grocery}
          onClose={() => setShowCatalog(false)}
          onAdd={(key, qty) => markBought(key, qty)}
        />
      )}
    </>
  );
}

// CatalogPickerModal — quick way to stock up the inventory by hand.
// Lists every item in the profile catalog that's NOT yet in the user's
// grocery, with a qty input + "Add" button per row. Calls onAdd(key, qty)
// which routes through markBought so the item appears in inventory and
// activity gets logged.
function CatalogPickerModal({ catalog, grocery, onClose, onAdd }) {
  const inventoryKeys = useMemo(() => new Set(grocery.map((g) => g.key)), [grocery]);
  // Only show what isn't already in the inventory; once added, the row
  // disappears (re-renders against the updated grocery prop).
  const candidates = useMemo(
    () => catalog.filter((c) => !inventoryKeys.has(c.key)),
    [catalog, inventoryKeys],
  );
  const [qtys, setQtys] = useState(() => {
    const out = {};
    for (const c of catalog) out[c.key] = c.initialQty || c.packetSize || 1;
    return out;
  });

  return (
    <Modal
      open
      onClose={onClose}
      title="Stock up from catalog"
      maxWidth="max-w-2xl"
      footer={
        <Button variant="outline" onClick={onClose}>Done</Button>
      }
    >
      <p className="font-body text-sm italic text-ink-muted mb-3">
        Items in your profile catalog that you don't have in inventory yet. Set a quantity and tap Add.
        Anything not listed here is already in your inventory — adjust those rows directly on the main page.
      </p>
      {candidates.length === 0 ? (
        <p className="font-body italic text-ink-muted">
          Every catalog item is already in your inventory. Use <strong>+ Add new</strong> to define a brand-new item.
        </p>
      ) : (
        <ul className="divide-y divide-ink/30 border-y border-ink/30">
          {candidates.map((c) => (
            <li key={c.key} className="py-2 flex flex-col md:flex-row md:items-center gap-2 md:gap-3">
              <div className="flex items-start gap-3 flex-1 min-w-0">
                <span className="text-2xl shrink-0">{c.icon || "🛒"}</span>
                <div className="flex-1 min-w-0">
                  <div className="font-body text-base break-words">{c.name}</div>
                  <div className="font-mono text-[10px] uppercase tracking-[0.2em] text-ink-muted">
                    {c.category} · multiples of {c.packetSize || 1}{c.unit}
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-1 shrink-0 self-end md:self-center">
                <input
                  type="number"
                  value={qtys[c.key] ?? c.packetSize ?? 1}
                  onChange={(e) =>
                    setQtys((p) => ({ ...p, [c.key]: Math.max(0, Number(e.target.value) || 0) }))
                  }
                  className="w-20 border-2 border-ink bg-paper px-2 py-1 font-display text-base text-center"
                />
                <span className="font-mono text-[9px] uppercase tracking-[0.2em] text-ink-muted">
                  {c.unit}
                </span>
                <Button
                  variant="primary"
                  size="sm"
                  onClick={() => {
                    const q = qtys[c.key] ?? c.packetSize ?? 1;
                    if (q > 0) onAdd(c.key, q);
                  }}
                >
                  Add
                </Button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </Modal>
  );
}

function ItemModal({ item, onClose, onSave, profile, updateProfile }) {
  const [draft, setDraft] = useState({ ...item, trackByPackets: !!item.trackByPackets });
  const customUnits = Array.isArray(profile?.customUnits) ? profile.customUnits : [];
  const allUnits = getAllUnits(customUnits);
  const [showAddUnit, setShowAddUnit] = useState(false);
  const [newUnitId, setNewUnitId] = useState("");
  const [newUnitLabel, setNewUnitLabel] = useState("");

  const ps = Math.max(1, Number(draft.packetSize) || 1);
  const packetCount = draft.trackByPackets ? draft.qty / ps : null;

  function addCustomUnit() {
    const id = newUnitId.trim();
    if (!id) return;
    const label = newUnitLabel.trim() || id;
    const next = [...customUnits.filter((u) => u.id !== id), { id, label }];
    updateProfile({ customUnits: next });
    setDraft({ ...draft, unit: id });
    setNewUnitId("");
    setNewUnitLabel("");
    setShowAddUnit(false);
  }

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

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <Field
            label="Unit"
            hint="Pick how this item is measured. Add your own (e.g. tray, scoop) if needed."
          >
            <div className="flex gap-2">
              <Select
                value={draft.unit}
                onChange={(e) => setDraft({ ...draft, unit: e.target.value })}
              >
                {allUnits.map((u) => (
                  <option key={u.id} value={u.id}>{u.label}</option>
                ))}
              </Select>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setShowAddUnit((s) => !s)}
                title="Add a custom unit"
              >
                {showAddUnit ? "Cancel" : "+ Custom"}
              </Button>
            </div>
            {showAddUnit && (
              <div className="border-2 border-ink p-2 mt-2 grid grid-cols-1 md:grid-cols-[1fr_1fr_auto] gap-2 items-end">
                <div>
                  <div className="font-mono text-[9px] uppercase tracking-[0.2em] text-ink-muted mb-0.5">
                    Short id
                  </div>
                  <TextInput
                    value={newUnitId}
                    onChange={(e) => setNewUnitId(e.target.value)}
                    placeholder="tray"
                  />
                </div>
                <div>
                  <div className="font-mono text-[9px] uppercase tracking-[0.2em] text-ink-muted mb-0.5">
                    Label (optional)
                  </div>
                  <TextInput
                    value={newUnitLabel}
                    onChange={(e) => setNewUnitLabel(e.target.value)}
                    placeholder="tray (12 eggs)"
                  />
                </div>
                <Button variant="primary" size="sm" onClick={addCustomUnit}>
                  Save unit
                </Button>
              </div>
            )}
          </Field>
          <Field label="Low at" hint={`Auto-shopping triggers when stock drops to this many ${draft.unit}.`}>
            <TextInput
              type="number"
              value={draft.lowThreshold}
              onChange={(e) =>
                setDraft({ ...draft, lowThreshold: Number(e.target.value) || 0 })
              }
            />
          </Field>
        </div>

        {/* Packet-tracking toggle — only for fridge meat / seafood. Other
            items use plain conventional units (g, ml, pc) which is enough
            for everything that doesn't come in fixed-weight packs. */}
        {isPacketEligibleItem(draft) && (
          <div className="border-2 border-ink p-3 bg-ink/5">
            <label className="flex items-start gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={!!draft.trackByPackets}
                onChange={(e) => setDraft({ ...draft, trackByPackets: e.target.checked })}
                className="mt-1"
              />
              <div className="flex-1 min-w-0">
                <div className="font-display text-base font-bold">Track by packets</div>
                <div className="font-body text-sm italic text-ink-muted">
                  Recommended for fridge meat / seafood you store in fixed-size packs
                  (chicken 500 g, beef cuts, fish fillets). Leave off to just count grams.
                </div>
              </div>
            </label>
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          {isPacketEligibleItem(draft) && draft.trackByPackets ? (
            <>
              <Field label="Packet size" hint={`One packet = N ${draft.unit}.`}>
                <TextInput
                  type="number"
                  value={draft.packetSize}
                  onChange={(e) =>
                    setDraft({ ...draft, packetSize: Math.max(1, Number(e.target.value) || 1) })
                  }
                />
              </Field>
              <Field label="Packets on hand">
                <TextInput
                  type="number"
                  step="0.5"
                  value={Number(((draft.qty || 0) / ps).toFixed(2))}
                  onChange={(e) =>
                    setDraft({
                      ...draft,
                      qty: Math.max(0, Number(e.target.value) || 0) * ps,
                    })
                  }
                />
              </Field>
              <Field label={`Total in ${draft.unit}`} hint="Auto-syncs with packets × size.">
                <TextInput
                  type="number"
                  value={draft.qty}
                  onChange={(e) => setDraft({ ...draft, qty: Math.max(0, Number(e.target.value) || 0) })}
                />
              </Field>
            </>
          ) : (
            <>
              <Field label="Quantity">
                <TextInput
                  type="number"
                  value={draft.qty}
                  onChange={(e) => setDraft({ ...draft, qty: Math.max(0, Number(e.target.value) || 0) })}
                />
              </Field>
              <Field
                label="Buy in multiples of"
                hint={`The quantity you typically buy at a time (e.g. sauce in 500 ${draft.unit}). One tap of Restock adds this much.`}
              >
                <TextInput
                  type="number"
                  value={draft.packetSize}
                  onChange={(e) =>
                    setDraft({ ...draft, packetSize: Math.max(0, Number(e.target.value) || 0) })
                  }
                />
              </Field>
            </>
          )}
        </div>

        {/* Perishable toggle (was hidden before but useful here too) */}
        <div className="border-2 border-ink p-3">
          <label className="flex items-start gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={!!draft.perishable}
              onChange={(e) => setDraft({ ...draft, perishable: e.target.checked })}
              className="mt-1"
            />
            <div className="flex-1 min-w-0">
              <div className="font-display text-base font-bold">Perishable</div>
              <div className="font-body text-sm italic text-ink-muted">
                Limits how much auto-shopping suggests buying — only tops up to one packet's worth.
              </div>
            </div>
          </label>
          {draft.perishable && (
            <div className="mt-2 max-w-xs">
              <Field label="Max days fresh">
                <TextInput
                  type="number"
                  value={draft.maxDays || 7}
                  onChange={(e) =>
                    setDraft({ ...draft, maxDays: Math.max(1, Number(e.target.value) || 7) })
                  }
                />
              </Field>
            </div>
          )}
        </div>
      </div>
    </Modal>
  );
}
