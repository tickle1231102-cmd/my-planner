import { classifyByKeywords } from './memoryClassify.js'
import {
  getEffectiveCategorySlug,
  resolveCategorySlug,
} from './memoryCategories.js'
import { getSavedUserKey, normalizeUserKey } from './userIdentity.js'

export const MEMORY_STORAGE_KEY = 'my-planner-memory-v1'

export function memoryStorageKey(userKey) {
  const key = normalizeUserKey(userKey || getSavedUserKey() || '')
  if (!key) return MEMORY_STORAGE_KEY
  return `${MEMORY_STORAGE_KEY}:${key}`
}

export function createEmptyMemoryData() {
  return { memos: [] }
}

export function normalizeMemoryData(raw) {
  if (!raw || !Array.isArray(raw.memos)) return createEmptyMemoryData()
  return {
    memos: raw.memos.map((memo, index) => ({
      id: memo.id || `memo-${index}`,
      content: memo.content || '',
      title: memo.title || '',
      categorySlug: memo.categorySlug || 'uncategorized',
      userCategorySlug: memo.userCategorySlug || null,
      confidence: Number.isFinite(memo.confidence) ? memo.confidence : null,
      classificationModel: memo.classificationModel || 'keyword-rules-v1',
      createdAt: memo.createdAt || new Date().toISOString(),
      updatedAt: memo.updatedAt || memo.createdAt || new Date().toISOString(),
    })),
  }
}

export function withDefaultMemory(raw) {
  return normalizeMemoryData(raw)
}

/** Remove legacy shared key that leaked memos across accounts on one browser. */
export function clearLegacyMemoryStorage() {
  if (typeof window === 'undefined') return
  localStorage.removeItem(MEMORY_STORAGE_KEY)
}

export function loadMemoryData(userKey) {
  clearLegacyMemoryStorage()
  if (typeof window === 'undefined') return createEmptyMemoryData()

  try {
    const raw = localStorage.getItem(memoryStorageKey(userKey))
    if (!raw) return createEmptyMemoryData()
    return normalizeMemoryData(JSON.parse(raw))
  } catch {
    return createEmptyMemoryData()
  }
}

export function saveMemoryData(data, userKey) {
  if (typeof window === 'undefined') return
  localStorage.setItem(
    memoryStorageKey(userKey),
    JSON.stringify(withDefaultMemory(data)),
  )
}

export function clearMemoryData(userKey) {
  if (typeof window === 'undefined') return
  localStorage.removeItem(memoryStorageKey(userKey))
  clearLegacyMemoryStorage()
}

export function clearAllMemoryData() {
  if (typeof window === 'undefined') return
  clearLegacyMemoryStorage()
  for (let index = localStorage.length - 1; index >= 0; index -= 1) {
    const key = localStorage.key(index)
    if (key?.startsWith(`${MEMORY_STORAGE_KEY}:`)) {
      localStorage.removeItem(key)
    }
  }
}

export function hasLocalMemoryData(userKey) {
  const data = loadMemoryData(userKey)
  return data.memos.length > 0
}

export function isMemoryDataEmpty(data) {
  return !data?.memos?.length
}

function sortMemosDesc(memos) {
  return [...memos].sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
  )
}

export function filterMemos(memos, options = {}) {
  let list = sortMemosDesc(memos)

  if (options.category) {
    list = list.filter((memo) => getEffectiveCategorySlug(memo) === options.category)
  }

  if (options.limit) {
    list = list.slice(0, options.limit)
  }

  return list
}

export function getMemoById(memos, id) {
  return memos.find((memo) => memo.id === id) ?? null
}

export function createMemoInData(data, content, classification, options = {}) {
  const resolved = classification ?? classifyByKeywords(content)
  const requestedCategory = options.userCategorySlug || options.categorySlug
  const forcedSlug = requestedCategory
    ? resolveCategorySlug(requestedCategory)
    : null
  const now = new Date().toISOString()
  const existingMemos = withDefaultMemory(data).memos

  const memo = {
    id: crypto.randomUUID(),
    content,
    title: resolved.title,
    categorySlug: forcedSlug || resolved.slug,
    userCategorySlug: forcedSlug,
    confidence: forcedSlug ? 1 : resolved.confidence,
    classificationModel: forcedSlug
      ? 'user-selected'
      : resolved.model || 'keyword-rules-v1',
    createdAt: now,
    updatedAt: now,
  }

  return {
    memos: [memo, ...existingMemos],
  }
}

export function updateMemoContentInData(data, id, content, classification) {
  const trimmed = content.trim()
  if (!trimmed) return withDefaultMemory(data)

  const resolved = classification ?? classifyByKeywords(trimmed)
  const memos = withDefaultMemory(data).memos

  return {
    memos: memos.map((memo) => {
      if (memo.id !== id) return memo

      const patch = {
        content: trimmed,
        title: resolved.title,
        updatedAt: new Date().toISOString(),
      }

      if (!memo.userCategorySlug) {
        patch.categorySlug = resolved.slug
        patch.confidence = resolved.confidence
        patch.classificationModel = resolved.model || 'keyword-rules-v1'
      }

      return { ...memo, ...patch }
    }),
  }
}

export function updateMemoCategoryInData(data, id, slug) {
  const memos = withDefaultMemory(data).memos
  return {
    memos: memos.map((memo) =>
      memo.id === id
        ? {
            ...memo,
            userCategorySlug: slug,
            updatedAt: new Date().toISOString(),
          }
        : memo,
    ),
  }
}

export function deleteMemoInData(data, id) {
  const memos = withDefaultMemory(data).memos
  return {
    memos: memos.filter((memo) => memo.id !== id),
  }
}

export function deleteMemosInData(data, ids) {
  const idSet = new Set(Array.isArray(ids) ? ids : [ids])
  const memos = withDefaultMemory(data).memos
  return {
    memos: memos.filter((memo) => !idSet.has(memo.id)),
  }
}

export function countMemosByCategory(memos) {
  return memos.reduce((acc, memo) => {
    const slug = getEffectiveCategorySlug(memo)
    acc[slug] = (acc[slug] ?? 0) + 1
    return acc
  }, {})
}
