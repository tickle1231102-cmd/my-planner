-- ID + password auth: link profiles to Supabase Auth users

alter table public.profiles
  add column if not exists auth_user_id uuid unique references auth.users (id) on delete cascade;

create index if not exists profiles_auth_user_id_idx on public.profiles (auth_user_id);

drop policy if exists "profiles_anon_select" on public.profiles;
drop policy if exists "profiles_anon_insert" on public.profiles;
drop policy if exists "app_data_anon_select" on public.app_data;
drop policy if exists "app_data_anon_insert" on public.app_data;
drop policy if exists "app_data_anon_update" on public.app_data;

drop policy if exists "profiles_select_own" on public.profiles;
drop policy if exists "profiles_update_own" on public.profiles;
drop policy if exists "app_data_select_own" on public.app_data;
drop policy if exists "app_data_insert_own" on public.app_data;
drop policy if exists "app_data_update_own" on public.app_data;

create policy "profiles_select_own" on public.profiles
  for select to authenticated
  using (auth_user_id = auth.uid());

create policy "profiles_update_own" on public.profiles
  for update to authenticated
  using (auth_user_id = auth.uid())
  with check (auth_user_id = auth.uid());

create policy "app_data_select_own" on public.app_data
  for select to authenticated
  using (
    exists (
      select 1
      from public.profiles p
      where p.user_key = app_data.user_key
        and p.auth_user_id = auth.uid()
    )
  );

create policy "app_data_insert_own" on public.app_data
  for insert to authenticated
  with check (
    exists (
      select 1
      from public.profiles p
      where p.user_key = app_data.user_key
        and p.auth_user_id = auth.uid()
    )
  );

create policy "app_data_update_own" on public.app_data
  for update to authenticated
  using (
    exists (
      select 1
      from public.profiles p
      where p.user_key = app_data.user_key
        and p.auth_user_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1
      from public.profiles p
      where p.user_key = app_data.user_key
        and p.auth_user_id = auth.uid()
    )
  );

create or replace function public.get_user_key_auth_status(p_user_key text)
returns text
language plpgsql
security definer
set search_path = public
as $$
begin
  if p_user_key is null or not (p_user_key ~ '^[a-zA-Z0-9가-힣_-]{3,32}$') then
    return 'invalid';
  end if;

  if not exists (select 1 from public.profiles where user_key = p_user_key) then
    return 'new';
  end if;

  if exists (
    select 1 from public.profiles
    where user_key = p_user_key and auth_user_id is null
  ) then
    return 'legacy';
  end if;

  return 'registered';
end;
$$;

create or replace function public.claim_profile(p_user_key text, p_nickname text default null)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
begin
  if v_uid is null then
    raise exception 'not authenticated';
  end if;

  if p_user_key is null or not (p_user_key ~ '^[a-zA-Z0-9가-힣_-]{3,32}$') then
    raise exception 'invalid user key';
  end if;

  update public.profiles
  set
    auth_user_id = v_uid,
    nickname = coalesce(nullif(trim(p_nickname), ''), nickname)
  where user_key = p_user_key and auth_user_id is null;

  if found then
    insert into public.app_data (user_key)
    select p_user_key
    where not exists (
      select 1 from public.app_data where user_key = p_user_key
    );
    return;
  end if;

  if exists (
    select 1 from public.profiles
    where user_key = p_user_key and auth_user_id = v_uid
  ) then
    if p_nickname is not null and trim(p_nickname) <> '' then
      update public.profiles
      set nickname = trim(p_nickname)
      where user_key = p_user_key and auth_user_id = v_uid;
    end if;
    return;
  end if;

  if exists (select 1 from public.profiles where user_key = p_user_key) then
    raise exception 'user key already claimed';
  end if;

  insert into public.profiles (user_key, nickname, auth_user_id)
  values (
    p_user_key,
    coalesce(nullif(trim(p_nickname), ''), p_user_key),
    v_uid
  );

  insert into public.app_data (user_key) values (p_user_key);
end;
$$;

revoke all on function public.get_user_key_auth_status(text) from public;
grant execute on function public.get_user_key_auth_status(text) to anon, authenticated;

revoke all on function public.claim_profile(text, text) from public;
grant execute on function public.claim_profile(text, text) to authenticated;

notify pgrst, 'reload schema';
