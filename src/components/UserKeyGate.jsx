import { useState } from 'react'
import {
  getPasswordHint,
  isValidPassword,
  lookupUserKeyByNickname,
  MIN_PASSWORD_LENGTH,
  resetPasswordForUserKey,
} from '../lib/authAccount.js'
import { SUPPORT_EMAIL } from '../lib/supportContact.js'
import { isValidUserKey } from '../lib/userIdentity.js'
import DbSetupHelp from './DbSetupHelp.jsx'

function getErrorMessage(err) {
  if (err instanceof Error) return err.message
  if (typeof err === 'string') return err
  return '연결에 실패했습니다'
}

const MODE_TITLES = {
  signIn: '로그인',
  signUp: '회원가입',
  findId: 'ID 찾기',
  resetPassword: '비밀번호 찾기',
}

const MODE_DESCRIPTIONS = {
  signIn: '',
  signUp: '새 아이디와 비밀번호를 설정해 주세요.',
  findId: '가입 시 설정한 닉네임으로 아이디를 찾을 수 있습니다.',
  resetPassword: '아이디와 새 비밀번호를 입력해 비밀번호를 재설정하세요.',
}

export default function UserKeyGate({
  onSignIn,
  onGoogleSignIn,
  onRegister,
  onBrowseAsGuest,
  loading,
  error,
}) {
  const [mode, setMode] = useState(() => {
    if (new URLSearchParams(window.location.search).get('signup') === '1') {
      return 'signUp'
    }
    return 'signIn'
  })
  const [userKey, setUserKey] = useState('')
  const [nickname, setNickname] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [localError, setLocalError] = useState('')
  const [successMessage, setSuccessMessage] = useState('')
  const [foundUserKey, setFoundUserKey] = useState('')
  const [showDbHelp, setShowDbHelp] = useState(false)

  function handleBrowseAsGuest() {
    window.alert(
      '게스트 데이터는 이 기기에만 저장됩니다. 회원가입시, 모든 기기에서 데이터를 연동할 수 있습니다.',
    )
    onBrowseAsGuest()
  }

  function switchMode(nextMode) {
    setMode(nextMode)
    setLocalError('')
    setSuccessMessage('')
    setFoundUserKey('')
    setShowDbHelp(false)
    if (nextMode !== 'resetPassword') {
      setPassword('')
      setConfirmPassword('')
    }
    if (nextMode === 'findId') {
      setNickname('')
    }
  }

  async function handleSubmit(e) {
    e.preventDefault()
    setLocalError('')
    setSuccessMessage('')
    setFoundUserKey('')
    setShowDbHelp(false)

    if (mode === 'findId') {
      try {
        const key = await lookupUserKeyByNickname(nickname)
        setFoundUserKey(key)
        setSuccessMessage(`아이디: ${key}`)
      } catch (err) {
        setLocalError(getErrorMessage(err))
      }
      return
    }

    if (mode === 'resetPassword') {
      if (!isValidUserKey(userKey.trim())) {
        setLocalError('아이디는 3~32자 (한글·영문·숫자·-·_)만 사용할 수 있어요')
        return
      }
      if (!isValidPassword(password)) {
        setLocalError(getPasswordHint())
        return
      }
      if (password !== confirmPassword) {
        setLocalError('비밀번호가 일치하지 않습니다')
        return
      }

      try {
        await resetPasswordForUserKey(userKey, password)
        setSuccessMessage('비밀번호가 변경되었습니다. 새 비밀번호로 로그인해 주세요.')
        setPassword('')
        setConfirmPassword('')
        setMode('signIn')
      } catch (err) {
        setLocalError(getErrorMessage(err))
      }
      return
    }

    if (!isValidUserKey(userKey.trim())) {
      setLocalError('아이디는 3~32자 (한글·영문·숫자·-·_)만 사용할 수 있어요')
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

  async function handleGoogleSignIn() {
    setLocalError('')

    try {
      await onGoogleSignIn()
    } catch (err) {
      setLocalError(getErrorMessage(err))
    }
  }

  const message = localError || error
  const needsDbSetup =
    showDbHelp || (message && message.includes('DB 테이블'))
  const isSignIn = mode === 'signIn'
  const isSignUp = mode === 'signUp'
  const isRecovery = mode === 'findId' || mode === 'resetPassword'

  return (
    <div className="flex min-h-svh flex-col items-center justify-center bg-planner-cream px-4 py-8">
      <div className="w-full max-w-md rounded-2xl border border-planner-sand bg-white p-6 shadow-soft sm:p-8">
        <h1 className="text-center text-xl font-medium tracking-tight text-planner-ink">
          FOCAL: 인생의 중심을 맞추다
        </h1>
        {!isSignIn && (
          <p className="mt-2 text-center text-sm font-medium text-planner-ink-muted">
            {MODE_TITLES[mode]}
          </p>
        )}
        {MODE_DESCRIPTIONS[mode] ? (
          <p className="mt-3 text-center text-sm leading-relaxed text-planner-ink-muted">
            {MODE_DESCRIPTIONS[mode]}
          </p>
        ) : null}

        <form onSubmit={handleSubmit} className="mt-6 space-y-3">
          {mode === 'findId' && (
            <label className="block">
              <span className="mb-1 block text-xs font-medium text-planner-ink-muted">
                닉네임
              </span>
              <input
                value={nickname}
                onChange={(e) => setNickname(e.target.value)}
                placeholder="가입 시 설정한 닉네임"
                required
                autoComplete="nickname"
                className="w-full rounded-xl border border-planner-sand bg-planner-cream/40 px-4 py-3 text-sm text-planner-ink outline-none focus:border-planner-sage focus:ring-2 focus:ring-planner-sage/20"
              />
            </label>
          )}

          {mode !== 'findId' && (
            <label className="block">
              <span className="mb-1 block text-xs font-medium text-planner-ink-muted">
                아이디
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
          )}

          {isSignUp && (
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

          {mode !== 'findId' && (
            <label className="block">
              <span className="mb-1 block text-xs font-medium text-planner-ink-muted">
                {mode === 'resetPassword' ? '새 비밀번호' : '비밀번호'}
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
          )}

          {(isSignUp || mode === 'resetPassword') && (
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

          {successMessage && (
            <p className="rounded-lg bg-planner-sage-light px-3 py-2 text-sm text-planner-sage">
              {successMessage}
            </p>
          )}

          {foundUserKey && mode === 'findId' && (
            <button
              type="button"
              onClick={() => {
                setUserKey(foundUserKey)
                switchMode('signIn')
              }}
              className="w-full rounded-xl border border-planner-sage/30 bg-planner-sage-light px-4 py-2.5 text-sm font-medium text-planner-sage transition hover:bg-planner-sage-light/80"
            >
              이 아이디로 로그인하기
            </button>
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
                  } else if (mode === 'signUp') {
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
            {loading
              ? '처리 중…'
              : mode === 'findId'
                ? 'ID 찾기'
                : mode === 'resetPassword'
                  ? '비밀번호 재설정'
                  : isSignIn
                    ? '로그인'
                    : '가입하기'}
          </button>

          {isSignIn && onGoogleSignIn && (
            <>
              <div className="relative py-1">
                <div className="absolute inset-0 flex items-center" aria-hidden>
                  <div className="w-full border-t border-planner-sand" />
                </div>
                <div className="relative flex justify-center text-xs">
                  <span className="bg-white px-2 text-planner-ink-muted">또는</span>
                </div>
              </div>
              <button
                type="button"
                onClick={handleGoogleSignIn}
                disabled={loading}
                className="flex w-full items-center justify-center gap-3 rounded-xl border border-planner-sand py-3 text-sm font-medium text-planner-ink transition hover:bg-planner-cream disabled:opacity-60"
              >
                <svg
                  aria-hidden="true"
                  className="h-4 w-4"
                  viewBox="0 0 24 24"
                >
                  <path
                    fill="#4285F4"
                    d="M21.6 12.23c0-.71-.06-1.4-.18-2.07H12v3.92h5.38a4.6 4.6 0 0 1-2 3.02v2.54h3.24c1.9-1.75 2.98-4.33 2.98-7.41Z"
                  />
                  <path
                    fill="#34A853"
                    d="M12 22c2.7 0 4.98-.9 6.63-2.43l-3.24-2.54c-.9.6-2.05.96-3.39.96-2.61 0-4.82-1.76-5.61-4.13H3.04v2.62A10 10 0 0 0 12 22Z"
                  />
                  <path
                    fill="#FBBC05"
                    d="M6.39 13.86a6.01 6.01 0 0 1 0-3.72V7.52H3.04a10 10 0 0 0 0 8.96l3.35-2.62Z"
                  />
                  <path
                    fill="#EA4335"
                    d="M12 6.01c1.47 0 2.79.51 3.83 1.5l2.87-2.88A9.64 9.64 0 0 0 12 2a10 10 0 0 0-8.96 5.52l3.35 2.62C7.18 7.77 9.39 6.01 12 6.01Z"
                  />
                </svg>
                Google로 계속하기
              </button>
            </>
          )}

          {isSignIn && onBrowseAsGuest && (
            <button
              type="button"
              onClick={handleBrowseAsGuest}
              disabled={loading}
              className="w-full rounded-xl border border-planner-sand py-3 text-sm font-medium text-planner-ink transition hover:bg-planner-cream disabled:opacity-60"
            >
              게스트로 둘러보기
            </button>
          )}

          {isSignIn && (
            <div className="flex items-center justify-center gap-2 text-xs text-planner-ink-muted">
              <button
                type="button"
                onClick={() => switchMode('findId')}
                className="font-medium text-planner-sage underline-offset-2 hover:underline"
              >
                ID 찾기
              </button>
              <span aria-hidden>|</span>
              <button
                type="button"
                onClick={() => switchMode('resetPassword')}
                className="font-medium text-planner-sage underline-offset-2 hover:underline"
              >
                비밀번호 찾기
              </button>
            </div>
          )}

          <p className="text-center text-sm text-planner-ink-muted">
            {isRecovery ? (
              <>
                <button
                  type="button"
                  onClick={() => switchMode('signIn')}
                  className="font-medium text-planner-sage underline-offset-2 hover:underline"
                >
                  로그인으로 돌아가기
                </button>
                {mode === 'findId' && (
                  <>
                    {' '}
                    · 문의:{' '}
                    <a
                      href={`mailto:${SUPPORT_EMAIL}`}
                      className="font-medium text-planner-sage underline-offset-2 hover:underline"
                    >
                      {SUPPORT_EMAIL}
                    </a>
                  </>
                )}
              </>
            ) : isSignIn ? (
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
