import { useState } from 'react'
import { HelpIcon } from './HelpIcon.jsx'
import { MailIcon } from './MailIcon.jsx'
import { SUPPORT_EMAIL } from '../lib/supportContact.js'
import { GUEST_USER_KEY } from '../lib/userIdentity.js'

function AccountLinkRow({ icon: Icon, label, description, href, onClick }) {
  const className =
    'flex w-full items-center gap-3 rounded-xl border border-planner-sand bg-white px-4 py-3 text-left transition hover:bg-planner-warm'

  const content = (
    <>
      <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-planner-sage-light text-planner-sage">
        <Icon className="size-4" />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block text-sm font-medium text-planner-ink">{label}</span>
        {description && (
          <span className="mt-0.5 block text-xs text-planner-ink-muted">{description}</span>
        )}
      </span>
      {href && (
        <span className="shrink-0 text-planner-ink-muted" aria-hidden>
          ↗
        </span>
      )}
    </>
  )

  if (href) {
    return (
      <a href={href} className={className}>
        {content}
      </a>
    )
  }

  return (
    <button type="button" onClick={onClick} className={className}>
      {content}
    </button>
  )
}

export default function AccountSettingsView({
  userKey,
  nickname,
  localOnly,
  syncing,
  onBack,
  onLogout,
  onDeleteAccount,
}) {
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [helpOpen, setHelpOpen] = useState(false)

  const isGuest = userKey === GUEST_USER_KEY
  const displayId = isGuest ? '체험 모드' : localOnly ? '로컬 저장' : userKey
  const displayNickname = isGuest ? '게스트' : localOnly ? '로컬 저장' : nickname || '—'

  const handleLogout = async () => {
    setBusy(true)
    setError('')
    try {
      await onLogout()
    } catch (err) {
      setError(err instanceof Error ? err.message : '로그아웃에 실패했습니다')
      setBusy(false)
    }
  }

  const handleDelete = async () => {
    const confirmed = window.confirm(
      '회원 탈퇴 시 모든 플래너 데이터가 삭제되며 복구할 수 없습니다.\n정말 탈퇴하시겠습니까?',
    )
    if (!confirmed) return

    setBusy(true)
    setError('')
    try {
      await onDeleteAccount()
    } catch (err) {
      setError(err instanceof Error ? err.message : '회원 탈퇴에 실패했습니다')
      setBusy(false)
    }
  }

  return (
    <div className="flex h-full flex-col bg-planner-cream">
      <div className="flex shrink-0 items-center gap-3 border-b border-planner-sand bg-white px-4 py-3">
        <button
          type="button"
          onClick={onBack}
          disabled={busy}
          className="rounded-lg px-2 py-1 text-sm text-planner-sage transition hover:bg-planner-sage-light disabled:opacity-50"
        >
          ← 뒤로
        </button>
        <h1 className="text-lg font-medium text-planner-ink">회원 정보</h1>
      </div>

      <div className="mx-auto flex w-full max-w-lg flex-1 flex-col px-4 py-6">
        <div className="rounded-2xl border border-planner-sand bg-white p-5 shadow-soft">
          <dl className="space-y-4">
            <div>
              <dt className="text-[11px] font-medium tracking-wide text-planner-ink-muted">
                닉네임
              </dt>
              <dd className="mt-1 text-base font-medium text-planner-ink">{displayNickname}</dd>
            </div>
            <div>
              <dt className="text-[11px] font-medium tracking-wide text-planner-ink-muted">ID</dt>
              <dd className="mt-1 break-all text-base font-medium text-planner-ink">{displayId}</dd>
            </div>
            <div>
              <dt className="text-[11px] font-medium tracking-wide text-planner-ink-muted">
                저장 방식
              </dt>
              <dd className="mt-1 text-sm text-planner-ink">
                {isGuest
                  ? '체험 모드 · 이 기기에만 저장'
                  : localOnly
                    ? '이 기기에만 저장'
                    : syncing
                      ? '클라우드 동기화 중…'
                      : '클라우드 동기화'}
              </dd>
            </div>
          </dl>
        </div>

        <div className="mt-4 space-y-2">
          <AccountLinkRow
            icon={HelpIcon}
            label="Help"
            description={helpOpen ? '도움말 내용은 곧 추가될 예정입니다.' : '도움말 및 안내'}
            onClick={() => setHelpOpen((open) => !open)}
          />
          <AccountLinkRow
            icon={MailIcon}
            label="Contact"
            description={SUPPORT_EMAIL}
            href={`mailto:${SUPPORT_EMAIL}`}
          />
        </div>

        {error && (
          <p className="mt-4 rounded-xl border border-planner-rose/30 bg-planner-rose-light px-4 py-3 text-sm text-planner-rose">
            {error}
          </p>
        )}

        <div className="mt-auto space-y-2 pt-8">
          <button
            type="button"
            onClick={handleLogout}
            disabled={busy}
            className="w-full rounded-xl border border-planner-sand bg-white px-4 py-3 text-sm font-medium text-planner-ink transition hover:bg-planner-warm disabled:opacity-50"
          >
            {isGuest || localOnly ? '로그인 화면으로' : '로그아웃'}
          </button>
          {!localOnly && (
            <button
              type="button"
              onClick={handleDelete}
              disabled={busy}
              className="w-full rounded-xl border border-planner-rose/30 bg-white px-4 py-3 text-sm font-medium text-planner-rose transition hover:bg-planner-rose-light disabled:opacity-50"
            >
              회원 탈퇴
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
