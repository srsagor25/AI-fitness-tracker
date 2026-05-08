import { useMemo, useState } from "react";
import { useApp } from "../store/AppContext.jsx";
import { Card, CardHeader, Stat } from "../components/ui/Card.jsx";
import { Button, IconButton } from "../components/ui/Button.jsx";
import { Field, TextInput, Select, Chip } from "../components/ui/Field.jsx";
import { Modal } from "../components/ui/Modal.jsx";
import { DateRangeFilter, filterRange, filterLabel } from "../components/ui/DateRangeFilter.jsx";
import { INTENSITY, estimateSportKcal } from "../store/sports.js";
import { todayKey } from "../lib/time.js";
import { Plus, Trash2, Edit3, Flame, Clock, Activity } from "lucide-react";

function uid() {
  return "sp_" + Math.random().toString(36).slice(2, 9);
}

export function Sports() {
  const {
    profile,
    sportsList,
    sportsLog,
    addSportSession,
    removeSportSession,
    saveSport,
    deleteSport,
    todaysSportsKcal,
  } = useApp();

  const [logging, setLogging] = useState(null); // sport id or null
  const [editingSport, setEditingSport] = useState(null);
  const [filter, setFilter] = useState({ mode: "preset", days: 30 });

  const today = todayKey();
  const todaysSessions = useMemo(
    () => sportsLog.filter((s) => todayKey(new Date(s.date)) === today),
    [sportsLog, today],
  );

  const inWindow = useMemo(() => {
    const range = filterRange(filter);
    return sportsLog.filter((s) => {
      const t = new Date(s.date).getTime();
      return t >= range.from && t <= range.to;
    });
  }, [sportsLog, filter]);

  const totals = useMemo(() => {
    let totalMin = 0;
    let totalKcal = 0;
    const bySport = {};
    for (const s of inWindow) {
      totalMin += Number(s.durationMin) || 0;
      totalKcal += Number(s.kcal) || 0;
      if (!bySport[s.sportId]) {
        bySport[s.sportId] = {
          name: s.sportName,
          icon: s.sportIcon,
          minutes: 0,
          kcal: 0,
          count: 0,
        };
      }
      bySport[s.sportId].minutes += Number(s.durationMin) || 0;
      bySport[s.sportId].kcal += Number(s.kcal) || 0;
      bySport[s.sportId].count++;
    }
    return { totalMin, totalKcal, bySport, count: inWindow.length };
  }, [inWindow]);

  return (
    <>
      <Card>
        <CardHeader
          kicker="Activity"
          title="Sports"
          subtitle={`Today: ${todaysSessions.length} session${todaysSessions.length === 1 ? "" : "s"} · ${Math.round(todaysSportsKcal)} kcal burned`}
          right={
            <Button
              variant="outline"
              size="sm"
              onClick={() =>
                setEditingSport({
                  id: uid(),
                  name: "",
                  icon: "🏃",
                  met: 5.0,
                  color: "#3b6aa3",
                })
              }
            >
              <Plus size={12} /> Add Sport
            </Button>
          }
        />

        {/* Sport library — tap a sport to log a session */}
        <div className="font-mono text-[10px] uppercase tracking-[0.25em] text-ink-muted mb-2">
          Tap a sport to log today's session
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2 mb-4">
          {sportsList.map((s) => (
            <div key={s.id} className="border-2 border-ink p-2 flex flex-col gap-1">
              <button
                onClick={() => setLogging(s.id)}
                className="flex items-center gap-2 text-left hover:bg-ink/5 px-1 py-1 transition-colors"
              >
                <span className="text-2xl">{s.icon}</span>
                <div className="flex-1 min-w-0">
                  <div className="font-body text-base truncate">{s.name}</div>
                  <div className="font-mono text-[9px] uppercase tracking-[0.2em] text-ink-muted">
                    MET {s.met}
                  </div>
                </div>
                <Plus size={14} className="shrink-0 text-ink-muted" />
              </button>
              <div className="flex justify-end gap-1">
                <button
                  onClick={() => setEditingSport({ ...s })}
                  className="font-mono text-[9px] uppercase tracking-[0.2em] text-ink-muted hover:text-ink"
                >
                  edit
                </button>
                <span className="font-mono text-[9px] text-ink-muted">·</span>
                <button
                  onClick={() => {
                    if (confirm(`Remove ${s.name} from your sports list?`)) deleteSport(s.id);
                  }}
                  className="font-mono text-[9px] uppercase tracking-[0.2em] text-ink-muted hover:text-accent"
                >
                  remove
                </button>
              </div>
            </div>
          ))}
        </div>
      </Card>

      {todaysSessions.length > 0 && (
        <Card>
          <CardHeader
            kicker="Today"
            title={`${todaysSessions.length} sport session${todaysSessions.length === 1 ? "" : "s"}`}
            subtitle={`${todaysSessions.reduce((s, x) => s + (x.durationMin || 0), 0)} min · ${Math.round(todaysSportsKcal)} kcal · feeds into your eating target`}
          />
          <ul className="divide-y divide-ink/30 border-y border-ink/30">
            {todaysSessions.map((s) => (
              <SessionRow
                key={s.id}
                session={s}
                onRemove={() => removeSportSession(s.id)}
              />
            ))}
          </ul>
        </Card>
      )}

      <Card>
        <CardHeader
          kicker="History"
          title="All Sport Sessions"
          subtitle={`${totals.count} sessions · ${totals.totalMin} min · ${Math.round(totals.totalKcal).toLocaleString()} kcal · ${filterLabel(filter)}`}
        />
        <div className="mb-3">
          <DateRangeFilter filter={filter} setFilter={setFilter} compact />
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
          <Stat label="Sessions" value={totals.count} />
          <Stat label="Total time" value={Math.round(totals.totalMin)} suffix="min" accent="#3b6aa3" />
          <Stat
            label="Total kcal"
            value={Math.round(totals.totalKcal).toLocaleString()}
            accent="#c44827"
          />
          <Stat
            label="Sports played"
            value={Object.keys(totals.bySport).length}
            accent="#4a6b3e"
          />
        </div>

        {Object.keys(totals.bySport).length > 0 && (
          <ul className="divide-y divide-ink/30 border-y border-ink/30 mb-4">
            {Object.entries(totals.bySport)
              .sort((a, b) => b[1].minutes - a[1].minutes)
              .map(([id, v]) => (
                <li key={id} className="py-2 flex items-center gap-3">
                  <span className="text-2xl">{v.icon}</span>
                  <div className="flex-1 min-w-0">
                    <div className="font-body text-base">{v.name}</div>
                    <div className="font-mono text-[10px] uppercase tracking-[0.2em] text-ink-muted">
                      {v.count} session{v.count === 1 ? "" : "s"}
                    </div>
                  </div>
                  <span className="font-mono text-[10px] uppercase tracking-[0.2em] text-right">
                    {Math.round(v.minutes)} min
                    <br />
                    {Math.round(v.kcal).toLocaleString()} kcal
                  </span>
                </li>
              ))}
          </ul>
        )}

        {inWindow.length === 0 ? (
          <p className="font-body italic text-ink-muted">No sessions logged in this window.</p>
        ) : (
          <ul className="divide-y divide-ink/30 border-y border-ink/30">
            {inWindow.slice(0, 100).map((s) => (
              <SessionRow
                key={s.id}
                session={s}
                onRemove={() => removeSportSession(s.id)}
                showDate
              />
            ))}
          </ul>
        )}
      </Card>

      {logging && (
        <LogSessionModal
          sport={sportsList.find((s) => s.id === logging)}
          weightKg={profile.stats?.weightKg || 70}
          onClose={() => setLogging(null)}
          onSave={(payload) => {
            addSportSession(payload);
            setLogging(null);
          }}
        />
      )}

      {editingSport && (
        <SportEditorModal
          sport={editingSport}
          onClose={() => setEditingSport(null)}
          onSave={(s) => {
            saveSport(s);
            setEditingSport(null);
          }}
        />
      )}
    </>
  );
}

