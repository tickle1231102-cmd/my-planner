import { CATEGORY_META, MAIN_CATEGORY_SLUGS } from '../../lib/memoryCategories.js'

export function CategoryPicker({ onSelect, activeSlug = null, compact = false }) {
  return (
    <div
      className={[
        'rounded-xl border border-planner-sand bg-planner-warm/40 p-3',
        compact ? 'p-2' : 'p-3',
      ].join(' ')}
    >
      {!compact && (
        <p className="mb-2 text-xs font-medium text-planner-ink-muted">
          카테고리 변경
        </p>
      )}
      <div className="flex flex-wrap gap-2">
        {MAIN_CATEGORY_SLUGS.map((slug) => {
          const meta = CATEGORY_META[slug]
          const isActive = activeSlug === slug

          return (
            <button
              key={slug}
              type="button"
              onClick={() => onSelect(slug)}
              className={[
                'rounded-full px-3 py-1.5 text-sm font-medium transition',
                compact ? 'px-2.5 py-1 text-xs' : 'text-sm',
                isActive
                  ? 'text-white'
                  : 'border border-planner-sand bg-white text-planner-ink-muted hover:bg-planner-sage-light/60',
              ].join(' ')}
              style={
                isActive
                  ? { backgroundColor: meta.color, borderColor: meta.color }
                  : undefined
              }
            >
              {meta.emoji} {meta.nameKo}
            </button>
          )
        })}
      </div>
    </div>
  )
}
