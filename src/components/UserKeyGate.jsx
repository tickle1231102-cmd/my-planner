import { useState } from 'react'
import { isValidUserKey } from '../lib/userIdentity.js'
import DbSetupHelp from './DbSetupHelp.jsx'

export default function UserKeyGate({ onLogin, loading, error }) {
  const [userKey, setUserKey] = useState('')
  const [nickname, setNickname] = useState('')
  const [localError, setLocalError] = useState('')
  const [showDbHelp, setShowDbHelp] = useState(false)

  async function handleSubmit(e) {
    e.preventDefault()
    setLocalError('')
    setShowDbHelp(false)

    if (!isValidUserKey(userKey.trim())) {
      setLocalError('고유 ID는 3~32자 (한글·영문·숫자·-·_)만 사용할 수 있어요')
      return
    }

    try {
      await onLogin(userKey, nickname)
    } catch (err) {
      const msg = err instanceof Error ? err.message : '연결 실패'
      setLocalError(msg)
      if (msg.includes('DB 테이블')) setShowDbHelp(true)
    }
  }

  const message = localError || error
  const needsDbSetup =
    showDbHelp || (message && message.includes('DB 테이블'))

  return (
    <div className="flex min-h-svh flex-col items-center justify-center bg-planner-cream px-4 py-8">
      <div className="w-full max-w-md rounded-2xl border border-planner-sand bg-white p-6 shadow-soft sm:p-8">
        <p className="text-center text-[10px] font-semibold tracking-[0.25em] text-planner-sage">
          MY PLANNER
        </p>
        <h1 className="mt-2 text-center text-xl font-medium text-planner-ink">
          데이터 연동
        </h1>
        <p className="mt-3 text-center text-sm leading-relaxed text-planner-ink-muted">
          고유 ID를 입력하면 휴대폰과 PC에서 같은 플래너를 볼 수 있어요.
          회원가입 없이 ID만 기억하면 됩니다.
        </p>

        <form onSubmit={handleSubmit} className="mt-6 space-y-3">
          <label className="block">
            <span className="mb-1 block text-xs font-medium text-planner-ink-muted">
              닉네임 (선택)
            </span>
            <input
              value={nickname}
              onChange={(e) => setNickname(e.target.value)}
              placeholder="예: 민지"
              className="w-full rounded-xl border border-planner-sand bg-planner-cream/40 px-4 py-3 text-sm text-planner-ink outline-none focus:border-planner-sage focus:ring-2 focus:ring-planner-sage/20"
            />
          </label>

          <label className="block">
            <span className="mb-1 block text-xs font-medium text-planner-ink-muted">
              고유 ID
            </span>
            <input
              value={userKey}
              onChange={(e) => setUserKey(e.target.value)}
              placeholder="예: minji-8392"
              required
              className="w-full rounded-xl border border-planner-sand bg-planner-cream/40 px-4 py-3 text-sm text-planner-ink outline-none focus:border-planner-sage focus:ring-2 focus:ring-planner-sage/20"
            />
          </label>

          <p className="text-xs leading-relaxed text-planner-ink-muted/80">
            다른 기기에서도 <strong className="font-medium">같은 ID</strong>를
            입력하세요. ID를 잊으면 데이터를 찾을 수 없어요.
          </p>

          {message && !needsDbSetup && (
            <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">
              {message}
            </p>
          )}

          {needsDbSetup && (
            <DbSetupHelp
              onRetry={async () => {
                if (!isValidUserKey(userKey.trim())) return
                setShowDbHelp(false)
                setLocalError('')
                try {
                  await onLogin(userKey, nickname)
                } catch (err) {
                  const msg = err instanceof Error ? err.message : '연결 실패'
                  setLocalError(msg)
                  if (msg.includes('DB 테이블')) setShowDbHelp(true)
                }
              }}
            />
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-xl bg-planner-sage py-3 text-sm font-semibold text-white transition hover:bg-planner-sage/90 disabled:opacity-60"
          >
            {loading ? '불러오는 중…' : '시작하기'}
          </button>
        </form>
      </div>
    </div>
  )
}
