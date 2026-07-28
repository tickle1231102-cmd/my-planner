-- Add AI goal plan data to app_data

alter table public.app_data
  add column if not exists goal_plan_data jsonb not null default '{}'::jsonb;

notify pgrst, 'reload schema';
