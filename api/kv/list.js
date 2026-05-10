import { withAuth } from "../_auth.js";
import { query } from "../_db.js";

// GET /api/kv/list?prefix=meals: → { keys: ["meals:2026-05-09", ...] }
// Optional `?withValues=1` returns full rows (used by the bulk pull
// flow). Without it we only return keys to keep responses small.
export default withAuth(async (req, res) => {
  if (req.method !== "GET") {
    res.status(405).json({ error: "Method not allowed" });
    return;
  }
  const prefix = (req.query?.prefix ?? "").toString();
  const withValues = !!req.query?.withValues;
  try {
    if (withValues) {
      const r = await query(
        `select key, value, updated_at from kv where key like $1 order by key`,
        [`${prefix}%`],
      );
      res.status(200).json({ rows: r.rows });
    } else {
      const r = await query(
        `select key from kv where key like $1 order by key`,
        [`${prefix}%`],
      );
      res.status(200).json({ keys: r.rows.map((row) => row.key) });
    }
  } catch (e) {
    res.status(500).json({ error: e.message || String(e) });
  }
});
