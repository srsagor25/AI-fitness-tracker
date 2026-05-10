-- AI Fitness Tracker · Postgres schema (multi-user)
--
-- Each user has their own account (email + password). Every kv row is
-- scoped to a user_id so two accounts on the same DB never see each
-- other's data. See README → Cloud sync for setup.

create extension if not exists pgcrypto; -- for gen_random_uuid()

create table if not exists users (
  id            uuid primary key default gen_random_uuid(),
  email         text unique not null,
  password_hash text not null,
  created_at    timestamptz not null default now()
);

-- KV store, scoped per user. Keys are the same aift:* names already in
-- use by the localStorage layer, so the migration is a JSON copy.
create table if not exists kv (
  user_id    uuid not null references users(id) on delete cascade,
  key        text not null,
  value      jsonb not null,
  updated_at timestamptz not null default now(),
  primary key (user_id, key)
);

-- Touch trigger so updated_at is correct on every UPDATE.
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
