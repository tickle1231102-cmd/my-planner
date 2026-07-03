import { getAdminClient } from './supabaseAdmin.js'
import { isValidUserKey, normalizeUserKey } from './cloudData.js'
import { AUTH_EMAIL_SUFFIX, LEGACY_AUTH_EMAIL_SUFFIX, userKeyToAuthEmail, userKeyToLegacyAuthEmail } from '../src/lib/authEmail.js'
import { getSupabaseEnvIssue } from './supabaseEnv.js'
import { createClient } from '@supabase/supabase-js'

export { userKeyToAuthEmail } from '../src/lib/authEmail.js'
export const MIN_PASSWORD_LENGTH = 8

function formatServerError(error) {
  const message =
    error?.message ||
    error?.msg ||
    (typeof error === 'string' ? error : 'request failed')

  if (message.includes('auth_user_id does not exist')) {
    return 'DB 업데이트가 필요합니다. Supabase SQL Editor에서 supabase/migrations/add_password_auth.sql 을 실행해 주세요.'
  }

  return message
}

function isValidPassword(password) {
  return typeof password === 'string' && password.length >= MIN_PASSWORD_LENGTH
}

async function findAuthUserByEmail(admin, email) {
  let page = 1

  while (page <= 20) {
    const { data, error } = await admin.auth.admin.listUsers({ page, perPage: 200 })
    if (error) throw error

    const match = data.users.find((user) => user.email === email)
    if (match) return match

    if (data.users.length < 200) break
    page += 1
  }

  return null
}

async function getUserKeyAuthStatus(admin, userKey) {
  const { data: profile, error } = await admin
    .from('profiles')
    .select('auth_user_id')
    .eq('user_key', userKey)
    .maybeSingle()

  if (error) throw error
  if (!profile) return 'new'
  if (!profile.auth_user_id) return 'legacy'
  return 'registered'
}

async function linkProfileToAuthUser(admin, userKey, authUserId, nickname) {
  const trimmedNickname = nickname?.trim() || ''
  const { data: profile, error: profileError } = await admin
    .from('profiles')
    .select('user_key, auth_user_id, nickname')
    .eq('user_key', userKey)
    .maybeSingle()

  if (profileError) throw profileError

  if (profile) {
    if (profile.auth_user_id && profile.auth_user_id !== authUserId) {
      const err = new Error('user key already claimed')
      err.code = 'ALREADY_CLAIMED'
      throw err
    }

    const { error: updateError } = await admin
      .from('profiles')
      .update({
        auth_user_id: authUserId,
        nickname: trimmedNickname || profile.nickname,
      })
      .eq('user_key', userKey)

    if (updateError) throw updateError

    const { data: appRow } = await admin
      .from('app_data')
      .select('user_key')
      .eq('user_key', userKey)
      .maybeSingle()

    if (!appRow) {
      const { error: dataError } = await admin.from('app_data').insert({
        user_key: userKey,
      })
      if (dataError) throw dataError
    }
    return
  }

  const { error: insertProfileError } = await admin.from('profiles').insert({
    user_key: userKey,
    nickname: trimmedNickname || userKey,
    auth_user_id: authUserId,
  })

  if (insertProfileError) throw insertProfileError

  const { error: insertDataError } = await admin.from('app_data').insert({
    user_key: userKey,
  })

  if (insertDataError) throw insertDataError
}

function userAlreadyExists(error) {
  const message = error?.message?.toLowerCase() || ''
  return (
    message.includes('already been registered') ||
    message.includes('already registered') ||
    message.includes('user already exists')
  )
}

async function ensureAuthUser(admin, email, password, allowPasswordReset) {
  const { data: created, error: createError } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
  })

  if (!createError) return created.user

  if (!userAlreadyExists(createError)) {
    throw createError
  }

  if (!allowPasswordReset) {
    const err = new Error('User already registered')
    err.code = 'ALREADY_REGISTERED'
    throw err
  }

  const existingUser = await findAuthUserByEmail(admin, email)
  if (!existingUser) {
    throw createError
  }

  const { data: updated, error: updateError } = await admin.auth.admin.updateUserById(
    existingUser.id,
    {
      password,
      email_confirm: true,
    },
  )

  if (updateError) throw updateError
  return updated.user
}

