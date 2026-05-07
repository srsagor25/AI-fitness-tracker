import { useApp } from "../store/AppContext.jsx";
import { formatLongDate } from "../lib/time.js";
import { TAB_DEF } from "../App.jsx";
import {
  Home,
  Utensils,
  Dumbbell,
  User,
  MoreHorizontal,
  ChevronLeft,
} from "lucide-react";

const PRIMARY_TABS = [
  { id: "today", label: "Today", icon: Home },
  { id: "diet", label: "Diet", icon: Utensils },
  { id: "activity", label: "Activity", icon: Dumbbell },
  { id: "body", label: "Body", icon: User },
  { id: "more", label: "More", icon: MoreHorizontal },
];

export function Layout({ tab, subTab, setTab, setSubTab, children }) {
  const { profile, snackbar } = useApp();
  const showBack = tab !== "today";
  const def = TAB_DEF[tab];
  const hasSubs = def && def.subTabs && def.subTabs.length > 0;

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
                  else setTab("today");
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

        {/* Primary nav: 5 top-level tabs */}
        <nav className="border-y-2 border-ink mb-4 md:mb-6">
          <div className="grid grid-cols-5">
            {PRIMARY_TABS.map((t) => {
              const Icon = t.icon;
              const active = tab === t.id;
              return (
                <button
                  key={t.id}
                  onClick={() => setTab(t.id)}
                  className={`py-3 px-2 font-mono text-[10px] uppercase tracking-[0.18em] inline-flex items-center justify-center gap-1.5 transition-colors ${
                    active ? "bg-ink text-paper" : "text-ink hover:bg-ink/10"
                  }`}
                >
                  <Icon size={14} />
                  <span className="hidden sm:inline">{t.label}</span>
                </button>
              );
            })}
          </div>

          {/* Sub-tab pill row — only when current tab has children */}
          {hasSubs && (
            <div className="border-t border-ink/30 overflow-x-auto bg-ink/5">
              <div className="flex min-w-max md:min-w-0">
                {def.subTabs.map((s) => {
                  const active = subTab === s.id;
                  return (
                    <button
                      key={s.id}
                      onClick={() => setSubTab(s.id)}
                      className={`flex-1 md:flex-none px-4 py-2 font-mono text-[10px] uppercase tracking-[0.18em] whitespace-nowrap transition-colors ${
                        active
                          ? "bg-ink text-paper"
                          : "text-ink hover:bg-ink/10"
                      }`}
                    >
                      {s.label}
                    </button>
                  );
                })}
              </div>
            </div>
          )}
        </nav>

        <main className="space-y-4 md:space-y-6 pb-24 md:pb-12">{children}</main>

        <footer className="mt-8 md:mt-12 pt-4 border-t-2 border-ink text-[9px] md:text-[10px] font-mono uppercase tracking-[0.25em] text-ink-muted flex justify-between">
          <span>AI Fitness Tracker</span>
          <span>Stored locally · {profile.name}</span>
        </footer>
      </div>

      {/* Mobile bottom nav — same 5 primary destinations */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-paper border-t-2 border-ink z-40 pb-safe">
        <ul className="flex">
          {PRIMARY_TABS.map((m) => {
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
