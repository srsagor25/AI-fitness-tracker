import { withAuth } from "../_auth.js";
import { withClient } from "../_db.js";

// POST /api/kv/bulk { items: [{ key, value }] } → upsert per-user, all
// inside one transaction so partial failures don't corrupt the snapshot.
export default withAuth(async (req, res, session) => {
  if (req.method !== "POST") {
    res.status(405).json({ error: "Method not allowed" });
    return;
  }
  const body = req.body && typeof req.body === "object" ? req.body : {};
  const items = Array.isArray(body.items) ? body.items : null;
  if (!items) {
    res.status(400).json({ error: "Expected { items: [{key, value}] }" });
    return;
  }
  for (const it of items) {
    if (!it || typeof it.key !== "string" || it.value === undefined) {
      res.status(400).json({ error: "Each item needs string key + value" });
      return;
    }
  }

  try {
    await withClient(async (client) => {
      await client.query("begin");
      try {
        for (const it of items) {
          await client.query(
            `insert into kv (user_id, key, value) values ($1, $2, $3)
               on conflict (user_id, key) do update set value = excluded.value`,
            [session.uid, it.key, JSON.stringify(it.value)],
          );
        }
        await client.query("commit");
      } catch (err) {
        await client.query("rollback");
        throw err;
      }
    });
    res.status(200).json({ ok: true, count: items.length });
  } catch (e) {
    res.status(500).json({ error: e.message || String(e) });
  }
});
