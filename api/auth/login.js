import { checkPassword, setSessionCookie } from "../_auth.js";

export default async function handler(req, res) {
  if (req.method !== "POST") {
    res.status(405).json({ error: "Method not allowed" });
    return;
  }
  try {
    const body = req.body && typeof req.body === "object" ? req.body : {};
    const password = typeof body.password === "string" ? body.password : "";
    if (!checkPassword(password)) {
      // Same delay/code regardless of which check failed — don't leak.
      res.status(401).json({ error: "Wrong password" });
      return;
    }
    setSessionCookie(res);
    res.status(200).json({ ok: true });
  } catch (e) {
    res.status(500).json({ error: e.message || String(e) });
  }
}
