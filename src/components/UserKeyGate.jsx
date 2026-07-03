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
  signIn: '고유 ID와 비밀번호로 플래너에 접속하세요.',
  signUp: '새 ID와 비밀번호를 설정해 주세요.',
  findId: '가입 시 설정한 닉네임으로 고유 ID를 찾을 수 있습니다.',
  resetPassword: '고유 ID와 새 비밀번호를 입력해 비밀번호를 재설정하세요.',
}

export default function UserKeyGate({ onSignIn, onRegister, loading, error }) {
  const [mode, setMode] = useState('signIn')
  const [userKey, setUserKey] = useState('')
  const [nickname, setNickname] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [localError, setLocalError] = useState('')
  const [successMessage, setSuccessMessage] = useState('')
  const [foundUserKey, setFoundUserKey] = useState('')
  const [showDbHelp, setShowDbHelp] = useState(false)

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
        setSuccessMessage(`고유 ID: ${key}`)
      } catch (err) {
        setLocalError(getErrorMessage(err))
      }
      return
    }

    if (mode === 'resetPassword') {
      if (!isValidUserKey(userKey.trim())) {
        setLocalError('고유 ID는 3~32자 (한글·영문·숫자·-·_)만 사용할 수 있어요')
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
  const isSignUp = mode === 'signUp'
  const isRecovery = mode === 'findId' || mode === 'resetPassword'

  return (
    <div className="flex min-h-svh flex-col items-center justify-center bg-planner-cream px-4 py-8">
      <div className="w-full max-w-md rounded-2xl border border-planner-sand bg-white p-6 shadow-soft sm:p-8">
        <p className="text-center text-[10px] font-semibold tracking-[0.25em] text-planner-sage">
          MY PLANNER
        </p>
        <h1 className="mt-2 text-center text-xl font-medium text-planner-ink">
          {MODE_TITLES[mode]}
        </h1>
        <p className="mt-3 text-center text-sm leading-relaxed text-planner-ink-muted">
          {MODE_DESCRIPTIONS[mode]}
        </p>

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
              이 ID로 로그인하기
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