function SessionRow({ session, onRemove, showDate }) {
  return (
    <li className="py-2 flex items-center gap-3 flex-wrap">
      <span className="text-2xl shrink-0">{session.sportIcon}</span>
      <div className="flex-1 min-w-0">
        <div className="font-body text-base flex items-center gap-2 flex-wrap">
          {session.sportName}
          <Chip color="#3b6aa3">{session.durationMin} min</Chip>
          <Chip color="#c44827">
            <Flame size={10} className="inline mr-1" />
            {Math.round(session.kcal)} kcal
          </Chip>
          {session.intensity && session.intensity !== "moderate" && (
            <Chip color="#6b5a3e">{session.intensity}</Chip>
          )}
        </div>
        <div className="font-mono text-[10px] uppercase tracking-[0.2em] text-ink-muted">
          {showDate
            ? new Date(session.date).toLocaleString("en-US", {
                month: "short",
                day: "numeric",
                year: "numeric",
                hour: "numeric",
                minute: "2-digit",
              })
            : new Date(session.date).toLocaleTimeString("en-US", {
                hour: "numeric",
                minute: "2-digit",
              })}
          {session.notes && ` · ${session.notes}`}
        </div>
      </div>
      <IconButton onClick={onRemove} aria-label="Remove session">
        <Trash2 size={14} />
      </IconButton>
    </li>
  );
}

