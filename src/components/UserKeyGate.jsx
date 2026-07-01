import { useState } from 'react'
import { getPasswordHint, isValidPassword, MIN_PASSWORD_LENGTH } from '../lib/authAccount.js'
import { isValidUserKey } from '../lib/userIdentity.js'
import DbSetupHelp from './DbSetupHelp.jsx'

function getErrorMessage(err) {
  if (err instanceof Error) return err.message
  if (typeof err === 'string') return err
  return '연결에 실패했습니다'
}

export default function UserKeyGate({ onSignIn, onRegister, loading, error }) {
  const [mode, setMode] = useState('signIn')
  const [userKey, setUserKey] = useState('')
  const [nickname, setNickname] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [localError, setLocalError] = useState('')
  const [showDbHelp, setShowDbHelp] = useState(false)

  function switchMode(nextMode) {
    setMode(nextMode)
    setLocalError('')
    setShowDbHelp(false)
    setPassword('')
    setConfirmPassword('')
  }

  async function handleSubmit(e) {
    e.preventDefault()
    setLocalError('')
    setShowDbHelp(false)

    if (!isValidUserKey(userKey.trim())) {
      setLocalError('고유 ID는 3~32자 (한글·영문·숫자·-·_)만 사용할 수 있어요')
      return
    }

    if (!isValidPassword(password)) {
      setLocalError(getPasswordHint())
      return
    }

    if (mode === 'signUp' && password !== confirmPassword) {
      setLocalError('비밀번호가 일치하지 않습니다')
      return
    }

    try {
      if (mode === 'signIn') {
        await onSignIn(userKey, password)
      } else {
        await onRegister(userKey, password, nickname)
      }
    } catch (err) {
      const msg = getErrorMessage(err)
      setLocalError(msg)
      if (msg.includes('DB 테이블')) setShowDbHelp(true)
    }
  }

  const message = localError || error
  const needsDbSetup =
    showDbHelp || (message && message.includes('DB 테이블'))
  const isSignIn = mode === 'signIn'

  return (
    <div className="flex min-h-svh flex-col items-center justify-center bg-planner-cream px-4 py-8">
      <div className="w-full max-w-md rounded-2xl border border-planner-sand bg-white p-6 shadow-soft sm:p-8">
        <p className="text-center text-[10px] font-semibold tracking-[0.25em] text-planner-sage">
          MY PLANNER
        </p>
        <h1 className="mt-2 text-center text-xl font-medium text-planner-ink">
          {isSignIn ? '로그인' : '회원가입'}
        </h1>
        <p className="mt-3 text-center text-sm leading-relaxed text-planner-ink-muted">
          {isSignIn
            ? '고유 ID와 비밀번호로 플래너에 접속하세요.'
            : '새 ID와 비밀번호를 설정해 주세요.'}
        </p>

        <form onSubmit={handleSubmit} className="mt-6 space-y-3">
          <label className="block">
            <span className="mb-1 block text-xs font-medium text-planner-ink-muted">
              고유 ID
            </span>
            <input
              value={userKey}
              onChange={(e) => setUserKey(e.target.value)}
              placeholder="예: minji-8392"
              required
              autoComplete="username"
              className="w-full rounded-xl border border-planner-sand bg-planner-cream/40 px-4 py-3 text-sm text-planner-ink outline-none focus:border-planner-sage focus:ring-2 focus:ring-planner-sage/20"
            />
          </label>

          {!isSignIn && (
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
          )}

          <label className="block">
            <span className="mb-1 block text-xs font-medium text-planner-ink-muted">
              비밀번호
            </span>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder={`${MIN_PASSWORD_LENGTH}자 이상`}
              required
              autoComplete={isSignIn ? 'current-password' : 'new-password'}
              className="w-full rounded-xl border border-planner-sand bg-planner-cream/40 px-4 py-3 text-sm text-planner-ink outline-none focus:border-planner-sage focus:ring-2 focus:ring-planner-sage/20"
            />
          </label>

          {!isSignIn && (
            <label className="block">
              <span className="mb-1 block text-xs font-medium text-planner-ink-muted">
                비밀번호 확인
              </span>
              <input
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="비밀번호 다시 입력"
                required
                autoComplete="new-password"
                className="w-full rounded-xl border border-planner-sand bg-planner-cream/40 px-4 py-3 text-sm text-planner-ink outline-none focus:border-planner-sage focus:ring-2 focus:ring-planner-sage/20"
              />
            </label>
          )}

          {message && !needsDbSetup && (
            <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">
              {message}
            </p>
          )}

          {needsDbSetup && (
            <DbSetupHelp
              onRetry={async () => {
                setShowDbHelp(false)
                setLocalError('')
                try {
                  if (mode === 'signIn') {
                    await onSignIn(userKey, password)
                  } else {
                    await onRegister(userKey, password, nickname)
                  }
                } catch (err) {
                  const msg = getErrorMessage(err)
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
            {loading ? '처리 중…' : isSignIn ? '로그인' : '가입하기'}
          </button>

          <p className="text-center text-sm text-planner-ink-muted">
            {isSignIn ? (
              <>
                처음이신가요?{' '}
                <button
                  type="button"
                  onClick={() => switchMode('signUp')}
                  className="font-medium text-planner-sage underline-offset-2 hover:underline"
                >
                  회원가입
                </button>
              </>
            ) : (
              <>
                이미 계정이 있으신가요?{' '}
                <button
                  type="button"
                  onClick={() => switchMode('signIn')}
                  className="font-medium text-planner-sage underline-offset-2 hover:underline"
                >
                  로그인
                </button>
              </>
            )}
          </p>
        </form>
      </div>
    </div>
  )
}
