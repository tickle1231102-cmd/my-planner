import { getAuthenticatedProfile } from './authAccount.js'
import { getClient } from './supabaseBrowser.js'
import { isValidUserKey, normalizeUserKey } from './userIdentity.js'
import {
  isMissingOptionalColumnError,
  optionalColumnMigrationHint,
  selectAppDataRow,
  upsertAppDataRow,
} from './appDataDb.js'

function toUserMessage(error) {
  const code = error?.code || ''
  const message = error?.message || '연결에 실패했습니다'

  if (isMissingOptionalColumnError(error)) {
    return optionalColumnMigrationHint(error) || message
  }
  if (code === 'PGRST205' || message.includes('profiles')) {
    return 'DB 테이블이 없습니다. Supabase SQL Editor에서 supabase/schema.sql 을 실행해 주세요.'
  }
  if (code === '42501' || message.toLowerCase().includes('permission')) {
    return 'DB 권한이 없습니다. schema.sql 의 정책(policy) 부분을 다시 실행해 주세요.'
  }
  if (message.includes('JWT') || message.includes('apikey')) {
    return 'Supabase API 키가 올바르지 않습니다. .env.local 의 VITE_SUPABASE_ANON_KEY 를 확인해 주세요.'
  }
  if (message.includes('로그인')) {
    return message
  }

  return message
}

function wrapError(error) {
  const err = new Error(toUserMessage(error))
  err.cause = error
  return err
}

async function requireProfile() {
  const profile = await getAuthenticatedProfile()
  if (!profile?.user_key) {
    throw new Error('로그인이 필요합니다')
  }
  return profile
}

export { isValidUserKey, normalizeUserKey }

export async function loadAppData() {
  const profile = await requireProfile()
  const supabase = getClient()

  try {
    return await selectAppDataRow(supabase, profile.user_key)
  } catch (error) {
    throw wrapError(error)
  }
}

export async function saveAppData(payload = {}) {
  const profile = await requireProfile()
  const supabase = getClient()

  if (payload.nickname?.trim()) {
    const { error: profileError } = await supabase
      .from('profiles')
      .update({ nickname: payload.nickname.trim() })
      .eq('user_key', profile.user_key)

    if (profileError) throw wrapError(profileError)
  }

  const patch = { user_key: profile.user_key }
  if (payload.annual_data !== undefined) patch.annual_data = payload.annual_data
  if (payload.weekly_data !== undefined) patch.weekly_data = payload.weekly_data
  if (payload.habit_data !== undefined) patch.habit_data = payload.habit_data
  if (payload.mandala_data !== undefined) patch.mandala_data = payload.mandala_data
  if (payload.monthly_data !== undefined) patch.monthly_data = payload.monthly_data
  if (payload.memory_data !== undefined) patch.memory_data = payload.memory_data

  try {
    return await upsertAppDataRow(supabase, patch)
  } catch (error) {
    throw wrapError(error)
  }
}
