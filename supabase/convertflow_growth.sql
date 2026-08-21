-- ConvertFlow growth features
-- Run this once in Supabase SQL Editor after convertflow_api_keys.sql
alter table public.convertflow_api_keys add column if not exists usage_count integer not null default 0, add column if not exists usage_limit integer not null default 1000, add column if not exists usage_reset_at timestamptz not null default (now() + interval '1 month');
update public.convertflow_api_keys set usage_limit=case plan when 'month' then 1000 when 'year' then 15000 when 'permanent' then 50000 else 1000 end;
create or replace function public.convertflow_set_api_plan_defaults() returns trigger language plpgsql as $$ begin new.usage_limit:=case new.plan when 'month' then 1000 when 'year' then 15000 when 'permanent' then 50000 else 1000 end; if new.usage_reset_at is null then new.usage_reset_at:=now()+case when new.plan='year' then interval '1 year' else interval '1 month' end; end if; return new; end; $$;
drop trigger if exists convertflow_api_plan_defaults on public.convertflow_api_keys;
create trigger convertflow_api_plan_defaults before insert or update of plan on public.convertflow_api_keys for each row execute function public.convertflow_set_api_plan_defaults();
create table if not exists public.convertflow_conversion_events (id uuid primary key default gen_random_uuid(), api_key_id uuid null references public.convertflow_api_keys(id) on delete set null, source text not null default 'free', category text null, input_format text null, output_format text null, file_count integer not null default 1, created_at timestamptz not null default now());
create index if not exists convertflow_events_created_idx on public.convertflow_conversion_events(created_at desc);
create index if not exists convertflow_events_api_key_idx on public.convertflow_conversion_events(api_key_id);
create table if not exists public.convertflow_feedback (id uuid primary key default gen_random_uuid(), rating smallint not null check (rating between 1 and 5), message text not null, page text null, created_at timestamptz not null default now());
create index if not exists convertflow_feedback_created_idx on public.convertflow_feedback(created_at desc);
alter table public.convertflow_conversion_events enable row level security;
alter table public.convertflow_feedback enable row level security;
-- Optional pg_cron cleanup: delete conversion events older than 90 days and expired API keys periodically.
