import { CATEGORY_META, MAIN_CATEGORY_SLUGS } from '../../lib/memoryCategories.js'
import { PlusIcon } from '../PlusIcon.jsx'

function CategoryChip({
  slug,
  label,
  emoji,
  count,
  active,
  dashed,
  color,
  onSelect,
  onAdd,
}) {
  return (
    <div className="flex shrink-0 items-center gap-0.5">
      <button
        type="button"
        onClick={() => onSelect(slug)}
        className={[
          'rounded-full border px-3 py-1.5 text-xs font-medium transition',
          active
            ? 'text-white'
            : dashed
              ? 'border-dashed border-planner-sand bg-white text-planner-ink-muted hover:border-planner-sage-muted hover:bg-planner-warm'
              : 'border-planner-sand bg-white text-planner-ink-muted hover:border-planner-sage-muted hover:bg-planner-warm',
        ].join(' ')}
        style={
          active && color
            ? { backgroundColor: color, borderColor: color }
            : undefined
        }
      >
        {emoji ? `${emoji} ` : null}
        {label}
        {count > 0 && <span className="ml-1 opacity-70">{count}</span>}
      </button>
      {onAdd && (
        <button
          type="button"
          onClick={() => onAdd(slug)}
          aria-label={`${label}에 메모 추가`}
          className={[
            'rounded-full border p-1.5 transition',
            active
              ? 'border-transparent bg-white/90 text-planner-ink shadow-soft hover:bg-white'
              : 'border-planner-sand bg-white text-planner-sage hover:border-planner-sage-muted hover:bg-planner-sage-light',
          ].join(' ')}
          style={
            active && color
              ? { color }
              : undefined
          }
        >
          <PlusIcon className="size-3.5" />
        </button>
      )}
    </div>
  )
}

export function CategoryFilter({
  activeCategory,
  counts,
  onSelect,
  onAddToCategory,
}) {
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
        return (
          <CategoryChip
            key={slug}
            slug={slug}
            label={meta.nameKo}
            emoji={meta.emoji}
            count={counts?.[slug] ?? 0}
            active={activeCategory === slug}
            color={meta.color}
            onSelect={onSelect}
            onAdd={onAddToCategory}
          />
        )
      })}

      {(() => {
        const meta = CATEGORY_META.uncategorized
        return (
          <CategoryChip
            slug="uncategorized"
            label={meta.nameKo}
            emoji={meta.emoji}
            count={counts?.uncategorized ?? 0}
            active={activeCategory === 'uncategorized'}
            color={meta.color}
            dashed
            onSelect={onSelect}
            onAdd={onAddToCategory}
          />
        )
      })()}
    </div>
  )
}
