import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from 'react'
import WeeklyView, { getMondayOfWeek } from './WeeklyView.jsx'
import UserKeyGate from './components/UserKeyGate.jsx'
import SupabaseSetup from './components/SupabaseSetup.jsx'
import { useCloudSync } from './context/CloudSyncContext.jsx'
import { DEFAULT_COLUMNS } from './lib/plannerStorage.js'

const AVAILABLE_YEARS = [2025, 2026, 2027, 2028]
const DAY_LABELS = ['월', '화', '수', '목', '금', '토', '일']
const MONTH_LABELS = [
  '1월', '2월', '3월', '4월', '5월', '6월',
  '7월', '8월', '9월', '10월', '11월', '12월',
]
const HEAVENLY = ['갑', '을', '병', '정', '무', '기', '경', '신', '임', '계']
const EARTHLY = ['자', '축', '인', '묘', '진', '사', '오', '미', '신', '유', '술', '해']

const ROW_MIN_HEIGHT = 36
const MONTH_COL_WIDTH = 34
const DAY_COL_MIN = 50
const NOTE_COL_MIN = 100

function pad(n) {
  return String(n).padStart(2, '0')
}

function isSameDay(a, b) {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  )
}

function formatDateLabel(date, short = false) {
  if (short) return `${date.getMonth() + 1}/${date.getDate()}`
  return `${date.getMonth() + 1}월 ${date.getDate()}일`
}

function getKoreanZodiac(year) {
  return HEAVENLY[(year - 4) % 10] + EARTHLY[(year - 4) % 12] + '년'
}

function getWeekId(days) {
  const monday = days[0]
  return `${monday.getFullYear()}-${pad(monday.getMonth() + 1)}-${pad(monday.getDate())}`
}

function getDominantMonth(days, year) {
  const counts = new Map()
  days.forEach((d) => {
    if (d.getFullYear() !== year) return
    const m = d.getMonth()
    counts.set(m, (counts.get(m) || 0) + 1)
  })
  if (counts.size === 0) return days[3].getMonth()
  return [...counts.entries()].sort((a, b) => b[1] - a[1])[0][0]
}

function generateWeeks(year) {
  const weeks = []
  const jan1 = new Date(year, 0, 1)
  const monday = new Date(jan1)
  const dow = monday.getDay()
  monday.setDate(monday.getDate() + (dow === 0 ? -6 : 1 - dow))

  const dec31 = new Date(year, 11, 31)

  while (true) {
    const days = Array.from({ length: 7 }, (_, i) => {
      const d = new Date(monday)
      d.setDate(monday.getDate() + i)
      return d
    })

    weeks.push({
      id: getWeekId(days),
      days,
      primaryMonth: getDominantMonth(days, year),
    })

    if (days.some((d) => isSameDay(d, dec31))) break
    monday.setDate(monday.getDate() + 7)
  }

  return weeks
}

function buildMonthSpans(weeks) {
  const spans = new Map()
  let i = 0
  while (i < weeks.length) {
    const month = weeks[i].primaryMonth
    let count = 0
    while (i + count < weeks.length && weeks[i + count].primaryMonth === month) {
      count++
    }
    spans.set(i, { month, count })
    i += count
  }
  return spans
}

