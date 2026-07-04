import { CATEGORY_META, getEffectiveCategorySlug } from '../../lib/memoryCategories.js'

export function CategoryBadge({
  memo,
  size = 'sm',
  pressable = false,
  onPress,
  selected = false,
}) {
  const slug = getEffectiveCategorySlug(memo)
  const meta = CATEGORY_META[slug] || CATEGORY_META.uncategorized
  const sizeClass = size === 'md' ? 'px-3 py-1 text-sm' : 'px-2 py-0.5 text-xs'
  const canPress = pressable && onPress

  const className = [
    'inline-flex shrink-0 items-center gap-1 rounded-full font-medium transition',
    sizeClass,
    canPress && 'cursor-pointer border hover:opacity-90 hover:shadow-sm',
    selected && canPress && 'ring-2 ring-planner-sage/40',
  ]
    .filter(Boolean)
    .join(' ')

  const style = {
    backgroundColor: `${meta.color}22`,
    color: meta.color,
    ...(canPress ? { borderColor: `${meta.color}66` } : {}),
  }

  const label = (
    <>
      <span>{meta.emoji}</span>
      {meta.nameKo}
      {memo.confidence != null && memo.confidence < 0.6 && slug === 'uncategorized' && (
        <span className="opacity-60">?</span>
      )}
    </>
  )

  if (canPress) {
    return (
      <button
        type="button"
        onClick={onPress}
        className={className}
        style={style}
        aria-expanded={selected}
        aria-label="카테고리 변경"
      >
        {label}
      </button>
    )
  }

  return (
    <span className={className} style={style}>
      {label}
    </span>
  )
}
