import { createUser, findUserByEmail, setSessionCookie } from "../_auth.js";

// POST /api/auth/register { email, password } → { ok, email }
//
// On success we also issue the session cookie so the new user is
// immediately logged in (saves the extra round trip on first sign-up).
export default async function handler(req, res) {
  if (req.method !== "POST") {
    res.status(405).json({ error: "Method not allowed" });
    return;
  }
  const body = req.body && typeof req.body === "object" ? req.body : {};
  const { email, password } = body;
  if (typeof email !== "string" || typeof password !== "string") {
    res.status(400).json({ error: "Missing email or password" });
    return;
  }
  try {
    const existing = await findUserByEmail(email);
    if (existing) {
      res.status(409).json({ error: "An account with that email already exists. Try signing in." });
      return;
    }
    const user = await createUser(email, password);
    setSessionCookie(res, { uid: user.id, email: user.email });
    res.status(200).json({ ok: true, email: user.email });
  } catch (e) {
    // hashPassword throws on weak passwords / invalid email — surface that
    // text directly so the UI can show it.
    res.status(400).json({ error: e.message || String(e) });
  }
}
