import { useEffect, useRef, useState } from 'react'
import { CATEGORY_META } from '../../lib/memoryCategories.js'
import { CategoryBadge } from './CategoryBadge.jsx'
import { ImeSafeTextarea } from '../ImeSafeTextarea.jsx'

export function QuickCapture({
  onCreate,
  forcedCategory = null,
  onCancel = null,
  autoFocus = false,
}) {
  const [content, setContent] = useState('')
  const [lastMemo, setLastMemo] = useState(null)
  const [saving, setSaving] = useState(false)
  const formRef = useRef(null)
  const textareaRef = useRef(null)
  const submittingRef = useRef(false)
  const submitAfterCompositionRef = useRef(false)

  const categoryMeta = forcedCategory ? CATEGORY_META[forcedCategory] : null

  useEffect(() => {
    if (!autoFocus) return
    const timer = setTimeout(() => textareaRef.current?.focus(), 0)
    return () => clearTimeout(timer)
  }, [autoFocus, forcedCategory])

  async function handleSubmit(event) {
    event.preventDefault()
    if (submittingRef.current) return

    const raw = textareaRef.current?.value ?? content
    const trimmed = raw.trim()
    if (!trimmed) return

    submittingRef.current = true
    setSaving(true)
    try {
      const created = await onCreate(trimmed, forcedCategory || undefined)
      if (created) {
        setLastMemo(created)
      }
      setContent('')
      if (textareaRef.current) {
        textareaRef.current.value = ''
      }
    } finally {
      submittingRef.current = false
      setSaving(false)
      submitAfterCompositionRef.current = false
    }
  }

  function requestSave() {
    formRef.current?.requestSubmit()
  }

  function handleKeyDown(event) {
    if (event.key !== 'Enter' || event.shiftKey) return
    if (event.repeat) return

    event.preventDefault()

    if (event.nativeEvent.isComposing || event.isComposing) {
      submitAfterCompositionRef.current = true
      return
    }

    requestSave()
  }

  function handleCompositionEnd() {
    if (!submitAfterCompositionRef.current) return
    submitAfterCompositionRef.current = false
    setTimeout(() => requestSave(), 0)
  }

  return (
    <div className="rounded-2xl border border-planner-sand bg-white p-4 shadow-soft">
      {categoryMeta && (
        <div className="mb-3 flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <span
              className="rounded-full px-2.5 py-1 text-xs font-medium text-white"
              style={{ backgroundColor: categoryMeta.color }}
            >
              {categoryMeta.emoji} {categoryMeta.nameKo}
            </span>
            <p className="text-xs text-planner-ink-muted">이 카테고리에 추가</p>
          </div>
          {onCancel && (
            <button
              type="button"
              onClick={onCancel}
              className="rounded-lg px-2 py-1 text-xs text-planner-ink-muted transition hover:bg-planner-warm hover:text-planner-ink"
            >
              닫기
            </button>
          )}
        </div>
      )}

      <form ref={formRef} onSubmit={handleSubmit}>
        <ImeSafeTextarea
          ref={textareaRef}
          value={content}
          onChange={(value) => setContent(value)}
          onKeyDown={handleKeyDown}
          onCompositionEnd={handleCompositionEnd}
          placeholder={
            categoryMeta
              ? `${categoryMeta.nameKo}에 남길 메모를 적어보세요`
              : '무엇이든 자유롭게 적어보세요. 자동으로 분류해 드립니다.'
          }
          rows={4}
          className="w-full resize-none rounded-xl border border-planner-sand bg-planner-cream/40 px-4 py-3 text-sm text-planner-ink placeholder:text-planner-ink-muted/50 focus:border-planner-sage-muted focus:outline-none focus:ring-2 focus:ring-planner-sage-light"
        />
        <div className="mt-3 flex items-center justify-between">
          <p className="text-xs text-planner-ink-muted">
            Enter로 저장 · Shift+Enter로 줄바꿈
          </p>
          <button
            type="submit"
            disabled={!content.trim() || saving}
            className="rounded-xl bg-planner-sage px-4 py-2 text-sm font-medium text-white transition hover:bg-planner-sage/90 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {saving
              ? categoryMeta
                ? '저장 중…'
                : '분류 중…'
              : '저장'}
          </button>
        </div>
      </form>

      {lastMemo && !forcedCategory && (
        <div className="mt-4 rounded-xl bg-planner-sage-light/60 p-3">
          <p className="mb-2 text-xs font-medium text-planner-sage">방금 분류됨</p>
          <div className="flex items-center gap-2">
            <CategoryBadge memo={lastMemo} size="md" />
            {lastMemo.confidence != null && (
              <span className="text-xs text-planner-ink-muted">
                신뢰도 {Math.round(lastMemo.confidence * 100)}%
              </span>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
