import { MAIN_CATEGORY_SLUGS } from '../src/lib/memoryCategories.js'

const VALID_SLUGS = new Set([...MAIN_CATEGORY_SLUGS, 'uncategorized'])

const DEFAULT_MODEL = 'gemini-2.0-flash-lite'

function buildPrompt(content) {
  return `You classify personal memos into exactly one category.

Categories (use slug exactly):
- finance — money, budget, investment
- career — work, job, projects
- learning — study, skills, books
- inner — diary, reflection, goals, mood
- relationship — family, friends, partner
- health — exercise, diet, sleep, medical
- uncategorized — unclear or mixed

Memo:
"""
${content}
"""

Respond with JSON only:
{"slug":"category slug","confidence":0.0-1.0,"title":"short title max 40 chars in the memo language"}`
}

function parseGeminiJson(text) {
  const trimmed = text.trim()
  const jsonMatch = trimmed.match(/\{[\s\S]*\}/)
  if (!jsonMatch) throw new Error('no JSON in Gemini response')
  return JSON.parse(jsonMatch[0])
}

function normalizeGeminiResult(raw) {
  const slug = VALID_SLUGS.has(raw.slug) ? raw.slug : 'uncategorized'
  const confidence =
    typeof raw.confidence === 'number'
      ? Math.min(1, Math.max(0, raw.confidence))
      : 0.5
  const title =
    typeof raw.title === 'string' ? raw.title.trim().slice(0, 60) : ''

  return { slug, confidence, title }
}

export function getGeminiModel() {
  return process.env.GEMINI_MODEL?.trim() || DEFAULT_MODEL
}

export async function classifyWithGemini(content) {
  const apiKey = process.env.GEMINI_API_KEY?.trim()
  if (!apiKey) {
    throw new Error('GEMINI_API_KEY not configured')
  }

  const model = getGeminiModel()
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`

  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents: [{ parts: [{ text: buildPrompt(content) }] }],
      generationConfig: {
        temperature: 0.1,
        maxOutputTokens: 128,
        responseMimeType: 'application/json',
      },
    }),
  })

  if (!response.ok) {
    const detail = await response.text().catch(() => '')
    throw new Error(`Gemini HTTP ${response.status}: ${detail.slice(0, 200)}`)
  }

  const payload = await response.json()
  const text = payload?.candidates?.[0]?.content?.parts?.[0]?.text
  if (!text) {
    throw new Error('empty Gemini response')
  }

  return normalizeGeminiResult(parseGeminiJson(text))
}
