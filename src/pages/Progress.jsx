import { useMemo, useRef, useState } from "react";
import { useApp } from "../store/AppContext.jsx";
import { Card, CardHeader, Stat } from "../components/ui/Card.jsx";
import { Button, IconButton } from "../components/ui/Button.jsx";
import { Field, TextInput, Select, Chip } from "../components/ui/Field.jsx";
import { Modal } from "../components/ui/Modal.jsx";
import { DateRangeFilter, filterRange, filterLabel } from "../components/ui/DateRangeFilter.jsx";
import { fileToResizedBase64 } from "../lib/aiVision.js";
import { bmr, kcalToKg, estimateWorkoutKcal, dailyTarget } from "../lib/calories.js";
import { calcMeal } from "../store/profiles.js";
import { load } from "../store/storage.js";
import { todayKey } from "../lib/time.js";
import {
  Plus,
  Trash2,
  Camera,
  Loader2,
  X,
  Image as ImageIcon,
  Tag,
  TrendingUp,
  TrendingDown,
  Minus,
  Calendar,
} from "lucide-react";

const VIEW_OPTIONS = [
  { id: "front", label: "Front", emoji: "🧍" },
  { id: "side", label: "Side", emoji: "↔️" },
  { id: "back", label: "Back", emoji: "🔄" },
  { id: "flex", label: "Flex / pose", emoji: "💪" },
];

// Measurement metric definitions used by the chart and history table.
const METRICS = [
  { id: "weightKg", label: "Weight", suffix: "kg", color: "#c44827" },
  { id: "neckCm", label: "Neck", suffix: "cm", color: "#3b6aa3" },
  { id: "chestCm", label: "Chest", suffix: "cm", color: "#4a6b3e" },
  { id: "pelvicCm", label: "Pelvic / Waist", suffix: "cm", color: "#6b5a3e" },
  { id: "bmr", label: "BMR", suffix: "kcal", color: "#2a2419" },
];

const COMMON_TAGS = ["morning", "post-workout", "vacation", "cut", "bulk", "before", "after"];

