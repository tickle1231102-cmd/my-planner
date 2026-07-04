import { classifyByKeywords } from './memoryClassify.js'
import { getSavedUserKey } from './userIdentity.js'

const KEYWORD_SKIP_CONFIDENCE = 0.7
const DEFAULT_DAILY_LIMIT = 50
const USAGE_KEY_PREFIX = 'my-planner-gemini-usage'

function getDailyLimit() {
  const fromEnv = Number(import.meta.env.VITE_GEMINI_DAILY_LIMIT)
  return Number.isFinite(fromEnv) && fromEnv > 0 ? fromEnv : DEFAULT_DAILY_LIMIT
}

function todayKey() {
  return new Date().toISOString().slice(0, 10)
}

function usageStorageKey() {
  const userKey = getSavedUserKey() || 'anonymous'
  return `${USAGE_KEY_PREFIX}:${userKey}:${todayKey()}`
}

function getGeminiUsageToday() {
  if (typeof window === 'undefined') return 0
  const raw = localStorage.getItem(usageStorageKey())
  const count = Number(raw)
  return Number.isFinite(count) && count > 0 ? count : 0
}

function incrementGeminiUsage() {
  if (typeof window === 'undefined') return
  const next = getGeminiUsageToday() + 1
  localStorage.setItem(usageStorageKey(), String(next))
}

function canUseGeminiToday() {
  return getGeminiUsageToday() < getDailyLimit()
}

function toClassification(keywordResult, model = 'keyword-rules-v1') {
  return {
    slug: keywordResult.slug,
    confidence: keywordResult.confidence,
    title: keywordResult.title,
    model,
  }
}

export function getGeminiUsageInfo() {
  return {
    used: getGeminiUsageToday(),
    limit: getDailyLimit(),
    remaining: Math.max(0, getDailyLimit() - getGeminiUsageToday()),
  }
}

/**
 * Classify memo content: keyword pre-check → Gemini API → keyword fallback.
 */
export async function classifyMemoContent(content) {
  const trimmed = content.trim()
  const keyword = classifyByKeywords(trimmed)

  if (
    keyword.confidence >= KEYWORD_SKIP_CONFIDENCE &&
    keyword.slug !== 'uncategorized'
  ) {
    return toClassification(keyword)
  }

  if (!canUseGeminiToday()) {
    return toClassification(keyword)
  }

  try {
    const response = await fetch('/api/classify-memo', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        content: trimmed,
        userKey: getSavedUserKey() || undefined,
      }),
    })

    if (!response.ok) {
      return toClassification(keyword)
    }

    const data = await response.json()
    if (data.source === 'gemini') {
      incrementGeminiUsage()
    }

    return {
      slug: data.slug || keyword.slug,
      confidence:
        typeof data.confidence === 'number'
          ? data.confidence
          : keyword.confidence,
      title: data.title || keyword.title,
      model: data.model || 'keyword-rules-v1',
    }
  } catch {
    return toClassification(keyword)
  }
}
