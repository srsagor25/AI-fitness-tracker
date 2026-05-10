import { useEffect, useState } from "react";
import { Card, CardHeader } from "./ui/Card.jsx";
import { Button } from "./ui/Button.jsx";
import { Field, TextInput, Chip } from "./ui/Field.jsx";
import {
  authStatus,
  login,
  logout,
  pushAll,
  pullAll,
} from "../lib/sync.js";
import { Cloud, CloudOff, ArrowUpToLine, ArrowDownToLine, AlertTriangle } from "lucide-react";

// Personal-cloud sync UI. Lives on the Profile page. Three states:
//  1. server not configured (no API or no env vars) → show setup hint
//  2. authed = false → password prompt
//  3. authed = true → push/pull buttons + logout
//
// Keep this card tightly scoped: every other surface in the app keeps
// reading from localStorage. Sync is always explicit — Push to upload,
// Pull to overwrite local with the server snapshot.

export function CloudSyncCard() {
  const [status, setStatus] = useState({ authed: false, configured: true, loaded: false });
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(null); // "login" | "logout" | "push" | "pull"
  const [msg, setMsg] = useState(null);   // last action result text
  const [err, setErr] = useState(null);

  async function refresh() {
    const s = await authStatus();
    setStatus({ ...s, loaded: true });
  }

  useEffect(() => {
    refresh();
  }, []);

  async function doLogin(e) {
    e.preventDefault?.();
    setErr(null);
    setBusy("login");
    try {
      await login(password);
      setPassword("");
      setMsg("Logged in.");
      await refresh();
    } catch (e2) {
      setErr(e2.message || "Login failed");
    } finally {
      setBusy(null);
    }
  }

  async function doLogout() {
    setBusy("logout");
    setErr(null);
    try {
      await logout();
      setMsg("Logged out.");
      await refresh();
    } catch (e2) {
      setErr(e2.message || "Logout failed");
    } finally {
      setBusy(null);
    }
  }

  async function doPush() {
    if (!confirm("Upload all local data to the server, overwriting anything stored there with the same key?")) return;
    setErr(null);
    setBusy("push");
    try {
      const r = await pushAll();
      setMsg(`Pushed ${r.count} keys (${(r.bytes / 1024).toFixed(1)} KB).`);
    } catch (e2) {
      setErr(e2.message || "Push failed");
    } finally {
      setBusy(null);
    }
  }

  async function doPull() {
    if (!confirm("Replace local data with the server snapshot? Anything you've changed locally that isn't on the server will be lost.")) return;
    setErr(null);
    setBusy("pull");
    try {
      const r = await pullAll({ overwrite: true });
      setMsg(`Pulled ${r.count} keys. Reload the app to see them.`);
    } catch (e2) {
      setErr(e2.message || "Pull failed");
    } finally {
      setBusy(null);
    }
  }

  // Render

  if (!status.loaded) {
    return (
      <Card>
        <CardHeader kicker="Cloud sync" title="Loading…" />
      </Card>
    );
  }

  if (status.configured === false) {
    return (
      <Card>
        <CardHeader
          kicker="Cloud sync"
          title="Not configured"
          subtitle="Set DATABASE_URL, SESSION_SECRET, and APP_PASSWORD in your Vercel project to enable Postgres sync."
        />
        <div className="border-2 border-ink p-3 flex items-start gap-2 bg-ink/5">
          <AlertTriangle size={16} className="text-accent shrink-0 mt-0.5" />
          <div className="font-body text-sm">
            See <strong>README → Cloud sync</strong> for the full setup. Until then the app keeps running on browser localStorage only.
          </div>
        </div>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader
        kicker="Cloud sync"
        title="Personal Postgres backup"
        subtitle="Local data is the source of truth. Push to back up; Pull to restore on a new device."
        right={
          status.authed ? (
            <Chip color="#4a6b3e">
              <Cloud size={10} className="inline mr-1" /> Linked
            </Chip>
          ) : (
            <Chip color="#6b5a3e">
              <CloudOff size={10} className="inline mr-1" /> Local only
            </Chip>
          )
        }
      />

      {!status.authed ? (
        <form onSubmit={doLogin} className="space-y-3">
          <Field label="App password" hint="Set on the server as APP_PASSWORD.">
            <TextInput
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete="current-password"
              placeholder="••••••••"
            />
          </Field>
          <Button type="submit" variant="primary" disabled={busy === "login" || !password}>
            {busy === "login" ? "Signing in…" : "Sign in"}
          </Button>
        </form>
      ) : (
        <div className="flex flex-wrap gap-2">
          <Button variant="primary" onClick={doPush} disabled={busy === "push"}>
            <ArrowUpToLine size={14} /> {busy === "push" ? "Pushing…" : "Push all to server"}
          </Button>
          <Button variant="outline" onClick={doPull} disabled={busy === "pull"}>
            <ArrowDownToLine size={14} /> {busy === "pull" ? "Pulling…" : "Pull from server"}
          </Button>
          <Button variant="ghost" onClick={doLogout} disabled={busy === "logout"}>
            {busy === "logout" ? "Signing out…" : "Sign out"}
          </Button>
        </div>
      )}

      {msg && (
        <div className="font-mono text-[10px] uppercase tracking-[0.25em] text-ink-muted mt-3">
          {msg}
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