function usePlannerStorage(year) {
  const { ready, annualData, updateAnnual } = useCloudSync()
  const hydratedRef = useRef(false)

  const [columns, setColumns] = useState(() => annualData.columns)
  const [weekData, setWeekData] = useState(() => annualData.weekData)

  useEffect(() => {
    if (!ready || hydratedRef.current) return
    setColumns(annualData.columns)
    setWeekData(annualData.weekData)
    hydratedRef.current = true
  }, [ready, annualData])

  useEffect(() => {
    if (!ready || !hydratedRef.current) return
    updateAnnual({ year, columns, weekData })
  }, [year, columns, weekData, ready, updateAnnual])

  const updateCell = useCallback((weekId, columnId, value) => {
    setWeekData((prev) => ({
      ...prev,
      [weekId]: { ...prev[weekId], [columnId]: value },
    }))
  }, [])

  const addColumn = useCallback((label) => {
    const trimmed = label.trim()
    if (!trimmed) return
    setColumns((prev) => [
      ...prev,
      { id: `col-${Date.now()}`, label: trimmed },
    ])
  }, [])

  const removeColumn = useCallback((columnId) => {
    if (DEFAULT_COLUMNS.some((c) => c.id === columnId)) return
    setColumns((prev) => prev.filter((c) => c.id !== columnId))
    setWeekData((prev) => {
      const next = { ...prev }
      Object.keys(next).forEach((weekId) => {
        const { [columnId]: _, ...rest } = next[weekId]
        next[weekId] = rest
      })
      return next
    })
  }, [])

  return { columns, weekData, updateCell, addColumn, removeColumn }
}

function columnHeaderColor(columnId) {
  if (columnId === 'schedule') return 'bg-planner-mist-light text-planner-mist'
  if (columnId === 'goals') return 'bg-planner-rose-light text-planner-rose'
  return 'bg-planner-warm text-planner-ink-muted'
}

function ColumnHeader({ column, onRemove }) {
  const isDefault = DEFAULT_COLUMNS.some((c) => c.id === column.id)

  return (
    <div
      className={`group relative flex min-h-[30px] items-center justify-center border-r border-planner-sand/60 px-1.5 py-1 text-center text-[11px] font-medium tracking-wide last:border-r-0 ${columnHeaderColor(column.id)}`}
    >
      <span>{column.label}</span>
      {!isDefault && onRemove && (
        <button
          type="button"
          onClick={() => onRemove(column.id)}
          className="absolute right-1 top-1 hidden h-5 w-5 items-center justify-center rounded-full bg-white/80 text-[10px] text-planner-ink-muted shadow-sm transition hover:bg-white hover:text-red-500 group-hover:flex"
          aria-label={`${column.label} 열 삭제`}
        >
          ×
        </button>
      )}
    </div>
  )
}

function CalendarCell({ date, year, isToday, isWeekend, compact, onSelect }) {
  const inYear = date.getFullYear() === year

  const className = [
    'flex w-full flex-col items-center justify-center gap-0 border-r border-planner-sand/50 text-center leading-none transition last:border-r-0',
    compact
      ? 'min-h-[34px] px-0.5 py-0.5 text-[10px]'
      : 'min-h-[36px] px-0.5 py-0.5 text-[11px]',
    !inYear && 'text-planner-ink-muted/35',
    inYear && isWeekend && !isToday && 'bg-planner-weekend/60',
    isToday && 'bg-planner-today font-semibold text-planner-ink ring-1 ring-inset ring-planner-today-ring/50',
    onSelect && inYear && 'cursor-pointer hover:bg-planner-sage-light/50 active:bg-planner-sage-light',
  ]
    .filter(Boolean)
    .join(' ')

  const content = (
    <>
      <span className={inYear ? 'text-planner-ink' : ''}>
        {formatDateLabel(date, true)}
      </span>
      {isToday && (
        <span className="mt-px text-[8px] font-medium leading-none text-planner-today-ring">
          오늘
        </span>
      )}
    </>
  )

  if (onSelect && inYear) {
    return (
      <button type="button" onClick={() => onSelect(date)} className={className}>
        {content}
      </button>
    )
  }

  return <div className={className}>{content}</div>
}

