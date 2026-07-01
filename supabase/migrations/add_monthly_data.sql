-- Add monthly planner data to app_data

alter table public.app_data
  add column if not exists monthly_data jsonb not null default '{}'::jsonb;

notify pgrst, 'reload schema';
