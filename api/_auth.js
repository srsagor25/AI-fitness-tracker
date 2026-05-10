// Multi-user auth. Each user has email + password (hashed with scrypt).
// On login we issue an HMAC-signed session cookie holding { uid, email }.
//
// SESSION_SECRET signs the cookie. Generate one with:
//   node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
//
// Password hashing uses Node's built-in crypto.scrypt — no native
// dependencies. Hash format: "scrypt$N$r$p$saltB64$hashB64".

import crypto from "crypto";
import { query } from "./_db.js";

const COOKIE_NAME = "aift_session";
const SESSION_TTL_MS = 30 * 86400_000; // 30 days
const SCRYPT_N = 16384;
const SCRYPT_R = 8;
const SCRYPT_P = 1;
const SCRYPT_KEYLEN = 64;

// ---------- session cookie helpers ----------

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

export function setSessionCookie(res, { uid, email }) {
  const token = sign({ uid, email, exp: Date.now() + SESSION_TTL_MS });
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

// Wrap a handler so it 401s when no valid session is present. The
// handler receives a third argument `session = { uid, email, exp }`.
export function withAuth(handler) {
  return async (req, res) => {
    const sess = getSession(req);
    if (!sess?.uid) {
      res.status(401).json({ error: "Unauthorized" });
      return;
    }
    return handler(req, res, sess);
  };
}

// ---------- password hashing ----------

function scryptHash(password, salt) {
  return new Promise((resolve, reject) => {
    crypto.scrypt(
      password,
      salt,
      SCRYPT_KEYLEN,
      { N: SCRYPT_N, r: SCRYPT_R, p: SCRYPT_P },
      (err, key) => (err ? reject(err) : resolve(key)),
    );
  });
}

export async function hashPassword(password) {
  if (typeof password !== "string" || password.length < 8) {
    throw new Error("Password must be at least 8 characters.");
  }
  const salt = crypto.randomBytes(16);
  const key = await scryptHash(password, salt);
  return [
    "scrypt",
    SCRYPT_N,
    SCRYPT_R,
    SCRYPT_P,
    salt.toString("base64"),
    key.toString("base64"),
  ].join("$");
}

export async function verifyPassword(password, stored) {
  if (typeof stored !== "string" || !stored.startsWith("scrypt$")) return false;
  const [, n, r, p, saltB64, hashB64] = stored.split("$");
  const salt = Buffer.from(saltB64, "base64");
  const expected = Buffer.from(hashB64, "base64");
  const derived = await new Promise((resolve, reject) => {
    crypto.scrypt(
      password,
      salt,
      expected.length,
      { N: +n, r: +r, p: +p },
      (err, key) => (err ? reject(err) : resolve(key)),
    );
  });
  if (derived.length !== expected.length) return false;
  return crypto.timingSafeEqual(derived, expected);
}

// ---------- user lookups ----------

function normalizeEmail(email) {
  if (typeof email !== "string") return "";
  return email.trim().toLowerCase();
}

export async function findUserByEmail(email) {
  const e = normalizeEmail(email);
  if (!e) return null;
  const r = await query(
    `select id, email, password_hash from users where email = $1`,
    [e],
  );
  return r.rows[0] || null;
}

export async function createUser(email, password) {
  const e = normalizeEmail(email);
  if (!e || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(e)) {
    throw new Error("Enter a valid email address.");
  }
  const hash = await hashPassword(password);
  const r = await query(
    `insert into users (email, password_hash) values ($1, $2) returning id, email`,
    [e, hash],
  );
  return r.rows[0];
}
