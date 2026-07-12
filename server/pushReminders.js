import {
  countUncheckedTodos,
  getWeekIdAndDayIdxInTimeZone,
  isInNotifyWindow,
} from './pushTime.js'
import { formatApiError, formatTimeFromDb } from './pushAuth.js'
import {
  deletePushSubscriptionById,
  hasPushDatabaseUrl,
  listEnabledPushSettings,
  listPushSubscriptions,
  loadWeeklyData,
  markPushNotified,
} from './pushDb.js'
import { sendPushNotification } from './webPush.js'

function readHeader(req, name) {
  const value = req.headers?.[name] ?? req.headers?.[name.toLowerCase()]
  if (Array.isArray(value)) return String(value[0] || '').trim()
  return String(value || '').trim()
}

function authorizeCron(req) {
  const secret = process.env.CRON_SECRET?.trim()
  if (!secret) {
    return {
      ok: false,
      status: 503,
      body: {
        error: 'CRON_SECRET is not configured on Vercel',
        hint: 'Vercel → Settings → Environment Variables 에 CRON_SECRET 을 추가한 뒤 Redeploy 하세요.',
      },
    }
  }

  const auth = readHeader(req, 'authorization')
  const headerSecret = readHeader(req, 'x-cron-secret')
  const ok =
    auth === `Bearer ${secret}` ||
    auth === secret ||
    headerSecret === secret

  if (!ok) {
    return {
      ok: false,
      status: 401,
      body: {
        error: 'unauthorized',
        hint: 'cron-job.org 작업의 Request Headers 에 Name=Authorization, Value=Bearer <Vercel CRON_SECRET> 을 넣으세요. (Bearer 뒤 공백 1칸)',
      },
    }
  }

  return { ok: true }
}

export async function handlePushRemindersCron(req) {
  const auth = authorizeCron(req)
  if (!auth.ok) {
    return { status: auth.status, body: auth.body }
  }

  try {
    if (!hasPushDatabaseUrl()) {
      return {
        status: 503,
        body: {
          error:
            'POSTGRES_URL이 없습니다. Vercel에 POSTGRES_URL 또는 POSTGRES_URL_NON_POOLING을 설정해 주세요.',
        },
      }
    }

    const now = new Date()
    const settingsRows = await listEnabledPushSettings()

    const results = {
      checked: 0,
      matched: 0,
      sent: 0,
      skipped: 0,
      failed: 0,
    }

    for (const row of settingsRows || []) {
      results.checked += 1
      const timezone = row.timezone || 'Asia/Seoul'
      const notifyTime = formatTimeFromDb(row.notify_time)
      const zoned = getWeekIdAndDayIdxInTimeZone(timezone, now)

      if (!isInNotifyWindow(notifyTime, zoned.hour, zoned.minute, 15)) {
        results.skipped += 1
        continue
      }

      const lastNotified = row.last_notified_on
        ? String(row.last_notified_on).slice(0, 10)
        : null
      if (lastNotified === zoned.dateKey) {
        results.skipped += 1
        continue
      }

      results.matched += 1

      let weeklyData = {}
      try {
        weeklyData = await loadWeeklyData(row.user_key)
      } catch (error) {
        console.warn('[push-cron] weekly load failed', row.user_key, formatApiError(error))
        results.failed += 1
        continue
      }

      const { unchecked, total } = countUncheckedTodos(
        weeklyData,
        zoned.weekId,
        zoned.dayIdx,
      )

      if (unchecked <= 0) {
        results.skipped += 1
        continue
      }

      let subscriptions = []
      try {
        subscriptions = await listPushSubscriptions(row.user_key)
      } catch (error) {
        console.warn('[push-cron] subs load failed', row.user_key, formatApiError(error))
        results.failed += 1
        continue
      }

      if (!subscriptions?.length) {
        results.skipped += 1
        continue
      }

      const payload = {
        title: 'Focal',
        body:
          total === unchecked
            ? `오늘 할 일 ${unchecked}개가 아직 남아 있어요. 위클리를 확인해 보세요.`
            : `미완료 할 일 ${unchecked}개가 있어요. 하루가 끝나기 전에 확인해 보세요.`,
        url: '/?view=weekly',
        tag: `focal-daily-${zoned.dateKey}`,
      }

      let delivered = 0
      for (const sub of subscriptions) {
        try {
          await sendPushNotification(
            {
              endpoint: sub.endpoint,
              keys: { p256dh: sub.p256dh, auth: sub.auth },
            },
            payload,
          )
          delivered += 1
        } catch (error) {
          const statusCode = error?.statusCode || error?.status
          if (statusCode === 404 || statusCode === 410) {
            await deletePushSubscriptionById(sub.id)
          } else {
            console.warn('[push-cron] send failed', row.user_key, error?.message || error)
          }
        }
      }

      if (delivered > 0) {
        results.sent += 1
        await markPushNotified(row.user_key, zoned.dateKey)
      } else {
        results.failed += 1
      }
    }

    return { status: 200, body: { ok: true, ...results } }
  } catch (error) {
    const message = formatApiError(error)
    console.error('[push-cron]', message, error)
    return { status: 500, body: { error: message } }
  }
}
