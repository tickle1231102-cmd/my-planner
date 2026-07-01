import { useState } from 'react'

const SETUP_SQL = `-- Supabase SQL Editor에 붙여넣고 Run
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

notify pgrst, 'reload schema';`

export default function DbSetupHelp({ onRetry }) {
  const [copied, setCopied] = useState(false)

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(SETUP_SQL)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      setCopied(false)
    }
  }

  return (
    <div className="mt-4 rounded-xl border border-amber-200 bg-amber-50 p-4 text-left">
      <p className="text-sm font-semibold text-amber-900">
        DB 테이블이 아직 없습니다
      </p>
      <ol className="mt-2 list-decimal space-y-1 pl-4 text-xs leading-relaxed text-amber-900/90">
        <li>
          Supabase 대시보드 → <strong>SQL Editor</strong> → New query
        </li>
        <li>아래 SQL 전체 복사 → 붙여넣기 → <strong>Run</strong></li>
        <li>
          왼쪽 <strong>Table Editor</strong>에서 profiles, app_data 표가 보이는지 확인
        </li>
        <li>이 페이지로 돌아와 <strong>다시 시도</strong> 클릭</li>
      </ol>

      <pre className="mt-3 max-h-40 overflow-auto rounded-lg bg-[#2d2d2d] p-3 text-[10px] leading-relaxed text-[#f8f8f2]">
        {SETUP_SQL}
      </pre>

      <div className="mt-3 flex gap-2">
        <button
          type="button"
          onClick={handleCopy}
          className="flex-1 rounded-lg border border-amber-300 bg-white py-2 text-xs font-medium text-amber-900"
        >
          {copied ? '복사됨!' : 'SQL 복사'}
        </button>
        {onRetry && (
          <button
            type="button"
            onClick={onRetry}
            className="flex-1 rounded-lg bg-planner-sage py-2 text-xs font-semibold text-white"
          >
            다시 시도
          </button>
        )}
      </div>
    </div>
  )
}
