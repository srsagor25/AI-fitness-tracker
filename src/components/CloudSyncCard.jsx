import { useEffect, useState } from "react";
import { Card, CardHeader } from "./ui/Card.jsx";
import { Button } from "./ui/Button.jsx";
import { Field, TextInput, Chip } from "./ui/Field.jsx";
import {
  authStatus,
  login,
  register,
  logout,
  pushAll,
  pullAll,
} from "../lib/sync.js";
import {
  Cloud,
  CloudOff,
  ArrowUpToLine,
  ArrowDownToLine,
  AlertTriangle,
  Mail,
} from "lucide-react";

// Account + cloud-sync UI on Profile. Two phases:
//   1. signed out → tabs for "Sign in" / "Create account"
//   2. signed in  → email shown, Push / Pull / Sign out buttons
//
// Each user has their own data in Postgres (kv.user_id), so two accounts
// on the same deployment never see each other's history. Sync is always
// explicit — Push to upload, Pull to overwrite local.

export function CloudSyncCard() {
  const [status, setStatus] = useState({ authed: false, configured: true, loaded: false, email: null });
  const [mode, setMode] = useState("signin"); // "signin" | "register"
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(null);
  const [msg, setMsg] = useState(null);
  const [err, setErr] = useState(null);

  async function refresh() {
    const s = await authStatus();
    setStatus({ ...s, loaded: true });
  }

  useEffect(() => {
    refresh();
  }, []);

  async function doSignin(e) {
    e.preventDefault?.();
    setErr(null);
    setBusy("auth");
    try {
      if (mode === "register") {
        await register(email.trim(), password);
        setMsg("Account created — you're signed in.");
      } else {
        await login(email.trim(), password);
        setMsg("Signed in.");
      }
      setPassword("");
      await refresh();
    } catch (e2) {
      setErr(e2.message || "Authentication failed");
    } finally {
      setBusy(null);
    }
  }

  async function doLogout() {
    setBusy("logout");
    setErr(null);
    try {
      await logout();
      setMsg("Signed out.");
      await refresh();
    } catch (e2) {
      setErr(e2.message || "Sign out failed");
    } finally {
      setBusy(null);
    }
  }

  async function doPush() {
    if (!confirm("Upload all local data to your account, overwriting anything stored there with the same key?")) return;
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
    if (!confirm("Replace local data with your account's snapshot? Anything you've changed locally that isn't on the server will be lost.")) return;
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
        <CardHeader kicker="Account" title="Loading…" />
      </Card>
    );
  }

  if (status.configured === false) {
    return (
      <Card>
        <CardHeader
          kicker="Account"
          title="Cloud sync not configured"
          subtitle="Set DATABASE_URL and SESSION_SECRET in your Vercel project to enable accounts."
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
        kicker="Account"
        title={status.authed ? `Signed in as ${status.email || "—"}` : "Sign in to sync"}
        subtitle={
          status.authed
            ? "Your data is private to your account. Push to upload; Pull to restore on a new device."
            : "Each account has its own private data. Local-only mode keeps working until you sign in."
        }
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
        <>
          <div className="flex gap-2 mb-3">
            {[
              { id: "signin", label: "Sign in" },
              { id: "register", label: "Create account" },
            ].map((t) => (
              <button
                key={t.id}
                onClick={() => {
                  setMode(t.id);
                  setErr(null);
                }}
                className={`px-3 py-1.5 border-2 font-mono text-[10px] uppercase tracking-[0.2em] ${
                  mode === t.id
                    ? "bg-ink text-paper border-ink"
                    : "border-ink hover:bg-ink hover:text-paper"
                }`}
              >
                {t.label}
              </button>
            ))}
          </div>
          <form onSubmit={doSignin} className="space-y-3">
            <Field label="Email">
              <TextInput
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                autoComplete="email"
                placeholder="you@example.com"
              />
            </Field>
            <Field
              label="Password"
              hint={mode === "register" ? "At least 8 characters." : undefined}
            >
              <TextInput
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete={mode === "register" ? "new-password" : "current-password"}
                placeholder="••••••••"
              />
            </Field>
            <Button
              type="submit"
              variant="primary"
              disabled={busy === "auth" || !email || !password}
            >
              <Mail size={14} />{" "}
              {busy === "auth"
                ? mode === "register"
                  ? "Creating account…"
                  : "Signing in…"
                : mode === "register"
                  ? "Create account"
                  : "Sign in"}
            </Button>
          </form>
        </>
      ) : (
        <div className="flex flex-wrap gap-2">
          <Button variant="primary" onClick={doPush} disabled={busy === "push"}>
            <ArrowUpToLine size={14} /> {busy === "push" ? "Pushing…" : "Push all to my account"}
          </Button>
          <Button variant="outline" onClick={doPull} disabled={busy === "pull"}>
            <ArrowDownToLine size={14} /> {busy === "pull" ? "Pulling…" : "Pull from my account"}
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
