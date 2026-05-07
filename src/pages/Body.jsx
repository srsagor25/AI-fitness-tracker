import { useMemo, useRef, useState } from "react";
import { useApp } from "../store/AppContext.jsx";
import { Card, CardHeader, Stat } from "../components/ui/Card.jsx";
import { Button, IconButton } from "../components/ui/Button.jsx";
import { Field, TextInput, Select, Chip } from "../components/ui/Field.jsx";
import { Modal } from "../components/ui/Modal.jsx";
import { fileToResizedBase64 } from "../lib/aiVision.js";
import { bmr, tdee } from "../lib/calories.js";
import {
  Plus,
  Trash2,
  TrendingDown,
  TrendingUp,
  Minus,
  Camera,
  Loader2,
  X,
  Image as ImageIcon,
  ArrowLeftRight,
} from "lucide-react";

const VIEW_OPTIONS = [
  { id: "front", label: "Front", emoji: "🧍" },
  { id: "side", label: "Side", emoji: "↔️" },
  { id: "back", label: "Back", emoji: "🔄" },
  { id: "flex", label: "Flex / pose", emoji: "💪" },
];

const WINDOWS = [
  { id: 7, label: "7 days" },
  { id: 30, label: "30 days" },
  { id: 90, label: "90 days" },
  { id: 0, label: "All" },
];

