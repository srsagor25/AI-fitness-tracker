import { withAuth } from "../_auth.js";
import { query } from "../_db.js";

// POST /api/kv/clear → delete every kv row owned by the signed-in user.
// Used by the in-app "Reset all data" button so the next sign-in starts
// from a blank slate (no rows to rehydrate).
export default withAuth(async (req, res, session) => {
  if (req.method !== "POST") {
    res.status(405).json({ error: "Method not allowed" });
    return;
  }
  try {
    const r = await query(`delete from kv where user_id = $1`, [session.uid]);
    res.status(200).json({ ok: true, deleted: r.rowCount });
  } catch (e) {
    res.status(500).json({ error: e.message || String(e) });
  }
});
