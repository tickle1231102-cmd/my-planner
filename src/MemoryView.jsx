import { useCallback, useEffect, useMemo, useState } from 'react'
import { useCloudSync } from './context/CloudSyncContext.jsx'
import {
  getEffectiveCategorySlug,
} from './lib/memoryCategories.js'
import { classifyMemoContent } from './lib/memoryClassifyClient.js'
import {
  countMemosByCategory,
  createMemoInData,
  deleteMemoInData,
  deleteMemosInData,
  filterMemos,
  getMemoById,
  updateMemoCategoryInData,
  updateMemoContentInData,
} from './lib/memoryStorage.js'
import { CategoryBadge } from './components/memory/CategoryBadge.jsx'
import { CategoryFilter } from './components/memory/CategoryFilter.jsx'
import { MemoCard } from './components/memory/MemoCard.jsx'
import { MemoryMindMap } from './components/memory/MemoryMindMap.jsx'
import { CategoryPicker } from './components/memory/CategoryPicker.jsx'
import { QuickCapture } from './components/memory/QuickCapture.jsx'
import { ImeSafeTextarea } from './components/ImeSafeTextarea.jsx'
import { TrashIcon } from './components/TrashIcon.jsx'

const TABS = [
  { id: 'home', label: '홈' },
  { id: 'memos', label: '기록' },
  { id: 'map', label: '맵' },
]

