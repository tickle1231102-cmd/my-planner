-- Add memory (my-memory) data to app_data

alter table public.app_data
  add column if not exists memory_data jsonb not null default '{}'::jsonb;

notify pgrst, 'reload schema';
