import { useMemo, useState } from "react";
import { useApp } from "../store/AppContext.jsx";
import { Card, CardHeader } from "../components/ui/Card.jsx";
import { Button, IconButton } from "../components/ui/Button.jsx";
import { Field, TextInput, Select, Chip } from "../components/ui/Field.jsx";
import { Modal } from "../components/ui/Modal.jsx";
import { DAYS_SHORT } from "../lib/time.js";
import { Plus, Trash2, Edit3, Copy, Check, Youtube } from "lucide-react";

const ACCENT_PALETTE = ["#c44827", "#3b6aa3", "#4a6b3e", "#6b5a3e", "#2a2419"];

function uid(prefix = "id") {
  return `${prefix}_${Math.random().toString(36).slice(2, 9)}`;
}

// Build a name → defaults map from every program (built-in + custom).
function buildExerciseLibrary(programs) {
  const map = new Map();
  for (const program of programs) {
    for (const day of program.days) {
      for (const ex of day.exercises) {
        const key = (ex.name || "").trim().toLowerCase();
        if (!key) continue;
        const existing = map.get(key);
        if (!existing || (!existing.url && ex.url)) {
          map.set(key, {
            name: ex.name.trim(),
            sets: ex.sets,
            reps: ex.reps,
            restSec: ex.restSec,
            url: ex.url || "",
          });
        }
      }
    }
  }
  return map;
}

export function Programs() {
  const {
    allPrograms,
    activeProgramId,
    setActiveProgramId,
    saveCustomProgram,
    deleteCustomProgram,
  } = useApp();

  const [editing, setEditing] = useState(null);
  const library = useMemo(() => buildExerciseLibrary(allPrograms), [allPrograms]);

  function startCreate() {
    setEditing({
      id: uid("prog"),
      name: "",
      subtitle: "",
      builtin: false,
      days: [
        {
          id: uid("day"),
          name: "Day 1",
          accent: "#c44827",
          icon: "💪",
          target: 2500,
          exercises: [{ id: uid("ex"), name: "", sets: 3, reps: 10, restSec: 90, url: "" }],
        },
      ],
      defaultWeek: ["rest", "rest", "rest", "rest", "rest", "rest", "rest"],
    });
  }
  function startEdit(program) {
    setEditing(JSON.parse(JSON.stringify(program)));
  }
  function startClone(program) {
    const cloned = JSON.parse(JSON.stringify(program));
    cloned.id = uid("prog");
    cloned.name = `${program.name} (copy)`;
    cloned.builtin = false;
    setEditing(cloned);
  }

  return (
    <>
      <Card>
        <CardHeader
          kicker="Programs"
          title="Workout Programs"
          subtitle="Pick a built-in plan or design your own custom split."
          right={
            <Button variant="primary" size="sm" onClick={startCreate}>
              <Plus size={12} /> Create Custom
            </Button>
          }
        />
        <ul className="space-y-3">
          {allPrograms.map((p) => (
            <li
              key={p.id}
              className={`border-2 p-3 ${activeProgramId === p.id ? "border-accent" : "border-ink"}`}
            >
              <div className="flex items-start justify-between gap-3 flex-wrap">
                <div className="flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    {activeProgramId === p.id && (
                      <Chip color="#c44827">
                        <Check size={10} className="inline mr-1" /> Active
                      </Chip>
                    )}
                    <Chip color={p.builtin ? "#3b6aa3" : "#4a6b3e"}>
                      {p.builtin ? "Built-in" : "Custom"}
                    </Chip>
                    <Chip>{p.days.length} days</Chip>
                    <Chip>
                      {p.days.reduce((s, d) => s + d.exercises.length, 0)} exercises
                    </Chip>
                  </div>
                  <h3 className="font-display text-2xl font-bold mt-1">{p.name}</h3>
                  {p.subtitle && (
                    <p className="font-body text-base text-ink-muted italic">{p.subtitle}</p>
                  )}
                  <div className="flex gap-1.5 mt-2 flex-wrap">
                    {p.days.map((d) => (
                      <span
                        key={d.id}
                        className="font-mono text-[9px] uppercase tracking-[0.2em] px-2 py-0.5 text-paper"
                        style={{ backgroundColor: d.accent }}
                        title={d.target ? `${d.target} kcal target` : undefined}
                      >
                        {d.icon ? `${d.icon} ` : ""}
                        {d.name}
                        {d.target ? ` · ${d.target}` : ""}
                      </span>
                    ))}
                  </div>
                </div>
                <div className="flex flex-wrap gap-2">
                  {activeProgramId !== p.id && (
                    <Button variant="primary" size="sm" onClick={() => setActiveProgramId(p.id)}>
                      Use this
                    </Button>
                  )}
                  <Button variant="outline" size="sm" onClick={() => startClone(p)}>
                    <Copy size={12} /> Clone
                  </Button>
                  {!p.builtin && (
                    <>
                      <Button variant="outline" size="sm" onClick={() => startEdit(p)}>
                        <Edit3 size={12} /> Edit
                      </Button>
                      <Button
                        variant="danger"
                        size="sm"
                        onClick={() => {
                          if (confirm(`Delete "${p.name}"?`)) deleteCustomProgram(p.id);
                        }}
                      >
                        <Trash2 size={12} /> Delete
                      </Button>
                    </>
                  )}
                </div>
              </div>
            </li>
          ))}
        </ul>
      </Card>

      {editing && (
        <ProgramEditorModal
          program={editing}
          library={library}
          onClose={() => setEditing(null)}
          onSave={(p) => {
            saveCustomProgram(p);
            setEditing(null);
          }}
        />
      )}

      {/* Datalist for exercise autocomplete (referenced by inputs in editor) */}
      <datalist id="exercise-library">
        {[...library.values()]
          .sort((a, b) => a.name.localeCompare(b.name))
          .map((item) => (
            <option key={item.name} value={item.name}>
              {item.url ? "🎬 with demo video" : ""}
            </option>
          ))}
      </datalist>
    </>
  );
}

