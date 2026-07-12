import { useEffect, useState } from 'react'
import { BellIcon } from './BellIcon.jsx'
import { HelpIcon } from './HelpIcon.jsx'
import { MailIcon } from './MailIcon.jsx'
import { ThemeIcon } from './ThemeIcon.jsx'
import { SUPPORT_EMAIL } from '../lib/supportContact.js'
import { GUEST_USER_KEY } from '../lib/userIdentity.js'
import { THEMES } from '../lib/theme.js'
import { useTheme } from '../context/ThemeContext.jsx'
import {
  DEFAULT_SETTINGS,
  disablePushNotifications,
  enablePushNotifications,
  fetchPushSettings,
  isLikelyIos,
  isStandaloneDisplay,
  isWebPushSupported,
  updatePushSettings,
} from '../lib/webPushClient.js'

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
  const [pushBusy, setPushBusy] = useState(false)
  const [pushError, setPushError] = useState('')
  const [pushSettings, setPushSettings] = useState(DEFAULT_SETTINGS)
  const [notifyTime, setNotifyTime] = useState(DEFAULT_SETTINGS.notifyTime)
  const { theme, setTheme } = useTheme()

  const isGuest = userKey === GUEST_USER_KEY
  const displayId = isGuest ? '체험 모드' : localOnly ? '로컬 저장' : userKey
  const displayNickname = isGuest ? '게스트' : localOnly ? '로컬 저장' : nickname || '—'
  const canUsePush = !isGuest && !localOnly
  const pushSupported = isWebPushSupported()
  const needsHomeScreen = isLikelyIos() && !isStandaloneDisplay()

  useEffect(() => {
    if (!canUsePush) return

    let cancelled = false
    ;(async () => {
      try {
        const settings = await fetchPushSettings()
        if (cancelled) return
        setPushSettings(settings)
        setNotifyTime(settings.notifyTime || DEFAULT_SETTINGS.notifyTime)
        setPushError('')
      } catch (err) {
        if (!cancelled) {
          setPushError(err instanceof Error ? err.message : '푸시 설정을 불러오지 못했습니다')
        }
      }
    })()

    return () => {
      cancelled = true
    }
  }, [canUsePush])

  const handleTogglePush = async () => {
    if (!canUsePush || pushBusy) return

    setPushBusy(true)
    setPushError('')
    try {
      if (pushSettings.enabled) {
        const settings = await disablePushNotifications()
        setPushSettings(settings)
      } else {
        const settings = await enablePushNotifications({ notifyTime })
        setPushSettings(settings)
        setNotifyTime(settings.notifyTime || notifyTime)
      }
    } catch (err) {
      setPushError(err instanceof Error ? err.message : '푸시 설정에 실패했습니다')
    } finally {
      setPushBusy(false)
    }
  }

  const handleSaveNotifyTime = async () => {
    if (!canUsePush || pushBusy) return
    if (!/^\d{2}:\d{2}$/.test(notifyTime)) {
      setPushError('알림 시간은 HH:MM 형식으로 입력해 주세요')
      return
    }

    setPushBusy(true)
    setPushError('')
    try {
      if (pushSettings.enabled) {
        const settings = await updatePushSettings({
          enabled: true,
          notifyTime,
        })
        setPushSettings(settings)
        setNotifyTime(settings.notifyTime || notifyTime)
      } else {
        const settings = await enablePushNotifications({ notifyTime })
        setPushSettings(settings)
        setNotifyTime(settings.notifyTime || notifyTime)
      }
    } catch (err) {
      setPushError(err instanceof Error ? err.message : '알림 시간 저장에 실패했습니다')
    } finally {
      setPushBusy(false)
    }
  }

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

        <div className="mt-4 rounded-2xl border border-planner-sand bg-white p-5 shadow-soft">
          <div className="flex items-start gap-3">
            <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-planner-sage-light text-planner-sage">
              <ThemeIcon className="size-4" />
            </span>
            <div className="min-w-0 flex-1">
              <h2 className="text-sm font-medium text-planner-ink">테마 설정</h2>
              <p className="mt-0.5 text-xs text-planner-ink-muted">
                앱 전체 색상을 변경합니다.
              </p>
            </div>
          </div>

          <div className="mt-4 grid grid-cols-2 gap-2">
            {Object.values(THEMES).map((option) => {
              const active = theme === option.id
              return (
                <button
                  key={option.id}
                  type="button"
                  onClick={() => setTheme(option.id)}
                  disabled={busy}
                  className={[
                    'rounded-xl border px-3 py-3 text-left transition',
                    active
                      ? 'border-planner-sage bg-planner-sage-light ring-2 ring-planner-sage/30'
                      : 'border-planner-sand bg-planner-cream/40 hover:bg-planner-warm',
                  ].join(' ')}
                >
                  <span className="block text-sm font-medium text-planner-ink">
                    {option.label}
                  </span>
                  <span className="mt-1 block text-xs text-planner-ink-muted">
                    {option.description}
                  </span>
                </button>
              )
            })}
          </div>
        </div>

        <div className="mt-4 rounded-2xl border border-planner-sand bg-white p-5 shadow-soft">
          <div className="flex items-start gap-3">
            <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-planner-sage-light text-planner-sage">
              <BellIcon className="size-4" />
            </span>
            <div className="min-w-0 flex-1">
              <h2 className="text-sm font-medium text-planner-ink">푸시 알림</h2>
              <p className="mt-0.5 text-xs text-planner-ink-muted">
                설정한 시간에 미체크 To do를 알려 주고, 알림을 누르면 위클리로 이동합니다.
              </p>
            </div>
          </div>

          {!canUsePush ? (
            <p className="mt-4 text-xs text-planner-ink-muted">
              클라우드 계정으로 로그인한 경우에만 푸시 알림을 사용할 수 있습니다.
            </p>
          ) : !pushSupported ? (
            <p className="mt-4 text-xs text-planner-ink-muted">
              이 브라우저는 웹 푸시를 지원하지 않습니다. Safari(아이폰은 홈 화면 앱) 또는
              Chrome에서 이용해 주세요.
            </p>
          ) : (
            <div className="mt-4 space-y-4">
              {needsHomeScreen && (
                <p className="rounded-xl bg-planner-warm px-3 py-2 text-xs text-planner-ink-muted">
                  아이폰에서는 Safari → 공유 → 홈 화면에 추가한 뒤, 홈 화면 아이콘으로 연
                  Focal에서만 푸시 알림이 동작합니다.
                </p>
              )}

              <label className="flex items-center justify-between gap-3">
                <span className="text-sm text-planner-ink">알림 받기</span>
                <button
                  type="button"
                  role="switch"
                  aria-checked={pushSettings.enabled}
                  disabled={pushBusy}
                  onClick={handleTogglePush}
                  className={[
                    'relative h-7 w-12 rounded-full transition',
                    pushSettings.enabled ? 'bg-planner-sage' : 'bg-planner-sand',
                    pushBusy ? 'opacity-50' : '',
                  ].join(' ')}
                >
                  <span
                    className={[
                      'absolute top-0.5 size-6 rounded-full bg-white shadow transition',
                      pushSettings.enabled ? 'left-5' : 'left-0.5',
                    ].join(' ')}
                  />
                </button>
              </label>

              <div>
                <label
                  htmlFor="push-notify-time"
                  className="block text-[11px] font-medium tracking-wide text-planner-ink-muted"
                >
                  알림 시간
                </label>
                <div className="mt-2 flex items-center gap-2">
                  <input
                    id="push-notify-time"
                    type="time"
                    value={notifyTime}
                    onChange={(event) => setNotifyTime(event.target.value)}
                    disabled={pushBusy}
                    className="rounded-xl border border-planner-sand bg-planner-cream/40 px-3 py-2 text-sm text-planner-ink outline-none focus:border-planner-sage"
                  />
                  <button
                    type="button"
                    onClick={handleSaveNotifyTime}
                    disabled={pushBusy}
                    className="rounded-xl border border-planner-sand bg-white px-3 py-2 text-sm font-medium text-planner-ink transition hover:bg-planner-warm disabled:opacity-50"
                  >
                    저장
                  </button>
                </div>
                <p className="mt-2 text-xs text-planner-ink-muted">
                  하루가 끝나기 전, 아직 체크하지 않은 할 일을 떠올리도록 시간을 맞춰 주세요.
                </p>
              </div>

              {pushSettings.enabled && pushSettings.hasSubscription && (
                <p className="text-xs text-planner-sage">이 기기에서 알림이 켜져 있습니다.</p>
              )}
            </div>
          )}

          {pushError && (
            <p className="mt-4 rounded-xl border border-planner-rose/30 bg-planner-rose-light px-3 py-2 text-xs text-planner-rose">
              {pushError}
            </p>
          )}
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
