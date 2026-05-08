import { useEffect, useState } from "react";
import { Layout } from "./components/Layout.jsx";
import { Dashboard } from "./pages/Dashboard.jsx";
import { Diet } from "./pages/Diet.jsx";
import { Cheat } from "./pages/Cheat.jsx";
import { Build } from "./pages/Build.jsx";
import { Plan } from "./pages/Plan.jsx";
import { Week } from "./pages/Week.jsx";
import { Foods } from "./pages/Foods.jsx";
import { Workout } from "./pages/Workout.jsx";
import { Sports } from "./pages/Sports.jsx";
import { Steps } from "./pages/Steps.jsx";
import { Programs } from "./pages/Programs.jsx";
import { History } from "./pages/History.jsx";
import { Grocery } from "./pages/Grocery.jsx";
import { Progress } from "./pages/Progress.jsx";
import { Physique } from "./pages/Physique.jsx";
import { Meds } from "./pages/Meds.jsx";
import { Supplements } from "./pages/Supplements.jsx";
import { Profile } from "./pages/Profile.jsx";

// Top-level tab definitions. Each may optionally have sub-tabs that render
// in a secondary row inside the page area.
export const TAB_DEF = {
  today: { label: "Today", default: null, subTabs: [] },
  diet: {
    label: "Diet",
    default: "log",
    subTabs: [
      { id: "log", label: "Log" },
      { id: "cheat", label: "Cheat" },
      { id: "build", label: "Build" },
      { id: "plan", label: "Plan" },
      { id: "week", label: "Week" },
      { id: "foods", label: "Foods" },
    ],
  },
  activity: {
    label: "Activity",
    default: "workout",
    subTabs: [
      { id: "workout", label: "Workout" },
      { id: "sports", label: "Sports" },
      { id: "steps", label: "Steps" },
      { id: "programs", label: "Programs" },
    ],
  },
  body: {
    label: "Body",
    default: "physique",
    subTabs: [
      { id: "physique", label: "Physique" },
      { id: "progress", label: "Progress" },
    ],
  },
  more: {
    label: "More",
    default: "meds",
    subTabs: [
      { id: "meds", label: "Meds" },
      { id: "supps", label: "Supps" },
      { id: "pantry", label: "Pantry" },
      { id: "history", label: "History" },
      { id: "profile", label: "Profile" },
    ],
  },
};

// Map old hash ids and bare tab strings (used by setTab call sites in pages)
// to the new {tab, subTab} shape so we don't have to update every caller.
const LEGACY_MAP = {
  dashboard: { tab: "today", subTab: null },
  today: { tab: "today", subTab: null },

  diet: { tab: "diet", subTab: "log" },
  log: { tab: "diet", subTab: "log" },
  cheat: { tab: "diet", subTab: "cheat" },
  build: { tab: "diet", subTab: "build" },
  plan: { tab: "diet", subTab: "plan" },
  week: { tab: "diet", subTab: "week" },
  foods: { tab: "diet", subTab: "foods" },

  workout: { tab: "activity", subTab: "workout" },
  sports: { tab: "activity", subTab: "sports" },
  steps: { tab: "activity", subTab: "steps" },
  programs: { tab: "activity", subTab: "programs" },
  activity: { tab: "activity", subTab: "workout" },

  body: { tab: "body", subTab: "physique" },
  physique: { tab: "body", subTab: "physique" },
  progress: { tab: "body", subTab: "progress" },

  meds: { tab: "more", subTab: "meds" },
  supplements: { tab: "more", subTab: "supps" },
  supps: { tab: "more", subTab: "supps" },
  grocery: { tab: "more", subTab: "pantry" },
  pantry: { tab: "more", subTab: "pantry" },
  history: { tab: "more", subTab: "history" },
  profile: { tab: "more", subTab: "profile" },
  more: { tab: "more", subTab: "meds" },
};

