export function Field({ label, hint, children }) {
  return (
    <label className="block">
      <div className="font-mono text-[10px] uppercase tracking-[0.25em] text-ink-muted mb-1">
        {label}
      </div>
      {children}
      {hint && (
        <div className="font-body text-sm text-ink-muted mt-1 italic">{hint}</div>
      )}
    </label>
  );
}

export function TextInput({ className = "", ...rest }) {
  return (
    <input
      className={`w-full border-2 border-ink bg-paper px-2 py-1.5 font-body text-base focus:outline-none focus:border-accent ${className}`}
      {...rest}
    />
  );
}

export function Select({ className = "", children, ...rest }) {
  return (
    <select
      className={`w-full border-2 border-ink bg-paper px-2 py-1.5 font-body text-base focus:outline-none focus:border-accent ${className}`}
      {...rest}
    >
      {children}
    </select>
  );
}

export function Chip({ children, className = "", color = "#2a2419" }) {
  return (
    <span
      className={`font-mono text-[9px] uppercase tracking-[0.2em] border px-1.5 py-0.5 whitespace-nowrap ${className}`}
      style={{ color, borderColor: color }}
    >
      {children}
    </span>
  );
}

export function ProgressBar({ value = 0, max = 100, color = "#2a2419", overColor = "#c44827" }) {
  const pct = Math.min(100, Math.max(0, (value / Math.max(1, max)) * 100));
  const over = value > max;
  return (
    <div className="h-px bg-ink/20 relative mt-2">
      <div
        className="absolute left-0 top-0 h-px transition-all"
        style={{ width: `${pct}%`, backgroundColor: over ? overColor : color }}
      />
    </div>
  );
}
