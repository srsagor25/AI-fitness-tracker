import { withAuth } from "../_auth.js";
import { withClient } from "../_db.js";

// Bulk push/pull endpoint.
//
// POST /api/kv/bulk { items: [{ key, value }, ...] }
//   → upserts every row inside one transaction. Returns { ok, count }.
//   Used by the "Push all" button in the Profile sync card so a fresh
//   account can be hydrated in one round-trip.
//
// The matching pull is `GET /api/kv/list?prefix=&withValues=1` — already
// covered by list.js so we don't duplicate it here.
export default withAuth(async (req, res) => {
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
  // Reject anything obviously malformed before we open a transaction.
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
            `insert into kv (key, value) values ($1, $2)
               on conflict (key) do update set value = excluded.value`,
            [it.key, JSON.stringify(it.value)],
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