export function Progress() {
  const {
    profile,
    weightLog,
    addMeasurement,
    removeWeightEntry,
    bodyPhotos,
    addBodyPhoto,
    removeBodyPhoto,
    dayTypes,
  } = useApp();

  const [filter, setFilter] = useState({ mode: "preset", days: 30 });
  const [activeTag, setActiveTag] = useState(null);
  const [activeMetric, setActiveMetric] = useState("weightKg");
  const [view, setView] = useState("measurements"); // measurements | photos
  const [photoFilter, setPhotoFilter] = useState("all");
  const [lightboxId, setLightboxId] = useState(null);
  const [showForm, setShowForm] = useState(false);

  // All known tags across measurements + photos for the tag chip row.
  const allTags = useMemo(() => {
    const set = new Set();
    for (const e of weightLog) for (const t of e.tags || []) set.add(t);
    return [...set];
  }, [weightLog]);

  const sorted = useMemo(
    () => [...weightLog].sort((a, b) => a.date - b.date),
    [weightLog],
  );

  // Window resolution: convert the shared filter shape to a from/to ms pair.
  const range = useMemo(() => filterRange(filter), [filter]);
  const windowDays = filter.mode === "preset" ? Number(filter.days) || 0 : 0;
  const filtered = useMemo(() => {
    let out = sorted.filter((e) => e.date >= range.from && e.date <= range.to);
    if (activeTag) {
      out = out.filter((e) => (e.tags || []).includes(activeTag));
    }
    return out;
  }, [sorted, range.from, range.to, activeTag]);

  const latest = sorted[sorted.length - 1];

  // Per-metric stats for the summary row.
  const summary = useMemo(() => {
    const out = {};
    for (const m of METRICS) {
      const vals = filtered
        .map((e) => (e[m.id] != null ? Number(e[m.id]) : null))
        .filter((v) => v != null);
      if (vals.length === 0) {
        out[m.id] = null;
        continue;
      }
      const first = vals[0];
      const last = vals[vals.length - 1];
      out[m.id] = {
        latest: last,
        change: last - first,
        min: Math.min(...vals),
        max: Math.max(...vals),
        count: vals.length,
      };
    }
    return out;
  }, [filtered]);

  return (
    <>
      <Card>
        <CardHeader
          kicker="Progress"
          title="Progress Tracking"
          subtitle="Weekly measurements + progress photos in one log."
          right={
            <div className="flex flex-wrap gap-2">
              <Button variant="primary" size="sm" onClick={() => setShowForm(true)}>
                <Plus size={12} /> Log Measurement
              </Button>
            </div>
          }
        />

        {/* View toggle */}
        <div className="flex gap-2 mb-3">
          <button
            onClick={() => setView("measurements")}
            className={`flex-1 px-3 py-2 border-2 font-mono text-[10px] uppercase tracking-[0.2em] ${
              view === "measurements" ? "bg-ink text-paper border-ink" : "border-ink hover:bg-ink hover:text-paper"
            }`}
          >
            Measurements ({weightLog.length})
          </button>
          <button
            onClick={() => setView("photos")}
            className={`flex-1 px-3 py-2 border-2 font-mono text-[10px] uppercase tracking-[0.2em] ${
              view === "photos" ? "bg-ink text-paper border-ink" : "border-ink hover:bg-ink hover:text-paper"
            }`}
          >
            Photos ({bodyPhotos.length})
          </button>
        </div>

        {/* Filters: window (with custom range) + tags */}
        <div className="mb-3">
          <DateRangeFilter filter={filter} setFilter={setFilter} compact />
        </div>

        {allTags.length > 0 && (
          <div className="flex flex-wrap gap-2 mb-3">
            <span className="font-mono text-[10px] uppercase tracking-[0.25em] text-ink-muted self-center mr-1 inline-flex items-center gap-1">
              <Tag size={12} /> Tag
            </span>
            <button
              onClick={() => setActiveTag(null)}
              className={`px-2.5 py-1 border-2 font-mono text-[10px] uppercase tracking-[0.2em] ${
                activeTag === null ? "bg-ink text-paper border-ink" : "border-ink hover:bg-ink hover:text-paper"
              }`}
            >
              All
            </button>
            {allTags.map((t) => (
              <button
                key={t}
                onClick={() => setActiveTag(t)}
                className={`px-2.5 py-1 border-2 font-mono text-[10px] uppercase tracking-[0.2em] ${
                  activeTag === t ? "bg-ink text-paper border-ink" : "border-ink hover:bg-ink hover:text-paper"
                }`}
              >
                #{t}
              </button>
            ))}
          </div>
        )}
      </Card>

      {view === "measurements" && (
        <>
          {/* Per-metric summary */}
          <Card>
            <CardHeader
              kicker="Summary"
              title={`${filtered.length} entr${filtered.length === 1 ? "y" : "ies"} in window`}
            />
            <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
              {METRICS.map((m) => {
                const s = summary[m.id];
                return (
                  <button
                    key={m.id}
                    onClick={() => setActiveMetric(m.id)}
                    className={`border-2 p-3 text-left ${
                      activeMetric === m.id ? "border-accent" : "border-ink"
                    }`}
                  >
                    <div className="font-mono text-[10px] uppercase tracking-[0.25em] text-ink-muted">
                      {m.label}
                    </div>
                    {s ? (
                      <>
                        <div
                          className="font-display text-2xl md:text-3xl font-black mt-1 leading-none"
                          style={{ color: m.color }}
                        >
                          {Number.isInteger(s.latest) ? s.latest : s.latest.toFixed(1)}
                          <span className="font-mono text-xs uppercase tracking-widest text-ink-muted ml-1">
                            {m.suffix}
                          </span>
                        </div>
                        <div className="font-mono text-[10px] uppercase tracking-[0.2em] mt-1" style={{ color: s.change > 0 ? "#c44827" : s.change < 0 ? "#4a6b3e" : "#6b5a3e" }}>
                          Δ {s.change >= 0 ? "+" : ""}{s.change.toFixed(1)}
                        </div>
                      </>
                    ) : (
                      <div className="font-display text-xl text-ink-muted mt-1">—</div>
                    )}
                  </button>
                );
              })}
            </div>
            {filtered.length >= 2 && summary[activeMetric] && (
              <div className="mt-4">
                <MetricChart
                  entries={filtered}
                  metricId={activeMetric}
                  color={METRICS.find((m) => m.id === activeMetric)?.color || "#2a2419"}
                />
              </div>
            )}
          </Card>

          {/* Estimated weight change from calorie balance — placed here so
              you can compare side-by-side with the measured weight trend
              chart above. */}
          <EstimatedWeightChange
            profile={profile}
            windowDays={windowDays}
            sortedMeasurements={sorted}
            dayTypes={dayTypes}
          />

          {/* History list */}
          <Card>
            <CardHeader kicker="History" title="All Measurements" />
            {filtered.length === 0 ? (
              <p className="font-body italic text-ink-muted">
                No entries match your filter.
              </p>
            ) : (
              <ul className="divide-y divide-ink/30 border-y border-ink/30">
                {[...filtered].reverse().map((e, i, arr) => {
                  const prev = arr[i + 1];
                  return (
                    <li key={e.id} className="py-3 flex items-start gap-3 flex-wrap">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-baseline gap-2 flex-wrap">
                          {e.weightKg != null && (
                            <span className="font-display text-xl font-bold">
                              {e.weightKg} kg
                              {prev?.weightKg != null && (
                                <DeltaChip diff={e.weightKg - prev.weightKg} unit="kg" />
                              )}
                            </span>
                          )}
                          {(e.tags || []).map((t) => (
                            <Chip key={t} color="#3b6aa3">#{t}</Chip>
                          ))}
                        </div>
                        <div className="font-mono text-[10px] uppercase tracking-[0.2em] text-ink-muted mt-0.5">
                          {new Date(e.date).toLocaleString("en-US", {
                            weekday: "short",
                            month: "short",
                            day: "numeric",
                            year: "numeric",
                            hour: "numeric",
                            minute: "2-digit",
                          })}
                        </div>
                        <div className="flex flex-wrap gap-x-4 gap-y-1 mt-2 font-mono text-[10px] uppercase tracking-[0.2em] text-ink-muted">
                          {e.neckCm != null && <span>Neck {e.neckCm} cm</span>}
                          {e.chestCm != null && <span>Chest {e.chestCm} cm</span>}
                          {e.pelvicCm != null && <span>Pelvic {e.pelvicCm} cm</span>}
                          {e.hipCm != null && <span>Hip {e.hipCm} cm</span>}
                          {e.bicepCm != null && <span>Bicep {e.bicepCm} cm</span>}
                          {e.thighCm != null && <span>Thigh {e.thighCm} cm</span>}
                          {e.bodyFatPct != null && <span>BF {e.bodyFatPct}%</span>}
                          {e.bmr != null && <span>BMR {e.bmr} kcal</span>}
                        </div>
                        {e.note && (
                          <p className="font-body text-sm italic text-ink-muted mt-1">{e.note}</p>
                        )}
                      </div>
                      <IconButton onClick={() => removeWeightEntry(e.id)} aria-label="Delete">
                        <Trash2 size={14} />
                      </IconButton>
                    </li>
                  );
                })}
              </ul>
            )}
          </Card>
        </>
      )}

      {view === "photos" && (
        <PhotoSection
          photos={bodyPhotos}
          latestWeight={latest}
          filter={photoFilter}
          setFilter={setPhotoFilter}
          onUpload={addBodyPhoto}
          onOpen={(id) => setLightboxId(id)}
        />
      )}

      {lightboxId && (
        <PhotoLightbox
          photos={bodyPhotos}
          startId={lightboxId}
          onClose={() => setLightboxId(null)}
          onDelete={(id) => {
            if (confirm("Delete this photo?")) {
              removeBodyPhoto(id);
              setLightboxId(null);
            }
          }}
        />
      )}

      {showForm && (
        <MeasurementFormModal
          profile={profile}
          allTags={allTags}
          onClose={() => setShowForm(false)}
          onSave={(payload) => {
            addMeasurement(payload);
            setShowForm(false);
          }}
        />
      )}
    </>
  );
}

