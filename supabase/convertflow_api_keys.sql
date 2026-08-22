-- ConvertFlow API key licensing
-- Run this once in Supabase SQL Editor.

create table if not exists public.convertflow_api_keys (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  key_hash text not null unique,
  key_prefix text not null,
  plan text not null check (plan in ('month', 'year', 'permanent')),
  expires_at timestamptz null,
  created_at timestamptz not null default now(),
  last_used_at timestamptz null,
  revoked_at timestamptz null,
  usage_count integer not null default 0,
  usage_limit integer not null default 50000,
  usage_reset_at timestamptz null
);

-- Keep existing databases compatible when this file is re-run after an older schema.
alter table public.convertflow_api_keys add column if not exists usage_count integer not null default 0;
alter table public.convertflow_api_keys add column if not exists usage_limit integer not null default 50000;
alter table public.convertflow_api_keys add column if not exists usage_reset_at timestamptz null;

create index if not exists convertflow_api_keys_hash_idx on public.convertflow_api_keys(key_hash);
create index if not exists convertflow_api_keys_expires_idx on public.convertflow_api_keys(expires_at);

alter table public.convertflow_api_keys enable row level security;

-- No public policies. API key management is performed only by the Node.js backend
-- using SUPABASE_SERVICE_ROLE_KEY.

-- Optional automatic cleanup. Supabase projects with pg_cron enabled can run this:
-- select cron.schedule('convertflow-delete-expired-api-keys', '*/15 * * * *', $$
--   delete from public.convertflow_api_keys
--   where expires_at is not null and expires_at <= now();
-- $$);