function LogSessionModal({ sport, weightKg, onClose, onSave }) {
  const [duration, setDuration] = useState(60);
  const [intensity, setIntensity] = useState("moderate");
  const [kcalOverride, setKcalOverride] = useState("");
  const [notes, setNotes] = useState("");

  const autoKcal = estimateSportKcal({
    met: sport.met,
    weightKg,
    durationMin: duration,
    intensity,
  });
  const finalKcal = kcalOverride !== "" ? Number(kcalOverride) || 0 : autoKcal;

  function handleSave() {
    onSave({
      sportId: sport.id,
      durationMin: Number(duration) || 0,
      intensity,
      kcal: kcalOverride !== "" ? Number(kcalOverride) : null,
    });
  }

  return (
    <Modal
      open
      onClose={onClose}
      title={`${sport.icon} Log ${sport.name}`}
      footer={
        <>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button variant="primary" onClick={handleSave} disabled={!duration}>
            <Plus size={12} /> Log Session
          </Button>
        </>
      }
    >
      <div className="space-y-3">
        <Field label="Duration (minutes)">
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setDuration((v) => Math.max(0, (Number(v) || 0) - 15))}
            >
              −15
            </Button>
            <TextInput
              type="number"
              value={duration}
              onChange={(e) => setDuration(e.target.value)}
              className="!text-center !text-xl !font-display !font-black"
            />
            <Button
              variant="outline"
              size="sm"
              onClick={() => setDuration((v) => (Number(v) || 0) + 15)}
            >
              +15
            </Button>
          </div>
        </Field>

        <Field label="Intensity">
          <div className="flex gap-1">
            {Object.values(INTENSITY).map((opt) => (
              <button
                key={opt.id}
                type="button"
                onClick={() => setIntensity(opt.id)}
                className={`flex-1 px-3 py-1.5 border-2 font-mono text-[10px] uppercase tracking-[0.2em] ${
                  intensity === opt.id
                    ? "bg-ink text-paper border-ink"
                    : "border-ink hover:bg-ink hover:text-paper"
                }`}
              >
                {opt.label} ×{opt.multiplier}
              </button>
            ))}
          </div>
        </Field>

        <div className="border-2 border-ink p-3 bg-ink/5">
          <div className="font-mono text-[10px] uppercase tracking-[0.25em] text-ink-muted">
            Estimated kcal
          </div>
          <div className="font-display text-3xl font-black text-accent mt-1">
            {finalKcal} <span className="font-mono text-xs uppercase tracking-widest text-ink-muted">kcal</span>
          </div>
          <div className="font-mono text-[10px] uppercase tracking-[0.2em] text-ink-muted mt-1">
            MET {sport.met} × {weightKg} kg × {(duration / 60).toFixed(2)} h ×{" "}
            {INTENSITY[intensity].multiplier}
          </div>
        </div>

        <Field
          label="Override kcal (optional)"
          hint="Leave blank to use the estimate above. Useful if your watch tracked the actual burn."
        >
          <TextInput
            type="number"
            value={kcalOverride}
            onChange={(e) => setKcalOverride(e.target.value)}
            placeholder={`Auto: ${autoKcal}`}
          />
        </Field>

        <Field label="Notes (optional)">
          <TextInput
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="e.g. with Tuesday squad, indoor pitch"
          />
        </Field>
      </div>
    </Modal>
  );
}

function SportEditorModal({ sport, onClose, onSave }) {
  const [draft, setDraft] = useState(sport);
  function update(patch) {
    setDraft((d) => ({ ...d, ...patch }));
  }
  function handleSave() {
    if (!draft.name?.trim()) return alert("Sport needs a name.");
    if (!draft.met || draft.met <= 0) return alert("MET value must be > 0.");
    onSave({ ...draft, name: draft.name.trim(), met: Number(draft.met) });
  }
  return (
    <Modal
      open
      onClose={onClose}
      title={sport.name ? `Edit ${sport.name}` : "Add Custom Sport"}
      footer={
        <>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button variant="primary" onClick={handleSave}>Save</Button>
        </>
      }
    >
      <div className="space-y-3">
        <div className="grid grid-cols-3 gap-3">
          <Field label="Icon">
            <TextInput
              value={draft.icon}
              onChange={(e) => update({ icon: e.target.value })}
              maxLength={4}
            />
          </Field>
          <div className="col-span-2">
            <Field label="Name">
              <TextInput
                value={draft.name}
                onChange={(e) => update({ name: e.target.value })}
                placeholder="e.g. Squash, Volleyball, Pickleball"
              />
            </Field>
          </div>
        </div>
        <Field
          label="MET (metabolic equivalent)"
          hint="Reference: walking 3.5, jogging 7, football 7, running 10, vigorous swim 10. Higher = more kcal/min."
        >
          <TextInput
            type="number"
            step="0.1"
            value={draft.met}
            onChange={(e) => update({ met: e.target.value })}
          />
        </Field>
      </div>
    </Modal>
  );
}
