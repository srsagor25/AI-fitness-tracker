// Postgres connection helper for Vercel serverless routes.
//
// Uses a per-invocation Client (not a Pool) because Vercel functions are
// ephemeral — pool warmup buys nothing here, and Pool can leak idle
// connections across invocations on hosted Postgres providers that have
// low connection limits (e.g. Neon's free tier ~100 conns).
//
// `DATABASE_URL` is required and must be a postgres:// URI. Most managed
// providers (Neon, Supabase, Vercel Postgres, Railway) hand you one
// directly. For Neon you typically need `?sslmode=require` in the URL.

import pg from "pg";

const { Client } = pg;

export async function withClient(fn) {
  if (!process.env.DATABASE_URL) {
    throw new Error("DATABASE_URL is not set — see README → Cloud sync.");
  }
  const client = new Client({
    connectionString: process.env.DATABASE_URL,
    // Most managed Postgres providers serve over TLS but not with a
    // CA we'd recognize from Node's bundled bundle. rejectUnauthorized:
    // false is the standard config for Neon/Supabase/etc.
    ssl: process.env.DATABASE_URL.includes("sslmode=disable")
      ? false
      : { rejectUnauthorized: false },
  });
  await client.connect();
  try {
    return await fn(client);
  } finally {
    await client.end();
  }
}

export async function query(sql, params = []) {
  return withClient((c) => c.query(sql, params));
}
