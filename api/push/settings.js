import { handlePushGetSettings, handlePushUpdateSettings } from '../../server/pushHandlers.js'

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization')

  if (req.method === 'OPTIONS') return res.status(200).end()

  try {
    if (req.method === 'GET') {
      const result = await handlePushGetSettings(req.headers.authorization)
      return res.status(result.status).json(result.body)
    }

    if (req.method === 'POST') {
      let body = req.body
      if (typeof body === 'string') body = JSON.parse(body)
      const result = await handlePushUpdateSettings(req.headers.authorization, body)
      return res.status(result.status).json(result.body)
    }

    return res.status(405).json({ error: 'method not allowed' })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'server error'
    return res.status(500).json({ error: message })
  }
}