function AddColumnModal({ open, onClose, onAdd }) {
  const [label, setLabel] = useState('')
  const inputRef = useRef(null)

  useEffect(() => {
    if (open) {
      setLabel('')
      setTimeout(() => inputRef.current?.focus(), 50)
    }
  }, [open])

  if (!open) return null

  const handleSubmit = (e) => {
    e.preventDefault()
    onAdd(label)
    onClose()
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-planner-ink/20 p-4 backdrop-blur-sm sm:items-center"
      onClick={onClose}
      role="presentation"
    >
      <form
        onClick={(e) => e.stopPropagation()}
        onSubmit={handleSubmit}
        className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-soft"
      >
        <h3 className="mb-1 text-base font-medium text-planner-ink">새 항목 추가</h3>
        <p className="mb-4 text-sm text-planner-ink-muted">
          주차별로 기록할 열 이름을 입력하세요.
        </p>
        <input
          ref={inputRef}
          type="text"
          value={label}
          onChange={(e) => setLabel(e.target.value)}
          placeholder="예: 메모, 감사일기"
          className="mb-4 w-full rounded-xl border border-planner-sand bg-planner-cream px-4 py-2.5 text-sm text-planner-ink placeholder:text-planner-ink-muted/50 focus:border-planner-sage-muted focus:outline-none focus:ring-2 focus:ring-planner-sage-light"
        />
        <div className="flex gap-2">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 rounded-xl border border-planner-sand py-2.5 text-sm text-planner-ink-muted transition hover:bg-planner-warm"
          >
            취소
          </button>
          <button
            type="submit"
            disabled={!label.trim()}
            className="flex-1 rounded-xl bg-planner-sage py-2.5 text-sm font-medium text-white transition hover:bg-planner-sage/90 disabled:opacity-40"
          >
            추가
          </button>
        </div>
      </form>
    </div>
  )
}

function MobileTabBar({ active, onChange }) {
  return (
    <div className="flex border-t border-planner-sand bg-planner-cream/95 lg:hidden">
      {[
        { id: 'calendar', label: '달력' },
        { id: 'notes', label: '일정 · 목표' },
      ].map((tab) => (
        <button
          key={tab.id}
          type="button"
          onClick={() => onChange(tab.id)}
          className={[
            'flex-1 py-3 text-sm font-medium transition',
            active === tab.id
              ? 'border-t-2 border-planner-sage text-planner-sage -mt-px'
              : 'text-planner-ink-muted',
          ].join(' ')}
        >
          {tab.label}
        </button>
      ))}
    </div>
  )
}

function YearNavigator({ year, onChange }) {
  const index = AVAILABLE_YEARS.indexOf(year)
  const canPrev = index > 0
  const canNext = index < AVAILABLE_YEARS.length - 1

  return (
    <div className="flex shrink-0 items-center justify-center gap-4 border-b border-planner-sand bg-planner-year-gold/55 px-4 py-2.5">
      <button
        type="button"
        disabled={!canPrev}
        onClick={() => canPrev && onChange(AVAILABLE_YEARS[index - 1])}
        className="flex size-8 items-center justify-center rounded-full border border-planner-sand/80 bg-white/80 text-planner-ink-muted transition hover:border-planner-sage-muted hover:bg-white hover:text-planner-sage disabled:cursor-not-allowed disabled:opacity-30"
        aria-label="이전 연도"
      >
        ‹
      </button>
      <p className="min-w-[140px] text-center text-sm font-medium tracking-wide text-planner-ink sm:text-base">
        {year}년 {getKoreanZodiac(year)}
      </p>
      <button
        type="button"
        disabled={!canNext}
        onClick={() => canNext && onChange(AVAILABLE_YEARS[index + 1])}
        className="flex size-8 items-center justify-center rounded-full border border-planner-sand/80 bg-white/80 text-planner-ink-muted transition hover:border-planner-sage-muted hover:bg-white hover:text-planner-sage disabled:cursor-not-allowed disabled:opacity-30"
        aria-label="다음 연도"
      >
        ›
      </button>
    </div>
  )
}

function scrollToTodayAnchor(behavior = 'smooth') {
  const todayEl = [...document.querySelectorAll('[data-today-anchor]')].find(
    (el) => el.getClientRects().length > 0,
  )
  if (!todayEl) return false

  todayEl.scrollIntoView({ behavior, block: 'center' })
  return true
}

