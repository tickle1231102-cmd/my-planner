import { handleDataRequest } from '../server/cloudData.js'

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type')

  if (req.method === 'OPTIONS') {
    return res.status(200).end()
  }

  try {
    let body = req.body
    if (req.method === 'POST' && typeof body === 'string') {
      body = JSON.parse(body)
    }

    const result = await handleDataRequest(
      req.method,
      req.url || '/api/data',
      body,
    )

    return res.status(result.status).json(result.body)
  } catch (error) {
    const message = error instanceof Error ? error.message : 'server error'
    return res.status(500).json({ error: message })
  }
}
