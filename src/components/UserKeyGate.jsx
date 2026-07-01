import { useState } from 'react'
import { getPasswordHint, isValidPassword, MIN_PASSWORD_LENGTH } from '../lib/authAccount.js'
import { isValidUserKey } from '../lib/userIdentity.js'
import DbSetupHelp from './DbSetupHelp.jsx'

const STEP_COPY = {
  signIn: {
    title: '로그인',
    description: '비밀번호를 입력해 주세요.',
    submit: '로그인',
  },
  signUp: {
    title: '회원가입',
    description: '사용할 비밀번호를 설정해 주세요.',
    submit: '가입하기',
  },
  legacy: {
    title: '비밀번호 설정',
    description:
      '기존 ID로 저장된 데이터가 있습니다. 계속 쓰려면 비밀번호를 설정해 주세요.',
    submit: '비밀번호 설정',
  },
}

export default function UserKeyGate({
  onCheckStatus,
  onSignIn,
  onRegister,
  onSetLegacyPassword,
  loading,
  error,
}) {
  const [userKey, setUserKey] = useState('')
  const [nickname, setNickname] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [step, setStep] = useState('id')
  const [localError, setLocalError] = useState('')
  const [showDbHelp, setShowDbHelp] = useState(false)

  function resetPasswordFields() {
    setPassword('')
    setConfirmPassword('')
  }

  function handleBack() {
    setStep('id')
    setLocalError('')
    resetPasswordFields()
  }

  async function handleContinue() {
    setLocalError('')
    setShowDbHelp(false)

    if (!isValidUserKey(userKey.trim())) {
      setLocalError('고유 ID는 3~32자 (한글·영문·숫자·-·_)만 사용할 수 있어요')
      return
    }

    try {
      const status = await onCheckStatus(userKey)
      resetPasswordFields()

      if (status === 'registered') {
        setStep('signIn')
        return
      }
      if (status === 'legacy') {
        setStep('legacy')
        return
      }
      if (status === 'new') {
        setStep('signUp')
        return
      }

      setLocalError('고유 ID 형식이 올바르지 않습니다')
    } catch (err) {
      const msg = err instanceof Error ? err.message : '연결 실패'
      setLocalError(msg)
      if (msg.includes('DB 테이블')) setShowDbHelp(true)
    }
  }

  async function handleSubmit(e) {
    e.preventDefault()
    setLocalError('')
    setShowDbHelp(false)

    if (step === 'id') {
      await handleContinue()
      return
    }

    if (!isValidPassword(password)) {
      setLocalError(getPasswordHint())
      return
    }

    if (step !== 'signIn' && password !== confirmPassword) {
      setLocalError('비밀번호가 일치하지 않습니다')
      return
    }

    try {
      if (step === 'signIn') {
        await onSignIn(userKey, password)
        return
      }
      if (step === 'signUp') {
        await onRegister(userKey, password, nickname)
        return
      }
      if (step === 'legacy') {
        await onSetLegacyPassword(userKey, password, nickname)
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : '연결 실패'
      setLocalError(msg)
      if (msg.includes('DB 테이블')) setShowDbHelp(true)
    }
  }

  const message = localError || error
  const needsDbSetup =
    showDbHelp || (message && message.includes('DB 테이블'))
  const stepCopy = STEP_COPY[step]
  const showNickname = step === 'signUp' || step === 'legacy'
  const showConfirmPassword = step === 'signUp' || step === 'legacy'

  return (
    <div className="flex min-h-svh flex-col items-center justify-center bg-planner-cream px-4 py-8">
      <div className="w-full max-w-md rounded-2xl border border-planner-sand bg-white p-6 shadow-soft sm:p-8">
        <p className="text-center text-[10px] font-semibold tracking-[0.25em] text-planner-sage">
          MY PLANNER
        </p>
        <h1 className="mt-2 text-center text-xl font-medium text-planner-ink">
          {step === 'id' ? '데이터 연동' : stepCopy?.title}
        </h1>
        <p className="mt-3 text-center text-sm leading-relaxed text-planner-ink-muted">
          {step === 'id'
            ? '고유 ID와 비밀번호로 휴대폰과 PC에서 같은 플래너를 안전하게 사용할 수 있어요.'
            : stepCopy?.description}
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
              readOnly={step !== 'id'}
              className={[
                'w-full rounded-xl border border-planner-sand bg-planner-cream/40 px-4 py-3 text-sm text-planner-ink outline-none focus:border-planner-sage focus:ring-2 focus:ring-planner-sage/20',
                step !== 'id' ? 'cursor-default opacity-80' : '',
              ].join(' ')}
            />
          </label>

          {showNickname && (
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

          {step !== 'id' && (
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
                autoComplete={step === 'signIn' ? 'current-password' : 'new-password'}
                className="w-full rounded-xl border border-planner-sand bg-planner-cream/40 px-4 py-3 text-sm text-planner-ink outline-none focus:border-planner-sage focus:ring-2 focus:ring-planner-sage/20"
              />
            </label>
          )}

          {showConfirmPassword && (
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

          {step === 'id' && (
            <p className="text-xs leading-relaxed text-planner-ink-muted/80">
              기존에 ID만 쓰던 경우, 같은 ID로 들어가면 비밀번호 설정 화면이
              나옵니다.
            </p>
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
                if (step === 'id') {
                  await handleContinue()
                  return
                }
                try {
                  if (step === 'signIn') await onSignIn(userKey, password)
                  else if (step === 'signUp') {
                    await onRegister(userKey, password, nickname)
                  } else if (step === 'legacy') {
                    await onSetLegacyPassword(userKey, password, nickname)
                  }
                } catch (err) {
                  const msg = err instanceof Error ? err.message : '연결 실패'
                  setLocalError(msg)
                  if (msg.includes('DB 테이블')) setShowDbHelp(true)
                }
              }}
            />
          )}

          <div className="flex gap-2">
            {step !== 'id' && (
              <button
                type="button"
                onClick={handleBack}
                disabled={loading}
                className="w-24 rounded-xl border border-planner-sand py-3 text-sm font-medium text-planner-ink-muted transition hover:bg-planner-warm disabled:opacity-60"
              >
                뒤로
              </button>
            )}
            <button
              type="submit"
              disabled={loading}
              className="flex-1 rounded-xl bg-planner-sage py-3 text-sm font-semibold text-white transition hover:bg-planner-sage/90 disabled:opacity-60"
            >
              {loading
                ? '처리 중…'
                : step === 'id'
                  ? '다음'
                  : stepCopy?.submit}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
