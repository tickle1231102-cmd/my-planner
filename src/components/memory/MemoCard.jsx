import { useState } from 'react'
import { getEffectiveCategorySlug } from '../../lib/memoryCategories.js'
import { formatRelativeTime } from '../../lib/memoryFormat.js'
import { CategoryBadge } from './CategoryBadge.jsx'
import { CategoryPicker } from './CategoryPicker.jsx'

export function MemoCard({ memo, onSelect, onAssignCategory }) {
  const [showPicker, setShowPicker] = useState(false)
  const preview =
    memo.title || memo.content.split('\n')[0]?.slice(0, 80) || '빈 메모'
  const activeSlug = getEffectiveCategorySlug(memo)

  function handleBadgePress(event) {
    event.stopPropagation()
    setShowPicker((value) => !value)
  }

  function handleAssign(slug) {
    onAssignCategory?.(memo.id, slug)
    setShowPicker(false)
  }

  return (
    <div className="rounded-xl border border-planner-sand bg-white p-4 shadow-soft transition hover:border-planner-sage-muted">
      <div className="mb-2 flex items-start justify-between gap-2">
        <button
          type="button"
          onClick={() => onSelect(memo.id)}
          className="min-w-0 flex-1 text-left"
        >
          <p className="line-clamp-2 font-medium text-planner-ink">{preview}</p>
        </button>
        <CategoryBadge
          memo={memo}
          pressable
          onPress={handleBadgePress}
          selected={showPicker}
        />
      </div>

      {showPicker && (
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
        onClick={() => onSelect(memo.id)}
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