export function Body() {
  const {
    profile,
    weightLog,
    addWeightEntry,
    removeWeightEntry,
    latestWeight,
    bodyPhotos,
    addBodyPhoto,
    removeBodyPhoto,
  } = useApp();
  const [draftWeight, setDraftWeight] = useState("");
  const [draftNote, setDraftNote] = useState("");
  const [windowDays, setWindowDays] = useState(30);
  const [photoFilter, setPhotoFilter] = useState("all");
  const [lightboxId, setLightboxId] = useState(null);

  const sorted = useMemo(
    () => [...weightLog].sort((a, b) => a.date - b.date),
    [weightLog],
  );

  const inWindow = useMemo(() => {
    if (!windowDays) return sorted;
    const cutoff = Date.now() - windowDays * 86400000;
    return sorted.filter((e) => e.date >= cutoff);
  }, [sorted, windowDays]);

  const stats = useMemo(() => {
    if (!sorted.length) return null;
    const first = sorted[0];
    const last = sorted[sorted.length - 1];
    const min = sorted.reduce((m, e) => (e.weightKg < m.weightKg ? e : m), sorted[0]);
    const max = sorted.reduce((m, e) => (e.weightKg > m.weightKg ? e : m), sorted[0]);
    const change = last.weightKg - first.weightKg;
    let windowChange = null;
    if (inWindow.length >= 2) {
      windowChange = inWindow[inWindow.length - 1].weightKg - inWindow[0].weightKg;
    }
    return { first, last, min, max, change, windowChange };
  }, [sorted, inWindow]);

  function submit(e) {
    e.preventDefault();
    const w = Number(draftWeight);
    if (!w) return;
    addWeightEntry(w, draftNote);
    setDraftWeight("");
    setDraftNote("");
  }

  return (
    <>
      <Card>
        <CardHeader
          kicker="Body"
          title="Weight Log"
          subtitle={
            latestWeight
              ? `Latest: ${latestWeight.weightKg} kg (${new Date(latestWeight.date).toLocaleDateString()})`
              : "Log your first weight to start tracking."
          }
        />
        <form onSubmit={submit} className="grid grid-cols-1 md:grid-cols-3 gap-3 items-end">
          <Field label="Weight (kg)">
            <TextInput
              type="number"
              step="0.1"
              value={draftWeight}
              onChange={(e) => setDraftWeight(e.target.value)}
              placeholder={latestWeight ? String(latestWeight.weightKg) : "75.0"}
            />
          </Field>
          <Field label="Note (optional)">
            <TextInput
              value={draftNote}
              onChange={(e) => setDraftNote(e.target.value)}
              placeholder="morning, post-cardio, etc."
            />
          </Field>
          <Button variant="primary" type="submit" disabled={!draftWeight}>
            <Plus size={12} /> Log Weight
          </Button>
        </form>
      </Card>

      {stats && (
        <Card>
          <CardHeader kicker="Trends" title="Movement" />
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
            <Stat label="Latest" value={stats.last.weightKg} suffix="kg" />
            <Stat
              label="Change (all)"
              value={`${stats.change >= 0 ? "+" : ""}${stats.change.toFixed(1)}`}
              suffix="kg"
              accent={stats.change > 0 ? "#c44827" : stats.change < 0 ? "#4a6b3e" : "#6b5a3e"}
            />
            <Stat
              label={`Last ${windowDays || "∞"}d`}
              value={
                stats.windowChange == null
                  ? "—"
                  : `${stats.windowChange >= 0 ? "+" : ""}${stats.windowChange.toFixed(1)}`
              }
              suffix="kg"
              accent={
                stats.windowChange == null
                  ? "#6b5a3e"
                  : stats.windowChange > 0
                    ? "#c44827"
                    : stats.windowChange < 0
                      ? "#4a6b3e"
                      : "#6b5a3e"
              }
            />
            <Stat
              label="Range"
              value={`${stats.min.weightKg}–${stats.max.weightKg}`}
              suffix="kg"
              accent="#3b6aa3"
            />
          </div>

          <div className="flex gap-2 mb-3">
            {WINDOWS.map((w) => (
              <button
                key={w.id}
                onClick={() => setWindowDays(w.id)}
                className={`px-3 py-1.5 border-2 font-mono text-[10px] uppercase tracking-[0.2em] ${
                  windowDays === w.id ? "bg-ink text-paper border-ink" : "border-ink hover:bg-ink hover:text-paper"
                }`}
              >
                {w.label}
              </button>
            ))}
          </div>

          <WeightChart entries={inWindow} />
        </Card>
      )}

      <Card>
        <CardHeader kicker="Computed" title="Energy from Latest Weight" />
        <div className="grid grid-cols-3 gap-3">
          <Stat label="BMR" value={bmr(profile)} suffix="kcal" />
          <Stat label="TDEE" value={tdee(profile)} suffix="kcal" accent="#3b6aa3" />
          <Stat label="Weight in profile" value={profile.stats?.weightKg || "—"} suffix="kg" accent="#6b5a3e" />
        </div>
        <p className="font-body text-sm italic text-ink-muted mt-3">
          Each new weight entry updates the profile automatically so BMR/TDEE/workout
          calorie burn stay accurate.
        </p>
      </Card>

      <PhotoSection
        photos={bodyPhotos}
        latestWeight={latestWeight}
        filter={photoFilter}
        setFilter={setPhotoFilter}
        onUpload={addBodyPhoto}
        onOpen={(id) => setLightboxId(id)}
      />

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

      <Card>
        <CardHeader kicker="Log" title="History" />
        {sorted.length === 0 ? (
          <p className="font-body italic text-ink-muted">No entries yet.</p>
        ) : (
          <ul className="divide-y divide-ink/30 border-y border-ink/30">
            {[...sorted].reverse().map((e, i, arr) => {
              const prev = arr[i + 1];
              const delta = prev ? e.weightKg - prev.weightKg : 0;
              return (
                <li key={e.id} className="py-2 flex items-center gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="font-display text-xl font-bold flex items-center gap-2">
                      {e.weightKg} kg
                      {prev && (
                        <span
                          className="font-mono text-[10px] uppercase tracking-[0.2em] flex items-center gap-1"
                          style={{
                            color: delta > 0 ? "#c44827" : delta < 0 ? "#4a6b3e" : "#6b5a3e",
                          }}
                        >
                          {delta > 0 ? <TrendingUp size={12} /> : delta < 0 ? <TrendingDown size={12} /> : <Minus size={12} />}
                          {delta > 0 ? "+" : ""}
                          {delta.toFixed(1)} kg
                        </span>
                      )}
                    </div>
                    <div className="font-mono text-[10px] uppercase tracking-[0.2em] text-ink-muted">
                      {new Date(e.date).toLocaleString("en-US", {
                        month: "short",
                        day: "numeric",
                        year: "numeric",
                        hour: "numeric",
                        minute: "2-digit",
                      })}
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
  );
}

function WeightChart({ entries }) {
  if (entries.length < 2) {
    return (
      <p className="font-body italic text-ink-muted">
        Log at least 2 entries to see a trend chart.
      </p>
    );
  }

  const W = 800;
  const H = 220;
  const padX = 32;
  const padY = 24;

  const xs = entries.map((e) => e.date);
  const ys = entries.map((e) => e.weightKg);
  const minX = Math.min(...xs);
  const maxX = Math.max(...xs);
  const minY = Math.min(...ys);
  const maxY = Math.max(...ys);
  const yRange = Math.max(0.5, maxY - minY);
  const padYBuf = yRange * 0.1;
  const yMin = minY - padYBuf;
  const yMax = maxY + padYBuf;

  const sx = (x) => padX + ((x - minX) / Math.max(1, maxX - minX)) * (W - padX * 2);
  const sy = (y) => H - padY - ((y - yMin) / (yMax - yMin)) * (H - padY * 2);

  const path = entries
    .map((e, i) => `${i === 0 ? "M" : "L"} ${sx(e.date).toFixed(1)} ${sy(e.weightKg).toFixed(1)}`)
    .join(" ");

  // 5 horizontal grid lines
  const ticks = 5;
  const yTicks = [];
  for (let i = 0; i <= ticks; i++) {
    const v = yMin + ((yMax - yMin) * i) / ticks;
    yTicks.push(v);
  }

  return (
    <svg
      viewBox={`0 0 ${W} ${H}`}
      className="w-full h-auto border-2 border-ink"
      preserveAspectRatio="none"
    >
      <rect x="0" y="0" width={W} height={H} fill="#f4ede0" />
      {yTicks.map((v, i) => {
        const y = sy(v);
        return (
          <g key={i}>
            <line
              x1={padX}
              x2={W - padX}
              y1={y}
              y2={y}
              stroke="#2a2419"
              strokeOpacity="0.15"
              strokeDasharray="2 4"
            />
            <text
              x={4}
              y={y + 3}
              fontSize="10"
              fontFamily="JetBrains Mono, monospace"
              fill="#6b5a3e"
            >
              {v.toFixed(1)}
            </text>
          </g>
        );
      })}
      <path d={path} fill="none" stroke="#c44827" strokeWidth="2" />
      {entries.map((e, i) => (
        <circle
          key={e.id}
          cx={sx(e.date)}
          cy={sy(e.weightKg)}
          r={i === entries.length - 1 ? 5 : 3}
          fill="#2a2419"
        />
      ))}
      {/* X-axis dates: show first and last */}
      <text
        x={padX}
        y={H - 4}
        fontSize="10"
        fontFamily="JetBrains Mono, monospace"
        fill="#6b5a3e"
      >
        {new Date(entries[0].date).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
      </text>
      <text
        x={W - padX}
        y={H - 4}
        textAnchor="end"
        fontSize="10"
        fontFamily="JetBrains Mono, monospace"
        fill="#6b5a3e"
      >
        {new Date(entries[entries.length - 1].date).toLocaleDateString("en-US", {
          month: "short",
          day: "numeric",
        })}
      </text>
    </svg>
  );
}

function bytesFromDataUrl(dataUrl) {
  if (!dataUrl) return 0;
  // Each base64 char encodes 6 bits → ~3/4 byte. Strip header before counting.
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
  const [pending, setPending] = useState(null); // { dataUrl, mediaType, w, h }
  const [view, setView] = useState("front");
  const [linkWeight, setLinkWeight] = useState(true);
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
          : linkWeight && latestWeight
            ? latestWeight.weightKg
            : null,
    });
    setPending(null);
    setNote("");
    setDraftWeight("");
  }

  function cancelPending() {
    setPending(null);
    setNote("");
    setDraftWeight("");
  }

  return (
    <Card>
      <CardHeader
        kicker="Progress"
        title="Body Photos"
        subtitle={
          photos.length === 0
            ? "Upload your first photo to start tracking visual progress."
            : `${photos.length} photo${photos.length === 1 ? "" : "s"} · ${fmtKB(totalBytes)} stored locally`
        }
        right={
          <Button
            variant="primary"
            size="sm"
            onClick={() => inputRef.current?.click()}
            disabled={busy}
          >
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
              <Field label={`Weight (kg) — leave blank to ${latestWeight ? `use latest ${latestWeight.weightKg}` : "skip"}`}>
                <TextInput
                  type="number"
                  step="0.1"
                  value={draftWeight}
                  onChange={(e) => setDraftWeight(e.target.value)}
                  placeholder={latestWeight ? String(latestWeight.weightKg) : ""}
                />
              </Field>
              <Field label="Note (optional)">
                <TextInput
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  placeholder="e.g. morning, post-workout, week 4 cut"
                />
              </Field>
              <div className="flex gap-2 justify-end">
                <Button variant="outline" size="sm" onClick={cancelPending}>
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
                  <img
                    src={p.dataUrl}
                    alt={p.view}
                    className="w-full h-full object-cover"
                    loading="lazy"
                  />
                </div>
                <div className="p-2 border-t border-ink/30 bg-paper">
                  <div className="font-mono text-[9px] uppercase tracking-[0.2em] text-ink-muted flex items-center justify-between">
                    <span>
                      {new Date(p.date).toLocaleDateString("en-US", {
                        month: "short",
                        day: "numeric",
                        year: "2-digit",
                      })}
                    </span>
                    <Chip>{VIEW_OPTIONS.find((v) => v.id === p.view)?.emoji || "🧍"}</Chip>
                  </div>
                  {p.weightKg && (
                    <div className="font-display text-base font-bold mt-1">{p.weightKg} kg</div>
                  )}
                  {p.note && (
                    <div className="font-body text-xs italic text-ink-muted mt-0.5 truncate">
                      {p.note}
                    </div>
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
            <Button
              variant="outline"
              size="sm"
              onClick={() => setIdx(Math.max(0, idx - 1))}
              disabled={idx === 0}
            >
              ← Older
            </Button>
            <span className="font-mono text-[10px] uppercase tracking-[0.25em] text-ink-muted">
              {idx + 1} / {sorted.length}
            </span>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setIdx(Math.min(sorted.length - 1, idx + 1))}
              disabled={idx === sorted.length - 1}
            >
              Newer →
            </Button>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <Select
              value={compareIdx == null ? "" : String(compareIdx)}
              onChange={(e) =>
                setCompareIdx(e.target.value === "" ? null : Number(e.target.value))
              }
              className="!text-xs"
            >
              <option value="">Compare with…</option>
              {sorted.map((p, i) => {
                if (i === idx) return null;
                return (
                  <option key={p.id} value={i}>
                    {new Date(p.date).toLocaleDateString("en-US", {
                      month: "short",
                      day: "numeric",
                      year: "numeric",
                    })}
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
          {new Date(p.date).toLocaleDateString("en-US", {
            month: "short",
            day: "numeric",
            year: "numeric",
          })}
        </span>
      </div>
      <img
        src={p.dataUrl}
        alt={p.view}
        className="w-full max-h-[60vh] object-contain bg-ink/5"
      />
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
