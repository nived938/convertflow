create table if not exists public.convertflow_users (
  id text primary key,
  email text not null unique,
  password_hash text,
  created_at timestamptz not null default now()
);

alter table public.convertflow_users add column if not exists password_hash text;

create table if not exists public.login_events (
  id uuid primary key,
  user_id text not null references public.convertflow_users(id) on delete cascade,
  email text not null,
  event text not null,
  created_at timestamptz not null default now()
);

create table if not exists public.verification_codes (
  user_id text not null references public.convertflow_users(id) on delete cascade,
  type text not null check (type in ('login_code', 'password_reset')),
  code_hash text not null,
  expires_at timestamptz not null,
  attempts integer not null default 0,
  created_at timestamptz not null default now(),
  primary key (user_id, type)
);

alter table public.convertflow_users enable row level security;
alter table public.login_events enable row level security;
alter table public.verification_codes enable row level security;

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

-- The backend uses the Supabase service-role key. Never expose it in frontend code.
