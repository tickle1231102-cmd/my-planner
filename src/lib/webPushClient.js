import { getClient } from './supabaseBrowser.js'

const DEFAULT_SETTINGS = {
  enabled: false,
  notifyTime: '21:00',
  timezone: 'Asia/Seoul',
  hasSubscription: false,
}

function urlBase64ToUint8Array(base64String) {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4)
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/')
  const raw = atob(base64)
  const output = new Uint8Array(raw.length)
  for (let i = 0; i < raw.length; i += 1) {
    output[i] = raw.charCodeAt(i)
  }
  return output
}

async function getAccessToken() {
  const supabase = getClient()
  const {
    data: { session },
  } = await supabase.auth.getSession()
  if (!session?.access_token) {
    throw new Error('로그인 세션이 없습니다')
  }
  return session.access_token
}

async function pushFetch(path, { method = 'GET', body } = {}) {
  const token = await getAccessToken()
  const response = await fetch(path, {
    method,
    headers: {
      Authorization: `Bearer ${token}`,
      ...(body ? { 'Content-Type': 'application/json' } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  })
  const payload = await response.json().catch(() => ({}))
  if (!response.ok) {
    throw new Error(payload.error || '푸시 API 요청에 실패했습니다')
  }
  return payload
}

export function isWebPushSupported() {
  return (
    typeof window !== 'undefined' &&
    'serviceWorker' in navigator &&
    'PushManager' in window &&
    'Notification' in window
  )
}

export function isStandaloneDisplay() {
  if (typeof window === 'undefined') return false
  return (
    window.matchMedia('(display-mode: standalone)').matches ||
    window.navigator.standalone === true
  )
}

export function isLikelyIos() {
  if (typeof navigator === 'undefined') return false
  const ua = navigator.userAgent || ''
  const iOS = /iPad|iPhone|iPod/.test(ua)
  const iPadOs = navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1
  return iOS || iPadOs
}

export async function registerPushServiceWorker() {
  if (!('serviceWorker' in navigator)) {
    throw new Error('이 브라우저는 서비스 워커를 지원하지 않습니다')
  }
  return navigator.serviceWorker.register('/sw.js')
}

export async function fetchPushSettings() {
  try {
    return await pushFetch('/api/push/settings')
  } catch (error) {
    if (error instanceof Error && error.message.includes('푸시 테이블')) {
      throw error
    }
    throw error
  }
}

export async function updatePushSettings({ enabled, notifyTime, timezone }) {
  return pushFetch('/api/push/settings', {
    method: 'POST',
    body: {
      enabled,
      notifyTime,
      timezone: timezone || Intl.DateTimeFormat().resolvedOptions().timeZone || 'Asia/Seoul',
    },
  })
}

async function fetchVapidPublicKey() {
  const response = await fetch('/api/push/vapid-public-key')
  const payload = await response.json().catch(() => ({}))
  if (!response.ok || !payload.publicKey) {
    throw new Error(payload.error || 'VAPID 공개키가 설정되지 않았습니다')
  }
  return payload.publicKey
}

async function getPushSubscription() {
  const registration = await navigator.serviceWorker.ready
  return registration.pushManager.getSubscription()
}

export async function enablePushNotifications({ notifyTime }) {
  if (!isWebPushSupported()) {
    throw new Error('이 브라우저는 웹 푸시를 지원하지 않습니다')
  }

  if (isLikelyIos() && !isStandaloneDisplay()) {
    throw new Error(
      '아이폰에서는 홈 화면에 추가한 앱에서만 푸시 알림을 받을 수 있습니다. Safari에서 공유 → 홈 화면에 추가 후 다시 시도해 주세요.',
    )
  }

  await registerPushServiceWorker()
  const permission = await Notification.requestPermission()
  if (permission !== 'granted') {
    throw new Error('알림 권한이 거부되었습니다')
  }

  const publicKey = await fetchVapidPublicKey()
  const registration = await navigator.serviceWorker.ready
  let subscription = await registration.pushManager.getSubscription()

  if (!subscription) {
    subscription = await registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(publicKey),
    })
  }

  const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone || 'Asia/Seoul'

  return pushFetch('/api/push/subscribe', {
    method: 'POST',
    body: {
      subscription: subscription.toJSON(),
      notifyTime,
      timezone,
    },
  })
}

export async function disablePushNotifications() {
  let endpoint
  try {
    const subscription = await getPushSubscription()
    if (subscription) {
      endpoint = subscription.endpoint
      await subscription.unsubscribe()
    }
  } catch {
    // still disable server-side
  }

  return pushFetch('/api/push/unsubscribe', {
    method: 'POST',
    body: { endpoint },
  })
}

export { DEFAULT_SETTINGS }
