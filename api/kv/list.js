import { withAuth } from "../_auth.js";
import { query } from "../_db.js";

// GET /api/kv/list?prefix=meals:&withValues=1 → per-user list.
export default withAuth(async (req, res, session) => {
  if (req.method !== "GET") {
    res.status(405).json({ error: "Method not allowed" });
    return;
  }
  const prefix = (req.query?.prefix ?? "").toString();
  const withValues = !!req.query?.withValues;
  try {
    if (withValues) {
      const r = await query(
        `select key, value, updated_at from kv
           where user_id = $1 and key like $2
           order by key`,
        [session.uid, `${prefix}%`],
      );
      res.status(200).json({ rows: r.rows });
    } else {
      const r = await query(
        `select key from kv
           where user_id = $1 and key like $2
           order by key`,
        [session.uid, `${prefix}%`],
      );
      res.status(200).json({ keys: r.rows.map((row) => row.key) });
    }
  } catch (e) {
    res.status(500).json({ error: e.message || String(e) });
  }
});
