import {
  formatApiError,
  isMissingPushTableError,
  normalizeTimezone,
  parseNotifyTime,
  resolveAuthedProfile,
} from './pushAuth.js'
import {
  countPushSubscriptions,
  deletePushSubscriptions,
  disablePushSettings,
  hasPushDatabaseUrl,
  loadPushSettings,
  upsertPushSettings,
  upsertPushSubscription,
} from './pushDb.js'
import { getVapidPublicKey } from './webPush.js'

function pushTableMissingResponse() {
  return {
    status: 503,
    body: {
      error:
        '푸시 테이블을 찾을 수 없습니다. Supabase SQL Editor에서 add_push_notifications.sql 을 다시 실행한 뒤, 몇 분 후 재시도해 주세요.',
    },
  }
}

function failFromError(error) {
  const message = formatApiError(error)
  console.error('[push]', message, error)
  if (isMissingPushTableError(message)) return pushTableMissingResponse()
  return { status: 500, body: { error: message } }
}

const DEFAULT_SETTINGS = {
  enabled: false,
  notifyTime: '21:00',
  timezone: 'Asia/Seoul',
  hasSubscription: false,
}

function assertPushDbConfigured() {
  if (!hasPushDatabaseUrl()) {
    throw new Error(
      'POSTGRES_URL이 없습니다. Vercel에 POSTGRES_URL 또는 POSTGRES_URL_NON_POOLING을 설정해 주세요.',
    )
  }
}

export async function handlePushVapidPublicKey() {
  const publicKey = getVapidPublicKey()
  if (!publicKey) {
    return { status: 503, body: { error: 'VAPID public key not configured' } }
  }
  return { status: 200, body: { publicKey } }
}

export async function handlePushGetSettings(authHeader) {
  try {
    assertPushDbConfigured()
    const resolved = await resolveAuthedProfile(authHeader)
    if (resolved.error) return resolved.error

    const settings = await loadPushSettings(resolved.profile.user_key)
    return { status: 200, body: settings }
  } catch (error) {
    return failFromError(error)
  }
}

export async function handlePushUpdateSettings(authHeader, body) {
  try {
    assertPushDbConfigured()
    const resolved = await resolveAuthedProfile(authHeader)
    if (resolved.error) return resolved.error

    const notifyTime = parseNotifyTime(body?.notifyTime)
    if (body?.notifyTime != null && !notifyTime) {
      return { status: 400, body: { error: 'invalid notifyTime (HH:MM)' } }
    }

    const timezone = normalizeTimezone(body?.timezone)
    const enabled =
      typeof body?.enabled === 'boolean' ? body.enabled : undefined

    const current = await loadPushSettings(resolved.profile.user_key)
    const nextEnabled = enabled ?? current.enabled
    const nextNotifyTime = notifyTime || current.notifyTime

    if (nextEnabled) {
      const count = await countPushSubscriptions(resolved.profile.user_key)
      if (!count) {
        return {
          status: 400,
          body: { error: '알림을 켜려면 먼저 푸시 권한을 허용해 주세요.' },
        }
      }
    }

    await upsertPushSettings({
      userKey: resolved.profile.user_key,
      enabled: nextEnabled,
      notifyTime: nextNotifyTime,
      timezone,
    })

    const settings = await loadPushSettings(resolved.profile.user_key)
    return { status: 200, body: settings }
  } catch (error) {
    return failFromError(error)
  }
}

export async function handlePushSubscribe(authHeader, body) {
  try {
    assertPushDbConfigured()
    const resolved = await resolveAuthedProfile(authHeader)
    if (resolved.error) return resolved.error

    const subscription = body?.subscription
    const endpoint = subscription?.endpoint
    const p256dh = subscription?.keys?.p256dh
    const auth = subscription?.keys?.auth

    if (!endpoint || !p256dh || !auth) {
      return { status: 400, body: { error: 'invalid subscription' } }
    }

    const notifyTime = parseNotifyTime(body?.notifyTime) || '21:00'
    const timezone = normalizeTimezone(body?.timezone)

    await upsertPushSubscription({
      userKey: resolved.profile.user_key,
      endpoint,
      p256dh,
      auth,
    })

    await upsertPushSettings({
      userKey: resolved.profile.user_key,
      enabled: true,
      notifyTime,
      timezone,
    })

    const settings = await loadPushSettings(resolved.profile.user_key)
    return { status: 200, body: settings }
  } catch (error) {
    return failFromError(error)
  }
}

export async function handlePushUnsubscribe(authHeader, body) {
  try {
    assertPushDbConfigured()
    const resolved = await resolveAuthedProfile(authHeader)
    if (resolved.error) return resolved.error

    await deletePushSubscriptions(resolved.profile.user_key, body?.endpoint)

    const count = await countPushSubscriptions(resolved.profile.user_key)
    if (!count) {
      await disablePushSettings(resolved.profile.user_key)
    }

    const settings = await loadPushSettings(resolved.profile.user_key)
    return { status: 200, body: settings }
  } catch (error) {
    return failFromError(error)
  }
}

export { DEFAULT_SETTINGS }
