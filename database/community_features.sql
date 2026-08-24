create table if not exists public.convertflow_announcement (
  id integer primary key default 1 check (id = 1),
  enabled boolean not null default false,
  title text not null default '',
  message text not null default '',
  type text not null default 'info',
  updated_at timestamptz not null default now()
);
insert into public.convertflow_announcement (id) values (1) on conflict (id) do nothing;
create table if not exists public.convertflow_donation_requests (
  id uuid primary key,
  name text not null,
  status text not null default 'pending',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create table if not exists public.convertflow_supporters (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  visible boolean not null default true,
  sort_order integer not null default 0,
  created_at timestamptz not null default now()
);
alter table public.convertflow_announcement enable row level security;
alter table public.convertflow_donation_requests enable row level security;
alter table public.convertflow_supporters enable row level security;