function ProgramEditorModal({ program, library, onClose, onSave }) {
  const [draft, setDraft] = useState(program);

  function update(patch) {
    setDraft((d) => ({ ...d, ...patch }));
  }
  function updateDay(dayId, patch) {
    setDraft((d) => ({
      ...d,
      days: d.days.map((day) => (day.id === dayId ? { ...day, ...patch } : day)),
    }));
  }
  function updateExercise(dayId, exId, patch, autoLib = false) {
    setDraft((d) => ({
      ...d,
      days: d.days.map((day) => {
        if (day.id !== dayId) return day;
        return {
          ...day,
          exercises: day.exercises.map((ex) => {
            if (ex.id !== exId) return ex;
            const next = { ...ex, ...patch };
            // Auto-fill from library when name matches a known exercise
            if (autoLib && patch.name) {
              const match = library.get(patch.name.trim().toLowerCase());
              if (match) {
                if (match.url && (!ex.url || ex.url === match.url)) next.url = match.url;
                const isDefault = ex.sets === 3 && ex.reps === 10 && ex.restSec === 90;
                if (isDefault) {
                  next.sets = match.sets;
                  next.reps = match.reps;
                  next.restSec = match.restSec;
                }
              }
            }
            return next;
          }),
        };
      }),
    }));
  }
  function addDay() {
    setDraft((d) => ({
      ...d,
      days: [
        ...d.days,
        {
          id: uid("day"),
          name: `Day ${d.days.length + 1}`,
          accent: ACCENT_PALETTE[d.days.length % ACCENT_PALETTE.length],
          icon: "💪",
          target: 2500,
          exercises: [{ id: uid("ex"), name: "", sets: 3, reps: 10, restSec: 90, url: "" }],
        },
      ],
    }));
  }
  function deleteDay(dayId) {
    setDraft((d) => ({
      ...d,
      days: d.days.filter((day) => day.id !== dayId),
      defaultWeek: d.defaultWeek.map((w) => (w === dayId ? "rest" : w)),
    }));
  }
  function addExercise(dayId) {
    setDraft((d) => ({
      ...d,
      days: d.days.map((day) =>
        day.id === dayId
          ? {
              ...day,
              exercises: [
                ...day.exercises,
                { id: uid("ex"), name: "", sets: 3, reps: 10, restSec: 90, url: "" },
              ],
            }
          : day,
      ),
    }));
  }
  function deleteExercise(dayId, exId) {
    setDraft((d) => ({
      ...d,
      days: d.days.map((day) =>
        day.id === dayId
          ? { ...day, exercises: day.exercises.filter((ex) => ex.id !== exId) }
          : day,
      ),
    }));
  }
  function setWeekSlot(idx, value) {
    setDraft((d) => {
      const w = [...d.defaultWeek];
      w[idx] = value;
      return { ...d, defaultWeek: w };
    });
  }

  function handleSave() {
    if (!draft.name.trim()) return alert("Program needs a name.");
    if (!draft.days.length) return alert("Program needs at least one day.");
    if (draft.days.some((d) => !d.name.trim())) return alert("Every day needs a name.");
    if (draft.days.some((d) => d.exercises.some((ex) => !ex.name.trim())))
      return alert("Every exercise needs a name.");
    onSave(draft);
  }

  return (
    <Modal
      open
      onClose={onClose}
      title={program.name ? `Edit ${program.name}` : "New Custom Program"}
      maxWidth="max-w-3xl"
      footer={
        <>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button variant="primary" onClick={handleSave}>Save Program</Button>
        </>
      }
    >
      <div className="space-y-4">
        <Field label="Program name">
          <TextInput value={draft.name} onChange={(e) => update({ name: e.target.value })} placeholder="e.g. My PPL" />
        </Field>
        <Field label="Subtitle (optional)">
          <TextInput value={draft.subtitle} onChange={(e) => update({ subtitle: e.target.value })} placeholder="6-day intermediate split" />
        </Field>

        <div>
          <div className="flex items-center justify-between mb-2">
            <h4 className="font-display text-xl font-bold">Days</h4>
            <Button variant="outline" size="sm" onClick={addDay}>
              <Plus size={12} /> Add Day
            </Button>
          </div>
          <div className="space-y-3">
            {draft.days.map((day) => (
              <div
                key={day.id}
                className="border-2 border-ink p-3"
                style={{ borderLeftColor: day.accent, borderLeftWidth: 6 }}
              >
                <div className="flex gap-2 mb-3 flex-wrap items-end">
                  <Field label="Day name">
                    <TextInput
                      className="!w-40"
                      value={day.name}
                      onChange={(e) => updateDay(day.id, { name: e.target.value })}
                    />
                  </Field>
                  <Field label="Icon">
                    <TextInput
                      className="!w-20"
                      value={day.icon || ""}
                      onChange={(e) => updateDay(day.id, { icon: e.target.value })}
                      placeholder="💪"
                    />
                  </Field>
                  <Field label="Accent">
                    <Select
                      className="!w-32"
                      value={day.accent}
                      onChange={(e) => updateDay(day.id, { accent: e.target.value })}
                    >
                      {ACCENT_PALETTE.map((c) => (
                        <option key={c} value={c}>
                          {c}
                        </option>
                      ))}
                    </Select>
                  </Field>
                  <Field label="Eating target (kcal)" hint="Drives Diet target on this day type.">
                    <TextInput
                      type="number"
                      className="!w-32"
                      value={day.target ?? 2500}
                      onChange={(e) =>
                        updateDay(day.id, {
                          target: Math.max(1200, Math.round(Number(e.target.value) || 0)),
                        })
                      }
                    />
                  </Field>
                  {draft.days.length > 1 && (
                    <IconButton onClick={() => deleteDay(day.id)} aria-label="Delete day">
                      <Trash2 size={14} />
                    </IconButton>
                  )}
                </div>
                <div className="space-y-2">
                  {day.exercises.map((ex) => (
                    <div key={ex.id} className="border border-ink/40 p-2 space-y-1.5">
                      <div className="grid grid-cols-12 gap-1.5 items-center">
                        <input
                          list="exercise-library"
                          autoComplete="off"
                          className="col-span-12 md:col-span-5 border-2 border-ink bg-paper px-2 py-1 font-body text-sm focus:outline-none focus:border-accent"
                          value={ex.name}
                          onChange={(e) =>
                            updateExercise(day.id, ex.id, { name: e.target.value }, true)
                          }
                          placeholder="Type to search library or write your own"
                        />
                        <TextInput
                          type="number"
                          className="col-span-3 md:col-span-1 !py-1 !text-sm"
                          value={ex.sets}
                          onChange={(e) =>
                            updateExercise(day.id, ex.id, {
                              sets: Number(e.target.value) || 0,
                            })
                          }
                          placeholder="sets"
                        />
                        <TextInput
                          type="number"
                          className="col-span-3 md:col-span-1 !py-1 !text-sm"
                          value={ex.reps}
                          onChange={(e) =>
                            updateExercise(day.id, ex.id, {
                              reps: Number(e.target.value) || 0,
                            })
                          }
                          placeholder="reps"
                        />
                        <TextInput
                          type="number"
                          className="col-span-3 md:col-span-2 !py-1 !text-sm"
                          value={ex.restSec}
                          onChange={(e) =>
                            updateExercise(day.id, ex.id, {
                              restSec: Number(e.target.value) || 0,
                            })
                          }
                          placeholder="rest s"
                        />
                        <span className="col-span-3 md:col-span-2 font-mono text-[9px] uppercase tracking-[0.2em] text-ink-muted text-center">
                          {ex.sets} × {ex.reps}
                        </span>
                        <IconButton
                          onClick={() => deleteExercise(day.id, ex.id)}
                          aria-label="Delete exercise"
                          className="col-span-12 md:col-span-1"
                        >
                          <Trash2 size={12} />
                        </IconButton>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <Youtube size={12} className="text-ink-muted shrink-0" />
                        <TextInput
                          className="flex-1 !py-1 !text-sm"
                          value={ex.url}
                          onChange={(e) =>
                            updateExercise(day.id, ex.id, { url: e.target.value })
                          }
                          placeholder="YouTube URL (optional — auto-filled when name matches library)"
                        />
                      </div>
                    </div>
                  ))}
                  <Button variant="ghost" size="sm" onClick={() => addExercise(day.id)}>
                    <Plus size={12} /> Add exercise
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div>
          <h4 className="font-display text-xl font-bold mb-2">Default Schedule</h4>
          <div className="grid grid-cols-7 gap-2">
            {draft.defaultWeek.map((slot, i) => (
              <div key={i}>
                <div className="font-mono text-[10px] uppercase tracking-[0.2em] text-ink-muted mb-1 text-center">
                  {DAYS_SHORT[i]}
                </div>
                <Select
                  value={slot}
                  onChange={(e) => setWeekSlot(i, e.target.value)}
                  className="!text-xs !py-1"
                >
                  <option value="rest">Rest</option>
                  {draft.days.map((d) => (
                    <option key={d.id} value={d.id}>
                      {d.name}
                    </option>
                  ))}
                </Select>
              </div>
            ))}
          </div>
        </div>
      </div>
    </Modal>
  );
}
