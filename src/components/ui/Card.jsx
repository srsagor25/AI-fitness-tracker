export function Card({ children, className = "", ...rest }) {
  return (
    <div className={`border-2 border-ink p-4 md:p-5 bg-paper ${className}`} {...rest}>
      {children}
    </div>
  );
}

export function CardHeader({ kicker, title, subtitle, right }) {
  return (
    <div className="flex items-start justify-between gap-4 mb-4">
      <div>
        {kicker && (
          <div className="font-mono text-[10px] uppercase tracking-[0.25em] text-ink-muted mb-1">
            {kicker}
          </div>
        )}
        {title && (
          <h2 className="font-display text-2xl md:text-3xl font-black leading-none">
            {title}
          </h2>
        )}
        {subtitle && (
          <p className="font-body text-base text-ink-muted mt-1">{subtitle}</p>
        )}
      </div>
      {right}
    </div>
  );
}

export function Stat({ label, value, accent = "#2a2419", suffix }) {
  return (
    <div className="border-2 border-ink p-3 md:p-4 bg-paper">
      <div className="font-mono text-[10px] uppercase tracking-[0.25em] text-ink-muted">
        {label}
      </div>
      <div
        className="font-display text-3xl md:text-4xl font-black mt-1 leading-none"
        style={{ color: accent }}
      >
        {value}
        {suffix && (
          <span className="font-mono text-xs uppercase tracking-widest ml-1 text-ink-muted">
            {suffix}
          </span>
        )}
      </div>
    </div>
  );
}
