// Reusable date-range filter. Filter shape:
//   { mode: "preset" | "custom", days?, from?, to? }
// Used wherever a list/chart needs to be scoped by time. Helpers below
// compute the resolved {from, to} ms pair and a human-readable label.

const PRESETS = [
  { id: 7, label: "7 days" },
  { id: 30, label: "30 days" },
  { id: 90, label: "3 months" },
  { id: 180, label: "6 months" },
  { id: 365, label: "1 year" },
  { id: 0, label: "All" },
];

export function filterRange(filter) {
  if (!filter) return { from: 0, to: Date.now() };
  if (filter.mode === "custom") {
    const from = filter.from ? new Date(filter.from).getTime() : 0;
    const to = filter.to ? new Date(filter.to + "T23:59:59").getTime() : Date.now();
    return { from, to };
  }
  const days = Number(filter.days) || 0;
  const to = Date.now();
  const from = days ? to - days * 86400000 : 0;
  return { from, to };
}

export function filterLabel(filter) {
  if (!filter) return "All time";
  if (filter.mode === "custom") {
    const f = filter.from
      ? new Date(filter.from).toLocaleDateString("en-US", { month: "short", day: "numeric" })
      : "—";
    const t = filter.to
      ? new Date(filter.to).toLocaleDateString("en-US", { month: "short", day: "numeric" })
      : "—";
    return `${f} → ${t}`;
  }
  const d = Number(filter.days) || 0;
  if (d === 0) return "All time";
  if (d === 7) return "Last 7 days";
  if (d === 30) return "Last 30 days";
  if (d === 90) return "Last 3 months";
  if (d === 180) return "Last 6 months";
  if (d === 365) return "Last year";
  return `Last ${d} days`;
}

export function DateRangeFilter({ filter, setFilter, presets = PRESETS, compact = false }) {
  return (
    <div className={compact ? "" : "border-2 border-ink p-3 bg-ink/5"}>
      {!compact && (
        <div className="font-mono text-[10px] uppercase tracking-[0.25em] text-ink-muted mb-2">
          Filter
        </div>
      )}
      <div className="flex flex-wrap gap-2 mb-2">
        {presets.map((p) => (
          <button
            key={p.id}
            onClick={() => setFilter({ mode: "preset", days: p.id })}
            className={`px-2.5 py-1 border-2 font-mono text-[10px] uppercase tracking-[0.2em] ${
              filter?.mode === "preset" && filter?.days === p.id
                ? "bg-ink text-paper border-ink"
                : "border-ink hover:bg-ink hover:text-paper"
            }`}
          >
            {p.label}
          </button>
        ))}
        <button
          onClick={() =>
            setFilter({
              mode: "custom",
              from:
                filter?.from ||
                new Date(Date.now() - 30 * 86400000).toISOString().slice(0, 10),
              to: filter?.to || new Date().toISOString().slice(0, 10),
            })
          }
          className={`px-2.5 py-1 border-2 font-mono text-[10px] uppercase tracking-[0.2em] ${
            filter?.mode === "custom"
              ? "bg-ink text-paper border-ink"
              : "border-ink hover:bg-ink hover:text-paper"
          }`}
        >
          Custom
        </button>
      </div>
      {filter?.mode === "custom" && (
        <div className="flex flex-wrap gap-2 items-end">
          <div>
            <div className="font-mono text-[9px] uppercase tracking-[0.25em] text-ink-muted mb-0.5">
              From
            </div>
            <input
              type="date"
              value={filter.from || ""}
              onChange={(e) => setFilter({ ...filter, from: e.target.value })}
              className="border-2 border-ink bg-paper px-2 py-1 font-body text-sm"
            />
          </div>
          <div>
            <div className="font-mono text-[9px] uppercase tracking-[0.25em] text-ink-muted mb-0.5">
              To
            </div>
            <input
              type="date"
              value={filter.to || ""}
              onChange={(e) => setFilter({ ...filter, to: e.target.value })}
              className="border-2 border-ink bg-paper px-2 py-1 font-body text-sm"
            />
          </div>
        </div>
      )}
    </div>
  );
}
