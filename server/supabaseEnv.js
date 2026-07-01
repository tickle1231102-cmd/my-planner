function getProjectRefFromUrl(url) {
  if (!url) return null
  try {
    return new URL(url).hostname.split('.')[0] || null
  } catch {
    return null
  }
}

function getProjectRefFromJwt(token) {
  if (!token || typeof token !== 'string') return null
  const parts = token.split('.')
  if (parts.length < 2) return null

  try {
    const payload = JSON.parse(
      Buffer.from(parts[1], 'base64url').toString('utf8'),
    )
    return typeof payload.ref === 'string' ? payload.ref : null
  } catch {
    return null
  }
}

export function getSupabaseEnvIssue() {
  const url = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  const anonKey = process.env.VITE_SUPABASE_ANON_KEY

  if (!url) {
    return 'VITE_SUPABASE_URL이 설정되지 않았습니다. .env.local을 확인해 주세요.'
  }

  const urlRef = getProjectRefFromUrl(url)

  if (serviceKey) {
    const serviceRef = getProjectRefFromJwt(serviceKey)
    if (urlRef && serviceRef && urlRef !== serviceRef) {
      return `로컬 Supabase 설정이 서로 다른 프로젝트를 가리킵니다. VITE_SUPABASE_URL은 "${urlRef}"인데 SUPABASE_SERVICE_ROLE_KEY는 "${serviceRef}"용입니다. Vercel 배포 환경과 동일한 프로젝트의 URL·anon key·service role key를 .env.local에 맞춰 주세요.`
    }
  }

  if (anonKey?.startsWith('eyJ')) {
    const anonRef = getProjectRefFromJwt(anonKey)
    if (urlRef && anonRef && urlRef !== anonRef) {
      return `로컬 Supabase 설정이 서로 다른 프로젝트를 가리킵니다. VITE_SUPABASE_URL은 "${urlRef}"인데 VITE_SUPABASE_ANON_KEY는 "${anonRef}"용입니다. Vercel 배포 환경과 동일한 키를 .env.local에 설정해 주세요.`
    }
  }

  return null
}
