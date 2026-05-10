import { withAuth } from "../_auth.js";
import { query } from "../_db.js";

// POST /api/kv/put { key, value } → upsert per-user.
export default withAuth(async (req, res, session) => {
  if (req.method !== "POST") {
    res.status(405).json({ error: "Method not allowed" });
    return;
  }
  const body = req.body && typeof req.body === "object" ? req.body : {};
  const { key, value } = body;
  if (!key || typeof key !== "string") {
    res.status(400).json({ error: "Missing key" });
    return;
  }
  if (value === undefined) {
    res.status(400).json({ error: "Missing value" });
    return;
  }
  try {
    const r = await query(
      `insert into kv (user_id, key, value) values ($1, $2, $3)
         on conflict (user_id, key) do update set value = excluded.value
         returning updated_at`,
      [session.uid, key, JSON.stringify(value)],
    );
    res.status(200).json({ ok: true, updated_at: r.rows[0].updated_at });
  } catch (e) {
    res.status(500).json({ error: e.message || String(e) });
  }
});
