-- Add mandala chart data to app_data (run in Supabase SQL Editor if not using CLI migrate)

alter table public.app_data
  add column if not exists mandala_data jsonb not null default '{"cells":[],"keyword":"","resolution":""}'::jsonb;

notify pgrst, 'reload schema';