export async function handleAuthEnvCheck() {
  const envIssue = getSupabaseEnvIssue()
  return {
    status: 200,
    body: {
      ok: !envIssue,
      envIssue,
    },
  }
}

export async function handleAuthStatus(body = {}) {
  const userKey = normalizeUserKey(body.userKey)

  if (!isValidUserKey(userKey)) {
    return { status: 400, body: { error: 'invalid userKey' } }
  }

  const envIssue = getSupabaseEnvIssue()
  if (envIssue) {
    return { status: 500, body: { error: envIssue } }
  }

  let admin
  try {
    admin = getAdminClient()
  } catch (error) {
    const message = error instanceof Error ? error.message : 'server misconfigured'
    return { status: 500, body: { error: message } }
  }

  try {
    const status = await getUserKeyAuthStatus(admin, userKey)
    return { status: 200, body: { status } }
  } catch (error) {
    const message = formatServerError(error)
    return { status: 500, body: { error: message } }
  }
}

export async function handleAuthRegister(body = {}) {
  const userKey = normalizeUserKey(body.userKey)
  const password = body.password
  const nickname = body.nickname || ''
  const mode = body.mode === 'legacy' ? 'legacy' : 'register'

  if (!isValidUserKey(userKey)) {
    return { status: 400, body: { error: 'invalid userKey' } }
  }

  if (!isValidPassword(password)) {
    return { status: 400, body: { error: 'password too short' } }
  }

  let admin
  try {
    admin = getAdminClient()
  } catch (error) {
    const message = error instanceof Error ? error.message : 'server misconfigured'
    return { status: 500, body: { error: message } }
  }

  try {
    const status = await getUserKeyAuthStatus(admin, userKey)

    if (mode === 'register' && status !== 'new') {
      return {
        status: 409,
        body: {
          error:
            status === 'legacy'
              ? 'legacy account'
              : 'already registered',
        },
      }
    }

    if (mode === 'legacy' && status !== 'legacy') {
      return {
        status: 409,
        body: {
          error:
            status === 'new'
              ? 'new account'
              : 'already registered',
        },
      }
    }

    const email = userKeyToAuthEmail(userKey)
    const authUser = await ensureAuthUser(admin, email, password, mode === 'legacy')
    if (!authUser?.id) {
      throw new Error('auth user missing after create')
    }

    await linkProfileToAuthUser(admin, userKey, authUser.id, nickname)

    return { status: 200, body: { ok: true } }
  } catch (error) {
    if (error?.code === 'ALREADY_REGISTERED') {
      return { status: 409, body: { error: 'already registered' } }
    }
    if (error?.code === 'ALREADY_CLAIMED') {
      return { status: 409, body: { error: 'already claimed' } }
    }

    const message = formatServerError(error)
    return { status: 500, body: { error: message } }
  }
}

function getAnonClient() {
  const url = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL
  const key = process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY

  if (!url || !key) {
    throw new Error('Supabase anon key is not configured on the server')
  }

  return createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  })
}

export async function handleDeleteAccount(authHeader) {
  if (!authHeader?.startsWith('Bearer ')) {
    return { status: 401, body: { error: 'unauthorized' } }
  }

  const token = authHeader.slice(7)

  try {
    const supabase = getAnonClient()
    const {
      data: { user },
      error,
    } = await supabase.auth.getUser(token)

    if (error || !user?.id) {
      return { status: 401, body: { error: 'unauthorized' } }
    }

    const admin = getAdminClient()
    const { data: profile, error: profileError } = await admin
      .from('profiles')
      .select('user_key')
      .eq('auth_user_id', user.id)
      .maybeSingle()

    if (profileError) throw profileError

    if (profile?.user_key) {
      const { error: dataError } = await admin
        .from('app_data')
        .delete()
        .eq('user_key', profile.user_key)
      if (dataError) throw dataError

      const { error: profileDeleteError } = await admin
        .from('profiles')
        .delete()
        .eq('user_key', profile.user_key)
      if (profileDeleteError) throw profileDeleteError
    }

    const { error: deleteUserError } = await admin.auth.admin.deleteUser(user.id)
    if (deleteUserError) throw deleteUserError

    return { status: 200, body: { ok: true } }
  } catch (error) {
    const message = formatServerError(error)
    return { status: 500, body: { error: message } }
  }
}

