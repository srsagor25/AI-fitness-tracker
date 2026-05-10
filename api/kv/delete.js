import { withAuth } from "../_auth.js";
import { query } from "../_db.js";

// POST /api/kv/delete { key } → { ok: true, deleted: <count> }
export default withAuth(async (req, res) => {
  if (req.method !== "POST") {
    res.status(405).json({ error: "Method not allowed" });
    return;
  }
  const body = req.body && typeof req.body === "object" ? req.body : {};
  const key = body.key;
  if (!key || typeof key !== "string") {
    res.status(400).json({ error: "Missing key" });
    return;
  }
  try {
    const r = await query(`delete from kv where key = $1`, [key]);
    res.status(200).json({ ok: true, deleted: r.rowCount });
  } catch (e) {
    res.status(500).json({ error: e.message || String(e) });
  }
});
