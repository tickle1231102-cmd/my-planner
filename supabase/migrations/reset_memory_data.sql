-- Reset all My Memory data (clears test memos shared across accounts)

update public.app_data
set memory_data = '{}'::jsonb,
    updated_at = now()
where memory_data is distinct from '{}'::jsonb;

notify pgrst, 'reload schema';
