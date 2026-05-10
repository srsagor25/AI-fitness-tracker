import { getSession } from "../_auth.js";

export default async function handler(req, res) {
  // Probe the session without 401-ing. The client polls this on mount to
  // know whether it should hide the login form.
  try {
    const sess = getSession(req);
    res.status(200).json({ authed: !!sess });
  } catch {
    // Misconfigured server (missing SESSION_SECRET etc.) — surface as
    // "not configured" rather than 500 so the UI can show a hint.
    res.status(200).json({ authed: false, configured: false });
  }
}
