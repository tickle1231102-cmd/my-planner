import { getClient } from './supabaseBrowser.js'
import {
  LEGACY_AUTH_EMAIL_SUFFIX,
  userKeyToAuthEmailCandidates,
} from './authEmail.js'
import { isValidUserKey, normalizeUserKey } from './userIdentity.js'
import { SUPPORT_EMAIL } from './supportContact.js'

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

function oauthNickname(user) {
  const metadata = user?.user_metadata || {}
  return (
    metadata.full_name ||
    metadata.name ||
    user?.email?.split('@')[0] ||
    'Google 사용자'
  )
}

function oauthUserKey(user) {
  return user.id.replaceAll('-', '')
}

async function checkLocalSupabaseEnv() {
  try {
    const response = await fetch('/api/auth/env-check')
    const body = await response.json().catch(() => ({}))
    if (!response.ok) {
      throw new Error(body.error || '서버 설정을 확인하지 못했습니다')
    }
    if (body.envIssue) {
      throw new Error(body.envIssue)
    }
  } catch (error) {
    if (error instanceof Error && error.message.includes('로컬 Supabase')) {
      throw error
    }
    // Production static hosting may not expose this route.
  }
}

export async function signInWithGoogle() {
  const supabase = getClient()
  const { error } = await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: {
      redirectTo: window.location.origin,
    },
  })

  if (error) throw new Error(mapAuthError(error))
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

async function migrateLegacyAuthEmail(accessToken) {
  try {
    await fetch('/api/auth/migrate-email', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    })
  } catch {
    // Non-blocking: login already succeeded.
  }
}

async function signInWithSession(userKey, password) {
  const key = normalizeUserKey(userKey)
  const supabase = getClient()
  const emailCandidates = userKeyToAuthEmailCandidates(key)

  let lastError = null
  let signedIn = false
  let usedLegacyEmail = false

  for (const email of emailCandidates) {
    const { error: signInError } = await supabase.auth.signInWithPassword({
      email,
      password,
    })

    if (!signInError) {
      signedIn = true
      usedLegacyEmail = email.endsWith(LEGACY_AUTH_EMAIL_SUFFIX)
      break
    }

    lastError = signInError
    if (signInError.message.toLowerCase().includes('invalid api key')) {
      throw new Error(
        'Supabase API 키가 올바르지 않습니다. .env.local 의 VITE_SUPABASE_ANON_KEY 가 VITE_SUPABASE_URL 과 같은 프로젝트인지 확인해 주세요.',
      )
    }
    if (!signInError.message.includes('Invalid login credentials')) {
      throw new Error(mapAuthError(signInError))
    }
  }

  if (!signedIn) {
    throw new Error('WRONG_PASSWORD')
  }

  const {
    data: { session },
    error: sessionError,
  } = await supabase.auth.getSession()

  if (sessionError) throw sessionError
  if (!session) {
    throw new Error('WRONG_PASSWORD')
  }

  if (usedLegacyEmail) {
    await migrateLegacyAuthEmail(session.access_token)
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

  await checkLocalSupabaseEnv()

  const status = await getUserKeyAuthStatus(key)
  if (status === 'new') {
    throw new Error('등록되지 않은 ID입니다. 회원가입을 진행해 주세요.')
  }
  if (status === 'legacy') {
    throw new Error('비밀번호 설정이 완료되지 않은 계정입니다.')
  }

  try {
    return await signInWithSession(key, password)
  } catch (error) {
    if (error instanceof Error && error.message === 'WRONG_PASSWORD') {
      throw new Error('비밀번호가 올바르지 않습니다')
    }
    throw error
  }
}

export async function registerWithUserKey(userKey, password, nickname = '') {
  const key = normalizeUserKey(userKey)
  if (!isValidUserKey(key)) {
    throw new Error('고유 ID 형식이 올바르지 않습니다')
  }
  if (!isValidPassword(password)) {
    throw new Error(getPasswordHint())
  }

  await checkLocalSupabaseEnv()

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

export async function lookupUserKeyByNickname(nickname) {
  const trimmed = nickname?.trim()
  if (!trimmed) {
    throw new Error('닉네임을 입력해 주세요')
  }

  const response = await fetch('/api/auth/lookup-id', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ nickname: trimmed }),
  })

  const body = await response.json().catch(() => ({}))

  if (response.status === 404) {
    throw new Error('일치하는 계정을 찾지 못했습니다')
  }
  if (response.status === 409 && body.error === 'ambiguous') {
    throw new Error(
      `같은 닉네임의 계정이 여러 개입니다. ${SUPPORT_EMAIL} 으로 문의해 주세요.`,
    )
  }
  if (!response.ok) {
    throw new Error(body.error || 'ID 찾기에 실패했습니다')
  }

  return body.userKey
}

export async function resetPasswordForUserKey(userKey, password) {
  const key = normalizeUserKey(userKey)
  if (!isValidUserKey(key)) {
    throw new Error('고유 ID 형식이 올바르지 않습니다')
  }
  if (!isValidPassword(password)) {
    throw new Error(getPasswordHint())
  }

  const response = await fetch('/api/auth/reset-password', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ userKey: key, password }),
  })

  const body = await response.json().catch(() => ({}))

  if (response.status === 404) {
    throw new Error('등록되지 않은 ID입니다')
  }
  if (response.status === 409 && body.error === 'legacy account') {
    throw new Error('비밀번호 설정이 완료되지 않은 계정입니다. 회원가입 절차를 진행해 주세요.')
  }
  if (!response.ok) {
    throw new Error(body.error || '비밀번호 재설정에 실패했습니다')
  }
}

export async function deleteAccountRemotely() {
  const supabase = getClient()
  const {
    data: { session },
  } = await supabase.auth.getSession()

  if (!session?.access_token) {
    throw new Error('로그인 세션이 없습니다')
  }

  const response = await fetch('/api/auth/delete-account', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${session.access_token}`,
    },
  })

  const body = await response.json().catch(() => ({}))
  if (!response.ok) {
    throw new Error(body.error || '회원 탈퇴에 실패했습니다')
  }
}

export async function getAuthenticatedProfile() {
  const supabase = getClient()
  const {
    data: { session },
  } = await supabase.auth.getSession()

  if (!session) return null

  const { data: existingProfile, error } = await supabase
    .from('profiles')
    .select('user_key, nickname')
    .eq('auth_user_id', session.user.id)
    .maybeSingle()

  if (error) throw error
  if (existingProfile) return existingProfile

  const provider = session.user.app_metadata?.provider
  if (provider !== 'google') return null

  const { error: claimError } = await supabase.rpc('claim_profile', {
    p_user_key: oauthUserKey(session.user),
    p_nickname: oauthNickname(session.user),
  })

  if (claimError) throw claimError

  const { data: createdProfile, error: profileError } = await supabase
    .from('profiles')
    .select('user_key, nickname')
    .eq('auth_user_id', session.user.id)
    .single()

  if (profileError) throw profileError
  return createdProfile
}
