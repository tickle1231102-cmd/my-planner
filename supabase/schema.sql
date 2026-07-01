-- supabase/RUN_THIS.sql 와 동일 (SQL Editor에서 전체 실행)

create table if not exists public.profiles (
  id uuid primary key default gen_random_uuid(),
  user_key text unique not null,
  nickname text,
  created_at timestamptz not null default now()
);

create table if not exists public.app_data (
  user_key text primary key,
  annual_data jsonb not null default '{"columns":[],"weekData":{}}'::jsonb,
  weekly_data jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'app_data_user_key_fkey'
  ) then
    alter table public.app_data
      add constraint app_data_user_key_fkey
      foreign key (user_key) references public.profiles (user_key) on delete cascade;
  end if;
end $$;

create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists app_data_updated_at on public.app_data;
create trigger app_data_updated_at
before update on public.app_data
for each row execute function public.set_updated_at();

alter table public.profiles enable row level security;
alter table public.app_data enable row level security;

drop policy if exists "profiles_anon_select" on public.profiles;
drop policy if exists "profiles_anon_insert" on public.profiles;
drop policy if exists "app_data_anon_select" on public.app_data;
drop policy if exists "app_data_anon_insert" on public.app_data;
drop policy if exists "app_data_anon_update" on public.app_data;

create policy "profiles_anon_select" on public.profiles for select to anon using (true);
create policy "profiles_anon_insert" on public.profiles for insert to anon with check (true);
create policy "app_data_anon_select" on public.app_data for select to anon using (true);
create policy "app_data_anon_insert" on public.app_data for insert to anon with check (true);
create policy "app_data_anon_update" on public.app_data for update to anon using (true) with check (true);

grant usage on schema public to anon, authenticated;
grant all on public.profiles to anon, authenticated;
grant all on public.app_data to anon, authenticated;

notify pgrst, 'reload schema';
