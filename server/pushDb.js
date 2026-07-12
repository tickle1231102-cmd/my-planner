import postgres from 'postgres'
import { formatTimeFromDb } from './pushAuth.js'

function getDatabaseUrl() {
  return (
    process.env.POSTGRES_URL_NON_POOLING?.trim() ||
    process.env.POSTGRES_URL?.trim() ||
    process.env.DATABASE_URL?.trim() ||
    ''
  )
}

export function hasPushDatabaseUrl() {
  return Boolean(getDatabaseUrl())
}

async function withSql(run) {
  const url = getDatabaseUrl()
  if (!url) {
    throw new Error(
      'POSTGRES_URL이 없습니다. Vercel Environment Variables에 POSTGRES_URL(또는 POSTGRES_URL_NON_POOLING)이 있는지 확인해 주세요.',
    )
  }

  const sql = postgres(url, {
    max: 1,
    idle_timeout: 5,
    connect_timeout: 10,
    prepare: false,
    ssl: 'require',
  })

  try {
    return await run(sql)
  } finally {
    await sql.end({ timeout: 5 })
  }
}

function mapSettings(row, hasSubscription) {
  return {
    enabled: Boolean(row?.enabled),
    notifyTime: formatTimeFromDb(row?.notify_time),
    timezone: row?.timezone || 'Asia/Seoul',
    lastNotifiedOn: row?.last_notified_on
      ? String(row.last_notified_on).slice(0, 10)
      : null,
    hasSubscription: Boolean(hasSubscription),
  }
}

export async function loadPushSettings(userKey) {
  return withSql(async (sql) => {
    const [settingsRows, subRows] = await Promise.all([
      sql`
        select enabled, notify_time, timezone, last_notified_on
        from public.push_settings
        where user_key = ${userKey}
        limit 1
      `,
      sql`
        select id
        from public.push_subscriptions
        where user_key = ${userKey}
        limit 1
      `,
    ])

    return mapSettings(settingsRows[0], subRows.length > 0)
  })
}

export async function countPushSubscriptions(userKey) {
  return withSql(async (sql) => {
    const rows = await sql`
      select count(*)::int as count
      from public.push_subscriptions
      where user_key = ${userKey}
    `
    return Number(rows[0]?.count || 0)
  })
}

export async function upsertPushSettings({
  userKey,
  enabled,
  notifyTime,
  timezone,
}) {
  return withSql(async (sql) => {
    await sql`
      insert into public.push_settings (user_key, enabled, notify_time, timezone)
      values (
        ${userKey},
        ${Boolean(enabled)},
        ${notifyTime}::time,
        ${timezone}
      )
      on conflict (user_key) do update set
        enabled = excluded.enabled,
        notify_time = excluded.notify_time,
        timezone = excluded.timezone,
        updated_at = now()
    `
  })
}

export async function upsertPushSubscription({
  userKey,
  endpoint,
  p256dh,
  auth,
}) {
  return withSql(async (sql) => {
    await sql`
      insert into public.push_subscriptions (user_key, endpoint, p256dh, auth)
      values (${userKey}, ${endpoint}, ${p256dh}, ${auth})
      on conflict (endpoint) do update set
        user_key = excluded.user_key,
        p256dh = excluded.p256dh,
        auth = excluded.auth,
        updated_at = now()
    `
  })
}

export async function deletePushSubscriptions(userKey, endpoint) {
  return withSql(async (sql) => {
    if (endpoint) {
      await sql`
        delete from public.push_subscriptions
        where user_key = ${userKey}
          and endpoint = ${endpoint}
      `
      return
    }

    await sql`
      delete from public.push_subscriptions
      where user_key = ${userKey}
    `
  })
}

export async function disablePushSettings(userKey) {
  return withSql(async (sql) => {
    await sql`
      insert into public.push_settings (user_key, enabled)
      values (${userKey}, false)
      on conflict (user_key) do update set
        enabled = false,
        updated_at = now()
    `
  })
}

export async function listEnabledPushSettings() {
  return withSql(async (sql) => {
    return sql`
      select user_key, notify_time, timezone, last_notified_on
      from public.push_settings
      where enabled = true
    `
  })
}

export async function listPushSubscriptions(userKey) {
  return withSql(async (sql) => {
    return sql`
      select id, endpoint, p256dh, auth
      from public.push_subscriptions
      where user_key = ${userKey}
    `
  })
}

export async function deletePushSubscriptionById(id) {
  return withSql(async (sql) => {
    await sql`
      delete from public.push_subscriptions
      where id = ${id}::uuid
    `
  })
}

export async function markPushNotified(userKey, dateKey) {
  return withSql(async (sql) => {
    await sql`
      update public.push_settings
      set last_notified_on = ${dateKey}::date,
          updated_at = now()
      where user_key = ${userKey}
    `
  })
}

export async function loadWeeklyData(userKey) {
  return withSql(async (sql) => {
    const rows = await sql`
      select weekly_data
      from public.app_data
      where user_key = ${userKey}
      limit 1
    `
    return rows[0]?.weekly_data || {}
  })
}
