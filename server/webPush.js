import webpush from 'web-push'
import { SUPPORT_EMAIL } from '../src/lib/supportContact.js'

function readEnv(name) {
  const value = process.env[name]
  return typeof value === 'string' ? value.trim() : ''
}

export function getVapidPublicKey() {
  return readEnv('VAPID_PUBLIC_KEY') || readEnv('VITE_VAPID_PUBLIC_KEY')
}

export function getVapidPrivateKey() {
  return readEnv('VAPID_PRIVATE_KEY')
}

export function configureWebPush() {
  const publicKey = getVapidPublicKey()
  const privateKey = getVapidPrivateKey()
  if (!publicKey || !privateKey) {
    throw new Error('VAPID_PUBLIC_KEY and VAPID_PRIVATE_KEY must be set')
  }

  const subject =
    process.env.VAPID_SUBJECT?.trim() || `mailto:${SUPPORT_EMAIL}`

  webpush.setVapidDetails(subject, publicKey, privateKey)
  return webpush
}

export async function sendPushNotification(subscription, payload) {
  const push = configureWebPush()
  return push.sendNotification(subscription, JSON.stringify(payload), {
    TTL: 60 * 60,
    urgency: 'normal',
  })
}
