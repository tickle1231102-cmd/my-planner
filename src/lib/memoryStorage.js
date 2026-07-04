import { classifyByKeywords } from './memoryClassify.js'
import { getEffectiveCategorySlug } from './memoryCategories.js'

export const MEMORY_STORAGE_KEY = 'my-planner-memory-v1'

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

export function loadMemoryData() {
  try {
    const raw = localStorage.getItem(MEMORY_STORAGE_KEY)
    if (!raw) return createEmptyMemoryData()
    return normalizeMemoryData(JSON.parse(raw))
  } catch {
    return createEmptyMemoryData()
  }
}

export function saveMemoryData(data) {
  localStorage.setItem(
    MEMORY_STORAGE_KEY,
    JSON.stringify(withDefaultMemory(data)),
  )
}

export function clearMemoryData() {
  localStorage.removeItem(MEMORY_STORAGE_KEY)
}

export function hasLocalMemoryData() {
  const data = loadMemoryData()
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

export function createMemoInData(data, content) {
  const classification = classifyByKeywords(content)
  const now = new Date().toISOString()
  const existingMemos = withDefaultMemory(data).memos

  const memo = {
    id: crypto.randomUUID(),
    content,
    title: classification.title,
    categorySlug: classification.slug,
    userCategorySlug: null,
    confidence: classification.confidence,
    classificationModel: 'keyword-rules-v1',
    createdAt: now,
    updatedAt: now,
  }

  return {
    memos: [memo, ...existingMemos],
  }
}

export function updateMemoContentInData(data, id, content) {
  const trimmed = content.trim()
  if (!trimmed) return withDefaultMemory(data)

  const classification = classifyByKeywords(trimmed)
  const memos = withDefaultMemory(data).memos

  return {
    memos: memos.map((memo) => {
      if (memo.id !== id) return memo

      const patch = {
        content: trimmed,
        title: classification.title,
        updatedAt: new Date().toISOString(),
      }

      if (!memo.userCategorySlug) {
        patch.categorySlug = classification.slug
        patch.confidence = classification.confidence
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

export function countMemosByCategory(memos) {
  return memos.reduce((acc, memo) => {
    const slug = getEffectiveCategorySlug(memo)
    acc[slug] = (acc[slug] ?? 0) + 1
    return acc
  }, {})
}
