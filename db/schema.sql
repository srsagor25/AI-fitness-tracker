-- AI Fitness Tracker · Postgres schema
--
-- Single-user "personal cloud" model: one app instance = one account,
-- gated by APP_PASSWORD. Every piece of state the app already keeps in
-- localStorage maps to a single row in `kv` (key text, value jsonb), so
-- the migration from localStorage is a JSON copy with no schema work.
-- See README → "Cloud sync" for setup steps.

create table if not exists kv (
  key        text primary key,
  value      jsonb not null,
  updated_at timestamptz not null default now()
);

-- Trigger so updated_at stays accurate on every UPDATE without the API
-- having to set it explicitly.
create or replace function kv_touch_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

drop trigger if exists kv_touch_updated_at on kv;
create trigger kv_touch_updated_at
  before update on kv
  for each row execute function kv_touch_updated_at();

-- Prefix scans (e.g. "meals:%") use the primary key index automatically
-- because text PK + LIKE 'prefix%' is range-compatible. No extra index
-- needed.
