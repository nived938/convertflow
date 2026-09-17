-- ConvertFlow PhonePe donation payments
-- This migration is also applied to the connected Supabase project.

create table if not exists public.convertflow_phonepe_payments (
  id uuid primary key default gen_random_uuid(),
  merchant_order_id text not null unique,
  amount_paise bigint not null check (amount_paise > 0),
  donor_name text not null,
  state text not null default 'PENDING',
  phonepe_order_id text,
  transaction_id text,
  failure_code text,
  failure_message text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  completed_at timestamptz
);

create index if not exists convertflow_phonepe_payments_state_idx
  on public.convertflow_phonepe_payments(state);

create index if not exists convertflow_phonepe_payments_created_at_idx
  on public.convertflow_phonepe_payments(created_at desc);

alter table public.convertflow_phonepe_payments enable row level security;
revoke all on public.convertflow_phonepe_payments from anon, authenticated;
grant all on public.convertflow_phonepe_payments to service_role;

alter table public.convertflow_donation_requests
  add column if not exists merchant_order_id text;

alter table public.convertflow_donation_requests
  add column if not exists amount_paise bigint;

create unique index if not exists convertflow_donation_requests_merchant_order_id_uidx
  on public.convertflow_donation_requests(merchant_order_id)
  where merchant_order_id is not null;
