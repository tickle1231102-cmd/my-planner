import { getClient } from './supabaseBrowser.js'
import { userKeyToAuthEmail } from './authEmail.js'
import { isValidUserKey, normalizeUserKey } from './userIdentity.js'

export const MIN_PASSWORD_LENGTH = 8

export function isValidPassword(password) {
  return typeof password === 'string' && password.length >= MIN_PASSWORD_LENGTH
}

export function getPasswordHint() {
  return `비밀번호는 ${MIN_PASSWORD_LENGTH}자 이상이어야 합니다`
}

export async function getUserKeyAuthStatus(userKey) {
  const key = normalizeUserKey(userKey)
  if (!isValidUserKey(key)) return 'invalid'

  const response = await fetch('/api/auth/status', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ userKey: key }),
  })

  const body = await response.json().catch(() => ({}))

  if (!response.ok) {
    throw new Error(body.error || '계정 상태를 확인하지 못했습니다')
  }

  return body.status
}

function mapAuthError(error) {
  const msg = error?.message || ''

  if (msg.includes('Invalid login credentials')) {
    return '비밀번호가 올바르지 않습니다'
  }
  if (msg.includes('User already registered') || msg.includes('already registered')) {
    return '이미 등록된 ID입니다. 로그인해 주세요.'
  }
  if (msg.includes('already claimed')) {
    return '이 ID는 다른 계정에 연결되어 있습니다'
  }
  if (msg.includes('rate limit') || msg.includes('email rate limit')) {
    return '요청이 너무 많습니다. 잠시 후 다시 시도해 주세요.'
  }
  if (msg.includes('invalid') && msg.toLowerCase().includes('email')) {
    return '계정 생성에 실패했습니다. 잠시 후 다시 시도해 주세요.'
  }
  if (msg.toLowerCase().includes('password')) {
    return getPasswordHint()
  }

  return msg || '인증에 실패했습니다'
}

function mapRegisterApiError(errorCode, fallback) {
  if (errorCode === 'already registered') {
    return '이미 등록된 ID입니다. 로그인해 주세요.'
  }
  if (errorCode === 'legacy account') {
    return '기존 ID입니다. 비밀번호 설정 화면에서 진행해 주세요.'
  }
  if (errorCode === 'new account') {
    return '새 ID입니다. 회원가입으로 진행해 주세요.'
  }
  if (fallback?.includes('SERVICE_ROLE')) {
    return '서버 인증 설정이 없습니다. SUPABASE_SERVICE_ROLE_KEY를 확인해 주세요.'
  }
  if (errorCode === 'already claimed') {
    return '이 ID는 다른 계정에 연결되어 있습니다'
  }
  if (fallback?.includes('rate limit')) {
    return '요청이 너무 많습니다. 잠시 후 다시 시도해 주세요.'
  }
  return fallback || '회원가입에 실패했습니다'
}

async function createAuthUserViaApi(userKey, password, mode, nickname = '') {
  const response = await fetch('/api/auth/register', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      userKey: normalizeUserKey(userKey),
      password,
      nickname,
      mode,
    }),
  })

  const body = await response.json().catch(() => ({}))

  if (!response.ok) {
    throw new Error(mapRegisterApiError(body.error, body.error))
  }
}

async function signInWithSession(userKey, password) {
  const key = normalizeUserKey(userKey)
  const supabase = getClient()

  const { error: signInError } = await supabase.auth.signInWithPassword({
    email: userKeyToAuthEmail(key),
    password,
  })

  if (signInError) throw new Error(mapAuthError(signInError))

  const {
    data: { session },
    error: sessionError,
  } = await supabase.auth.getSession()

  if (sessionError) throw sessionError
  if (!session) {
    throw new Error('로그인 세션을 만들지 못했습니다.')
  }

  return key
}

export async function signInWithUserKey(userKey, password) {
  const key = normalizeUserKey(userKey)
  if (!isValidUserKey(key)) {
    throw new Error('고유 ID 형식이 올바르지 않습니다')
  }
  if (!isValidPassword(password)) {
    throw new Error(getPasswordHint())
  }

  return signInWithSession(key, password)
}

export async function registerWithUserKey(userKey, password, nickname = '') {
  const key = normalizeUserKey(userKey)
  if (!isValidUserKey(key)) {
    throw new Error('고유 ID 형식이 올바르지 않습니다')
  }
  if (!isValidPassword(password)) {
    throw new Error(getPasswordHint())
  }

  try {
    await createAuthUserViaApi(key, password, 'register', nickname)
    return await signInWithSession(key, password)
  } catch (error) {
    const supabase = getClient()
    await supabase.auth.signOut()
    throw error
  }
}

export async function linkLegacyUserKey(userKey, password, nickname = '') {
  const key = normalizeUserKey(userKey)
  if (!isValidUserKey(key)) {
    throw new Error('고유 ID 형식이 올바르지 않습니다')
  }
  if (!isValidPassword(password)) {
    throw new Error(getPasswordHint())
  }

  try {
    await createAuthUserViaApi(key, password, 'legacy', nickname)
    return await signInWithSession(key, password)
  } catch (error) {
    const supabase = getClient()
    await supabase.auth.signOut()
    throw error
  }
}

export async function signOutAccount() {
  const supabase = getClient()
  await supabase.auth.signOut()
}

export async function getAuthenticatedProfile() {
  const supabase = getClient()
  const {
    data: { session },
  } = await supabase.auth.getSession()

  if (!session) return null

  const { data, error } = await supabase
    .from('profiles')
    .select('user_key, nickname')
    .eq('auth_user_id', session.user.id)
    .maybeSingle()

  if (error) throw error
  return data
}
