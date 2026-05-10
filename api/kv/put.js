import { withAuth } from "../_auth.js";
import { query } from "../_db.js";

// POST /api/kv/put { key, value } → { ok: true, updated_at }
export default withAuth(async (req, res) => {
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
      `insert into kv (key, value) values ($1, $2)
         on conflict (key) do update set value = excluded.value
         returning updated_at`,
      [key, JSON.stringify(value)],
    );
    res.status(200).json({ ok: true, updated_at: r.rows[0].updated_at });
  } catch (e) {
    res.status(500).json({ error: e.message || String(e) });
  }
});