function PlannerGrid({
  weeks,
  year,
  today,
  columns,
  weekData,
  updateCell,
  removeColumn,
  onAddColumn,
  monthSpans,
  compact,
  onDateSelect,
}) {
  const monthCol = compact ? '30px' : `${MONTH_COL_WIDTH}px`
  const dayCol = compact ? `minmax(40px, 1fr)` : `minmax(${DAY_COL_MIN}px, 1fr)`
  const noteCol = compact ? `minmax(100px, 1fr)` : `minmax(${NOTE_COL_MIN}px, 1fr)`

  const gridCols = `${monthCol} repeat(7, ${dayCol}) ${columns.map(() => noteCol).join(' ')} 36px`

  return (
    <div className="overflow-x-auto">
      <div
        className="min-w-max"
        style={{ display: 'grid', gridTemplateColumns: gridCols }}
      >
        {/* Column headers + memo labels */}
        <div className="border-b border-r border-planner-sand bg-planner-warm" />
        <div
          className="col-span-7 flex items-center justify-center border-b border-r border-planner-sand bg-planner-sage-light/50 py-0.5 text-[10px] font-medium text-planner-sage"
        >
          달력
        </div>
        <div
          className="flex items-center justify-center border-b border-r border-planner-sand bg-planner-warm py-1 text-[11px] font-medium text-planner-ink-muted"
          style={{ gridColumn: `span ${columns.length}` }}
        >
          메모
        </div>
        <button
          type="button"
          onClick={onAddColumn}
          className="flex items-center justify-center border-b border-planner-sand bg-planner-warm text-base text-planner-sage transition hover:bg-planner-sage-light"
          aria-label="항목 추가"
        >
          +
        </button>

        <div className="sticky top-0 z-10 border-b border-r border-planner-sand bg-planner-warm" />
        {DAY_LABELS.map((day, i) => (
          <div
            key={day}
            className={[
              'sticky top-0 z-10 flex items-center justify-center border-b border-r border-planner-sand/60 py-1 text-[11px] font-medium last:border-r-0',
              i >= 5
                ? 'bg-planner-sage-light/80 text-planner-sage'
                : 'bg-planner-sage-light text-planner-sage',
            ].join(' ')}
          >
            {day}
          </div>
        ))}
        {columns.map((col) => (
          <ColumnHeader key={col.id} column={col} onRemove={removeColumn} />
        ))}
        <div className="sticky top-0 z-10 border-b border-planner-sand bg-planner-warm" />

        {/* Week rows */}
        {weeks.map((week, weekIndex) => {
          const monthInfo = monthSpans.get(weekIndex)
          const isEvenMonth = week.primaryMonth % 2 === 0
          const rowBg = isEvenMonth ? 'bg-white' : 'bg-planner-cream/50'

          return (
            <div key={week.id} className="contents">
              {monthInfo && (
                <div
                  className={`flex items-center justify-center border-b border-r border-planner-sand text-[11px] font-medium text-planner-ink-muted ${rowBg} ${compact ? 'text-[10px]' : ''}`}
                  style={{
                    gridRow: `span ${monthInfo.count}`,
                    backgroundColor: 'rgba(240, 235, 227, 0.85)',
                  }}
                >
                  {MONTH_LABELS[monthInfo.month]}
                </div>
              )}

              {week.days.map((date, i) => {
                const isToday = isSameDay(date, today) && year === today.getFullYear()
                return (
                  <div
                    key={i}
                    data-today-anchor={isToday ? 'true' : undefined}
                    className={`border-b border-planner-sand/60 ${rowBg} ${isToday ? 'scroll-mt-28' : ''}`}
                  >
                    <CalendarCell
                      date={date}
                      year={year}
                      isToday={isToday}
                      isWeekend={i >= 5}
                      compact={compact}
                      onSelect={onDateSelect}
                    />
                  </div>
                )
              })}

              {columns.map((col) => (
                <div
                  key={col.id}
                  className={`border-b border-r border-planner-sand/40 ${rowBg}`}
                  style={{ minHeight: ROW_MIN_HEIGHT }}
                >
                  <textarea
                    value={weekData[week.id]?.[col.id] || ''}
                    onChange={(e) => updateCell(week.id, col.id, e.target.value)}
                    placeholder={`${col.label}`}
                    className="h-full w-full bg-transparent px-2 py-1 text-xs leading-snug text-planner-ink placeholder:text-planner-ink-muted/40 transition focus:bg-white/80 focus:outline-none focus:ring-1 focus:ring-inset focus:ring-planner-sage-muted/40"
                    rows={1}
                  />
                </div>
              ))}

              <div className={`border-b border-planner-sand/40 ${rowBg}`} />
            </div>
          )
        })}
      </div>
    </div>
  )
}

