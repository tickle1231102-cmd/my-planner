import { handlePushRemindersCron } from '../../server/pushReminders.js'

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
  res.setHeader(
    'Access-Control-Allow-Headers',
    'Content-Type, Authorization, x-cron-secret',
  )

  if (req.method === 'OPTIONS') return res.status(200).end()
  if (req.method !== 'GET' && req.method !== 'POST') {
    return res.status(405).json({ error: 'method not allowed' })
  }

  try {
    const result = await handlePushRemindersCron(req)
    return res.status(result.status).json(result.body)
  } catch (error) {
    const message = error instanceof Error ? error.message : 'server error'
    return res.status(500).json({ error: message })
  }
}
