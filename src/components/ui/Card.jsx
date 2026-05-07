export function Card({ children, className = "", ...rest }) {
  return (
    <div className={`border-2 border-ink p-4 md:p-5 bg-paper ${className}`} {...rest}>
      {children}
    </div>
  );
}

export function CardHeader({ kicker, title, subtitle, right }) {
  return (
    <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-3 mb-4">
      <div className="min-w-0 flex-1">
        {kicker && (
          <div className="font-mono text-[10px] uppercase tracking-[0.25em] text-ink-muted mb-1">
            {kicker}
          </div>
        )}
        {title && (
          <h2 className="font-display text-2xl md:text-3xl font-black leading-tight break-words">
            {title}
          </h2>
        )}
        {subtitle && (
          <p className="font-body text-base text-ink-muted mt-1 break-words">{subtitle}</p>
        )}
      </div>
      {right && (
        <div className="shrink-0 flex flex-wrap gap-2 md:justify-end items-start">
          {right}
        </div>
      )}
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