function MobileCalendar({ weeks, year, today, monthSpans, onDateSelect }) {
  return (
    <div className="overflow-x-auto">
      <div
        className="min-w-max"
        style={{
          display: 'grid',
          gridTemplateColumns: `30px repeat(7, minmax(40px, 1fr))`,
        }}
      >
        <div className="border-b border-r border-planner-sand bg-planner-warm" />
        <div className="col-span-7 border-b border-r border-planner-sand bg-planner-sage-light/40" />
        {DAY_LABELS.map((day, i) => (
          <div
            key={day}
            className={[
              'flex items-center justify-center border-b border-r border-planner-sand/60 py-1 text-[10px] font-medium',
              i >= 5 ? 'bg-planner-sage-light/80 text-planner-sage' : 'bg-planner-sage-light text-planner-sage',
            ].join(' ')}
          >
            {day}
          </div>
        ))}

        {weeks.map((week, weekIndex) => {
          const monthInfo = monthSpans.get(weekIndex)
          const isEvenMonth = week.primaryMonth % 2 === 0
          const rowBg = isEvenMonth ? 'bg-white' : 'bg-planner-cream/50'

          return (
            <div key={week.id} className="contents">
              {monthInfo && (
                <div
                  className="flex items-center justify-center border-b border-r border-planner-sand text-[10px] font-medium text-planner-ink-muted"
                  style={{ gridRow: `span ${monthInfo.count}`, backgroundColor: 'rgba(240, 235, 227, 0.85)' }}
                >
                  {MONTH_LABELS[monthInfo.month]}
                </div>
              )}
              {week.days.map((date, i) => {
                const isToday = isSameDay(date, today) && year === today.getFullYear()
                return (
                  <div
                    key={i}
                    data-today-anchor={isToday ? 'true' : undefined}
                    className={`border-b border-planner-sand/60 ${rowBg} ${isToday ? 'scroll-mt-28' : ''}`}
                  >
                    <CalendarCell
                      date={date}
                      year={year}
                      isToday={isToday}
                      isWeekend={i >= 5}
                      compact
                      onSelect={onDateSelect}
                    />
                  </div>
                )
              })}
            </div>
          )
        })}
      </div>
    </div>
  )
}

function MobileNotes({
  weeks,
  columns,
  weekData,
  updateCell,
  removeColumn,
  onAddColumn,
}) {
  const gridCols = `${columns.map(() => 'minmax(120px, 1fr)').join(' ')} 36px`

  return (
    <div className="overflow-x-auto">
      <div className="min-w-max" style={{ display: 'grid', gridTemplateColumns: gridCols }}>
        {columns.map((col) => (
          <ColumnHeader key={col.id} column={col} onRemove={removeColumn} />
        ))}
        <button
          type="button"
          onClick={onAddColumn}
          className="flex items-center justify-center border-b border-planner-sand bg-planner-warm text-lg text-planner-sage"
          aria-label="항목 추가"
        >
          +
        </button>

        {weeks.map((week, weekIndex) => {
          const isEvenMonth = week.primaryMonth % 2 === 0
          const rowBg = isEvenMonth ? 'bg-white' : 'bg-planner-cream/50'

          return (
            <div key={week.id} className="contents">
              {columns.map((col) => (
                <div
                  key={col.id}
                  className={`border-b border-r border-planner-sand/40 ${rowBg}`}
                  style={{ minHeight: ROW_MIN_HEIGHT }}
                >
                  <textarea
                    value={weekData[week.id]?.[col.id] || ''}
                    onChange={(e) => updateCell(week.id, col.id, e.target.value)}
                    placeholder={`${col.label}`}
                    className="h-full w-full bg-transparent px-2 py-1 text-xs leading-snug text-planner-ink placeholder:text-planner-ink-muted/40 focus:bg-white/80 focus:outline-none"
                    rows={1}
                  />
                </div>
              ))}
              <div className={`border-b border-planner-sand/40 ${rowBg}`} />
            </div>
          )
        })}
      </div>
    </div>
  )
}

