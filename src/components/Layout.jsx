import { useApp } from "../store/AppContext.jsx";
import { formatLongDate } from "../lib/time.js";

const TAB_GROUPS = [
  {
    label: "Diet · Nutrition",
    tabs: [
      { id: "dashboard", label: "Today" },
      { id: "diet", label: "Diet" },
      { id: "cheat", label: "Cheat" },
      { id: "build", label: "Build" },
      { id: "plan", label: "Plan" },
      { id: "week", label: "Week" },
      { id: "foods", label: "Foods" },
    ],
  },
  {
    label: "Training",
    tabs: [
      { id: "workout", label: "Workout" },
      { id: "programs", label: "Programs" },
    ],
  },
  {
    label: "Pantry",
    tabs: [{ id: "grocery", label: "Grocery" }],
  },
  {
    label: "You",
    tabs: [
      { id: "body", label: "Body" },
      { id: "meds", label: "Meds" },
      { id: "profile", label: "Profile" },
    ],
  },
  {
    label: "Log",
    tabs: [{ id: "history", label: "History" }],
  },
];

export function Layout({ tab, setTab, children }) {
  const { profile, snackbar } = useApp();
  return (
    <div className="min-h-screen bg-paper text-ink">
      <div className="max-w-5xl mx-auto px-4 md:px-6 py-6">
        <header className="border-b-2 border-ink pb-4 mb-6">
          <div className="flex items-end justify-between text-[10px] tracking-[0.25em] font-mono uppercase text-ink-muted">
            <div>No. {formatLongDate()}</div>
            <div>Vol. I — {profile.name}</div>
          </div>
          <h1 className="font-display text-5xl md:text-7xl font-black tracking-tight leading-none mt-2">
            AI Fitness Tracker
          </h1>
          <p className="font-body text-base md:text-lg text-ink-muted mt-2 italic">
            {profile.publicLabel || "Diet, training, recovery — one ledger."}
          </p>
        </header>

        <nav className="border-y-2 border-ink mb-6 overflow-x-auto">
          <div className="flex min-w-max md:min-w-0">
            {TAB_GROUPS.map((g, gi) => {
              const isLast = gi === TAB_GROUPS.length - 1;
              return (
                <div
                  key={g.label}
                  className={`flex flex-col ${isLast ? "" : "border-r-4 border-ink"}`}
                  style={{ flex: `${g.tabs.length} 1 0%` }}
                >
                  <div className="text-center font-mono text-[9px] uppercase tracking-[0.3em] text-ink-muted py-1.5 border-b border-ink/30 bg-ink/5">
                    {g.label}
                  </div>
                  <div className="flex">
                    {g.tabs.map((t) => (
                      <button
                        key={t.id}
                        onClick={() => setTab(t.id)}
                        className={`flex-1 py-3 px-3 font-mono text-[10px] uppercase tracking-[0.18em] transition-colors whitespace-nowrap ${
                          tab === t.id ? "bg-ink text-paper" : "text-ink hover:bg-ink/10"
                        }`}
                      >
                        {t.label}
                      </button>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </nav>

        <main className="space-y-6 pb-24">{children}</main>

        <footer className="mt-12 pt-4 border-t-2 border-ink text-[10px] font-mono uppercase tracking-[0.25em] text-ink-muted flex justify-between">
          <span>AI Fitness Tracker</span>
          <span>Stored locally · {profile.name}</span>
        </footer>
      </div>

      {snackbar && (
        <div className="fixed bottom-4 left-1/2 -translate-x-1/2 z-50 bg-ink text-paper px-4 py-2 font-mono text-[10px] uppercase tracking-[0.25em] shadow-lg border-2 border-ink">
          {snackbar.msg}
        </div>
      )}
    </div>
  );
}
