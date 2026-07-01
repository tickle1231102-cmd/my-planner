import { getAdminClient } from './supabaseAdmin.js'
import {
  insertAppDataRow,
  isMissingOptionalColumnError,
  optionalColumnMigrationHint,
  selectAppDataRow,
  upsertAppDataRow,
} from '../src/lib/appDataDb.js'

const USER_KEY_RE = /^[a-zA-Z0-9가-힣_-]{3,32}$/

const DEFAULT_ANNUAL = { columns: [], weekData: {} }
const DEFAULT_WEEKLY = {}
const DEFAULT_HABIT = {}
const DEFAULT_MANDALA = { cells: [], keyword: '', resolution: '' }
const DEFAULT_MONTHLY = {}

export function normalizeUserKey(raw) {
  return String(raw ?? '')
    .trim()
    .toLowerCase()
}

export function isValidUserKey(userKey) {
  return USER_KEY_RE.test(userKey)
}

async function ensureProfile(userKey, nickname) {
  const supabase = getAdminClient()

  const { data: profile } = await supabase
    .from('profiles')
    .select('user_key')
    .eq('user_key', userKey)
    .maybeSingle()

  if (profile) return

  const { error: profileError } = await supabase.from('profiles').insert({
    user_key: userKey,
    nickname: nickname || userKey,
  })

  if (profileError) throw profileError

  await insertAppDataRow(supabase, {
    user_key: userKey,
    annual_data: DEFAULT_ANNUAL,
    weekly_data: DEFAULT_WEEKLY,
    habit_data: DEFAULT_HABIT,
    mandala_data: DEFAULT_MANDALA,
    monthly_data: DEFAULT_MONTHLY,
  })
}

export async function loadAppData(userKey) {
  if (!isValidUserKey(userKey)) {
    return { status: 400, body: { error: 'invalid userKey' } }
  }

  await ensureProfile(userKey)
  const supabase = getAdminClient()

  try {
    const data = await selectAppDataRow(supabase, userKey)
    return { status: 200, body: { data } }
  } catch (error) {
    const message = isMissingOptionalColumnError(error)
      ? optionalColumnMigrationHint(error)
      : error?.message || 'request failed'
    return { status: 500, body: { error: message } }
  }
}

export async function saveAppData(userKey, payload = {}) {
  if (!isValidUserKey(userKey)) {
    return { status: 400, body: { error: 'invalid userKey' } }
  }

  await ensureProfile(userKey, payload.nickname)

  const patch = { user_key: userKey }
  if (payload.annual_data !== undefined) patch.annual_data = payload.annual_data
  if (payload.weekly_data !== undefined) patch.weekly_data = payload.weekly_data
  if (payload.habit_data !== undefined) patch.habit_data = payload.habit_data
  if (payload.mandala_data !== undefined) patch.mandala_data = payload.mandala_data
  if (payload.monthly_data !== undefined) patch.monthly_data = payload.monthly_data

  const supabase = getAdminClient()

  try {
    const data = await upsertAppDataRow(supabase, patch)
    return { status: 200, body: { data } }
  } catch (error) {
    const message = isMissingOptionalColumnError(error)
      ? optionalColumnMigrationHint(error)
      : error?.message || 'request failed'
    return { status: 500, body: { error: message } }
  }
}

export async function handleDataRequest(method, url, body) {
  const userKey = normalizeUserKey(
    method === 'GET'
      ? new URL(url, 'http://local').searchParams.get('userKey')
      : body?.userKey,
  )

  if (method === 'GET') {
    return loadAppData(userKey)
  }

  if (method === 'POST') {
    return saveAppData(userKey, {
      nickname: body?.nickname,
      annual_data: body?.annual_data,
      weekly_data: body?.weekly_data,
      habit_data: body?.habit_data,
      mandala_data: body?.mandala_data,
      monthly_data: body?.monthly_data,
    })
  }

  return { status: 405, body: { error: 'method not allowed' } }
}
