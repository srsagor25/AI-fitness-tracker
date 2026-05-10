import { useEffect, useState } from "react";
import { Card, CardHeader } from "./ui/Card.jsx";
import { Button } from "./ui/Button.jsx";
import { Field, TextInput, Chip } from "./ui/Field.jsx";
import { authStatus, login, register, logout } from "../lib/sync.js";
import { Cloud, CloudOff, AlertTriangle, Mail } from "lucide-react";

// Account UI on the Profile page. Two phases:
//   1. signed out → tabs for "Sign in" / "Create account"
//   2. signed in  → email shown + Sign out
//
// No Push / Pull buttons anymore — once you're signed in, every change
// auto-syncs to your account in the background. The DB is the source of
// truth; localStorage is just a fast cache that gets rehydrated from
// the server on each sign-in.
export function CloudSyncCard() {
  const [status, setStatus] = useState({ authed: false, configured: true, loaded: false, email: null });
  const [mode, setMode] = useState("signin"); // "signin" | "register"
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(null);
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
      // login()/register() in sync.js take care of hydrating + reloading,
      // so the page is replaced before this component sees the result.
      if (mode === "register") {
        await register(email.trim(), password);
      } else {
        await login(email.trim(), password);
      }
    } catch (e2) {
      setErr(e2.message || "Authentication failed");
      setBusy(null);
    }
  }

  async function doLogout() {
    if (!confirm("Sign out? Local cache will be cleared so the next sign-in starts fresh.")) return;
    setBusy("logout");
    setErr(null);
    try {
      await logout(); // also reloads
    } catch (e2) {
      setErr(e2.message || "Sign out failed");
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
            See <strong>README → Cloud sync</strong> for setup. Until then the app keeps running on browser localStorage only.
          </div>
        </div>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader
        kicker="Account"
        title={status.authed ? `Signed in as ${status.email || "—"}` : "Sign in to start"}
        subtitle={
          status.authed
            ? "Every change auto-saves to your account. Sign in on another device to load the same data."
            : "Each account has its own private data. Sign in to start saving — your changes will sync automatically."
        }
        right={
          status.authed ? (
            <Chip color="#4a6b3e">
              <Cloud size={10} className="inline mr-1" /> Auto-syncing
            </Chip>
          ) : (
            <Chip color="#6b5a3e">
              <CloudOff size={10} className="inline mr-1" /> Not signed in
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
        <Button variant="ghost" onClick={doLogout} disabled={busy === "logout"}>
          {busy === "logout" ? "Signing out…" : "Sign out"}
        </Button>
      )}

      {err && (
        <div className="border-2 border-accent bg-accent/5 px-3 py-2 mt-3 text-sm font-body">
          {err}
        </div>
      )}
    </Card>
  );
}
