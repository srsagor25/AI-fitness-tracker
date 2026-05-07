const base =
  "inline-flex items-center justify-center gap-2 font-mono text-[10px] uppercase tracking-[0.25em] transition-colors";

export function Button({
  variant = "primary",
  size = "md",
  className = "",
  children,
  ...rest
}) {
  const sizes = {
    sm: "px-2 py-1.5",
    md: "px-3 py-2",
    lg: "px-4 py-3 text-[11px]",
  };
  const variants = {
    primary: "bg-ink text-paper hover:bg-accent",
    accent: "bg-accent text-paper hover:bg-ink",
    outline: "border-2 border-ink hover:bg-ink hover:text-paper",
    ghost: "text-ink hover:bg-ink/10",
    danger: "border-2 border-accent text-accent hover:bg-accent hover:text-paper",
  };
  return (
    <button
      className={`${base} ${sizes[size]} ${variants[variant]} ${className}`}
      {...rest}
    >
      {children}
    </button>
  );
}

export function IconButton({ className = "", children, ...rest }) {
  return (
    <button
      className={`inline-flex items-center justify-center w-8 h-8 border-2 border-ink hover:bg-ink hover:text-paper transition-colors ${className}`}
      {...rest}
    >
      {children}
    </button>
  );
}
