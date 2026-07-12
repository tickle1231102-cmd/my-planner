import {
  formatTimeFromDb,
  normalizeTimezone,
  parseNotifyTime,
  resolveAuthedProfile,
} from './pushAuth.js'
import { getVapidPublicKey } from './webPush.js'

const DEFAULT_SETTINGS = {
  enabled: false,
  notifyTime: '21:00',
  timezone: 'Asia/Seoul',
  hasSubscription: false,
}

async function loadSettings(admin, userKey) {
  const [{ data: settings }, { data: subs, error: subError }] = await Promise.all([
    admin
      .from('push_settings')
      .select('enabled, notify_time, timezone, last_notified_on')
      .eq('user_key', userKey)
      .maybeSingle(),
    admin
      .from('push_subscriptions')
      .select('id')
      .eq('user_key', userKey)
      .limit(1),
  ])

  if (subError) throw subError

  return {
    enabled: Boolean(settings?.enabled),
    notifyTime: formatTimeFromDb(settings?.notify_time),
    timezone: settings?.timezone || 'Asia/Seoul',
    lastNotifiedOn: settings?.last_notified_on || null,
    hasSubscription: Boolean(subs?.length),
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
    const resolved = await resolveAuthedProfile(authHeader)
    if (resolved.error) return resolved.error

    const settings = await loadSettings(resolved.admin, resolved.profile.user_key)
    return { status: 200, body: settings }
  } catch (error) {
    const message = error instanceof Error ? error.message : 'server error'
    if (message.includes('push_settings') || message.includes('schema cache')) {
      return {
        status: 503,
        body: {
          error:
            '푸시 테이블이 없습니다. Supabase에서 supabase/migrations/add_push_notifications.sql 을 실행해 주세요.',
        },
      }
    }
    return { status: 500, body: { error: message } }
  }
}

export async function handlePushUpdateSettings(authHeader, body) {
  try {
    const resolved = await resolveAuthedProfile(authHeader)
    if (resolved.error) return resolved.error

    const notifyTime = parseNotifyTime(body?.notifyTime)
    if (body?.notifyTime != null && !notifyTime) {
      return { status: 400, body: { error: 'invalid notifyTime (HH:MM)' } }
    }

    const timezone = normalizeTimezone(body?.timezone)
    const enabled =
      typeof body?.enabled === 'boolean' ? body.enabled : undefined

    const current = await loadSettings(resolved.admin, resolved.profile.user_key)
    const next = {
      user_key: resolved.profile.user_key,
      enabled: enabled ?? current.enabled,
      notify_time: notifyTime || current.notifyTime,
      timezone,
    }

    if (next.enabled) {
      const { count, error: countError } = await resolved.admin
        .from('push_subscriptions')
        .select('id', { count: 'exact', head: true })
        .eq('user_key', resolved.profile.user_key)

      if (countError) throw countError
      if (!count) {
        return {
          status: 400,
          body: { error: '알림을 켜려면 먼저 푸시 권한을 허용해 주세요.' },
        }
      }
    }

    const { error } = await resolved.admin
      .from('push_settings')
      .upsert(next, { onConflict: 'user_key' })

    if (error) throw error

    const settings = await loadSettings(resolved.admin, resolved.profile.user_key)
    return { status: 200, body: settings }
  } catch (error) {
    const message = error instanceof Error ? error.message : 'server error'
    return { status: 500, body: { error: message } }
  }
}

export async function handlePushSubscribe(authHeader, body) {
  try {
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

    const { error: subError } = await resolved.admin.from('push_subscriptions').upsert(
      {
        user_key: resolved.profile.user_key,
        endpoint,
        p256dh,
        auth,
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'endpoint' },
    )

    if (subError) throw subError

    const { error: settingsError } = await resolved.admin.from('push_settings').upsert(
      {
        user_key: resolved.profile.user_key,
        enabled: true,
        notify_time: notifyTime,
        timezone,
      },
      { onConflict: 'user_key' },
    )

    if (settingsError) throw settingsError

    const settings = await loadSettings(resolved.admin, resolved.profile.user_key)
    return { status: 200, body: settings }
  } catch (error) {
    const message = error instanceof Error ? error.message : 'server error'
    return { status: 500, body: { error: message } }
  }
}

export async function handlePushUnsubscribe(authHeader, body) {
  try {
    const resolved = await resolveAuthedProfile(authHeader)
    if (resolved.error) return resolved.error

    const endpoint = body?.endpoint
    if (endpoint) {
      await resolved.admin
        .from('push_subscriptions')
        .delete()
        .eq('user_key', resolved.profile.user_key)
        .eq('endpoint', endpoint)
    } else {
      await resolved.admin
        .from('push_subscriptions')
        .delete()
        .eq('user_key', resolved.profile.user_key)
    }

    const { count } = await resolved.admin
      .from('push_subscriptions')
      .select('id', { count: 'exact', head: true })
      .eq('user_key', resolved.profile.user_key)

    if (!count) {
      await resolved.admin
        .from('push_settings')
        .upsert(
          {
            user_key: resolved.profile.user_key,
            enabled: false,
          },
          { onConflict: 'user_key' },
        )
    }

    const settings = await loadSettings(resolved.admin, resolved.profile.user_key)
    return { status: 200, body: settings }
  } catch (error) {
    const message = error instanceof Error ? error.message : 'server error'
    return { status: 500, body: { error: message } }
  }
}

export { DEFAULT_SETTINGS }
