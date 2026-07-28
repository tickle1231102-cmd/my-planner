-- Fix UNRESTRICTED tables from goal-decomposer (Prisma).
-- Supabase shows "UNRESTRICTED" when RLS is disabled — the Data API can
-- read/write these tables with the anon key. Enable RLS so they are locked
-- down unless a policy explicitly allows access.
--
-- Focal AI Plan does NOT use these tables (it stores in app_data.goal_plan_data).
-- Prisma / direct Postgres connections still work (they bypass RLS).
--
-- Run in Supabase SQL Editor:
-- https://supabase.com/dashboard/project/nnulpjepaearokjujbis/sql/new

alter table if exists public."Goal" enable row level security;
alter table if exists public."YearlyPlan" enable row level security;
alter table if exists public."MonthlyPlan" enable row level security;
alter table if exists public."WeeklyPlan" enable row level security;
alter table if exists public."DailyTask" enable row level security;
alter table if exists public._prisma_migrations enable row level security;

-- No policies on purpose: anon/authenticated cannot access via PostgREST.
-- Add policies later only if a client needs API access to these tables.

notify pgrst, 'reload schema';
