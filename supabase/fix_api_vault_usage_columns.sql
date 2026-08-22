-- Fix for existing ConvertFlow databases created before API usage columns were added.
-- Run this once in the Supabase SQL Editor.

alter table public.convertflow_api_keys
  add column if not exists usage_count integer not null default 0;

alter table public.convertflow_api_keys
  add column if not exists usage_limit integer not null default 50000;

alter table public.convertflow_api_keys
  add column if not exists usage_reset_at timestamptz null;
