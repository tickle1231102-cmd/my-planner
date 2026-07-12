import webpush from 'web-push'
import { SUPPORT_EMAIL } from '../src/lib/supportContact.js'

export function getVapidPublicKey() {
  return process.env.VAPID_PUBLIC_KEY?.trim() || ''
}

export function getVapidPrivateKey() {
  return process.env.VAPID_PRIVATE_KEY?.trim() || ''
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
