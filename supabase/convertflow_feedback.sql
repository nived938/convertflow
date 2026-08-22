create table if not exists public.convertflow_feedback (
  id uuid primary key default gen_random_uuid(),
  rating integer not null check (rating between 1 and 5),
  message text not null,
  page text,
  created_at timestamptz not null default now()
);

create index if not exists convertflow_feedback_created_at_idx on public.convertflow_feedback(created_at desc);
create index if not exists convertflow_feedback_rating_idx on public.convertflow_feedback(rating);

alter table public.convertflow_feedback enable row level security;

-- Public feedback submission is performed by the Node.js backend with the service role key.
-- Admin feedback reads are also performed by the Node.js backend after admin-token verification.
