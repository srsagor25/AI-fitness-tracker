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
import { Programs } from "./pages/Programs.jsx";
import { History } from "./pages/History.jsx";
import { Grocery } from "./pages/Grocery.jsx";
import { Progress } from "./pages/Progress.jsx";
import { Physique } from "./pages/Physique.jsx";
import { Meds } from "./pages/Meds.jsx";
import { Supplements } from "./pages/Supplements.jsx";
import { Profile } from "./pages/Profile.jsx";

// Hash-based tab state so the browser back button takes you to the previous
// tab instead of leaving the app. Initial tab comes from window.location.hash
// or falls back to "dashboard".
function getInitialTab() {
  if (typeof window === "undefined") return "dashboard";
  const h = window.location.hash.replace(/^#/, "");
  return h || "dashboard";
}

export default function App() {
  const [tab, setTabState] = useState(getInitialTab);

  // Push history entry when tab changes; let popstate restore prev tab.
  function setTab(next) {
    if (next === tab) return;
    if (typeof window !== "undefined") {
      window.history.pushState({ tab: next }, "", `#${next}`);
    }
    setTabState(next);
  }

  useEffect(() => {
    function onPop(e) {
      const next = e.state?.tab || getInitialTab();
      setTabState(next);
    }
    if (typeof window !== "undefined") {
      // Replace initial state so the first hash is in the stack.
      window.history.replaceState({ tab }, "", `#${tab}`);
      window.addEventListener("popstate", onPop);
      return () => window.removeEventListener("popstate", onPop);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <Layout tab={tab} setTab={setTab}>
      {tab === "dashboard" && <Dashboard setTab={setTab} />}
      {tab === "diet" && <Diet />}
      {tab === "cheat" && <Cheat />}
      {tab === "build" && <Build setTab={setTab} />}
      {tab === "plan" && <Plan />}
      {tab === "week" && <Week />}
      {tab === "foods" && <Foods />}
      {tab === "workout" && <Workout />}
      {tab === "programs" && <Programs />}
      {tab === "history" && <History />}
      {tab === "grocery" && <Grocery />}
      {tab === "physique" && <Physique setTab={setTab} />}
      {tab === "progress" && <Progress />}
      {/* Back-compat: route old "body" hashes to Progress */}
      {tab === "body" && <Progress />}
      {tab === "meds" && <Meds />}
      {tab === "supplements" && <Supplements />}
      {tab === "profile" && <Profile />}
    </Layout>
  );
}
