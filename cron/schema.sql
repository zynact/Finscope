-- ========================================================
-- Table: ping
-- Purpose: Keep-alive table for Supabase activity (Read & Write)
-- Run this in the Supabase SQL Editor:
-- https://supabase.com/dashboard/project/<your-project-id>/sql
-- ========================================================

-- 1. Create table 'ping'
create table if not exists public.ping (
    id integer primary key default 1,
    last_pinged_at timestamptz not null default now(),
    ping_count bigint not null default 0,
    created_at timestamptz not null default now()
);

-- 2. Insert the single tracking row if it does not exist
insert into public.ping (id, last_pinged_at, ping_count)
values (1, now(), 0)
on conflict (id) do nothing;

-- 3. Enable Row Level Security (RLS)
alter table public.ping enable row level security;

-- 4. Set RLS policies:
-- Drop existing policies if re-running
drop policy if exists "Allow read on ping" on public.ping;
drop policy if exists "Allow update on ping" on public.ping;
drop policy if exists "Allow insert on ping" on public.ping;

-- Allow SELECT for all (anon key or service role)
create policy "Allow read on ping"
    on public.ping
    for select
    using (true);

-- Allow UPDATE for all (anon key or service role)
create policy "Allow update on ping"
    on public.ping
    for update
    using (true)
    with check (true);

-- Allow INSERT in case table needs upsert
create policy "Allow insert on ping"
    on public.ping
    for insert
    with check (true);

