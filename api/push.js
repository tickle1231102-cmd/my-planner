import {
  handlePushGetSettings,
  handlePushSubscribe,
  handlePushUnsubscribe,
  handlePushUpdateSettings,
  handlePushVapidPublicKey,
} from '../server/pushHandlers.js'
import { handlePushRemindersCron } from '../server/pushReminders.js'

function getRoute(req) {
  const fromQuery = req.query?.r
  if (fromQuery) return String(fromQuery)

  const url = new URL(req.url || '/', 'http://localhost')
  const fromSearch = url.searchParams.get('r')
  if (fromSearch) return fromSearch

  const path = url.pathname.replace(/\/+$/, '')
  if (path.endsWith('/vapid-public-key')) return 'vapid'
  if (path.endsWith('/settings')) return 'settings'
  if (path.endsWith('/subscribe')) return 'subscribe'
  if (path.endsWith('/unsubscribe')) return 'unsubscribe'
  if (path.includes('push-reminders') || path.endsWith('/cron')) return 'cron'
  return ''
}

function readBody(req) {
  let body = req.body
  if (typeof body === 'string') {
    try {
      body = JSON.parse(body)
    } catch {
      // keep string
    }
  }
  return body
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
  res.setHeader(
    'Access-Control-Allow-Headers',
    'Content-Type, Authorization, x-cron-secret',
  )

  if (req.method === 'OPTIONS') return res.status(200).end()

  const route = getRoute(req)

  try {
    if (route === 'vapid') {
      if (req.method !== 'GET') return res.status(405).json({ error: 'method not allowed' })
      const result = await handlePushVapidPublicKey()
      return res.status(result.status).json(result.body)
    }

    if (route === 'settings') {
      if (req.method === 'GET') {
        const result = await handlePushGetSettings(req.headers.authorization)
        return res.status(result.status).json(result.body)
      }
      if (req.method === 'POST') {
        const result = await handlePushUpdateSettings(
          req.headers.authorization,
          readBody(req),
        )
        return res.status(result.status).json(result.body)
      }
      return res.status(405).json({ error: 'method not allowed' })
    }

    if (route === 'subscribe') {
      if (req.method !== 'POST') return res.status(405).json({ error: 'method not allowed' })
      const result = await handlePushSubscribe(req.headers.authorization, readBody(req))
      return res.status(result.status).json(result.body)
    }

    if (route === 'unsubscribe') {
      if (req.method !== 'POST') return res.status(405).json({ error: 'method not allowed' })
      const result = await handlePushUnsubscribe(req.headers.authorization, readBody(req))
      return res.status(result.status).json(result.body)
    }

    if (route === 'cron') {
      if (req.method !== 'GET' && req.method !== 'POST') {
        return res.status(405).json({ error: 'method not allowed' })
      }
      const result = await handlePushRemindersCron(req)
      return res.status(result.status).json(result.body)
    }

    return res.status(404).json({ error: 'not found' })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'server error'
    return res.status(500).json({ error: message })
  }
}
