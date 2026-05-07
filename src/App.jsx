import { useState } from "react";
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
import { Body } from "./pages/Body.jsx";
import { Meds } from "./pages/Meds.jsx";
import { Profile } from "./pages/Profile.jsx";

export default function App() {
  const [tab, setTab] = useState("dashboard");
  return (
    <Layout tab={tab} setTab={setTab}>
      {tab === "dashboard" && <Dashboard setTab={setTab} />}
      {tab === "diet" && <Diet />}
      {tab === "cheat" && <Cheat />}
      {tab === "build" && <Build />}
      {tab === "plan" && <Plan />}
      {tab === "week" && <Week />}
      {tab === "foods" && <Foods />}
      {tab === "workout" && <Workout />}
      {tab === "programs" && <Programs />}
      {tab === "history" && <History />}
      {tab === "grocery" && <Grocery />}
      {tab === "body" && <Body />}
      {tab === "meds" && <Meds />}
      {tab === "profile" && <Profile />}
    </Layout>
  );
}
