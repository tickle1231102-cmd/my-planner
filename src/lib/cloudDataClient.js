import { getClient } from './supabaseBrowser.js'

const USER_KEY_RE = /^[a-zA-Z0-9가-힣_-]{3,32}$/

const DEFAULT_ANNUAL = { columns: [], weekData: {} }
const DEFAULT_WEEKLY = {}

function toUserMessage(error) {
  const code = error?.code || ''
  const message = error?.message || '연결에 실패했습니다'

  if (code === 'PGRST205' || message.includes('profiles')) {
    return 'DB 테이블이 없습니다. Supabase SQL Editor에서 supabase/schema.sql 을 실행해 주세요.'
  }
  if (code === '42501' || message.toLowerCase().includes('permission')) {
    return 'DB 권한이 없습니다. schema.sql 의 정책(policy) 부분을 다시 실행해 주세요.'
  }
  if (message.includes('JWT') || message.includes('apikey')) {
    return 'Supabase API 키가 올바르지 않습니다. .env.local 의 VITE_SUPABASE_ANON_KEY 를 확인해 주세요.'
  }

  return message
}

function wrapError(error) {
  const err = new Error(toUserMessage(error))
  err.cause = error
  return err
}

export function normalizeUserKey(raw) {
  return String(raw ?? '')
    .trim()
    .toLowerCase()
}

export function isValidUserKey(userKey) {
  return USER_KEY_RE.test(userKey)
}

async function ensureProfile(userKey, nickname) {
  const supabase = getClient()

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

  if (profileError) throw wrapError(profileError)

  const { error: dataError } = await supabase.from('app_data').insert({
    user_key: userKey,
    annual_data: DEFAULT_ANNUAL,
    weekly_data: DEFAULT_WEEKLY,
  })

  if (dataError) throw wrapError(dataError)
}

export async function loadAppData(userKey) {
  if (!isValidUserKey(userKey)) {
    throw new Error('고유 ID 형식이 올바르지 않습니다')
  }

  await ensureProfile(userKey)
  const supabase = getClient()

  const { data, error } = await supabase
    .from('app_data')
    .select('annual_data, weekly_data, updated_at')
    .eq('user_key', userKey)
    .single()

  if (error) throw wrapError(error)
  return data
}

export async function saveAppData(userKey, payload = {}) {
  if (!isValidUserKey(userKey)) {
    throw new Error('고유 ID 형식이 올바르지 않습니다')
  }

  await ensureProfile(userKey, payload.nickname)

  const patch = { user_key: userKey }
  if (payload.annual_data !== undefined) patch.annual_data = payload.annual_data
  if (payload.weekly_data !== undefined) patch.weekly_data = payload.weekly_data

  const supabase = getClient()
  const { data, error } = await supabase
    .from('app_data')
    .upsert(patch)
    .select('annual_data, weekly_data, updated_at')
    .single()

  if (error) throw wrapError(error)
  return data
}