function resolvePath(input) {
  if (!input) return { tab: "today", subTab: null };
  // "tab/sub" form
  if (input.includes("/")) {
    const [t, s] = input.split("/");
    if (TAB_DEF[t]) {
      const validSub = TAB_DEF[t].subTabs.find((x) => x.id === s);
      return {
        tab: t,
        subTab: validSub ? validSub.id : TAB_DEF[t].default,
      };
    }
  }
  // Legacy single-id (covers most existing setTab callers)
  if (LEGACY_MAP[input]) return LEGACY_MAP[input];
  // Plain top-level id
  if (TAB_DEF[input]) {
    return { tab: input, subTab: TAB_DEF[input].default };
  }
  return { tab: "today", subTab: null };
}

function pathToHash({ tab, subTab }) {
  if (!subTab) return tab;
  return `${tab}/${subTab}`;
}

function getInitialPath() {
  if (typeof window === "undefined") return { tab: "today", subTab: null };
  const h = window.location.hash.replace(/^#/, "");
  return resolvePath(h);
}

export default function App() {
  const initial = getInitialPath();
  const [tab, setTabState] = useState(initial.tab);
  const [subTab, setSubTabState] = useState(initial.subTab);

  // navigate(path) — accepts either a top-level id ("diet"), a legacy
  // single-id ("supplements", "grocery", "dashboard"), or a "tab/sub" path
  // ("more/meds"). Keeps all existing call sites working without changes.
  function navigate(input) {
    const next = resolvePath(input);
    if (next.tab === tab && next.subTab === subTab) return;
    if (typeof window !== "undefined") {
      window.history.pushState(next, "", `#${pathToHash(next)}`);
    }
    setTabState(next.tab);
    setSubTabState(next.subTab);
  }

  // Selecting a sub-tab keeps the current top-level tab.
  function setSubTab(s) {
    if (s === subTab) return;
    const next = { tab, subTab: s };
    if (typeof window !== "undefined") {
      window.history.pushState(next, "", `#${pathToHash(next)}`);
    }
    setSubTabState(s);
  }

  useEffect(() => {
    function onPop(e) {
      const next = e.state || getInitialPath();
      setTabState(next.tab);
      setSubTabState(next.subTab);
    }
    if (typeof window !== "undefined") {
      window.history.replaceState({ tab, subTab }, "", `#${pathToHash({ tab, subTab })}`);
      window.addEventListener("popstate", onPop);
      return () => window.removeEventListener("popstate", onPop);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Pages still call setTab("foods") etc. — `navigate` handles both the
  // legacy strings and the new tab/sub paths.
  const setTab = navigate;

  return (
    <Layout tab={tab} subTab={subTab} setTab={setTab} setSubTab={setSubTab}>
      {tab === "today" && <Dashboard setTab={setTab} />}

      {tab === "diet" && subTab === "log" && <Diet />}
      {tab === "diet" && subTab === "cheat" && <Cheat />}
      {tab === "diet" && subTab === "build" && <Build setTab={setTab} />}
      {tab === "diet" && subTab === "plan" && <Plan />}
      {tab === "diet" && subTab === "week" && <Week />}
      {tab === "diet" && subTab === "foods" && <Foods />}

      {tab === "activity" && subTab === "workout" && <Workout />}
      {tab === "activity" && subTab === "sports" && <Sports />}
      {tab === "activity" && subTab === "steps" && <Steps />}
      {tab === "activity" && subTab === "programs" && <Programs />}

      {tab === "body" && subTab === "physique" && <Physique setTab={setTab} />}
      {tab === "body" && subTab === "progress" && <Progress />}

      {tab === "more" && subTab === "meds" && <Meds />}
      {tab === "more" && subTab === "supps" && <Supplements />}
      {tab === "more" && subTab === "pantry" && <Grocery />}
      {tab === "more" && subTab === "history" && <History />}
      {tab === "more" && subTab === "profile" && <Profile />}
    </Layout>
  );
}
