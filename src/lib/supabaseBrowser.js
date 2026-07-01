import { createClient } from '@supabase/supabase-js'

function readEnv(name) {
  return (
    import.meta.env[`VITE_${name}`] ||
    import.meta.env[`NEXT_PUBLIC_${name}`] ||
    ''
  )
}

export function getSupabaseConfig() {
  return {
    url: readEnv('SUPABASE_URL'),
    key: readEnv('SUPABASE_ANON_KEY'),
  }
}

export function isSupabaseConfigured() {
  const { url, key } = getSupabaseConfig()
  return Boolean(url && key && !url.includes('your-project'))
}

function getClient() {
  const { url, key } = getSupabaseConfig()

  if (!url || !key) {
    throw new Error('SUPABASE_NOT_CONFIGURED')
  }

  return createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  })
}

export { getClient }
