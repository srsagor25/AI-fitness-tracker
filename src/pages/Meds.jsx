import { useEffect, useMemo, useState } from "react";
import { useApp } from "../store/AppContext.jsx";
import { Card, CardHeader, Stat } from "../components/ui/Card.jsx";
import { Button, IconButton } from "../components/ui/Button.jsx";
import { Field, TextInput, Select, Chip } from "../components/ui/Field.jsx";
import { Modal } from "../components/ui/Modal.jsx";
import {
  Pill,
  Syringe,
  Droplet,
  Plus,
  Trash2,
  Edit3,
  Bell,
  BellRing,
  BellOff,
  Check,
  Clock,
} from "lucide-react";

// Common supplement presets — pre-fill the editor when adding from "Supps".
export const SUPPLEMENT_PRESETS = [
  { name: "Melatonin gummies", type: "gummy", defaultQuantity: 1, unit: "gummies", notes: "Take 30 min before bed" },
  { name: "Vitamin D3", type: "capsule", defaultQuantity: 1, unit: "capsules", notes: "1000–4000 IU; with fat for absorption" },
  { name: "Multivitamin", type: "tablet", defaultQuantity: 1, unit: "tablets", notes: "With breakfast" },
  { name: "Nicotine gum", type: "gummy", defaultQuantity: 1, unit: "pieces", notes: "" },
  { name: "Nicotine patch", type: "topical", defaultQuantity: 1, unit: "patch", notes: "Apply daily; rotate site" },
  { name: "Fish Oil / Omega-3", type: "capsule", defaultQuantity: 2, unit: "capsules", notes: "With meal" },
  { name: "Magnesium glycinate", type: "capsule", defaultQuantity: 1, unit: "capsules", notes: "Before bed" },
  { name: "Zinc", type: "capsule", defaultQuantity: 1, unit: "capsules", notes: "Not on empty stomach" },
  { name: "Vitamin C", type: "tablet", defaultQuantity: 1, unit: "tablets", notes: "" },
  { name: "B-Complex", type: "tablet", defaultQuantity: 1, unit: "tablets", notes: "" },
  { name: "Creatine", type: "powder", defaultQuantity: 5, unit: "g", notes: "5g daily, any time" },
  { name: "Whey protein", type: "powder", defaultQuantity: 1, unit: "scoops", notes: "Post-workout or with meals" },
  { name: "Caffeine", type: "tablet", defaultQuantity: 1, unit: "tablets", notes: "" },
  { name: "Ashwagandha", type: "capsule", defaultQuantity: 1, unit: "capsules", notes: "" },
  { name: "Probiotic", type: "capsule", defaultQuantity: 1, unit: "capsules", notes: "" },
];

export const MED_TYPES = [
  { id: "tablet", label: "Tablet", icon: "💊", iconCmp: Pill, defaultUnit: "tablets" },
  { id: "capsule", label: "Capsule", icon: "💊", iconCmp: Pill, defaultUnit: "capsules" },
  { id: "gummy", label: "Gummy", icon: "🐻", iconCmp: Pill, defaultUnit: "gummies" },
  { id: "powder", label: "Powder / Scoop", icon: "🥄", iconCmp: Pill, defaultUnit: "scoops" },
  { id: "drop", label: "Drop", icon: "💧", iconCmp: Droplet, defaultUnit: "drops" },
  { id: "syrup", label: "Syrup / Liquid", icon: "🧴", iconCmp: Droplet, defaultUnit: "ml" },
  { id: "spray", label: "Spray", icon: "💨", iconCmp: Droplet, defaultUnit: "sprays" },
  { id: "inhaler", label: "Inhaler", icon: "🫁", iconCmp: Droplet, defaultUnit: "puffs" },
  { id: "vaccine", label: "Vaccine / Injection", icon: "💉", iconCmp: Syringe, defaultUnit: "dose" },
  { id: "topical", label: "Topical / Cream", icon: "🩹", iconCmp: Pill, defaultUnit: "applications" },
  { id: "therapy", label: "Therapy / Workout", icon: "🧘", iconCmp: Pill, defaultUnit: "minutes", defaultQuantity: 30 },
  { id: "other", label: "Other", icon: "🩺", iconCmp: Pill, defaultUnit: "units" },
];

function uid() {
  return "med_" + Math.random().toString(36).slice(2, 9);
}

