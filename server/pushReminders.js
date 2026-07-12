import { getAdminClient } from './supabaseAdmin.js'
import {
  countUncheckedTodos,
  getWeekIdAndDayIdxInTimeZone,
  isInNotifyWindow,
} from './pushTime.js'
import { formatTimeFromDb } from './pushAuth.js'
import { sendPushNotification } from './webPush.js'

function isAuthorizedCron(req) {
  const secret = process.env.CRON_SECRET?.trim()
  if (!secret) return process.env.NODE_ENV !== 'production'

  const auth = req.headers?.authorization || ''
  const headerSecret = req.headers?.['x-cron-secret']
  return auth === `Bearer ${secret}` || headerSecret === secret
}

export async function handlePushRemindersCron(req) {
  if (!isAuthorizedCron(req)) {
    return { status: 401, body: { error: 'unauthorized' } }
  }

  try {
    const admin = getAdminClient()
    const now = new Date()

    const { data: settingsRows, error: settingsError } = await admin
      .from('push_settings')
      .select('user_key, notify_time, timezone, last_notified_on')
      .eq('enabled', true)

    if (settingsError) throw settingsError

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

      if (row.last_notified_on === zoned.dateKey) {
        results.skipped += 1
        continue
      }

      results.matched += 1

      const { data: appData, error: appError } = await admin
        .from('app_data')
        .select('weekly_data')
        .eq('user_key', row.user_key)
        .maybeSingle()

      if (appError) {
        results.failed += 1
        continue
      }

      const { unchecked, total } = countUncheckedTodos(
        appData?.weekly_data || {},
        zoned.weekId,
        zoned.dayIdx,
      )

      if (unchecked <= 0) {
        results.skipped += 1
        continue
      }

      const { data: subscriptions, error: subError } = await admin
        .from('push_subscriptions')
        .select('id, endpoint, p256dh, auth')
        .eq('user_key', row.user_key)

      if (subError) {
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
            await admin.from('push_subscriptions').delete().eq('id', sub.id)
          } else {
            console.warn('[push-cron] send failed', row.user_key, error?.message || error)
          }
        }
      }

      if (delivered > 0) {
        results.sent += 1
        await admin
          .from('push_settings')
          .update({ last_notified_on: zoned.dateKey })
          .eq('user_key', row.user_key)
      } else {
        results.failed += 1
      }
    }

    return { status: 200, body: { ok: true, ...results } }
  } catch (error) {
    const message = error instanceof Error ? error.message : 'server error'
    return { status: 500, body: { error: message } }
  }
}
