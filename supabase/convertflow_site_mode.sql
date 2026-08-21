-- ConvertFlow global site mode
-- Run this once in the Supabase SQL Editor.

create table if not exists public.site_control (
  id integer primary key check (id = 1),
  mode text not null default 'normal' check (mode in ('normal', 'maintenance', 'not_found')),
  updated_at timestamptz not null default now()
);

insert into public.site_control (id, mode)
values (1, 'normal')
on conflict (id) do nothing;

alter table public.site_control enable row level security;

drop policy if exists "Public can read site mode" on public.site_control;
create policy "Public can read site mode"
on public.site_control
for select
to anon, authenticated
using (true);

-- Admin writes are performed by the Node.js backend using the Supabase service-role key.
-- Never expose the service-role key in Vercel frontend variables or GitHub.
