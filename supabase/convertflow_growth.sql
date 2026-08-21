-- ConvertFlow growth features
-- Run in Supabase SQL Editor after convertflow_api_keys.sql

alter table public.convertflow_api_keys
  add column if not exists usage_count integer not null default 0,
  add column if not exists usage_limit integer not null default 1000,
  add column if not exists usage_reset_at timestamptz not null default (now() + interval '1 month');

create table if not exists public.convertflow_conversion_events (
  id uuid primary key default gen_random_uuid(),
  api_key_id uuid null references public.convertflow_api_keys(id) on delete set null,
  source text not null default 'free',
  category text null,
  input_format text null,
  output_format text null,
  file_count integer not null default 1,
  created_at timestamptz not null default now()
);
create index if not exists convertflow_events_created_idx on public.convertflow_conversion_events(created_at desc);
create index if not exists convertflow_events_api_key_idx on public.convertflow_conversion_events(api_key_id);

create table if not exists public.convertflow_feedback (
  id uuid primary key default gen_random_uuid(),
  rating smallint not null check (rating between 1 and 5),
  message text not null,
  page text null,
  created_at timestamptz not null default now()
);
create index if not exists convertflow_feedback_created_idx on public.convertflow_feedback(created_at desc);

alter table public.convertflow_conversion_events enable row level security;
alter table public.convertflow_feedback enable row level security;
-- Backend only, using the Supabase service role.

-- Optional automatic cleanup of old event data. Requires pg_cron:
-- select cron.schedule('convertflow-clean-events','15 3 * * *', $$
--   delete from public.convertflow_conversion_events where created_at < now() - interval '90 days';
-- $$);
