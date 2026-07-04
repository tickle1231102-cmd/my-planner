import { CATEGORY_META, MAIN_CATEGORY_SLUGS } from '../../lib/memoryCategories.js'

export function CategoryFilter({ activeCategory, counts, onSelect }) {
  return (
    <div className="flex gap-2 overflow-x-auto pb-1">
      <button
        type="button"
        onClick={() => onSelect(null)}
        className={[
          'shrink-0 rounded-full border px-3 py-1.5 text-xs font-medium transition',
          activeCategory === null
            ? 'border-planner-sage bg-planner-sage text-white'
            : 'border-planner-sand bg-white text-planner-ink-muted hover:border-planner-sage-muted hover:bg-planner-sage-light',
        ].join(' ')}
      >
        전체
        {counts?.all != null && (
          <span className="ml-1 opacity-70">{counts.all}</span>
        )}
      </button>
      {MAIN_CATEGORY_SLUGS.map((slug) => {
        const meta = CATEGORY_META[slug]
        const count = counts?.[slug] ?? 0
        const active = activeCategory === slug

        return (
          <button
            key={slug}
            type="button"
            onClick={() => onSelect(slug)}
            className={[
              'shrink-0 rounded-full border px-3 py-1.5 text-xs font-medium transition',
              active
                ? 'text-white'
                : 'border-planner-sand bg-white text-planner-ink-muted hover:border-planner-sage-muted hover:bg-planner-warm',
            ].join(' ')}
            style={
              active
                ? { backgroundColor: meta.color, borderColor: meta.color }
                : undefined
            }
          >
            {meta.emoji} {meta.nameKo}
            {count > 0 && <span className="ml-1 opacity-70">{count}</span>}
          </button>
        )
      })}

      {(() => {
        const meta = CATEGORY_META.uncategorized
        const count = counts?.uncategorized ?? 0
        const active = activeCategory === 'uncategorized'

        return (
          <button
            type="button"
            onClick={() => onSelect('uncategorized')}
            className={[
              'shrink-0 rounded-full border px-3 py-1.5 text-xs font-medium transition',
              active
                ? 'text-white'
                : 'border-dashed border-planner-sand bg-white text-planner-ink-muted hover:border-planner-sage-muted hover:bg-planner-warm',
            ].join(' ')}
            style={
              active
                ? { backgroundColor: meta.color, borderColor: meta.color }
                : undefined
            }
          >
            {meta.emoji} {meta.nameKo}
            {count > 0 && <span className="ml-1 opacity-70">{count}</span>}
          </button>
        )
      })()}
    </div>
  )
}
