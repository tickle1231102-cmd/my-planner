import { handlePlanGenerateRequest } from '../../server/planGenerate.js'

// Allow longer Gemini generation on Vercel (Pro); Hobby caps lower automatically.
export const config = {
  maxDuration: 60,
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type')

  if (req.method === 'OPTIONS') {
    return res.status(200).end()
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: { message: 'method not allowed' } })
  }

  try {
    let body = req.body
    if (typeof body === 'string') {
      body = JSON.parse(body)
    }

    const result = await handlePlanGenerateRequest(body)
    return res.status(result.status).json(result.body)
  } catch (error) {
    console.error('[api/plan/generate]', error)
    const message = error instanceof Error ? error.message : 'server error'
    return res.status(500).json({ error: { message, code: 'INTERNAL_ERROR' } })
  }
}
