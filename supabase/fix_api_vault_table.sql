-- ConvertFlow API key vault table
-- Run this once in Supabase SQL Editor if the table does not exist.

create table if not exists public.convertflow_api_key_vault (
  api_key_id uuid primary key references public.convertflow_api_keys(id) on delete cascade,
  encrypted_key text not null,
  iv text not null,
  auth_tag text not null,
  created_at timestamptz not null default now()
);

alter table public.convertflow_api_key_vault enable row level security;

-- Refresh PostgREST's schema cache after creating the table.
notify pgrst, 'reload schema';
