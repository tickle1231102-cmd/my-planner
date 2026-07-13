/** Category metadata aligned with my-planner palette */
export const CATEGORY_META = {
  finance: { nameKo: '재무', color: '#7A9E7E', emoji: '💰' },
  career: { nameKo: '커리어', color: '#8BAFC4', emoji: '💼' },
  learning: { nameKo: '학습&성장', color: '#5A9E82', emoji: '📚' },
  inner: { nameKo: '내부 향상', color: '#C4A87A', emoji: '🧘' },
  relationship: { nameKo: '관계', color: '#C4A0A0', emoji: '🤝' },
  health: { nameKo: '건강', color: '#E07A5F', emoji: '💪' },
  uncategorized: { nameKo: '미분류', color: '#7A746C', emoji: '📝' },
}

export const MAIN_CATEGORY_SLUGS = [
  'finance',
  'career',
  'learning',
  'inner',
  'relationship',
  'health',
]

/** Map Korean display names (and aliases) to internal slugs. */
export const CATEGORY_NAME_TO_SLUG = {
  재무: 'finance',
  finance: 'finance',
  커리어: 'career',
  career: 'career',
  '학습&성장': 'learning',
  '학습 & 성장': 'learning',
  학습: 'learning',
  learning: 'learning',
  '내부 향상': 'inner',
  내부향상: 'inner',
  inner: 'inner',
  관계: 'relationship',
  relationship: 'relationship',
  건강: 'health',
  health: 'health',
  미분류: 'uncategorized',
  uncategorized: 'uncategorized',
}

export function resolveCategorySlug(value) {
  if (!value || typeof value !== 'string') return 'uncategorized'
  const trimmed = value.trim()
  if (CATEGORY_META[trimmed]) return trimmed
  const mapped = CATEGORY_NAME_TO_SLUG[trimmed] || CATEGORY_NAME_TO_SLUG[trimmed.toLowerCase()]
  return mapped || 'uncategorized'
}

export function getCategoryMeta(slug) {
  return CATEGORY_META[slug] || CATEGORY_META.uncategorized
}

export function getEffectiveCategorySlug(memo) {
  return memo.userCategorySlug || memo.categorySlug || 'uncategorized'
}
