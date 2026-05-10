import { withAuth } from "../_auth.js";
import { query } from "../_db.js";

// GET /api/kv/get?key=meals:2026-05-09 → { value } (per-user scoped)
export default withAuth(async (req, res, session) => {
  if (req.method !== "GET") {
    res.status(405).json({ error: "Method not allowed" });
    return;
  }
  const key = (req.query && req.query.key) || "";
  if (!key || typeof key !== "string") {
    res.status(400).json({ error: "Missing key" });
    return;
  }
  try {
    const r = await query(
      `select value from kv where user_id = $1 and key = $2`,
      [session.uid, key],
    );
    res.status(200).json({ value: r.rows[0]?.value ?? null });
  } catch (e) {
    res.status(500).json({ error: e.message || String(e) });
  }
});
