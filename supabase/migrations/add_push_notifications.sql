-- Push notification settings + Web Push subscriptions

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create table if not exists public.push_settings (
  user_key text primary key references public.profiles (user_key) on delete cascade,
  enabled boolean not null default false,
  notify_time time not null default '21:00',
  timezone text not null default 'Asia/Seoul',
  last_notified_on date,
  updated_at timestamptz not null default now()
);

create table if not exists public.push_subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_key text not null references public.profiles (user_key) on delete cascade,
  endpoint text not null unique,
  p256dh text not null,
  auth text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists push_subscriptions_user_key_idx
  on public.push_subscriptions (user_key);

create index if not exists push_settings_enabled_idx
  on public.push_settings (enabled)
  where enabled = true;

drop trigger if exists push_settings_updated_at on public.push_settings;
create trigger push_settings_updated_at
before update on public.push_settings
for each row execute function public.set_updated_at();

drop trigger if exists push_subscriptions_updated_at on public.push_subscriptions;
create trigger push_subscriptions_updated_at
before update on public.push_subscriptions
for each row execute function public.set_updated_at();

alter table public.push_settings enable row level security;
alter table public.push_subscriptions enable row level security;

-- Access is via service-role API after JWT verification (same pattern as auth routes).
-- No direct client policies needed beyond denying anon/authenticated table access by default.

grant all on public.push_settings to anon, authenticated, service_role;
grant all on public.push_subscriptions to anon, authenticated, service_role;

-- Force PostgREST to pick up the new tables (avoids PGRST205 schema cache errors).
select pg_notification_queue_usage();
notify pgrst, 'reload schema';
notify pgrst, 'reload tables';
