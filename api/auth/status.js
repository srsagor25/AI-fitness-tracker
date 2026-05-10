import { getSession } from "../_auth.js";

export default async function handler(req, res) {
  try {
    const sess = getSession(req);
    if (sess?.uid) {
      res.status(200).json({ authed: true, email: sess.email || null });
      return;
    }
    res.status(200).json({ authed: false });
  } catch {
    // Misconfigured server (missing SESSION_SECRET etc.) — surface as
    // not-configured so the UI can show a hint.
    res.status(200).json({ authed: false, configured: false });
  }
}
