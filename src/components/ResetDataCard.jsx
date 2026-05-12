import { useState } from "react";
import { Card, CardHeader } from "./ui/Card.jsx";
import { Button } from "./ui/Button.jsx";
import { resetAll } from "../lib/sync.js";
import { AlertTriangle, Trash2 } from "lucide-react";

// "Reset all data" lives at the bottom of the Profile tab. It wipes the
// local cache AND (if signed in) every kv row in the user's Postgres
// account, then reloads — so the app boots into first-run onboarding
// under the same account.
//
// Two-step confirm: first click arms the danger button, second click
// commits. Avoids the native confirm() dialog so the action feels
// considered, not modal.
export function ResetDataCard() {
  const [armed, setArmed] = useState(false);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState(null);

  async function doReset() {
    setBusy(true);
    setErr(null);
    try {
      await resetAll(); // reloads on success
    } catch (e) {
      setErr(e.message || "Reset failed");
      setBusy(false);
      setArmed(false);
    }
  }

  return (
    <Card className="border-accent">
      <CardHeader
        kicker="Danger zone"
        title="Reset all data"
        subtitle="Wipes today's log, history, weigh-ins, presets, programs, and every other saved field. If you're signed in, your cloud-synced data is deleted too. Your account itself is kept — you'll just start over inside it."
      />
      <div className="border-2 border-accent bg-accent/5 p-3 flex items-start gap-2 mb-3">
        <AlertTriangle size={16} className="text-accent shrink-0 mt-0.5" />
        <div className="font-body text-sm">
          This can't be undone. Make sure you actually want a fresh start before clicking twice.
        </div>
      </div>
      {!armed ? (
        <Button variant="danger" onClick={() => setArmed(true)} disabled={busy}>
          <Trash2 size={14} /> Reset all data
        </Button>
      ) : (
        <div className="flex flex-wrap gap-2">
          <Button variant="accent" onClick={doReset} disabled={busy}>
            <Trash2 size={14} /> {busy ? "Wiping…" : "Yes, wipe everything"}
          </Button>
          <Button variant="ghost" onClick={() => setArmed(false)} disabled={busy}>
            Cancel
          </Button>
        </div>
      )}
      {err && (
        <div className="border-2 border-accent bg-accent/5 px-3 py-2 mt-3 text-sm font-body">
          {err}
        </div>
      )}
    </Card>
  );
}
