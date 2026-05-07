import { useApp } from "../store/AppContext.jsx";
import { formatLongDate } from "../lib/time.js";
import {
  Home,
  Utensils,
  Dumbbell,
  ShoppingBag,
  User,
  History as HistoryIcon,
  ChevronLeft,
} from "lucide-react";

// 5 primary destinations for the bottom mobile nav.
const MOBILE_PRIMARY = [
  { id: "dashboard", label: "Today", icon: Home },
  { id: "diet", label: "Diet", icon: Utensils },
  { id: "workout", label: "Train", icon: Dumbbell },
  { id: "grocery", label: "Pantry", icon: ShoppingBag },
  { id: "profile", label: "You", icon: User },
];

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
    label: "Activity",
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
      { id: "physique", label: "Physique" },
      { id: "progress", label: "Progress" },
      { id: "meds", label: "Meds" },
      { id: "supplements", label: "Supps" },
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

  // Show a back button on every non-Today tab so phone users always have an
  // explicit way to step back to the home screen alongside the browser back.
  const showBack = tab !== "dashboard";

  return (
    <div className="min-h-screen bg-paper text-ink">
      <div className="max-w-5xl mx-auto px-3 md:px-6 py-4 md:py-6">
        <header className="border-b-2 border-ink pb-3 md:pb-4 mb-4 md:mb-6">
          <div className="flex items-end justify-between text-[9px] md:text-[10px] tracking-[0.2em] md:tracking-[0.25em] font-mono uppercase text-ink-muted">
            <div className="truncate">No. {formatLongDate()}</div>
            <div className="truncate ml-2">Vol. I — {profile.name}</div>
          </div>
          <div className="flex items-center gap-2 mt-1 md:mt-2">
            {showBack && (
              <button
                onClick={() => {
                  if (window.history.length > 1) window.history.back();
                  else setTab("dashboard");
                }}
                className="md:hidden border-2 border-ink p-2 hover:bg-ink hover:text-paper transition-colors shrink-0"
                aria-label="Back"
              >
                <ChevronLeft size={16} />
              </button>
            )}
            <h1 className="font-display text-3xl md:text-7xl font-black tracking-tight leading-none">
              AI Fitness Tracker
            </h1>
          </div>
          <p className="font-body text-sm md:text-lg text-ink-muted mt-2 italic">
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

        <main className="space-y-4 md:space-y-6 pb-24 md:pb-12">{children}</main>

        <footer className="mt-8 md:mt-12 pt-4 border-t-2 border-ink text-[9px] md:text-[10px] font-mono uppercase tracking-[0.25em] text-ink-muted flex justify-between">
          <span>AI Fitness Tracker</span>
          <span>Stored locally · {profile.name}</span>
        </footer>
      </div>

      {/* Mobile bottom nav — fixed primary destinations */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-paper border-t-2 border-ink z-40 pb-safe">
        <ul className="flex">
          {MOBILE_PRIMARY.map((m) => {
            const Icon = m.icon;
            const active = tab === m.id;
            return (
              <li key={m.id} className="flex-1">
                <button
                  onClick={() => setTab(m.id)}
                  className={`w-full py-2 px-1 flex flex-col items-center gap-0.5 ${
                    active ? "bg-ink text-paper" : "text-ink"
                  }`}
                >
                  <Icon size={18} />
                  <span className="font-mono text-[9px] uppercase tracking-[0.15em]">
                    {m.label}
                  </span>
                </button>
              </li>
            );
          })}
        </ul>
      </nav>

      {snackbar && (
        <div className="fixed bottom-20 md:bottom-4 left-1/2 -translate-x-1/2 z-50 bg-ink text-paper px-4 py-2 font-mono text-[10px] uppercase tracking-[0.25em] shadow-lg border-2 border-ink whitespace-nowrap max-w-[90vw] truncate">
          {snackbar.msg}
        </div>
      )}
    </div>
  );
}