function App() {
  const {
    userKey,
    loading,
    ready,
    login,
    logout,
    syncing,
    error,
    nickname,
    cloudEnabled,
    localOnly,
    useLocalMode,
  } = useCloudSync()

  if (loading) {
    return (
      <div className="flex min-h-svh items-center justify-center bg-planner-cream text-sm text-planner-ink-muted">
        데이터 불러오는 중…
      </div>
    )
  }

  if (!cloudEnabled && !ready) {
    return <SupabaseSetup onUseLocal={useLocalMode} />
  }

  if (!userKey || !ready) {
    return <UserKeyGate onLogin={login} loading={loading} error={error} />
  }

  return (
    <PlannerApp
      logout={logout}
      syncing={syncing && !localOnly}
      userKey={userKey}
      nickname={localOnly ? '로컬 저장' : nickname || userKey}
      localOnly={localOnly}
    />
  )
}

function PlannerApp({ logout, syncing, userKey, nickname, localOnly }) {
  const today = useMemo(() => {
    const d = new Date()
    d.setHours(0, 0, 0, 0)
    return d
  }, [])

  const initialYear = AVAILABLE_YEARS.includes(today.getFullYear())
    ? today.getFullYear()
    : 2026

  const [year, setYear] = useState(initialYear)

  const weeks = useMemo(() => generateWeeks(year), [year])
  const monthSpans = useMemo(() => buildMonthSpans(weeks), [weeks])

  const { columns, weekData, updateCell, addColumn, removeColumn } =
    usePlannerStorage(year)

  const hasScrolledRef = useRef(false)
  const touchStartRef = useRef(null)

  const [mobileTab, setMobileTab] = useState('calendar')
  const [showAddColumn, setShowAddColumn] = useState(false)
  const [view, setView] = useState('annual')
  const [selectedWeekMonday, setSelectedWeekMonday] = useState(null)

  const openWeek = useCallback((date) => {
    setSelectedWeekMonday(getMondayOfWeek(date))
    setView('weekly')
  }, [])

  const backToAnnual = useCallback(() => {
    setView('annual')
  }, [])

  const changeYear = useCallback((nextYear) => {
    hasScrolledRef.current = false
    setYear(nextYear)
  }, [])

  const scrollToToday = useCallback((behavior = 'smooth') => {
    scrollToTodayAnchor(behavior)
  }, [])

  useLayoutEffect(() => {
    if (view !== 'annual') return
    if (hasScrolledRef.current) return
    if (mobileTab !== 'calendar') return
    if (year !== today.getFullYear()) return

    const tryScroll = () => {
      if (scrollToTodayAnchor('smooth')) {
        hasScrolledRef.current = true
      }
    }

    tryScroll()
    const raf = requestAnimationFrame(tryScroll)
    const timer = setTimeout(tryScroll, 100)
    const retry = setTimeout(tryScroll, 400)

    return () => {
      cancelAnimationFrame(raf)
      clearTimeout(timer)
      clearTimeout(retry)
    }
  }, [weeks, mobileTab, view, year, today])

  const showTodayButton = year === today.getFullYear()

  useEffect(() => {
    if (view !== 'annual' || year === today.getFullYear()) return
    document.querySelector('main')?.scrollTo({ top: 0, behavior: 'smooth' })
  }, [year, view, today])

  if (view === 'weekly' && selectedWeekMonday) {
    return (
      <div className="flex h-svh flex-col">
        <WeeklyView
          weekMonday={selectedWeekMonday}
          onBack={backToAnnual}
          today={today}
        />
      </div>
    )
  }

  const handleTouchStart = (e) => {
    touchStartRef.current = e.touches[0].clientX
  }

  const handleTouchEnd = (e) => {
    if (touchStartRef.current === null) return
    const diff = e.changedTouches[0].clientX - touchStartRef.current
    if (Math.abs(diff) > 60) {
      if (diff < 0 && mobileTab === 'calendar') setMobileTab('notes')
      if (diff > 0 && mobileTab === 'notes') setMobileTab('calendar')
    }
    touchStartRef.current = null
  }

  return (
    <div className="flex h-svh flex-col">
      <header className="sticky top-0 z-40 border-b border-planner-sand bg-planner-cream/90 backdrop-blur-md">
        <div className="mx-auto flex max-w-[1600px] items-center justify-between px-4 py-3 sm:px-6">
          <div>
            <h1 className="text-lg font-medium tracking-tight text-planner-ink sm:text-xl">
              연간 플래너
            </h1>
            <p className="text-xs text-planner-ink-muted sm:text-sm">
              날짜를 눌러 주간 플래너로 이동하세요
            </p>
            <p className="mt-0.5 text-[11px] text-planner-sage">
              {nickname || userKey}
              {localOnly
                ? ' · 이 기기에만 저장'
                : syncing
                  ? ' · 저장 중…'
                  : ' · 동기화됨'}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={logout}
              className="rounded-full border border-planner-sand px-3 py-1.5 text-[11px] font-medium text-planner-ink-muted transition hover:bg-white sm:text-xs"
            >
              ID 변경
            </button>
            {showTodayButton && (
              <button
                type="button"
                onClick={scrollToToday}
                className="rounded-full border border-planner-sage-muted/50 bg-planner-sage-light px-4 py-1.5 text-xs font-medium text-planner-sage transition hover:bg-planner-sage hover:text-white sm:text-sm"
              >
                오늘로 이동
              </button>
            )}
          </div>
        </div>
        <YearNavigator year={year} onChange={changeYear} />
        <MobileTabBar active={mobileTab} onChange={setMobileTab} />
      </header>

      <main
        className="scrollbar-thin min-h-0 flex-1 overflow-auto"
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
      >
        <div className="mx-auto max-w-[1600px] p-2 sm:p-3">
          <div className="hidden overflow-hidden rounded-2xl border border-planner-sand bg-white shadow-soft lg:block">
            <PlannerGrid
              weeks={weeks}
              year={year}
              today={today}
              columns={columns}
              weekData={weekData}
              updateCell={updateCell}
              removeColumn={removeColumn}
              onAddColumn={() => setShowAddColumn(true)}
              monthSpans={monthSpans}
              onDateSelect={openWeek}
            />
          </div>

          <div className="overflow-hidden rounded-2xl border border-planner-sand bg-white shadow-soft lg:hidden">
            {mobileTab === 'calendar' ? (
              <MobileCalendar
                weeks={weeks}
                year={year}
                today={today}
                monthSpans={monthSpans}
                onDateSelect={openWeek}
              />
            ) : (
              <MobileNotes
                weeks={weeks}
                columns={columns}
                weekData={weekData}
                updateCell={updateCell}
                removeColumn={removeColumn}
                onAddColumn={() => setShowAddColumn(true)}
              />
            )}
          </div>

          <p className="mt-3 text-center text-xs text-planner-ink-muted/60 lg:hidden">
            좌우로 스와이프하여 달력과 일정을 전환할 수 있어요
          </p>
        </div>
      </main>

      <AddColumnModal
        open={showAddColumn}
        onClose={() => setShowAddColumn(false)}
        onAdd={addColumn}
      />
    </div>
  )
}

export default App
