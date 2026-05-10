import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "./index.css";
import App from "./App.jsx";
import { AppProvider } from "./store/AppContext.jsx";
import { initSync } from "./lib/sync.js";

// Probe auth status and (if signed in) attach the auto-sync write hook
// before React mounts. Failure is non-blocking — the app still renders
// on localStorage if /api is unreachable.
initSync().catch(() => {});

createRoot(document.getElementById("root")).render(
  <StrictMode>
    <AppProvider>
      <App />
    </AppProvider>
  </StrictMode>,
);
