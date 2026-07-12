import { createClient } from '@supabase/supabase-js'
import { getAdminClient } from './supabaseAdmin.js'

export function getAnonClient() {
  const url = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL
  const key = process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY

  if (!url || !key) {
    throw new Error('Supabase anon key is not configured on the server')
  }

  return createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  })
}

export async function resolveAuthedProfile(authHeader) {
  if (!authHeader?.startsWith('Bearer ')) {
    return { error: { status: 401, body: { error: 'unauthorized' } } }
  }

  const token = authHeader.slice(7)
  const supabase = getAnonClient()
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser(token)

  if (error || !user?.id) {
    return { error: { status: 401, body: { error: 'unauthorized' } } }
  }

  const admin = getAdminClient()
  const { data: profile, error: profileError } = await admin
    .from('profiles')
    .select('user_key, nickname')
    .eq('auth_user_id', user.id)
    .maybeSingle()

  if (profileError) throw profileError
  if (!profile?.user_key) {
    return { error: { status: 404, body: { error: 'profile not found' } } }
  }

  return { admin, user, profile }
}

export function parseNotifyTime(value) {
  if (typeof value !== 'string') return null
  const match = /^([01]\d|2[0-3]):([0-5]\d)$/.exec(value.trim())
  if (!match) return null
  return `${match[1]}:${match[2]}`
}

export function normalizeTimezone(value) {
  const tz = typeof value === 'string' && value.trim() ? value.trim() : 'Asia/Seoul'
  try {
    Intl.DateTimeFormat('en-US', { timeZone: tz }).format(new Date())
    return tz
  } catch {
    return 'Asia/Seoul'
  }
}

export function formatTimeFromDb(value) {
  if (!value) return '21:00'
  if (typeof value === 'string') {
    return value.slice(0, 5)
  }
  return '21:00'
}