function DeltaChip({ diff, unit }) {
  if (Math.abs(diff) < 0.01) return null;
  const color = diff > 0 ? "#c44827" : "#4a6b3e";
  return (
    <span
      className="font-mono text-[10px] uppercase tracking-[0.2em] inline-flex items-center gap-1 ml-1"
      style={{ color }}
    >
      {diff > 0 ? <TrendingUp size={10} /> : <TrendingDown size={10} />}
      {diff > 0 ? "+" : ""}
      {diff.toFixed(1)} {unit}
    </span>
  );
}

function MeasurementFormModal({ profile, allTags, onClose, onSave }) {
  const [date, setDate] = useState(new Date().toISOString().slice(0, 16));
  const [weightKg, setWeightKg] = useState("");
  const [neckCm, setNeckCm] = useState("");
  const [chestCm, setChestCm] = useState("");
  const [pelvicCm, setPelvicCm] = useState("");
  const [hipCm, setHipCm] = useState("");
  const [bicepCm, setBicepCm] = useState("");
  const [thighCm, setThighCm] = useState("");
  const [bodyFatPct, setBodyFatPct] = useState("");
  const [bmrEntered, setBmrEntered] = useState("");
  const [note, setNote] = useState("");
  const [tags, setTags] = useState([]);
  const [tagInput, setTagInput] = useState("");
  const [showOptional, setShowOptional] = useState(false);

  // Auto-suggest BMR from weight using Mifflin–St Jeor.
  const suggestedBmr = useMemo(() => {
    const w = Number(weightKg);
    if (!w) return null;
    return bmr({
      stats: { ...profile.stats, weightKg: w },
    });
  }, [weightKg, profile.stats]);

  function addTag(t) {
    const tag = (t || tagInput).trim().toLowerCase();
    if (!tag) return;
    setTags((prev) => (prev.includes(tag) ? prev : [...prev, tag]));
    setTagInput("");
  }
  function removeTag(t) {
    setTags((prev) => prev.filter((x) => x !== t));
  }

  function handleSave() {
    onSave({
      date: new Date(date).getTime(),
      weightKg,
      neckCm,
      chestCm,
      pelvicCm,
      hipCm,
      bicepCm,
      thighCm,
      bodyFatPct,
      bmr: bmrEntered || suggestedBmr,
      note,
      tags,
      allowEmptyWeight: !weightKg,
    });
  }

  return (
    <Modal
      open
      onClose={onClose}
      title="Log Measurement"
      maxWidth="max-w-2xl"
      footer={
        <>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button variant="primary" onClick={handleSave}>Save Measurement</Button>
        </>
      }
    >
      <div className="space-y-3">
        <Field label="Date & time">
          <TextInput type="datetime-local" value={date} onChange={(e) => setDate(e.target.value)} />
        </Field>

        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
          <Field label="Weight (kg)">
            <TextInput
              type="number"
              step="0.1"
              value={weightKg}
              onChange={(e) => setWeightKg(e.target.value)}
              placeholder={profile.stats?.weightKg ? String(profile.stats.weightKg) : ""}
            />
          </Field>
          <Field label="Neck (cm)">
            <TextInput type="number" step="0.1" value={neckCm} onChange={(e) => setNeckCm(e.target.value)} />
          </Field>
          <Field label="Chest (cm)">
            <TextInput type="number" step="0.1" value={chestCm} onChange={(e) => setChestCm(e.target.value)} />
          </Field>
          <Field label="Pelvic / Waist (cm)">
            <TextInput type="number" step="0.1" value={pelvicCm} onChange={(e) => setPelvicCm(e.target.value)} />
          </Field>
          <Field
            label="BMR (kcal)"
            hint={suggestedBmr ? `Auto: ${suggestedBmr} from current profile + new weight` : ""}
          >
            <TextInput
              type="number"
              value={bmrEntered}
              onChange={(e) => setBmrEntered(e.target.value)}
              placeholder={suggestedBmr ? String(suggestedBmr) : ""}
            />
          </Field>
        </div>

        <button
          type="button"
          onClick={() => setShowOptional((v) => !v)}
          className="font-mono text-[10px] uppercase tracking-[0.25em] text-ink-muted underline"
        >
          {showOptional ? "Hide" : "Show"} optional measurements (hip, bicep, thigh, body-fat %)
        </button>
        {showOptional && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <Field label="Hip (cm)">
              <TextInput type="number" step="0.1" value={hipCm} onChange={(e) => setHipCm(e.target.value)} />
            </Field>
            <Field label="Bicep (cm)">
              <TextInput type="number" step="0.1" value={bicepCm} onChange={(e) => setBicepCm(e.target.value)} />
            </Field>
            <Field label="Thigh (cm)">
              <TextInput type="number" step="0.1" value={thighCm} onChange={(e) => setThighCm(e.target.value)} />
            </Field>
            <Field label="Body fat %">
              <TextInput type="number" step="0.1" value={bodyFatPct} onChange={(e) => setBodyFatPct(e.target.value)} />
            </Field>
          </div>
        )}

        <Field label="Tags">
          <div className="flex flex-wrap gap-1.5 mb-2">
            {tags.map((t) => (
              <button
                key={t}
                type="button"
                onClick={() => removeTag(t)}
                className="font-mono text-[10px] uppercase tracking-[0.2em] border-2 border-ink px-2 py-0.5 hover:bg-accent hover:text-paper hover:border-accent inline-flex items-center gap-1"
              >
                #{t}
                <X size={10} />
              </button>
            ))}
          </div>
          <div className="flex gap-2 mb-2">
            <TextInput
              value={tagInput}
              onChange={(e) => setTagInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  addTag();
                }
              }}
              placeholder="Type a tag and Enter"
            />
            <Button variant="outline" type="button" onClick={() => addTag()}>
              Add
            </Button>
          </div>
          <div className="flex flex-wrap gap-1.5">
            {[...new Set([...COMMON_TAGS, ...allTags])].map((t) => (
              <button
                key={t}
                type="button"
                onClick={() => addTag(t)}
                disabled={tags.includes(t)}
                className={`font-mono text-[10px] uppercase tracking-[0.2em] border px-2 py-0.5 ${
                  tags.includes(t) ? "border-good text-good" : "border-ink/40 text-ink-muted hover:border-ink hover:text-ink"
                }`}
              >
                #{t}
              </button>
            ))}
          </div>
        </Field>

        <Field label="Note">
          <TextInput
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="e.g. felt strong, post-cardio, week 4 of cut"
          />
        </Field>
      </div>
    </Modal>
  );
}

