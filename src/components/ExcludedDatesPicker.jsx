import { useMemo, useState } from 'react'

const DAY_LABELS = ['일', '월', '화', '수', '목', '금', '토']

function parseLocalDate(dateStr) {
  const [year, month, day] = dateStr.split('-').map(Number)
  return new Date(year, month - 1, day)
}

function formatDateKey(date) {
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const d = String(date.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

function buildMonthCells(year, month) {
  const firstDay = new Date(year, month, 1)
  const daysInMonth = new Date(year, month + 1, 0).getDate()
  const leading = firstDay.getDay()
  const cells = []

  for (let i = 0; i < leading; i += 1) cells.push(null)
  for (let day = 1; day <= daysInMonth; day += 1) {
    const date = new Date(year, month, day)
    date.setHours(0, 0, 0, 0)
    cells.push(date)
  }
  while (cells.length % 7 !== 0) cells.push(null)

  return cells
}

function monthInRange(year, month, startDate, endDate) {
  const monthStart = `${year}-${String(month + 1).padStart(2, '0')}-01`
  const monthEnd = `${year}-${String(month + 1).padStart(2, '0')}-${String(new Date(year, month + 1, 0).getDate()).padStart(2, '0')}`
  return monthEnd >= startDate && monthStart <= endDate
}

export default function ExcludedDatesPicker({
  startDate,
  endDate,
  value = [],
  onChange,
  disabled = false,
}) {
  const rangeStart = startDate || ''
  const rangeEnd = endDate || ''
  const validRange = rangeStart && rangeEnd && rangeEnd >= rangeStart

  const initialMonth = useMemo(() => {
    if (!validRange) return { year: new Date().getFullYear(), month: new Date().getMonth() }
    const start = parseLocalDate(rangeStart)
    return { year: start.getFullYear(), month: start.getMonth() }
  }, [validRange, rangeStart])

  const [viewYear, setViewYear] = useState(initialMonth.year)
  const [viewMonth, setViewMonth] = useState(initialMonth.month)

  const selectedSet = useMemo(() => new Set(value), [value])
  const cells = useMemo(() => buildMonthCells(viewYear, viewMonth), [viewYear, viewMonth])

  const canGoPrev = validRange && monthInRange(
    viewMonth === 0 ? viewYear - 1 : viewYear,
    viewMonth === 0 ? 11 : viewMonth - 1,
    rangeStart,
    rangeEnd,
  )
  const canGoNext = validRange && monthInRange(
    viewMonth === 11 ? viewYear + 1 : viewYear,
    viewMonth === 11 ? 0 : viewMonth + 1,
    rangeStart,
    rangeEnd,
  )

  function isSelectable(date) {
    if (!date || !validRange) return false
    const key = formatDateKey(date)
    return key >= rangeStart && key <= rangeEnd
  }

  function toggleDate(date) {
    if (!isSelectable(date) || disabled) return
    const key = formatDateKey(date)
    const next = selectedSet.has(key)
      ? value.filter((item) => item !== key)
      : [...value, key].sort()
    onChange?.(next)
  }

  function goPrev() {
    if (!canGoPrev) return
    if (viewMonth === 0) {
      setViewYear((y) => y - 1)
      setViewMonth(11)
    } else {
      setViewMonth((m) => m - 1)
    }
  }

  function goNext() {
    if (!canGoNext) return
    if (viewMonth === 11) {
      setViewYear((y) => y + 1)
      setViewMonth(0)
    } else {
      setViewMonth((m) => m + 1)
    }
  }

  if (!validRange) {
    return (
      <p className="rounded-xl border border-planner-sand bg-planner-warm/40 px-3 py-2 text-xs text-planner-ink-muted">
        시작일과 마감일을 먼저 선택해 주세요.
      </p>
    )
  }

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between gap-2">
        <button
          type="button"
          onClick={goPrev}
          disabled={disabled || !canGoPrev}
          className="rounded-lg px-2 py-1 text-sm text-planner-ink-muted transition hover:bg-planner-warm disabled:opacity-30"
          aria-label="이전 달"
        >
          ‹
        </button>
        <p className="text-sm font-medium text-planner-ink">
          {viewYear}년 {viewMonth + 1}월
        </p>
        <button
          type="button"
          onClick={goNext}
          disabled={disabled || !canGoNext}
          className="rounded-lg px-2 py-1 text-sm text-planner-ink-muted transition hover:bg-planner-warm disabled:opacity-30"
          aria-label="다음 달"
        >
          ›
        </button>
      </div>

      <p className="text-[11px] text-planner-ink-muted">
        달력에서 날짜를 눌러 제외할 날을 선택하세요. 다시 누르면 해제됩니다.
      </p>

      <div className="rounded-xl border border-planner-sand bg-planner-warm/20 p-2">
        <div className="grid grid-cols-7 gap-1">
          {DAY_LABELS.map((label, index) => (
            <div
              key={label}
              className={[
                'py-1 text-center text-[10px] font-medium',
                index === 0 ? 'text-red-500' : 'text-planner-ink-muted',
              ].join(' ')}
            >
              {label}
            </div>
          ))}
          {cells.map((date, index) => {
            if (!date) {
              return <div key={`empty-${index}`} className="h-8" />
            }

            const key = formatDateKey(date)
            const selectable = isSelectable(date)
            const selected = selectedSet.has(key)
            const isSunday = date.getDay() === 0

            return (
              <button
                key={key}
                type="button"
                disabled={disabled || !selectable}
                onClick={() => toggleDate(date)}
                className={[
                  'h-8 rounded-lg text-xs transition',
                  !selectable && 'cursor-not-allowed opacity-25',
                  selectable && !selected && 'hover:bg-planner-sage-light/60',
                  selected && 'bg-planner-sage font-medium text-white',
                  !selected && isSunday && selectable && 'text-red-500',
                  !selected && !isSunday && selectable && 'text-planner-ink',
                ]
                  .filter(Boolean)
                  .join(' ')}
                aria-pressed={selected}
                aria-label={`${key}${selected ? ' 제외됨' : ''}`}
              >
                {date.getDate()}
              </button>
            )
          })}
        </div>
      </div>

      {value.length > 0 ? (
        <div className="flex flex-wrap gap-1.5">
          {value.map((dateStr) => (
            <button
              key={dateStr}
              type="button"
              disabled={disabled}
              onClick={() => onChange?.(value.filter((item) => item !== dateStr))}
              className="rounded-full bg-planner-sage-light px-2.5 py-1 text-[11px] text-planner-sage transition hover:bg-planner-sage hover:text-white disabled:opacity-50"
              title="클릭하여 제외 해제"
            >
              {dateStr} ×
            </button>
          ))}
        </div>
      ) : (
        <p className="text-[11px] text-planner-ink-muted/70">선택된 제외 날짜 없음</p>
      )}
    </div>
  )
}