async function findAuthUserForUserKey(admin, userKey) {
  const email = userKeyToAuthEmail(userKey)
  let user = await findAuthUserByEmail(admin, email)
  if (user) return user

  return findAuthUserByEmail(admin, userKeyToLegacyAuthEmail(userKey))
}

export async function handleLookupId(body = {}) {
  const nickname = typeof body.nickname === 'string' ? body.nickname.trim() : ''

  if (!nickname) {
    return { status: 400, body: { error: 'nickname required' } }
  }

  const envIssue = getSupabaseEnvIssue()
  if (envIssue) {
    return { status: 500, body: { error: envIssue } }
  }

  let admin
  try {
    admin = getAdminClient()
  } catch (error) {
    const message = error instanceof Error ? error.message : 'server misconfigured'
    return { status: 500, body: { error: message } }
  }

  try {
    const { data, error } = await admin
      .from('profiles')
      .select('user_key, nickname')
      .not('auth_user_id', 'is', null)
      .ilike('nickname', nickname)

    if (error) throw error

    if (!data?.length) {
      return { status: 404, body: { error: 'not found' } }
    }

    if (data.length > 1) {
      return { status: 409, body: { error: 'ambiguous' } }
    }

    return { status: 200, body: { userKey: data[0].user_key } }
  } catch (error) {
    const message = formatServerError(error)
    return { status: 500, body: { error: message } }
  }
}

export async function handleResetPassword(body = {}) {
  const userKey = normalizeUserKey(body.userKey)
  const password = body.password

  if (!isValidUserKey(userKey)) {
    return { status: 400, body: { error: 'invalid userKey' } }
  }

  if (!isValidPassword(password)) {
    return { status: 400, body: { error: 'password too short' } }
  }

  const envIssue = getSupabaseEnvIssue()
  if (envIssue) {
    return { status: 500, body: { error: envIssue } }
  }

  let admin
  try {
    admin = getAdminClient()
  } catch (error) {
    const message = error instanceof Error ? error.message : 'server misconfigured'
    return { status: 500, body: { error: message } }
  }

  try {
    const status = await getUserKeyAuthStatus(admin, userKey)

    if (status === 'new') {
      return { status: 404, body: { error: 'not found' } }
    }

    if (status === 'legacy') {
      return { status: 409, body: { error: 'legacy account' } }
    }

    const authUser = await findAuthUserForUserKey(admin, userKey)
    if (!authUser?.id) {
      return { status: 404, body: { error: 'not found' } }
    }

    const { error: updateError } = await admin.auth.admin.updateUserById(authUser.id, {
      password,
    })

    if (updateError) throw updateError

    return { status: 200, body: { ok: true } }
  } catch (error) {
    const message = formatServerError(error)
    return { status: 500, body: { error: message } }
  }
}

export async function handleMigrateEmail(authHeader) {
  if (!authHeader?.startsWith('Bearer ')) {
    return { status: 401, body: { error: 'unauthorized' } }
  }

  const token = authHeader.slice(7)

  try {
    const supabase = getAnonClient()
    const {
      data: { user },
      error,
    } = await supabase.auth.getUser(token)

    if (error || !user?.email) {
      return { status: 401, body: { error: 'unauthorized' } }
    }

    if (!user.email.endsWith(LEGACY_AUTH_EMAIL_SUFFIX)) {
      return { status: 200, body: { ok: true, migrated: false } }
    }

    const newEmail = user.email.replace(
      LEGACY_AUTH_EMAIL_SUFFIX,
      AUTH_EMAIL_SUFFIX,
    )
    const admin = getAdminClient()
    const { error: updateError } = await admin.auth.admin.updateUserById(user.id, {
      email: newEmail,
      email_confirm: true,
    })

    if (updateError) throw updateError

    return { status: 200, body: { ok: true, migrated: true } }
  } catch (error) {
    const message = formatServerError(error)
    return { status: 500, body: { error: message } }
  }
}
