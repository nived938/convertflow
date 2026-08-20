-- Run this in Supabase SQL Editor before setting SUPABASE_URL and
-- SUPABASE_SERVICE_ROLE_KEY on Render. The service-role key must never be
-- exposed to the frontend.

create table if not exists public.convertflow_users (
  id text primary key,
  email text not null unique,
  created_at timestamptz not null default now()
);

create table if not exists public.login_events (
  id uuid primary key,
  user_id text not null,
  email text not null,
  event text not null,
  created_at timestamptz not null default now()
);

alter table public.convertflow_users enable row level security;
alter table public.login_events enable row level security;

-- Backend calls use the service-role key. Do not create browser-facing write policies.
