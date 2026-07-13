import { useState } from 'react'
import { getEffectiveCategorySlug } from '../../lib/memoryCategories.js'
import { formatRelativeTime } from '../../lib/memoryFormat.js'
import { CategoryBadge } from './CategoryBadge.jsx'
import { CategoryPicker } from './CategoryPicker.jsx'

export function MemoCard({
  memo,
  onSelect,
  onAssignCategory,
  selectMode = false,
  selected = false,
  onToggleSelect,
}) {
  const [showPicker, setShowPicker] = useState(false)
  const preview =
    memo.title || memo.content.split('\n')[0]?.slice(0, 80) || '빈 메모'
  const activeSlug = getEffectiveCategorySlug(memo)

  function handleBadgePress(event) {
    event.stopPropagation()
    if (selectMode) return
    setShowPicker((value) => !value)
  }

  function handleAssign(slug) {
    onAssignCategory?.(memo.id, slug)
    setShowPicker(false)
  }

  function handleCardActivate() {
    if (selectMode) {
      onToggleSelect?.(memo.id)
      return
    }
    onSelect(memo.id)
  }

  return (
    <div
      className={[
        'rounded-xl border bg-white p-4 shadow-soft transition',
        selectMode && selected
          ? 'border-planner-sage ring-2 ring-planner-sage/25'
          : 'border-planner-sand hover:border-planner-sage-muted',
      ].join(' ')}
    >
      <div className="mb-2 flex items-start gap-2">
        {selectMode && (
          <button
            type="button"
            role="checkbox"
            aria-checked={selected}
            aria-label="메모 선택"
            onClick={(event) => {
              event.stopPropagation()
              onToggleSelect?.(memo.id)
            }}
            className={[
              'mt-0.5 flex size-5 shrink-0 items-center justify-center rounded border transition',
              selected
                ? 'border-planner-sage bg-planner-sage text-white'
                : 'border-planner-sand bg-white text-transparent',
            ].join(' ')}
          >
            <svg viewBox="0 0 12 12" className="size-3" fill="none" aria-hidden>
              <path
                d="M2.5 6.2 4.8 8.5 9.5 3.5"
                stroke="currentColor"
                strokeWidth="1.6"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </button>
        )}

        <button
          type="button"
          onClick={handleCardActivate}
          className="min-w-0 flex-1 text-left"
        >
          <p className="line-clamp-2 font-medium text-planner-ink">{preview}</p>
        </button>

        {!selectMode && (
          <CategoryBadge
            memo={memo}
            pressable
            onPress={handleBadgePress}
            selected={showPicker}
          />
        )}
      </div>

      {!selectMode && showPicker && (
        <div className="mb-2" onClick={(event) => event.stopPropagation()}>
          <CategoryPicker
            compact
            activeSlug={activeSlug === 'uncategorized' ? null : activeSlug}
            onSelect={handleAssign}
          />
        </div>
      )}

      <button
        type="button"
        onClick={handleCardActivate}
        className="block w-full text-left"
      >
        <p className="line-clamp-2 text-sm text-planner-ink-muted">{memo.content}</p>
        <p className="mt-2 text-xs text-planner-ink-muted/70">
          {formatRelativeTime(memo.createdAt)}
        </p>
      </button>
    </div>
  )
}
