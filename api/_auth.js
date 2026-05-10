// Cookie-based auth for the personal cloud. Single-user model: one shared
// password (APP_PASSWORD env var) gates the whole DB. After a successful
// login we issue an HMAC-signed session cookie so subsequent /api/kv/*
// calls don't have to send the password again.
//
// SESSION_SECRET signs the cookie. Generate one once with:
//   node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
//
// This is intentionally minimal — multi-user accounts, OAuth, etc. would
// replace this module entirely. See README → Cloud sync.

import crypto from "crypto";

const COOKIE_NAME = "aift_session";
const SESSION_TTL_MS = 30 * 86400_000; // 30 days

function getSecret() {
  const s = process.env.SESSION_SECRET;
  if (!s) throw new Error("SESSION_SECRET is not set — see README → Cloud sync.");
  return s;
}

function b64urlEncode(buf) {
  return Buffer.from(buf)
    .toString("base64")
    .replace(/=+$/, "")
    .replace(/\+/g, "-")
    .replace(/\//g, "_");
}

function b64urlDecode(str) {
  const pad = str.length % 4 === 0 ? "" : "=".repeat(4 - (str.length % 4));
  return Buffer.from(str.replace(/-/g, "+").replace(/_/g, "/") + pad, "base64");
}

function sign(payload) {
  const secret = getSecret();
  const body = b64urlEncode(JSON.stringify(payload));
  const sig = b64urlEncode(
    crypto.createHmac("sha256", secret).update(body).digest(),
  );
  return `${body}.${sig}`;
}

function verify(token) {
  if (!token || typeof token !== "string") return null;
  const dot = token.indexOf(".");
  if (dot < 0) return null;
  const body = token.slice(0, dot);
  const sig = token.slice(dot + 1);
  const secret = getSecret();
  const expected = b64urlEncode(
    crypto.createHmac("sha256", secret).update(body).digest(),
  );
  // constant-time compare
  if (
    sig.length !== expected.length ||
    !crypto.timingSafeEqual(Buffer.from(sig), Buffer.from(expected))
  ) {
    return null;
  }
  try {
    const payload = JSON.parse(b64urlDecode(body).toString());
    if (payload.exp && payload.exp < Date.now()) return null;
    return payload;
  } catch {
    return null;
  }
}

export function setSessionCookie(res) {
  const token = sign({ ok: true, exp: Date.now() + SESSION_TTL_MS });
  const parts = [
    `${COOKIE_NAME}=${token}`,
    "HttpOnly",
    "Path=/",
    `Max-Age=${Math.floor(SESSION_TTL_MS / 1000)}`,
    "SameSite=Lax",
  ];
  if (process.env.VERCEL_ENV === "production") parts.push("Secure");
  res.setHeader("Set-Cookie", parts.join("; "));
}

export function clearSessionCookie(res) {
  res.setHeader(
    "Set-Cookie",
    `${COOKIE_NAME}=; HttpOnly; Path=/; Max-Age=0; SameSite=Lax`,
  );
}

export function getSession(req) {
  const cookie = req.headers?.cookie || "";
  const m = cookie.match(new RegExp(`(?:^|; )${COOKIE_NAME}=([^;]+)`));
  if (!m) return null;
  return verify(m[1]);
}

// Wrap a handler so it 401s when no valid session is present. Used by all
// /api/kv/* routes.
export function withAuth(handler) {
  return async (req, res) => {
    const sess = getSession(req);
    if (!sess) {
      res.status(401).json({ error: "Unauthorized" });
      return;
    }
    return handler(req, res, sess);
  };
}

export function checkPassword(input) {
  const expected = process.env.APP_PASSWORD || "";
  if (!expected) {
    throw new Error("APP_PASSWORD is not set — see README → Cloud sync.");
  }
  if (typeof input !== "string" || input.length === 0) return false;
  // Constant-time compare so an attacker can't time-leak the prefix.
  const a = Buffer.from(input);
  const b = Buffer.from(expected);
  if (a.length !== b.length) return false;
  return crypto.timingSafeEqual(a, b);
}