export default function MemoryView() {
  const { memoryData, updateMemory } = useCloudSync()
  const memos = memoryData?.memos ?? []

  const [tab, setTab] = useState('home')
  const [listCategory, setListCategory] = useState(null)
  const [selectedMemoId, setSelectedMemoId] = useState(null)
  const [isEditing, setIsEditing] = useState(false)
  const [editDraft, setEditDraft] = useState('')
  const [savingEdit, setSavingEdit] = useState(false)
  const [showCategoryPicker, setShowCategoryPicker] = useState(false)
  const [selectMode, setSelectMode] = useState(false)
  const [selectedIds, setSelectedIds] = useState(() => new Set())

  useEffect(() => {
    setIsEditing(false)
    setEditDraft('')
    setShowCategoryPicker(false)
  }, [selectedMemoId])

  useEffect(() => {
    if (tab !== 'memos') {
      setSelectMode(false)
      setSelectedIds(new Set())
    }
  }, [tab])

  useEffect(() => {
    setSelectedIds(new Set())
  }, [listCategory])

  const categoryCounts = useMemo(() => {
    const counts = countMemosByCategory(memos)
    return { all: memos.length, ...counts }
  }, [memos])

  const recentMemos = useMemo(
    () => filterMemos(memos, { limit: 10 }),
    [memos],
  )

  const filteredMemos = useMemo(
    () => filterMemos(memos, { category: listCategory || undefined }),
    [memos, listCategory],
  )

  const selectedMemo = useMemo(
    () => (selectedMemoId ? getMemoById(memos, selectedMemoId) : null),
    [memos, selectedMemoId],
  )

  const handleCreate = useCallback(
    async (content) => {
      const classification = await classifyMemoContent(content)
      let created = null
      updateMemory((prev) => {
        const next = createMemoInData(prev, content, classification)
        created = next.memos[0] ?? null
        return next
      })
      return created
    },
    [updateMemory],
  )

  const handleSelectMemo = useCallback((id) => {
    setSelectedMemoId(id)
    setTab('detail')
  }, [])

  const handleSelectCategory = useCallback((slug) => {
    setListCategory(slug)
    setTab('memos')
  }, [])

  const handleCategoryChange = useCallback(
    (slug) => {
      if (!selectedMemoId) return
      updateMemory((prev) => updateMemoCategoryInData(prev, selectedMemoId, slug))
      setShowCategoryPicker(false)
    },
    [selectedMemoId, updateMemory],
  )

  const handleAssignCategory = useCallback(
    (memoId, slug) => {
      updateMemory((prev) => updateMemoCategoryInData(prev, memoId, slug))
    },
    [updateMemory],
  )

  const handleDelete = useCallback(() => {
    if (!selectedMemoId) return
    if (!window.confirm('이 기록을 삭제할까요?')) return
    updateMemory((prev) => deleteMemoInData(prev, selectedMemoId))
    setSelectedMemoId(null)
    setTab('memos')
  }, [selectedMemoId, updateMemory])

  const exitSelectMode = useCallback(() => {
    setSelectMode(false)
    setSelectedIds(new Set())
  }, [])

  const enterSelectMode = useCallback(() => {
    setSelectMode(true)
    setSelectedIds(new Set())
  }, [])

  const handleToggleSelect = useCallback((id) => {
    setSelectedIds((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }, [])

  const handleSelectAllVisible = useCallback(() => {
    setSelectedIds((prev) => {
      const visibleIds = filteredMemos.map((memo) => memo.id)
      const allSelected =
        visibleIds.length > 0 && visibleIds.every((id) => prev.has(id))
      if (allSelected) return new Set()
      return new Set(visibleIds)
    })
  }, [filteredMemos])

  const handleDeleteSelected = useCallback(() => {
    if (selectedIds.size === 0) return
    const count = selectedIds.size
    if (!window.confirm(`선택한 ${count}개의 기록을 삭제할까요?`)) return
    const ids = [...selectedIds]
    updateMemory((prev) => deleteMemosInData(prev, ids))
    exitSelectMode()
  }, [exitSelectMode, selectedIds, updateMemory])

  const handleStartEdit = useCallback(() => {
    if (!selectedMemo) return
    setEditDraft(selectedMemo.content)
    setIsEditing(true)
  }, [selectedMemo])

  const handleCancelEdit = useCallback(() => {
    setIsEditing(false)
    setEditDraft('')
  }, [])

  const handleSaveEdit = useCallback(async () => {
    if (!selectedMemoId || savingEdit) return
    const trimmed = editDraft.trim()
    if (!trimmed) return

    setSavingEdit(true)
    try {
      const classification = selectedMemo?.userCategorySlug
        ? null
        : await classifyMemoContent(trimmed)

      updateMemory((prev) =>
        updateMemoContentInData(prev, selectedMemoId, trimmed, classification),
      )
      setIsEditing(false)
      setEditDraft('')
    } finally {
      setSavingEdit(false)
    }
  }, [
    editDraft,
    savingEdit,
    selectedMemo?.userCategorySlug,
    selectedMemoId,
    updateMemory,
  ])

  const activeSlug = selectedMemo ? getEffectiveCategorySlug(selectedMemo) : null

  return (
    <div className="space-y-4">
      {tab !== 'detail' && (
        <div className="flex gap-1 rounded-xl border border-planner-sand bg-planner-warm/50 p-1">
          {TABS.map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() => {
                setTab(item.id)
                setSelectedMemoId(null)
              }}
              className={[
                'flex-1 rounded-lg py-2 text-sm font-medium transition',
                tab === item.id
                  ? 'bg-white text-planner-sage shadow-soft'
                  : 'text-planner-ink-muted hover:text-planner-ink',
              ].join(' ')}
            >
              {item.label}
            </button>
          ))}
        </div>
      )}

      {tab === 'home' && (
        <div className="space-y-5">
          <div>
            <p className="text-[11px] font-medium tracking-[0.18em] text-planner-sage">
              MY MEMORY
            </p>
            <h2 className="mt-1 text-xl font-medium text-planner-ink">
              생각나는 대로 적어보세요
            </h2>
            <p className="mt-1 text-sm text-planner-ink-muted">
              키워드로 자동 분류하고, 카테고리별로 기억을 모아둡니다
            </p>
          </div>

          <QuickCapture onCreate={handleCreate} />

          <div>
            <h3 className="mb-3 text-sm font-medium text-planner-ink">카테고리</h3>
            <CategoryFilter
              activeCategory={null}
              counts={categoryCounts}
              onSelect={handleSelectCategory}
            />
          </div>

          <div>
            <div className="mb-3 flex items-center justify-between">
              <h3 className="text-sm font-medium text-planner-ink">최근 기록</h3>
              {memos.length > 0 && (
                <button
                  type="button"
                  onClick={() => setTab('memos')}
                  className="text-xs font-medium text-planner-sage hover:underline"
                >
                  전체 보기
                </button>
              )}
            </div>
            {recentMemos.length === 0 ? (
              <p className="rounded-xl border border-dashed border-planner-sand bg-planner-warm/30 p-8 text-center text-sm text-planner-ink-muted">
                아직 기록이 없습니다. 위에 첫 메모를 남겨보세요!
              </p>
            ) : (
              <div className="space-y-3">
                {recentMemos.map((memo) => (
                  <MemoCard
                    key={memo.id}
                    memo={memo}
                    onSelect={handleSelectMemo}
                    onAssignCategory={handleAssignCategory}
                  />
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {tab === 'memos' && (
        <div className="space-y-4">
          <div className="flex items-start justify-between gap-3">
            <div>
              <h2 className="text-lg font-medium text-planner-ink">전체 기록</h2>
              <p className="mt-0.5 text-sm text-planner-ink-muted">
                {selectMode
                  ? `${selectedIds.size}개 선택됨 · 총 ${filteredMemos.length}개`
                  : `${filteredMemos.length}개의 메모`}
              </p>
            </div>
            {filteredMemos.length > 0 && (
              <button
                type="button"
                onClick={() => {
                  if (selectMode) exitSelectMode()
                  else enterSelectMode()
                }}
                aria-label={selectMode ? '선택 취소' : '메모 선택 삭제'}
                aria-pressed={selectMode}
                className={[
                  'rounded-lg p-2 transition',
                  selectMode
                    ? 'bg-planner-rose-light text-planner-rose'
                    : 'text-planner-ink-muted hover:bg-planner-warm hover:text-planner-rose',
                ].join(' ')}
              >
                <TrashIcon className="size-5" />
              </button>
            )}
          </div>

          {selectMode && (
            <div className="flex flex-wrap items-center gap-2 rounded-xl border border-planner-sand bg-white p-2 shadow-soft">
              <button
                type="button"
                onClick={handleSelectAllVisible}
                className="rounded-lg px-3 py-1.5 text-xs font-medium text-planner-sage transition hover:bg-planner-sage-light"
              >
                {filteredMemos.length > 0 &&
                filteredMemos.every((memo) => selectedIds.has(memo.id))
                  ? '선택 해제'
                  : '전체 선택'}
              </button>
              <button
                type="button"
                onClick={exitSelectMode}
                className="rounded-lg px-3 py-1.5 text-xs text-planner-ink-muted transition hover:bg-planner-warm"
              >
                취소
              </button>
              <button
                type="button"
                onClick={handleDeleteSelected}
                disabled={selectedIds.size === 0}
                className="ml-auto rounded-lg bg-planner-rose px-3 py-1.5 text-xs font-medium text-white transition hover:bg-planner-rose/90 disabled:cursor-not-allowed disabled:opacity-40"
              >
                {selectedIds.size > 0 ? `${selectedIds.size}개 삭제` : '삭제'}
              </button>
            </div>
          )}

          <CategoryFilter
            activeCategory={listCategory}
            counts={categoryCounts}
            onSelect={setListCategory}
          />

          {filteredMemos.length === 0 ? (
            <p className="rounded-xl border border-dashed border-planner-sand bg-planner-warm/30 p-8 text-center text-sm text-planner-ink-muted">
              {listCategory === 'uncategorized'
                ? '미분류 메모 — 미분류 버튼을 눌러 카테고리를 지정하세요'
                : listCategory
                  ? '이 카테고리에 기록이 없습니다'
                  : '아직 기록이 없습니다'}
            </p>
          ) : (
            <div className="space-y-3">
              {filteredMemos.map((memo) => (
                <MemoCard
                  key={memo.id}
                  memo={memo}
                  onSelect={handleSelectMemo}
                  onAssignCategory={handleAssignCategory}
                  selectMode={selectMode}
                  selected={selectedIds.has(memo.id)}
                  onToggleSelect={handleToggleSelect}
                />
              ))}
            </div>
          )}
        </div>
      )}

      {tab === 'map' && (
        <MemoryMindMap
          memos={memos}
          onSelectCategory={handleSelectCategory}
          onSelectMemo={handleSelectMemo}
        />
      )}

      {tab === 'detail' && selectedMemo && (
        <div className="space-y-6">
          <div className="flex items-center justify-between gap-2">
            <button
              type="button"
              onClick={() => {
                setSelectedMemoId(null)
                setTab('memos')
              }}
              className="text-sm text-planner-ink-muted transition hover:text-planner-sage"
            >
              ← 목록
            </button>
            <div className="flex items-center gap-2">
              {isEditing ? (
                <>
                  <button
                    type="button"
                    onClick={handleCancelEdit}
                    className="rounded-lg border border-planner-sand px-3 py-1 text-sm text-planner-ink-muted transition hover:bg-planner-warm"
                  >
                    취소
                  </button>
                  <button
                    type="button"
                    onClick={handleSaveEdit}
                    disabled={!editDraft.trim() || savingEdit}
                    className="rounded-lg bg-planner-sage px-3 py-1 text-sm font-medium text-white transition hover:bg-planner-sage/90 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {savingEdit ? '분류 중…' : '저장'}
                  </button>
                </>
              ) : (
                <>
                  <button
                    type="button"
                    onClick={handleStartEdit}
                    className="rounded-lg border border-planner-sage-muted/50 px-3 py-1 text-sm font-medium text-planner-sage transition hover:bg-planner-sage-light"
                  >
                    수정
                  </button>
                  <button
                    type="button"
                    onClick={handleDelete}
                    className="rounded-lg px-2 py-1 text-sm text-planner-rose transition hover:bg-planner-rose-light"
                  >
                    삭제
                  </button>
                </>
              )}
            </div>
          </div>

          <div className="rounded-2xl border border-planner-sand bg-white p-5 shadow-soft">
            <div className="mb-3 flex flex-wrap items-center gap-2">
              <CategoryBadge
                memo={selectedMemo}
                size="md"
                pressable={!isEditing}
                onPress={() => setShowCategoryPicker((value) => !value)}
                selected={showCategoryPicker}
              />
              {selectedMemo.confidence != null && (
                <span className="text-xs text-planner-ink-muted">
                  분류 신뢰도 {Math.round(selectedMemo.confidence * 100)}%
                </span>
              )}
            </div>

            {showCategoryPicker && !isEditing && (
              <div className="mb-4">
                <CategoryPicker
                  activeSlug={activeSlug === 'uncategorized' ? null : activeSlug}
                  onSelect={handleCategoryChange}
                />
              </div>
            )}

            {isEditing ? (
              <ImeSafeTextarea
                value={editDraft}
                onChange={setEditDraft}
                rows={8}
                className="w-full resize-y rounded-xl border border-planner-sand bg-planner-cream/40 px-4 py-3 text-sm leading-relaxed text-planner-ink focus:border-planner-sage-muted focus:outline-none focus:ring-2 focus:ring-planner-sage-light"
                autoFocus
              />
            ) : (
              <>
                <h2 className="text-xl font-medium text-planner-ink">
                  {selectedMemo.title || '제목 없음'}
                </h2>
                <p className="mt-4 whitespace-pre-wrap text-sm leading-relaxed text-planner-ink">
                  {selectedMemo.content}
                </p>
              </>
            )}

            <p className="mt-4 text-xs text-planner-ink-muted">
              작성 {new Date(selectedMemo.createdAt).toLocaleString('ko-KR')}
              {selectedMemo.updatedAt !== selectedMemo.createdAt && (
                <>
                  {' · '}
                  수정 {new Date(selectedMemo.updatedAt).toLocaleString('ko-KR')}
                </>
              )}
            </p>
          </div>
        </div>
      )}

      {tab === 'detail' && !selectedMemo && (
        <p className="text-sm text-planner-ink-muted">기록을 찾을 수 없습니다.</p>
      )}
    </div>
  )
}
