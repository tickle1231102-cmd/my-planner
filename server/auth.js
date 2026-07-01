import { getAdminClient } from './supabaseAdmin.js'
import { isValidUserKey, normalizeUserKey } from './cloudData.js'
import { userKeyToAuthEmail } from '../src/lib/authEmail.js'

export { userKeyToAuthEmail } from '../src/lib/authEmail.js'
export const MIN_PASSWORD_LENGTH = 8

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
  const { data, error } = await admin.rpc('get_user_key_auth_status', {
    p_user_key: userKey,
  })

  if (error) throw error
  return data
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
  const { error: createError } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
  })

  if (!createError) return

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

  const { error: updateError } = await admin.auth.admin.updateUserById(
    existingUser.id,
    {
      password,
      email_confirm: true,
    },
  )

  if (updateError) throw updateError
}

export async function handleAuthRegister(body = {}) {
  const userKey = normalizeUserKey(body.userKey)
  const password = body.password
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
    await ensureAuthUser(admin, email, password, mode === 'legacy')

    return { status: 200, body: { ok: true } }
  } catch (error) {
    if (error?.code === 'ALREADY_REGISTERED') {
      return { status: 409, body: { error: 'already registered' } }
    }

    const message =
      error?.message ||
      error?.msg ||
      (typeof error === 'string' ? error : 'register failed')
    return { status: 500, body: { error: message } }
  }
}
