import { findUserByEmail, verifyPassword, setSessionCookie } from "../_auth.js";

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
    const user = await findUserByEmail(email);
    // Same response for unknown email + wrong password — don't leak which.
    if (!user || !(await verifyPassword(password, user.password_hash))) {
      res.status(401).json({ error: "Wrong email or password" });
      return;
    }
    setSessionCookie(res, { uid: user.id, email: user.email });
    res.status(200).json({ ok: true, email: user.email });
  } catch (e) {
    res.status(500).json({ error: e.message || String(e) });
  }
}