function MetricChart({ entries, metricId, color }) {
  const points = entries
    .map((e) => ({ x: e.date, y: e[metricId] }))
    .filter((p) => p.y != null && !Number.isNaN(Number(p.y)))
    .map((p) => ({ x: p.x, y: Number(p.y) }));

  if (points.length < 2) {
    return (
      <p className="font-body italic text-ink-muted">
        Need at least 2 entries with this metric for a trend line.
      </p>
    );
  }

  const W = 800;
  const H = 200;
  const padX = 36;
  const padY = 24;

  const xs = points.map((p) => p.x);
  const ys = points.map((p) => p.y);
  const minX = Math.min(...xs);
  const maxX = Math.max(...xs);
  const minY = Math.min(...ys);
  const maxY = Math.max(...ys);
  const yRange = Math.max(0.5, maxY - minY);
  const padBuf = yRange * 0.1;
  const yMin = minY - padBuf;
  const yMax = maxY + padBuf;

  const sx = (x) => padX + ((x - minX) / Math.max(1, maxX - minX)) * (W - padX * 2);
  const sy = (y) => H - padY - ((y - yMin) / (yMax - yMin)) * (H - padY * 2);

  const path = points
    .map((p, i) => `${i === 0 ? "M" : "L"} ${sx(p.x).toFixed(1)} ${sy(p.y).toFixed(1)}`)
    .join(" ");

  return (
    <svg
      viewBox={`0 0 ${W} ${H}`}
      className="w-full h-auto border-2 border-ink"
      preserveAspectRatio="none"
    >
      <rect x="0" y="0" width={W} height={H} fill="#f4ede0" />
      {[0, 0.25, 0.5, 0.75, 1].map((f) => {
        const v = yMin + (yMax - yMin) * f;
        const y = sy(v);
        return (
          <g key={f}>
            <line x1={padX} x2={W - padX} y1={y} y2={y} stroke="#2a2419" strokeOpacity="0.15" strokeDasharray="2 4" />
            <text x={4} y={y + 3} fontSize="10" fontFamily="JetBrains Mono, monospace" fill="#6b5a3e">
              {v.toFixed(1)}
            </text>
          </g>
        );
      })}
      <path d={path} fill="none" stroke={color} strokeWidth="2" />
      {points.map((p, i) => (
        <circle
          key={i}
          cx={sx(p.x)}
          cy={sy(p.y)}
          r={i === points.length - 1 ? 5 : 3}
          fill={color}
        />
      ))}
      <text x={padX} y={H - 4} fontSize="10" fontFamily="JetBrains Mono, monospace" fill="#6b5a3e">
        {new Date(points[0].x).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
      </text>
      <text x={W - padX} y={H - 4} textAnchor="end" fontSize="10" fontFamily="JetBrains Mono, monospace" fill="#6b5a3e">
        {new Date(points[points.length - 1].x).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
      </text>
    </svg>
  );
}

// =============== Photo upload + lightbox (moved from Body.jsx) ===============

function bytesFromDataUrl(dataUrl) {
  if (!dataUrl) return 0;
  const i = dataUrl.indexOf(",");
  const len = i >= 0 ? dataUrl.length - i - 1 : dataUrl.length;
  return Math.floor((len * 3) / 4);
}

function fmtKB(bytes) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function PhotoSection({ photos, latestWeight, filter, setFilter, onUpload, onOpen }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);
  const [pending, setPending] = useState(null);
  const [view, setView] = useState("front");
  const [note, setNote] = useState("");
  const [draftWeight, setDraftWeight] = useState("");
  const inputRef = useRef(null);

  const totalBytes = useMemo(
    () => photos.reduce((s, p) => s + bytesFromDataUrl(p.dataUrl), 0),
    [photos],
  );
  const filtered = useMemo(() => {
    const sorted = [...photos].sort((a, b) => b.date - a.date);
    if (filter === "all") return sorted;
    return sorted.filter((p) => p.view === filter);
  }, [photos, filter]);

  async function handleFile(file) {
    if (!file) return;
    setError(null);
    setBusy(true);
    try {
      const { dataUrl, mediaType, width, height } = await fileToResizedBase64(file, 1024, 0.85);
      setPending({ dataUrl, mediaType, width, height });
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  }

  function commit() {
    if (!pending) return;
    onUpload({
      dataUrl: pending.dataUrl,
      mediaType: pending.mediaType,
      width: pending.width,
      height: pending.height,
      view,
      note,
      weightKg:
        draftWeight !== ""
          ? Number(draftWeight)
          : latestWeight?.weightKg
            ? latestWeight.weightKg
            : null,
    });
    setPending(null);
    setNote("");
    setDraftWeight("");
  }

  return (
    <Card>
      <CardHeader
        kicker="Progress photos"
        title="Visual log"
        subtitle={
          photos.length === 0
            ? "Upload your first photo to start tracking visual progress."
            : `${photos.length} photo${photos.length === 1 ? "" : "s"} · ${fmtKB(totalBytes)} stored locally`
        }
        right={
          <Button variant="primary" size="sm" onClick={() => inputRef.current?.click()} disabled={busy}>
            {busy ? <Loader2 size={12} className="animate-spin" /> : <Camera size={12} />}
            {busy ? "Processing…" : "Add Photo"}
          </Button>
        }
      />

      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        capture="environment"
        onChange={(e) => handleFile(e.target.files?.[0])}
        className="hidden"
      />

      {error && (
        <div className="border-2 border-accent bg-accent/5 px-3 py-2 mb-3 font-body text-sm text-accent">
          {error}
        </div>
      )}

      {totalBytes > 4 * 1024 * 1024 && (
        <div className="border-2 border-accent bg-accent/5 px-3 py-2 mb-3 font-body text-sm text-accent">
          Storage usage at {fmtKB(totalBytes)} of ~5 MB. Consider deleting older photos.
        </div>
      )}

      {pending && (
        <div className="border-2 border-good bg-good/5 p-3 mb-4 space-y-3">
          <div className="flex items-center gap-2 mb-1">
            <ImageIcon size={14} className="text-good" />
            <span className="font-mono text-[10px] uppercase tracking-[0.25em] text-good">
              Confirm upload
            </span>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <img
              src={pending.dataUrl}
              alt="Preview"
              className="border-2 border-ink w-full max-h-64 object-contain bg-ink/5"
            />
            <div className="md:col-span-2 space-y-3">
              <Field label="View">
                <Select value={view} onChange={(e) => setView(e.target.value)}>
                  {VIEW_OPTIONS.map((v) => (
                    <option key={v.id} value={v.id}>
                      {v.emoji} {v.label}
                    </option>
                  ))}
                </Select>
              </Field>
              <Field label={`Weight (kg) — leave blank to ${latestWeight?.weightKg ? `use latest ${latestWeight.weightKg}` : "skip"}`}>
                <TextInput
                  type="number"
                  step="0.1"
                  value={draftWeight}
                  onChange={(e) => setDraftWeight(e.target.value)}
                  placeholder={latestWeight?.weightKg ? String(latestWeight.weightKg) : ""}
                />
              </Field>
              <Field label="Note (optional)">
                <TextInput
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  placeholder="e.g. morning, post-workout, week 4"
                />
              </Field>
              <div className="flex gap-2 justify-end">
                <Button variant="outline" size="sm" onClick={() => setPending(null)}>
                  Cancel
                </Button>
                <Button variant="primary" size="sm" onClick={commit}>
                  Save photo
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {photos.length > 0 && (
        <>
          <div className="flex flex-wrap gap-2 mb-3">
            <button
              onClick={() => setFilter("all")}
              className={`px-3 py-1.5 border-2 font-mono text-[10px] uppercase tracking-[0.2em] ${
                filter === "all" ? "bg-ink text-paper border-ink" : "border-ink hover:bg-ink hover:text-paper"
              }`}
            >
              All ({photos.length})
            </button>
            {VIEW_OPTIONS.map((v) => {
              const c = photos.filter((p) => p.view === v.id).length;
              if (c === 0) return null;
              return (
                <button
                  key={v.id}
                  onClick={() => setFilter(v.id)}
                  className={`px-3 py-1.5 border-2 font-mono text-[10px] uppercase tracking-[0.2em] ${
                    filter === v.id ? "bg-ink text-paper border-ink" : "border-ink hover:bg-ink hover:text-paper"
                  }`}
                >
                  {v.emoji} {v.label} ({c})
                </button>
              );
            })}
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
            {filtered.map((p) => (
              <button
                key={p.id}
                onClick={() => onOpen(p.id)}
                className="border-2 border-ink overflow-hidden text-left hover:border-accent transition-colors"
              >
                <div className="aspect-[3/4] bg-ink/5">
                  <img src={p.dataUrl} alt={p.view} className="w-full h-full object-cover" loading="lazy" />
                </div>
                <div className="p-2 border-t border-ink/30 bg-paper">
                  <div className="font-mono text-[9px] uppercase tracking-[0.2em] text-ink-muted flex items-center justify-between">
                    <span>
                      {new Date(p.date).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "2-digit" })}
                    </span>
                    <Chip>{VIEW_OPTIONS.find((v) => v.id === p.view)?.emoji || "🧍"}</Chip>
                  </div>
                  {p.weightKg && (
                    <div className="font-display text-base font-bold mt-1">{p.weightKg} kg</div>
                  )}
                  {p.note && (
                    <div className="font-body text-xs italic text-ink-muted mt-0.5 truncate">{p.note}</div>
                  )}
                </div>
              </button>
            ))}
          </div>
        </>
      )}
    </Card>
  );
}

function PhotoLightbox({ photos, startId, onClose, onDelete }) {
  const sorted = useMemo(() => [...photos].sort((a, b) => a.date - b.date), [photos]);
  const startIdx = sorted.findIndex((p) => p.id === startId);
  const [idx, setIdx] = useState(Math.max(0, startIdx));
  const [compareIdx, setCompareIdx] = useState(null);

  const photo = sorted[idx];
  const compare = compareIdx != null ? sorted[compareIdx] : null;
  if (!photo) return null;

  return (
    <Modal open onClose={onClose} title="Body photo" maxWidth="max-w-5xl">
      <div className="space-y-3">
        {compare ? (
          <div className="grid grid-cols-2 gap-3">
            <PhotoPanel p={compare} label="Compare" />
            <PhotoPanel p={photo} label="Current" />
          </div>
        ) : (
          <PhotoPanel p={photo} label="" />
        )}

        <div className="flex flex-wrap gap-2 items-center justify-between border-t-2 border-ink pt-3">
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={() => setIdx(Math.max(0, idx - 1))} disabled={idx === 0}>
              ← Older
            </Button>
            <span className="font-mono text-[10px] uppercase tracking-[0.25em] text-ink-muted">
              {idx + 1} / {sorted.length}
            </span>
            <Button variant="outline" size="sm" onClick={() => setIdx(Math.min(sorted.length - 1, idx + 1))} disabled={idx === sorted.length - 1}>
              Newer →
            </Button>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <Select
              value={compareIdx == null ? "" : String(compareIdx)}
              onChange={(e) => setCompareIdx(e.target.value === "" ? null : Number(e.target.value))}
              className="!text-xs"
            >
              <option value="">Compare with…</option>
              {sorted.map((p, i) => {
                if (i === idx) return null;
                return (
                  <option key={p.id} value={i}>
                    {new Date(p.date).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                    {p.weightKg ? ` · ${p.weightKg}kg` : ""} · {p.view}
                  </option>
                );
              })}
            </Select>
            {compare && (
              <Button variant="outline" size="sm" onClick={() => setCompareIdx(null)}>
                <X size={12} /> End compare
              </Button>
            )}
            <Button variant="danger" size="sm" onClick={() => onDelete(photo.id)}>
              <Trash2 size={12} /> Delete
            </Button>
          </div>
        </div>
      </div>
    </Modal>
  );
}

function PhotoPanel({ p, label }) {
  return (
    <div className="border-2 border-ink p-2 bg-paper">
      <div className="font-mono text-[10px] uppercase tracking-[0.25em] text-ink-muted mb-2 flex items-center justify-between">
        <span>{label}</span>
        <span>
          {new Date(p.date).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
        </span>
      </div>
      <img src={p.dataUrl} alt={p.view} className="w-full max-h-[60vh] object-contain bg-ink/5" />
      <div className="mt-2 flex items-center gap-2 flex-wrap">
        <Chip>
          {VIEW_OPTIONS.find((v) => v.id === p.view)?.emoji || "🧍"} {p.view}
        </Chip>
        {p.weightKg && <Chip color="#3b6aa3">{p.weightKg} kg</Chip>}
        {p.note && <span className="font-body text-sm italic">{p.note}</span>}
      </div>
    </div>
  );
}

// ============================================================================
// EstimatedWeightChange — uses the daily calorie balance (eaten − target)
// to project an approximate weight change. Sits next to the measured weight
// chart so the user can sanity-check predictions vs. reality.
// 7,700 kcal ≈ 1 kg of fat (3,500 kcal/lb).
// ============================================================================

const MEAL_SLOTS = ["lunch", "shake", "dinner", "snack"];

function EstimatedWeightChange({ profile, windowDays, sortedMeasurements, dayTypes = [] }) {
  const data = useMemo(() => {
    const out = [];
    const days = windowDays || 30;
    const cursor = new Date();
    cursor.setHours(0, 0, 0, 0);
    let cumulative = 0;
    let cumKcal = 0;
    for (let i = 0; i < days; i++) {
      const k = todayKey(cursor);
      const meals = load(`meals:${k}`, null);
      const cheats = load(`cheats:${k}`, null);
      if (meals || cheats) {
        let kcalIn = 0;
        for (const slot of MEAL_SLOTS) {
          for (const m of meals?.[slot] || []) kcalIn += calcMeal(m.items).kcal;
        }
        for (const c of cheats || []) kcalIn += calcMeal(c.items).kcal;

        const dayTypeId = load(`dayType:${k}`, "rest");
        const dayType = dayTypes.find((dt) => dt.id === dayTypeId) || dayTypes[0];
        const baseTarget = dayType?.target || dailyTarget(profile);

        const stepsCount = load(`steps:${k}`, 0);
        const sa = profile.stepAdjust || {};
        const stepAdj =
          stepsCount < (sa.lowThreshold || 0)
            ? sa.lowDelta || 0
            : stepsCount > (sa.highThreshold || Infinity)
              ? sa.highDelta || 0
              : 0;

        const sessionsToday = (load("workout:history", []) || []).filter(
          (s) => todayKey(new Date(s.date)) === k,
        );
        const workoutKcal = sessionsToday.reduce(
          (s, h) =>
            s +
            estimateWorkoutKcal({
              durationSec: h.durationSec,
              weightKg: profile.stats?.weightKg || 70,
              totalVolume: h.totalVolume,
            }),
          0,
        );

        const target = Math.max(1200, baseTarget + stepAdj + workoutKcal);
        const balance = kcalIn - target;
        cumKcal += balance;
        cumulative += kcalToKg(balance);
        out.push({
          date: new Date(cursor),
          key: k,
          kcalIn: Math.round(kcalIn),
          target: Math.round(target),
          balance: Math.round(balance),
          deltaKg: kcalToKg(balance),
          cumulativeKg: cumulative,
        });
      }
      cursor.setDate(cursor.getDate() - 1);
    }
    return { entries: out.reverse(), cumKcal, cumKg: kcalToKg(cumKcal) };
  }, [windowDays, profile, dayTypes]);

  // Match window of measured weights for side-by-side comparison.
  const cutoff = Date.now() - (windowDays || 30) * 86400000;
  const measuredInWindow = sortedMeasurements.filter((e) => e.date >= cutoff);
  const measuredFirst = measuredInWindow[0];
  const measuredLast = measuredInWindow[measuredInWindow.length - 1];
  const measuredDeltaKg =
    measuredFirst?.weightKg && measuredLast?.weightKg
      ? measuredLast.weightKg - measuredFirst.weightKg
      : null;

  const direction = data.cumKg > 0 ? "gain" : data.cumKg < 0 ? "loss" : "no change";
  const dirColor = data.cumKg > 0 ? "#c44827" : data.cumKg < 0 ? "#4a6b3e" : "#6b5a3e";

  return (
    <Card>
      <CardHeader
        kicker="Estimated"
        title="Weight change from calorie balance"
        subtitle="Approximation from daily eaten−target. Compare against the measured weight chart above."
      />

      <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
        <div className="border-2 border-ink p-3">
          <div className="font-mono text-[10px] uppercase tracking-[0.25em] text-ink-muted">
            Estimated change
          </div>
          <div className="flex items-baseline gap-2 mt-1 flex-wrap">
            <span
              className="font-display text-3xl md:text-4xl font-black tabular-nums leading-none"
              style={{ color: dirColor }}
            >
              {data.cumKg > 0 ? "+" : data.cumKg < 0 ? "−" : ""}
              {Math.abs(data.cumKg).toFixed(2)}
            </span>
            <span className="font-mono text-[11px] uppercase tracking-[0.25em] text-ink-muted">
              kg {direction}
            </span>
          </div>
          <div className="font-mono text-[10px] uppercase tracking-[0.25em] text-ink-muted mt-1">
            From {data.cumKcal >= 0 ? "+" : ""}
            {data.cumKcal.toLocaleString()} kcal balance over {data.entries.length} day
            {data.entries.length === 1 ? "" : "s"}
          </div>
        </div>
        <div className="border-2 border-ink p-3">
          <div className="font-mono text-[10px] uppercase tracking-[0.25em] text-ink-muted">
            Measured change
          </div>
          {measuredDeltaKg != null ? (
            <>
              <div className="flex items-baseline gap-2 mt-1 flex-wrap">
                <span
                  className="font-display text-3xl md:text-4xl font-black tabular-nums leading-none"
                  style={{
                    color: measuredDeltaKg > 0 ? "#c44827" : measuredDeltaKg < 0 ? "#4a6b3e" : "#6b5a3e",
                  }}
                >
                  {measuredDeltaKg > 0 ? "+" : measuredDeltaKg < 0 ? "−" : ""}
                  {Math.abs(measuredDeltaKg).toFixed(1)}
                </span>
                <span className="font-mono text-[11px] uppercase tracking-[0.25em] text-ink-muted">
                  kg actual
                </span>
              </div>
              <div className="font-mono text-[10px] uppercase tracking-[0.25em] text-ink-muted mt-1">
                {measuredFirst.weightKg.toFixed(1)} → {measuredLast.weightKg.toFixed(1)} kg over{" "}
                {measuredInWindow.length} weigh-ins
              </div>
            </>
          ) : (
            <div className="font-display text-2xl text-ink-muted mt-1">—</div>
          )}
        </div>
        <div className="border-2 border-ink p-3 col-span-2 md:col-span-1">
          <div className="font-mono text-[10px] uppercase tracking-[0.25em] text-ink-muted">
            Variance
          </div>
          {measuredDeltaKg != null ? (
            <>
              <div className="font-display text-3xl md:text-4xl font-black tabular-nums leading-none mt-1">
                {(measuredDeltaKg - data.cumKg).toFixed(2)}
                <span className="font-mono text-xs uppercase tracking-widest text-ink-muted ml-1">
                  kg
                </span>
              </div>
              <div className="font-mono text-[10px] uppercase tracking-[0.25em] text-ink-muted mt-1">
                Measured − estimated. Big gap → either logging missed days or
                metabolic baseline differs from estimate.
              </div>
            </>
          ) : (
            <div className="font-mono text-[10px] uppercase tracking-[0.25em] text-ink-muted mt-1 italic">
              Log at least 2 weigh-ins to compare.
            </div>
          )}
        </div>
      </div>

      {data.entries.length > 0 && (
        <ul className="divide-y divide-ink/30 border-y border-ink/30 mt-4 max-h-96 overflow-y-auto">
          {[...data.entries].reverse().map((d) => {
            const isOver = d.balance > 0;
            const isUnder = d.balance < 0;
            const c = isOver ? "#c44827" : isUnder ? "#4a6b3e" : "#6b5a3e";
            return (
              <li key={d.key} className="py-2 flex items-center gap-3">
                <div className="flex-1 min-w-0">
                  <div className="font-body text-base">
                    {d.date.toLocaleDateString("en-US", {
                      weekday: "short",
                      month: "short",
                      day: "numeric",
                    })}
                  </div>
                  <div className="font-mono text-[10px] uppercase tracking-[0.2em] text-ink-muted">
                    Eaten {d.kcalIn} vs target {d.target} kcal
                  </div>
                </div>
                <div className="text-right">
                  <div
                    className="font-display text-lg font-bold tabular-nums"
                    style={{ color: c }}
                  >
                    {d.balance > 0 ? "+" : ""}
                    {d.balance}
                    <span className="font-mono text-[9px] uppercase tracking-widest text-ink-muted ml-1">
                      kcal
                    </span>
                  </div>
                  <div className="font-mono text-[10px] uppercase tracking-[0.2em]" style={{ color: c }}>
                    ≈ {d.deltaKg > 0 ? "+" : d.deltaKg < 0 ? "−" : ""}
                    {Math.abs(d.deltaKg * 1000) < 100
                      ? `${Math.round(Math.abs(d.deltaKg * 1000))} g`
                      : `${Math.abs(d.deltaKg).toFixed(2)} kg`}
                  </div>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </Card>
  );
}
