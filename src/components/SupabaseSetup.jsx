import { useCloudSync } from '../context/CloudSyncContext.jsx'

export default function SupabaseSetup({ onUseLocal }) {
  const { cloudEnabled } = useCloudSync()

  if (cloudEnabled) return null

  return (
    <div className="flex min-h-svh flex-col items-center justify-center bg-planner-cream px-4 py-8">
      <div className="w-full max-w-lg rounded-2xl border border-amber-200 bg-white p-6 shadow-soft sm:p-8">
        <p className="text-center text-[10px] font-semibold tracking-[0.25em] text-amber-600">
          SETUP REQUIRED
        </p>
        <h1 className="mt-2 text-center text-xl font-medium text-planner-ink">
          Supabase 연결 설정
        </h1>
        <p className="mt-3 text-center text-sm leading-relaxed text-planner-ink-muted">
          클라우드 동기화를 쓰려면 Supabase 키가 필요합니다.
          아래 순서대로 설정한 뒤 개발 서버를 재시작하세요.
        </p>

        <ol className="mt-5 space-y-3 text-sm text-planner-ink">
          <li className="rounded-xl bg-planner-cream/80 px-4 py-3">
            <strong>1.</strong> supabase.com 에서 프로젝트 생성
          </li>
          <li className="rounded-xl bg-planner-cream/80 px-4 py-3">
            <strong>2.</strong> SQL Editor에서{' '}
            <code className="text-xs">supabase/schema.sql</code> 실행
          </li>
          <li className="rounded-xl bg-planner-cream/80 px-4 py-3">
            <strong>3.</strong> Settings → API 에서 URL·anon key 복사
          </li>
          <li className="rounded-xl bg-planner-cream/80 px-4 py-3">
            <strong>4.</strong> 프로젝트 루트에{' '}
            <code className="text-xs">.env.local</code> 파일 생성:
            <pre className="mt-2 overflow-x-auto rounded-lg bg-[#2d2d2d] p-3 text-xs text-[#f8f8f2]">
{`VITE_SUPABASE_URL=https://xxxx.supabase.co
VITE_SUPABASE_ANON_KEY=sb_publishable_...`}
            </pre>
            <p className="mt-2 text-xs text-amber-700">
              Vite 프로젝트이므로 NEXT_PUBLIC_ 이 아닌 VITE_ 로 적어야 합니다.
            </p>
          </li>
          <li className="rounded-xl bg-planner-cream/80 px-4 py-3">
            <strong>5.</strong> 터미널에서 서버 재시작:{' '}
            <code className="text-xs">npm run dev</code>
          </li>
        </ol>

        <button
          type="button"
          onClick={onUseLocal}
          className="mt-6 w-full rounded-xl border border-planner-sand py-3 text-sm font-medium text-planner-ink-muted transition hover:bg-planner-cream"
        >
          설정 전 · 이 기기에만 저장 (로컬 모드)
        </button>
      </div>
    </div>
  )
}
