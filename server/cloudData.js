import { createClient } from '@supabase/supabase-js'

const USER_KEY_RE = /^[a-zA-Z0-9가-힣_-]{3,32}$/

const DEFAULT_ANNUAL = { columns: [], weekData: {} }
const DEFAULT_WEEKLY = {}

export function normalizeUserKey(raw) {
  return String(raw ?? '')
    .trim()
    .toLowerCase()
}

export function isValidUserKey(userKey) {
  return USER_KEY_RE.test(userKey)
}

function getAdminClient() {
  const url = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!url || !key) {
    throw new Error(
      'SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set in environment',
    )
  }

  return createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  })
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

  const { error: dataError } = await supabase.from('app_data').insert({
    user_key: userKey,
    annual_data: DEFAULT_ANNUAL,
    weekly_data: DEFAULT_WEEKLY,
  })

  if (dataError) throw dataError
}

export async function loadAppData(userKey) {
  if (!isValidUserKey(userKey)) {
    return { status: 400, body: { error: 'invalid userKey' } }
  }

  await ensureProfile(userKey)
  const supabase = getAdminClient()

  const { data, error } = await supabase
    .from('app_data')
    .select('annual_data, weekly_data, updated_at')
    .eq('user_key', userKey)
    .single()

  if (error) {
    return { status: 500, body: { error: error.message } }
  }

  return { status: 200, body: { data } }
}

export async function saveAppData(userKey, payload = {}) {
  if (!isValidUserKey(userKey)) {
    return { status: 400, body: { error: 'invalid userKey' } }
  }

  await ensureProfile(userKey, payload.nickname)

  const patch = { user_key: userKey }
  if (payload.annual_data !== undefined) patch.annual_data = payload.annual_data
  if (payload.weekly_data !== undefined) patch.weekly_data = payload.weekly_data

  const supabase = getAdminClient()
  const { data, error } = await supabase
    .from('app_data')
    .upsert(patch)
    .select('annual_data, weekly_data, updated_at')
    .single()

  if (error) {
    return { status: 500, body: { error: error.message } }
  }

  return { status: 200, body: { data } }
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
    })
  }

  return { status: 405, body: { error: 'method not allowed' } }
}