function todayHM(d = new Date()) {
  return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
}

function todayDateKey(d = new Date()) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${dd}`;
}

function daysBetween(aKey, bKey) {
  const a = new Date(aKey);
  const b = new Date(bKey);
  return Math.floor((b - a) / 86400000);
}

// Returns true if a medication should fire today based on its repeat cycle.
function isDueToday(med, today = new Date()) {
  const every = Math.max(1, Number(med.repeatEveryDays) || 1);
  if (every === 1) return true;
  const start = med.startDate || todayDateKey(today);
  const days = daysBetween(start, todayDateKey(today));
  if (days < 0) return false; // before start
  return days % every === 0;
}

function nextDueDate(med, from = new Date()) {
  const every = Math.max(1, Number(med.repeatEveryDays) || 1);
  if (every === 1) return from;
  const start = med.startDate || todayDateKey(from);
  const startD = new Date(start);
  const today = new Date(from);
  today.setHours(0, 0, 0, 0);
  if (today < startD) return startD;
  const days = Math.floor((today - startD) / 86400000);
  const remainder = days % every;
  if (remainder === 0) return today;
  const next = new Date(today);
  next.setDate(next.getDate() + (every - remainder));
  return next;
}

function minutesUntil(hhmm, due = new Date()) {
  if (!hhmm) return Infinity;
  const [h, m] = hhmm.split(":").map(Number);
  const now = new Date();
  const target = new Date(due);
  target.setHours(h, m, 0, 0);
  if (target < now) {
    // If the same-day target has passed, push to next due day
    target.setDate(target.getDate() + 1);
  }
  return Math.round((target - now) / 60000);
}

export function Meds({ category = "med", title = "Medications", kicker = "Pill, Drop, Vaccine", emptyHint = "Click Add Medication to create one." } = {}) {
  const { meds: allMeds, saveMedication, deleteMedication, medsTakenToday, logDose, unlogDose } =
    useApp();
  const meds = useMemo(() => allMeds.filter((m) => (m.category || "med") === category), [allMeds, category]);
  const todayDoses = useMemo(
    () => medsTakenToday.filter((d) => (d.category || "med") === category),
    [medsTakenToday, category],
  );
  const [editing, setEditing] = useState(null);
  const [doseModal, setDoseModal] = useState(null);
  const [notifPermission, setNotifPermission] = useState(
    typeof Notification !== "undefined" ? Notification.permission : "unsupported",
  );

  // Reminder ticker — checks every 30s if any reminder time matches now (±1m)
  // and fires a browser notification, deduped by med+time+date. Skips meds
  // not due today based on their repeatEveryDays cycle.
  useEffect(() => {
    if (notifPermission !== "granted") return;
    const fired = new Set();
    function check() {
      const now = new Date();
      const hm = todayHM(now);
      const day = now.toISOString().slice(0, 10);
      for (const m of meds) {
        if (!isDueToday(m, now)) continue;
        for (const t of m.reminderTimes || []) {
          const key = `${day}|${m.id}|${t}`;
          if (hm === t && !fired.has(key)) {
            fired.add(key);
            try {
              new Notification(`💊 ${m.name}`, {
                body: `Take ${m.defaultQuantity || 1} ${m.unit || "dose"}${m.notes ? ` — ${m.notes}` : ""}`,
                tag: key,
              });
            } catch {}
          }
        }
      }
    }
    check();
    const t = setInterval(check, 30 * 1000);
    return () => clearInterval(t);
  }, [meds, notifPermission]);

  async function requestPerm() {
    if (typeof Notification === "undefined") return;
    const p = await Notification.requestPermission();
    setNotifPermission(p);
  }

  function startCreate() {
    setEditing({
      id: uid(),
      name: "",
      type: category === "supplement" ? "gummy" : "tablet",
      category,
      defaultQuantity: 1,
      unit: category === "supplement" ? "gummies" : "tablets",
      notes: "",
      reminderTimes: [],
      repeatEveryDays: 1,
      startDate: todayDateKey(),
    });
  }

  const upcomingReminders = useMemo(() => {
    const out = [];
    const todayD = new Date();
    for (const m of meds) {
      const dueDate = isDueToday(m, todayD) ? todayD : nextDueDate(m, todayD);
      const dueDateKey = todayDateKey(dueDate);
      const isToday = dueDateKey === todayDateKey(todayD);
      for (const t of m.reminderTimes || []) {
        out.push({
          medId: m.id,
          medName: m.name,
          time: t,
          mins: minutesUntil(t, dueDate),
          dueDateKey,
          isToday,
          repeatEveryDays: m.repeatEveryDays || 1,
        });
      }
    }
    return out.sort((a, b) => a.mins - b.mins);
  }, [meds]);

  return (
    <>
      <Card>
        <CardHeader
          kicker={kicker}
          title={title}
          subtitle={`${meds.length} ${category}${meds.length === 1 ? "" : "s"} · ${todayDoses.length} dose${todayDoses.length === 1 ? "" : "s"} taken today`}
          right={
            <div className="flex flex-wrap gap-2">
              {notifPermission === "default" && (
                <Button variant="outline" size="sm" onClick={requestPerm}>
                  <Bell size={12} /> Enable Reminders
                </Button>
              )}
              {notifPermission === "granted" && (
                <Chip color="#4a6b3e">
                  <BellRing size={10} className="inline mr-1" /> Reminders on
                </Chip>
              )}
              {notifPermission === "denied" && (
                <Chip color="#c44827">
                  <BellOff size={10} className="inline mr-1" /> Notifications blocked
                </Chip>
              )}
              <Button variant="primary" size="sm" onClick={startCreate}>
                <Plus size={12} /> Add {category === "supplement" ? "Supplement" : "Medication"}
              </Button>
            </div>
          }
        />

        {notifPermission === "denied" && (
          <p className="font-body text-sm italic text-ink-muted mb-3">
            Browser notifications are blocked. Enable them in site settings to get
            reminders. The reminder times are still listed below.
          </p>
        )}

        {meds.length === 0 ? (
          <p className="font-body italic text-ink-muted">
            No medications added yet. Click <strong>Add Medication</strong> to create one.
          </p>
        ) : (
          <ul className="space-y-3">
            {meds.map((m) => (
              <MedRow
                key={m.id}
                med={m}
                takenToday={todayDoses.filter((d) => d.medId === m.id)}
                onTake={() => setDoseModal(m)}
                onEdit={() => setEditing({ ...m })}
                onDelete={() => {
                  if (confirm(`Remove ${m.name}?`)) deleteMedication(m.id);
                }}
              />
            ))}
          </ul>
        )}
      </Card>

      {upcomingReminders.length > 0 && (
        <Card>
          <CardHeader kicker="Schedule" title="Upcoming Reminders" />
          <ul className="divide-y divide-ink/30 border-y border-ink/30">
            {upcomingReminders.slice(0, 8).map((r, i) => (
              <li key={i} className="py-2 flex items-center justify-between gap-3 flex-wrap">
                <div className="flex items-center gap-2 flex-wrap">
                  <Clock size={14} className="text-ink-muted" />
                  <span className="font-body">{r.medName}</span>
                  {!r.isToday && (
                    <Chip color="#3b6aa3">
                      Next: {new Date(r.dueDateKey).toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" })}
                    </Chip>
                  )}
                  {r.repeatEveryDays > 1 && (
                    <Chip color="#6b5a3e">Every {r.repeatEveryDays}d</Chip>
                  )}
                </div>
                <div className="flex items-center gap-3">
                  <span className="font-display text-lg font-bold">{r.time}</span>
                  <span className="font-mono text-[10px] uppercase tracking-[0.2em] text-ink-muted w-24 text-right">
                    in {r.mins < 60 ? `${r.mins}m` : `${Math.floor(r.mins / 60)}h ${r.mins % 60}m`}
                  </span>
                </div>
              </li>
            ))}
          </ul>
        </Card>
      )}

      <Card>
        <CardHeader
          kicker="Today's doses"
          title={`${todayDoses.length} taken`}
          right={
            todayDoses.length > 0 && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  if (confirm("Clear today's dose log?")) {
                    todayDoses.forEach((d) => unlogDose(d.id));
                  }
                }}
              >
                Clear today
              </Button>
            )
          }
        />
        {todayDoses.length === 0 ? (
          <p className="font-body italic text-ink-muted">No doses logged yet today.</p>
        ) : (
          <ul className="divide-y divide-ink/30 border-y border-ink/30">
            {[...todayDoses]
              .sort((a, b) => b.takenAt - a.takenAt)
              .map((d) => {
                const tDef = MED_TYPES.find((t) => t.id === d.type);
                return (
                  <li key={d.id} className="py-2 flex items-center gap-3">
                    <span className="text-2xl">{tDef?.icon || "💊"}</span>
                    <div className="flex-1 min-w-0">
                      <div className="font-body text-base">
                        {d.medName}{" "}
                        <span className="font-mono text-[10px] uppercase tracking-[0.2em] text-ink-muted ml-1">
                          {d.quantity} {d.unit}
                        </span>
                      </div>
                      <div className="font-mono text-[10px] uppercase tracking-[0.2em] text-ink-muted">
                        {new Date(d.takenAt).toLocaleTimeString("en-US", {
                          hour: "numeric",
                          minute: "2-digit",
                        })}
                        {d.note && ` · ${d.note}`}
                      </div>
                    </div>
                    <IconButton onClick={() => unlogDose(d.id)} aria-label="Remove dose">
                      <Trash2 size={14} />
                    </IconButton>
                  </li>
                );
              })}
          </ul>
        )}
      </Card>

      {editing && (
        <MedEditorModal
          med={editing}
          onClose={() => setEditing(null)}
          onSave={(m) => {
            saveMedication(m);
            setEditing(null);
          }}
        />
      )}
      {doseModal && (
        <DoseModal
          med={doseModal}
          onClose={() => setDoseModal(null)}
          onLog={(qty, note) => {
            logDose(doseModal, qty, note);
            setDoseModal(null);
          }}
        />
      )}
    </>
  );
}

function MedRow({ med, takenToday, onTake, onEdit, onDelete }) {
  const tDef = MED_TYPES.find((t) => t.id === med.type) || MED_TYPES[0];
  const totalToday = takenToday.reduce((s, d) => s + (d.quantity || 0), 0);
  const dueToday = isDueToday(med);
  const every = Math.max(1, Number(med.repeatEveryDays) || 1);
  const repeatLabel =
    every === 1
      ? "Daily"
      : every === 7
        ? "Weekly"
        : every === 14
          ? "Bi-weekly"
          : every === 30
            ? "Monthly"
            : `Every ${every} days`;
  const next = dueToday ? null : nextDueDate(med);
  return (
    <li className={`border-2 p-3 ${!dueToday ? "border-ink/30 bg-ink/5" : "border-ink"}`}>
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div className="flex items-start gap-3 flex-1 min-w-0">
          <span className="text-3xl">{tDef.icon}</span>
          <div className="flex-1">
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="font-display text-xl font-bold">{med.name}</h3>
              <Chip>{tDef.label}</Chip>
              <Chip color="#3b6aa3">
                {med.defaultQuantity} {med.unit}
              </Chip>
              <Chip color={every === 1 ? "#6b5a3e" : "#3b6aa3"}>{repeatLabel}</Chip>
              {!dueToday && next && (
                <Chip color="#6b5a3e">
                  Next: {next.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" })}
                </Chip>
              )}
              {takenToday.length > 0 && (
                <Chip color="#4a6b3e">
                  <Check size={10} className="inline mr-1" />
                  {takenToday.length} dose{takenToday.length === 1 ? "" : "s"} today ({totalToday} {med.unit})
                </Chip>
              )}
            </div>
            {med.notes && (
              <p className="font-body text-sm italic text-ink-muted mt-1">{med.notes}</p>
            )}
            {med.reminderTimes?.length > 0 && (
              <div className="flex flex-wrap gap-1.5 mt-2">
                {med.reminderTimes.map((t, i) => (
                  <span
                    key={i}
                    className="font-mono text-[10px] uppercase tracking-[0.2em] border border-ink/40 px-2 py-0.5 inline-flex items-center gap-1"
                  >
                    <Clock size={10} /> {t}
                  </span>
                ))}
              </div>
            )}
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="primary" size="sm" onClick={onTake}>
            <Check size={12} /> Take Dose
          </Button>
          <Button variant="outline" size="sm" onClick={onEdit}>
            <Edit3 size={12} /> Edit
          </Button>
          <IconButton onClick={onDelete} aria-label="Delete">
            <Trash2 size={14} />
          </IconButton>
        </div>
      </div>
    </li>
  );
}

function MedEditorModal({ med, onClose, onSave }) {
  const [draft, setDraft] = useState(med);
  const [reminderInput, setReminderInput] = useState("08:00");

  function update(patch) {
    setDraft((d) => ({ ...d, ...patch }));
  }
  function changeType(typeId) {
    const t = MED_TYPES.find((x) => x.id === typeId) || MED_TYPES[0];
    setDraft((d) => ({
      ...d,
      type: typeId,
      // Reset unit + default quantity to the type's defaults if this is a
      // fresh draft. We only respect the user's prior unit if it's not the
      // previous type's default (i.e. they explicitly customised it).
      unit: t.defaultUnit,
      defaultQuantity: t.defaultQuantity ?? d.defaultQuantity ?? 1,
    }));
  }
  function addReminder() {
    if (!reminderInput) return;
    const times = [...(draft.reminderTimes || []), reminderInput];
    times.sort();
    update({ reminderTimes: [...new Set(times)] });
  }
  function removeReminder(t) {
    update({ reminderTimes: (draft.reminderTimes || []).filter((x) => x !== t) });
  }

  function handleSave() {
    if (!draft.name?.trim()) return alert("Medication needs a name.");
    onSave({
      ...draft,
      name: draft.name.trim(),
      defaultQuantity: Number(draft.defaultQuantity) || 1,
      unit: (draft.unit || "").trim(),
      reminderTimes: [...new Set(draft.reminderTimes || [])].sort(),
      repeatEveryDays: Math.max(1, Number(draft.repeatEveryDays) || 1),
      startDate: draft.startDate || todayDateKey(),
    });
  }

  const REPEAT_PRESETS = [
    { value: 1, label: "Daily" },
    { value: 2, label: "Every 2 days" },
    { value: 3, label: "Every 3 days" },
    { value: 7, label: "Weekly" },
    { value: 14, label: "Bi-weekly" },
    { value: 30, label: "Monthly" },
  ];
  const isCustomRepeat = !REPEAT_PRESETS.find((r) => r.value === Number(draft.repeatEveryDays));

  return (
    <Modal
      open
      onClose={onClose}
      title={med.name ? `Edit ${med.name}` : "New Medication"}
      maxWidth="max-w-xl"
      footer={
        <>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button variant="primary" onClick={handleSave}>Save</Button>
        </>
      }
    >
      <div className="space-y-3">
        {draft.category === "supplement" && !draft.name?.trim() && (
          <div className="border-2 border-ink p-3 bg-ink/5">
            <div className="font-mono text-[10px] uppercase tracking-[0.25em] text-ink-muted mb-2">
              Quick-pick a supplement
            </div>
            <div className="flex flex-wrap gap-1.5">
              {SUPPLEMENT_PRESETS.map((p) => (
                <button
                  key={p.name}
                  type="button"
                  onClick={() =>
                    setDraft((d) => ({
                      ...d,
                      name: p.name,
                      type: p.type,
                      defaultQuantity: p.defaultQuantity,
                      unit: p.unit,
                      notes: p.notes || d.notes || "",
                    }))
                  }
                  className="font-mono text-[10px] uppercase tracking-[0.2em] border-2 border-ink px-2 py-1 hover:bg-ink hover:text-paper transition-colors"
                >
                  {p.name}
                </button>
              ))}
            </div>
            <p className="font-body text-sm italic text-ink-muted mt-2">
              Tap one to fill in the form, then add reminder times below.
            </p>
          </div>
        )}
        <Field label="Name">
          <TextInput
            value={draft.name}
            onChange={(e) => update({ name: e.target.value })}
            placeholder={draft.category === "supplement" ? "e.g. Magnesium glycinate" : "e.g. Vitamin D3, Metformin, Ozempic"}
          />
        </Field>
        <Field label="Type">
          <Select value={draft.type} onChange={(e) => changeType(e.target.value)}>
            {MED_TYPES.map((t) => (
              <option key={t.id} value={t.id}>
                {t.icon} {t.label}
              </option>
            ))}
          </Select>
        </Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Default quantity per dose">
            <TextInput
              type="number"
              step="0.1"
              value={draft.defaultQuantity}
              onChange={(e) => update({ defaultQuantity: e.target.value })}
            />
          </Field>
          <Field label="Unit">
            <TextInput
              value={draft.unit}
              onChange={(e) => update({ unit: e.target.value })}
              placeholder="tablets, drops, ml, dose…"
            />
          </Field>
        </div>
        <Field label="Notes (optional)">
          <TextInput
            value={draft.notes || ""}
            onChange={(e) => update({ notes: e.target.value })}
            placeholder="e.g. Take with food, alternate arm, etc."
          />
        </Field>

        <div>
          <div className="font-mono text-[10px] uppercase tracking-[0.25em] text-ink-muted mb-1">
            Repeat schedule
          </div>
          <div className="flex flex-wrap gap-2 mb-2">
            {REPEAT_PRESETS.map((r) => (
              <button
                key={r.value}
                type="button"
                onClick={() => update({ repeatEveryDays: r.value })}
                className={`px-3 py-1.5 border-2 font-mono text-[10px] uppercase tracking-[0.2em] ${
                  Number(draft.repeatEveryDays) === r.value
                    ? "bg-ink text-paper border-ink"
                    : "border-ink hover:bg-ink hover:text-paper"
                }`}
              >
                {r.label}
              </button>
            ))}
            <button
              type="button"
              onClick={() => update({ repeatEveryDays: 5 })}
              className={`px-3 py-1.5 border-2 font-mono text-[10px] uppercase tracking-[0.2em] ${
                isCustomRepeat ? "bg-ink text-paper border-ink" : "border-ink hover:bg-ink hover:text-paper"
              }`}
            >
              Custom
            </button>
          </div>
          {isCustomRepeat && (
            <Field label="Every X days">
              <TextInput
                type="number"
                min="1"
                value={draft.repeatEveryDays}
                onChange={(e) => update({ repeatEveryDays: Math.max(1, Number(e.target.value) || 1) })}
              />
            </Field>
          )}
          {Number(draft.repeatEveryDays) > 1 && (
            <Field label="Start date">
              <TextInput
                type="date"
                value={draft.startDate || todayDateKey()}
                onChange={(e) => update({ startDate: e.target.value })}
              />
            </Field>
          )}
          {Number(draft.repeatEveryDays) > 1 && (
            <p className="font-body text-sm italic text-ink-muted mt-1">
              Reminders fire every {draft.repeatEveryDays} days starting{" "}
              {new Date(draft.startDate || todayDateKey()).toLocaleDateString("en-US", { month: "short", day: "numeric" })}.
            </p>
          )}
        </div>

        <div>
          <div className="font-mono text-[10px] uppercase tracking-[0.25em] text-ink-muted mb-1">
            Reminder times (each due day)
          </div>
          <div className="flex gap-2 mb-2">
            <input
              type="time"
              value={reminderInput}
              onChange={(e) => setReminderInput(e.target.value)}
              className="border-2 border-ink bg-paper px-2 py-1.5 font-body text-base focus:outline-none focus:border-accent"
            />
            <Button variant="outline" type="button" onClick={addReminder}>
              <Plus size={12} /> Add time
            </Button>
          </div>
          {draft.reminderTimes?.length > 0 ? (
            <div className="flex flex-wrap gap-2">
              {draft.reminderTimes.map((t) => (
                <button
                  key={t}
                  type="button"
                  onClick={() => removeReminder(t)}
                  className="font-mono text-[10px] uppercase tracking-[0.2em] border-2 border-ink px-2 py-1 hover:bg-accent hover:text-paper hover:border-accent transition-colors flex items-center gap-1"
                  aria-label={`Remove ${t}`}
                >
                  <Clock size={10} /> {t}
                  <Trash2 size={10} className="ml-1" />
                </button>
              ))}
            </div>
          ) : (
            <p className="font-body text-sm italic text-ink-muted">
              No reminders set. Add times above to get notifications when this medication
              is due.
            </p>
          )}
        </div>
      </div>
    </Modal>
  );
}

function DoseModal({ med, onClose, onLog }) {
  const [qty, setQty] = useState(med.defaultQuantity || 1);
  const [note, setNote] = useState("");
  return (
    <Modal
      open
      onClose={onClose}
      title={`Take ${med.name}`}
      footer={
        <>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button variant="primary" onClick={() => onLog(qty, note)}>
            Log Dose
          </Button>
        </>
      }
    >
      <div className="space-y-3">
        <Field label={`Quantity (${med.unit})`}>
          <TextInput
            type="number"
            step="0.1"
            value={qty}
            onChange={(e) => setQty(e.target.value)}
          />
        </Field>
        <Field label="Note (optional)">
          <TextInput
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="e.g. left arm, with breakfast"
          />
        </Field>
      </div>
    </Modal>
  );
}
