import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from 'react'
import WeeklyView, { getMondayOfWeek } from './WeeklyView.jsx'
import MonthlyView from './MonthlyView.jsx'
import YearOverviewCalendar from './YearOverviewCalendar.jsx'
import HabitTracker from './HabitTracker.jsx'
import MemoryView from './MemoryView.jsx'
import MandalartView from './MandalartView.jsx'
import UserKeyGate from './components/UserKeyGate.jsx'
import { ImeSafeTextarea } from './components/ImeSafeTextarea.jsx'
import SupabaseSetup from './components/SupabaseSetup.jsx'
import AccountSettingsView from './components/AccountSettingsView.jsx'
import { AccountButton } from './components/AccountButton.jsx'
import { CalendarIcon } from './components/CalendarIcon.jsx'
import { PlannerQuickNav } from './components/PlannerQuickNav.jsx'
import { AppNavMenu } from './components/AppNavMenu.jsx'
import { PullToRefresh } from './components/PullToRefresh.jsx'
import { useCloudSync } from './context/CloudSyncContext.jsx'
import { DEFAULT_COLUMNS } from './lib/plannerStorage.js'
import { formatDateDayOnly, formatDateLabel } from './lib/dateFormat.js'
import { padMonthGoals, padYearGoals } from './lib/goalLists.js'
import { parseAppRoute, syncAppRoute } from './lib/appRoute.js'
import { GUEST_USER_KEY } from './lib/userIdentity.js'
import { DRAFT_DEBOUNCE_MS } from './lib/debouncedDraft.js'

const AVAILABLE_YEARS = [2025, 2026, 2027, 2028]
const DAY_LABELS = ['월', '화', '수', '목', '금', '토', '일']
const MONTH_LABELS = [
  '1월', '2월', '3월', '4월', '5월', '6월',
  '7월', '8월', '9월', '10월', '11월', '12월',
]

const ROW_MIN_HEIGHT = 36
const MOBILE_HEADER_TOP_HEIGHT = 24
const MOBILE_HEADER_SUB_HEIGHT = 30
const MOBILE_WEEK_ROW_HEIGHT = 48
const MONTH_COL_WIDTH = 34
const DAY_COL_MIN = 33
const NOTE_COL_MIN = 100

const DATE_COLOR_OPTIONS = [
  { id: 'red', label: '빨강', swatch: 'bg-red-400', cell: 'bg-red-200/85' },
  { id: 'orange', label: '주황', swatch: 'bg-orange-400', cell: 'bg-orange-200/85' },
  { id: 'yellow', label: '노랑', swatch: 'bg-yellow-300', cell: 'bg-yellow-200/85' },
  { id: 'green', label: '초록', swatch: 'bg-green-400', cell: 'bg-green-200/85' },
  { id: 'blue', label: '파랑', swatch: 'bg-blue-400', cell: 'bg-blue-200/85' },
]

const DATE_COLOR_CELL = Object.fromEntries(
  DATE_COLOR_OPTIONS.map((option) => [option.id, option.cell]),
)
const SATURDAY_DIVIDER = 'border-l-2 border-planner-sage/80'
const MEMO_CALENDAR_DIVIDER = 'border-l-[3px] border-l-planner-ink/35'

function pad(n) {
  return String(n).padStart(2, '0')
}

function formatDateKey(date) {
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`
}

function isSameDay(a, b) {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  )
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
  const { ready, annualData, updateAnnual, pullGeneration } = useCloudSync()
  const hydratedRef = useRef(false)
  const skipSaveAfterPullRef = useRef(false)
  const lastSyncedPullRef = useRef(0)

  const [columns, setColumns] = useState(() => annualData.columns)
  const [weekData, setWeekData] = useState(() => annualData.weekData)
  const [dateColors, setDateColors] = useState(() => annualData.dateColors || {})
  const [monthGoals, setMonthGoals] = useState(() => annualData.monthGoals || {})
  const [yearGoals, setYearGoals] = useState(() => annualData.yearGoals || {})
  const [yearMemos, setYearMemos] = useState(() => annualData.yearMemos || {})
  const snapshotRef = useRef({
    year,
    columns,
    weekData,
    dateColors,
    monthGoals,
    yearGoals,
    yearMemos,
  })

  snapshotRef.current = {
    year,
    columns,
    weekData,
    dateColors,
    monthGoals,
    yearGoals,
    yearMemos,
  }

  useEffect(() => {
    if (!ready || hydratedRef.current) return
    setColumns(annualData.columns)
    setWeekData(annualData.weekData)
    setDateColors(annualData.dateColors || {})
    setMonthGoals(annualData.monthGoals || {})
    setYearGoals(annualData.yearGoals || {})
    setYearMemos(annualData.yearMemos || {})
    hydratedRef.current = true
  }, [ready, annualData])

  useEffect(() => {
    if (!ready || pullGeneration === 0 || pullGeneration === lastSyncedPullRef.current) {
      return
    }
    lastSyncedPullRef.current = pullGeneration
    skipSaveAfterPullRef.current = true
    setColumns(annualData.columns)
    setWeekData(annualData.weekData)
    setDateColors(annualData.dateColors || {})
    setMonthGoals(annualData.monthGoals || {})
    setYearGoals(annualData.yearGoals || {})
    setYearMemos(annualData.yearMemos || {})
  }, [annualData, pullGeneration, ready])

  useEffect(() => {
    if (!ready || !hydratedRef.current) return
    if (skipSaveAfterPullRef.current) {
      skipSaveAfterPullRef.current = false
      return
    }

    const timer = setTimeout(() => {
      updateAnnual(snapshotRef.current)
    }, DRAFT_DEBOUNCE_MS)

    return () => clearTimeout(timer)
  }, [year, columns, weekData, dateColors, monthGoals, yearGoals, yearMemos, ready, updateAnnual])

  useEffect(() => {
    return () => {
      if (!ready || !hydratedRef.current) return
      updateAnnual(snapshotRef.current)
    }
  }, [ready, updateAnnual])

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

  const setDateColor = useCallback((dateKey, colorId) => {
    setDateColors((prev) => {
      if (!colorId) {
        const { [dateKey]: _, ...rest } = prev
        return rest
      }
      return { ...prev, [dateKey]: colorId }
    })
  }, [])

  const updateMonthGoal = useCallback((goalYear, month, goalId, updates) => {
    const monthKey = String(month)
    setMonthGoals((prev) => {
      const yearGoals = prev[goalYear] || {}
      const goals = padMonthGoals(yearGoals[monthKey])
      return {
        ...prev,
        [goalYear]: {
          ...yearGoals,
          [monthKey]: goals.map((goal) =>
            goal.id === goalId ? { ...goal, ...updates } : goal,
          ),
        },
      }
    })
  }, [])

  const updateYearGoal = useCallback((goalYear, goalId, updates) => {
    setYearGoals((prev) => {
      const goals = padYearGoals(prev[goalYear])
      return {
        ...prev,
        [goalYear]: goals.map((goal) =>
          goal.id === goalId ? { ...goal, ...updates } : goal,
        ),
      }
    })
  }, [])

  const updateYearMemo = useCallback((goalYear, memo) => {
    setYearMemos((prev) => ({
      ...prev,
      [goalYear]: memo,
    }))
  }, [])

  return {
    columns,
    weekData,
    dateColors,
    monthGoals,
    yearGoals,
    yearMemos,
    updateCell,
    setDateColor,
    updateMonthGoal,
    updateYearGoal,
    updateYearMemo,
    addColumn,
    removeColumn,
  }
}

function columnHeaderColor(columnId) {
  if (columnId === 'schedule') return 'bg-planner-mist-light text-planner-mist'
  if (columnId === 'goals') return 'bg-planner-rose-light text-planner-rose'
  return 'bg-planner-warm text-planner-ink-muted'
}

function ColumnHeader({ column, onRemove, leadingDivider = false, fillHeight = false }) {
  const isDefault = DEFAULT_COLUMNS.some((c) => c.id === column.id)

  return (
    <div
      className={`group relative flex items-center justify-center border-r border-planner-sand/60 px-1.5 text-center text-[11px] font-medium tracking-wide last:border-r-0 ${fillHeight ? 'h-full min-h-0 border-b border-planner-sand/60 py-0' : 'min-h-[30px] border-b border-planner-sand/60 py-1'} ${columnHeaderColor(column.id)} ${leadingDivider ? MEMO_CALENDAR_DIVIDER : ''}`}
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

function CalendarCell({
  date,
  year,
  isToday,
  compact,
  fillRow,
  highlightColor,
  onSelect,
  onColorMenu,
}) {
  const longPressTimerRef = useRef(null)
  const longPressFiredRef = useRef(false)

  const inYear = date.getFullYear() === year
  const customBg = inYear && highlightColor ? DATE_COLOR_CELL[highlightColor] : null

  const clearLongPress = useCallback(() => {
    if (longPressTimerRef.current !== null) {
      window.clearTimeout(longPressTimerRef.current)
      longPressTimerRef.current = null
    }
  }, [])

  useEffect(() => () => clearLongPress(), [clearLongPress])

  const className = [
    'flex w-full flex-col items-center justify-center gap-0 border-r border-planner-sand/50 text-center leading-none transition last:border-r-0 select-none',
    compact ? 'touch-manipulation [touch-callout:none]' : '',
    compact
      ? fillRow
        ? 'h-full min-h-0 px-0.5 py-0.5 text-sm'
        : 'min-h-[34px] px-0.5 py-0.5 text-sm'
      : 'min-h-[36px] px-0.5 py-0.5 text-[16.5px]',
    !inYear && 'text-planner-ink-muted/35',
    inYear && !customBg && !isToday && 'bg-transparent',
    customBg,
    isToday && !customBg && 'bg-planner-today',
    isToday && 'font-semibold text-planner-ink ring-1 ring-inset ring-planner-today-ring/50',
    onSelect && inYear && !customBg && 'cursor-pointer hover:bg-planner-sage-light/50 active:bg-planner-sage-light',
    onSelect && inYear && customBg && 'cursor-pointer hover:brightness-95 active:brightness-90',
  ]
    .filter(Boolean)
    .join(' ')

  const handleContextMenu = (event) => {
    if (!inYear || !onColorMenu) return
    event.preventDefault()
    onColorMenu(date, event)
  }

  const handleTouchStart = (event) => {
    if (!compact || !inYear || !onColorMenu) return
    const touch = event.touches[0]
    if (!touch) return
    longPressFiredRef.current = false
    clearLongPress()
    longPressTimerRef.current = window.setTimeout(() => {
      longPressFiredRef.current = true
      onColorMenu(date, { clientX: touch.clientX, clientY: touch.clientY })
      if (typeof navigator.vibrate === 'function') {
        navigator.vibrate(12)
      }
    }, 480)
  }

  const handleTouchEnd = () => {
    clearLongPress()
  }

  const handleTouchMove = () => {
    clearLongPress()
  }

  const handleSelect = () => {
    if (longPressFiredRef.current) {
      longPressFiredRef.current = false
      return
    }
    onSelect?.(date)
  }

  const touchHandlers = compact && inYear && onColorMenu
    ? {
        onTouchStart: handleTouchStart,
        onTouchEnd: handleTouchEnd,
        onTouchMove: handleTouchMove,
        onTouchCancel: handleTouchEnd,
      }
    : {}

  const content = (
    <>
      <span className={inYear ? 'text-planner-ink' : ''}>
        {compact ? formatDateDayOnly(date) : formatDateLabel(date)}
      </span>
      {isToday && (
        <span className="mt-px text-[10px] font-medium leading-none text-planner-today-ring">
          오늘
        </span>
      )}
    </>
  )

  if (onSelect && inYear) {
    return (
      <button
        type="button"
        onClick={handleSelect}
        onContextMenu={handleContextMenu}
        {...touchHandlers}
        className={className}
      >
        {content}
      </button>
    )
  }

  return (
    <div onContextMenu={handleContextMenu} className={className}>
      {content}
    </div>
  )
}

function DateColorMenu({ x, y, currentColor, onSelect, onClose }) {
  const menuRef = useRef(null)

  useEffect(() => {
    const handlePointer = (event) => {
      if (menuRef.current?.contains(event.target)) return
      onClose()
    }

    const handleKey = (event) => {
      if (event.key === 'Escape') onClose()
    }

    const pointerTimer = window.setTimeout(() => {
      window.addEventListener('pointerdown', handlePointer)
    }, 320)

    window.addEventListener('keydown', handleKey)
    window.addEventListener('scroll', onClose, true)
    window.addEventListener('resize', onClose)

    return () => {
      window.clearTimeout(pointerTimer)
      window.removeEventListener('pointerdown', handlePointer)
      window.removeEventListener('keydown', handleKey)
      window.removeEventListener('scroll', onClose, true)
      window.removeEventListener('resize', onClose)
    }
  }, [onClose])

  return (
    <div
      ref={menuRef}
      className="fixed z-50 min-w-[148px] rounded-xl border border-planner-sand bg-white p-2 shadow-soft"
      style={{ left: x, top: y }}
      role="menu"
      onContextMenu={(e) => e.preventDefault()}
    >
      <p className="px-2 pb-1.5 text-[10px] font-medium text-planner-ink-muted">날짜 색상</p>
      {DATE_COLOR_OPTIONS.map((option) => (
        <button
          key={option.id}
          type="button"
          role="menuitem"
          onClick={() => onSelect(option.id)}
          className={[
            'flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-left text-xs text-planner-ink transition hover:bg-planner-warm',
            currentColor === option.id && 'bg-planner-sage-light/70',
          ]
            .filter(Boolean)
            .join(' ')}
        >
          <span className={`size-3.5 shrink-0 rounded-full ${option.swatch} ring-1 ring-planner-sand/60`} />
          {option.label}
        </button>
      ))}
      {currentColor && (
        <button
          type="button"
          role="menuitem"
          onClick={() => onSelect(null)}
          className="mt-1 w-full rounded-lg border-t border-planner-sand/80 px-2 py-1.5 pt-2 text-left text-xs text-planner-ink-muted transition hover:bg-planner-warm"
        >
          기본 색상
        </button>
      )}
    </div>
  )
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

function MobileYearlyPanels({
  mobileTab,
  setMobileTab,
  weeks,
  year,
  today,
  monthSpans,
  dateColors,
  onDateSelect,
  onColorMenu,
  columns,
  weekData,
  updateCell,
  removeColumn,
  onAddColumn,
}) {
  const scrollRef = useRef(null)
  const tabFromScrollRef = useRef(false)

  useEffect(() => {
    if (tabFromScrollRef.current) {
      tabFromScrollRef.current = false
      return
    }
    const el = scrollRef.current
    if (!el) return
    const idx = mobileTab === 'calendar' ? 0 : 1
    const left = idx * el.clientWidth
    if (Math.abs(el.scrollLeft - left) > 2) {
      el.scrollTo({ left, behavior: 'smooth' })
    }
  }, [mobileTab])

  const handleScroll = () => {
    const el = scrollRef.current
    if (!el || el.clientWidth === 0) return
    const ratio = el.scrollLeft / el.clientWidth
    let next = mobileTab
    if (ratio > 0.65) next = 'notes'
    else if (ratio < 0.35) next = 'calendar'
    if (next !== mobileTab) {
      tabFromScrollRef.current = true
      setMobileTab(next)
    }
  }

  return (
    <div
      ref={scrollRef}
      onScroll={handleScroll}
      className="flex overflow-x-auto overscroll-x-contain [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
    >
      <div className="w-full shrink-0">
        <MobileCalendar
          weeks={weeks}
          year={year}
          today={today}
          monthSpans={monthSpans}
          dateColors={dateColors}
          onDateSelect={onDateSelect}
          onColorMenu={onColorMenu}
        />
      </div>
      <div className="w-full shrink-0">
        <MobileNotes
          weeks={weeks}
          columns={columns}
          weekData={weekData}
          updateCell={updateCell}
          removeColumn={removeColumn}
          onAddColumn={onAddColumn}
        />
      </div>
    </div>
  )
}

function MobileTabBar({ active, onChange }) {
  return (
    <div className="flex border-t border-planner-sand bg-white lg:hidden">
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
    <div className="flex shrink-0 items-center justify-center gap-4 border-b border-planner-sage/30 bg-planner-sage-muted px-4 py-2.5">
      <button
        type="button"
        disabled={!canPrev}
        onClick={() => canPrev && onChange(AVAILABLE_YEARS[index - 1])}
        className="flex size-8 items-center justify-center rounded-full border border-planner-sand/80 bg-white/80 text-planner-ink-muted transition hover:border-planner-sage-muted hover:bg-white hover:text-planner-sage disabled:cursor-not-allowed disabled:opacity-30"
        aria-label="이전 연도"
      >
        ‹
      </button>
      <p className="min-w-[72px] text-center text-sm font-medium tracking-wide text-planner-ink sm:text-base">
        {year}년
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

function YearProgressBar({ year, today }) {
  const { percent, daysLeft, dayOfYear, totalDays } = useMemo(() => {
    const dayMs = 24 * 60 * 60 * 1000
    const startOfYear = new Date(year, 0, 1)
    const startOfNextYear = new Date(year + 1, 0, 1)
    const total = Math.round((startOfNextYear - startOfYear) / dayMs)
    const elapsed = Math.floor((today - startOfYear) / dayMs)
    const clampedElapsed = Math.min(Math.max(elapsed, 0), total)
    return {
      percent: (clampedElapsed / total) * 100,
      daysLeft: total - clampedElapsed,
      dayOfYear: Math.min(clampedElapsed + 1, total),
      totalDays: total,
    }
  }, [year, today])

  const roundedPercent = Math.round(percent * 10) / 10
  const ddayLabel = daysLeft <= 0 ? 'D-DAY' : `D-${daysLeft}`

  return (
    <div className="mb-2 rounded-2xl border border-planner-sand bg-white p-3 shadow-soft sm:mb-3 sm:p-4">
      <div className="flex items-end justify-between gap-3">
        <div className="min-w-0">
          <p className="text-[11px] font-medium uppercase tracking-wide text-planner-sage sm:text-xs">
            {year}년
          </p>
          <p className="mt-0.5 flex items-baseline gap-1.5 text-planner-ink">
            <span className="text-xl font-semibold tabular-nums sm:text-2xl">
              {roundedPercent}%
            </span>
            <span className="text-[11px] text-planner-ink-muted sm:text-xs">
              {dayOfYear} / {totalDays}일
            </span>
          </p>
        </div>
        <div className="shrink-0 text-right">
          <span className="inline-flex items-center rounded-full bg-planner-sage px-3 py-1 text-sm font-semibold tabular-nums text-white sm:text-base">
            {ddayLabel}
          </span>
          <p className="mt-1 text-[11px] text-planner-ink-muted sm:text-xs">
            올해 {daysLeft}일 남음
          </p>
        </div>
      </div>
      <div
        className="mt-2.5 h-2.5 w-full overflow-hidden rounded-full bg-planner-sage-muted sm:h-3"
        role="progressbar"
        aria-valuenow={roundedPercent}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label={`${year}년 ${roundedPercent}%`}
      >
        <div
          className="h-full rounded-full bg-planner-sage transition-[width] duration-500 ease-out"
          style={{ width: `${percent}%` }}
        />
      </div>
    </div>
  )
}

function scrollToTodayAnchor(behavior = 'smooth') {
  const main = document.querySelector('[data-planner-main]')
  const todayEl = [...document.querySelectorAll('[data-today-anchor="true"]')].find(
    (el) => el.getClientRects().length > 0,
  )
  if (!todayEl) return false

  if (main) {
    const mainRect = main.getBoundingClientRect()
    const elRect = todayEl.getBoundingClientRect()
    const targetTop =
      elRect.top - mainRect.top + main.scrollTop - main.clientHeight / 2 + elRect.height / 2
    main.scrollTo({ top: Math.max(0, targetTop), behavior })
    return true
  }

  todayEl.scrollIntoView({ behavior, block: 'center' })
  return true
}

function PlannerGrid({
  weeks,
  year,
  today,
  columns,
  weekData,
  dateColors,
  updateCell,
  removeColumn,
  onAddColumn,
  monthSpans,
  compact,
  onDateSelect,
  onColorMenu,
}) {
  const monthCol = compact ? '30px' : `${MONTH_COL_WIDTH}px`
  const dayCol = compact ? `minmax(27px, 1fr)` : `minmax(${DAY_COL_MIN}px, 1fr)`
  const noteCol = compact ? `minmax(100px, 1fr)` : `minmax(${NOTE_COL_MIN}px, 1fr)`

  const gridCols = `${monthCol} repeat(7, ${dayCol}) ${columns.map(() => noteCol).join(' ')} 36px`

  return (
    <div className="overflow-x-auto">
      <div
        className="min-w-max"
        style={{ display: 'grid', gridTemplateColumns: gridCols }}
      >
        {/* Column headers + memo labels */}
        <div className="border-b border-r border-planner-sand bg-planner-month-col" />
        <div
          className="col-span-7 flex items-center justify-center border-b border-r border-planner-sand bg-planner-sage-light/50 py-0.5 text-[10px] font-medium text-planner-sage"
        >
          달력
        </div>
        <div
          className={`flex items-center justify-center border-b border-r border-planner-sand bg-planner-warm py-1 text-[11px] font-medium text-planner-ink-muted ${MEMO_CALENDAR_DIVIDER}`}
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

        <div className="sticky top-0 z-10 border-b border-r border-planner-sand bg-planner-month-col" />
        {DAY_LABELS.map((day, i) => (
          <div
            key={day}
            className={[
              'sticky top-0 z-10 flex items-center justify-center border-b border-r border-planner-sand/60 py-1 text-[16.5px] font-medium last:border-r-0',
              i === 5 && SATURDAY_DIVIDER,
              i >= 5
                ? 'bg-planner-sage-light/80 text-planner-sage'
                : 'bg-planner-sage-light text-planner-sage',
            ].join(' ')}
          >
            {day}
          </div>
        ))}
        {columns.map((col, colIndex) => (
          <ColumnHeader
            key={col.id}
            column={col}
            onRemove={removeColumn}
            leadingDivider={colIndex === 0}
          />
        ))}
        <div className="sticky top-0 z-10 border-b border-planner-sand bg-planner-warm" />

        {/* Week rows */}
        {weeks.map((week, weekIndex) => {
          const monthInfo = monthSpans.get(weekIndex)
          const isEvenMonth = week.primaryMonth % 2 === 0
          const rowBg = isEvenMonth ? 'bg-white' : 'bg-planner-warm'

          return (
            <div key={week.id} className="contents">
              {monthInfo && (
                <div
                  className={`flex items-center justify-center border-b border-r border-planner-sand bg-planner-month-col text-[11px] font-semibold text-planner-sage ${compact ? 'text-[10px]' : ''}`}
                  style={{
                    gridRow: `span ${monthInfo.count}`,
                  }}
                >
                  {MONTH_LABELS[monthInfo.month]}
                </div>
              )}

              {week.days.map((date, i) => {
                const isToday = isSameDay(date, today) && year === today.getFullYear()
                const dateKey = formatDateKey(date)
                return (
                  <div
                    key={i}
                    data-today-anchor={isToday ? 'true' : undefined}
                    className={[
                      'border-b border-planner-sand/60',
                      rowBg,
                      i === 5 && SATURDAY_DIVIDER,
                      isToday && 'scroll-mt-28',
                    ]
                      .filter(Boolean)
                      .join(' ')}
                  >
                    <CalendarCell
                      date={date}
                      year={year}
                      isToday={isToday}
                      compact={compact}
                      highlightColor={dateColors[dateKey]}
                      onSelect={onDateSelect}
                      onColorMenu={onColorMenu}
                    />
                  </div>
                )
              })}

              {columns.map((col, colIndex) => (
                <div
                  key={col.id}
                  className={`border-b border-r border-planner-sand/40 ${rowBg} ${colIndex === 0 ? MEMO_CALENDAR_DIVIDER : ''}`}
                  style={{ minHeight: ROW_MIN_HEIGHT }}
                >
                  <ImeSafeTextarea
                    value={weekData[week.id]?.[col.id] || ''}
                    onChange={(value) => updateCell(week.id, col.id, value)}
                    className="h-full w-full bg-transparent px-2 py-1 text-xs leading-snug text-planner-ink transition focus:bg-white/80 focus:outline-none focus:ring-1 focus:ring-inset focus:ring-planner-sage-muted/40"
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

function MobileCalendar({ weeks, year, today, monthSpans, dateColors, onDateSelect, onColorMenu }) {
  const dayCol = `minmax(27px, 1fr)`

  return (
    <div className="overflow-x-auto">
      <div
        className="min-w-max"
        style={{
          display: 'grid',
          gridTemplateColumns: `30px repeat(7, ${dayCol})`,
        }}
      >
        <div
          className="border-b border-r border-planner-sand bg-planner-month-col"
          style={{ gridColumn: 1, height: MOBILE_HEADER_TOP_HEIGHT }}
        />
        <div
          className="flex items-center justify-center border-b border-r border-planner-sand bg-planner-sage-light/40 text-[10px] font-medium text-planner-sage"
          style={{ gridColumn: '2 / 9', height: MOBILE_HEADER_TOP_HEIGHT }}
        >
          달력
        </div>
        <div
          className="border-b border-r border-planner-sand bg-planner-month-col"
          style={{ gridColumn: 1, height: MOBILE_HEADER_SUB_HEIGHT }}
        />
        {DAY_LABELS.map((day, i) => (
          <div
            key={day}
            style={{ gridColumn: i + 2, height: MOBILE_HEADER_SUB_HEIGHT }}
            className={[
              'flex items-center justify-center border-b border-r border-planner-sand/60 text-[15px] font-medium',
              i === 5 && SATURDAY_DIVIDER,
              i >= 5 ? 'bg-planner-sage-light/80 text-planner-sage' : 'bg-planner-sage-light text-planner-sage',
            ].join(' ')}
          >
            {day}
          </div>
        ))}

        {weeks.map((week, weekIndex) => {
          const monthInfo = monthSpans.get(weekIndex)
          const isEvenMonth = week.primaryMonth % 2 === 0
          const rowBg = isEvenMonth ? 'bg-white' : 'bg-planner-warm'

          return (
            <div key={week.id} className="contents">
              {monthInfo && (
                <div
                  className="flex items-center justify-center border-b border-r border-planner-sand bg-planner-month-col text-[10px] font-semibold text-planner-sage"
                  style={{
                    gridColumn: 1,
                    gridRow: `span ${monthInfo.count}`,
                  }}
                >
                  {MONTH_LABELS[monthInfo.month]}
                </div>
              )}
              {week.days.map((date, i) => {
                const isToday = isSameDay(date, today) && year === today.getFullYear()
                const dateKey = formatDateKey(date)
                return (
                  <div
                    key={i}
                    data-today-anchor={isToday ? 'true' : undefined}
                    style={{ gridColumn: i + 2, height: MOBILE_WEEK_ROW_HEIGHT }}
                    className={[
                      'border-b border-planner-sand/60',
                      rowBg,
                      i === 5 && SATURDAY_DIVIDER,
                      isToday && 'scroll-mt-28',
                    ]
                      .filter(Boolean)
                      .join(' ')}
                  >
                    <CalendarCell
                      date={date}
                      year={year}
                      isToday={isToday}
                      compact
                      fillRow
                      highlightColor={dateColors[dateKey]}
                      onSelect={onDateSelect}
                      onColorMenu={onColorMenu}
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
        <div
          className="flex items-center justify-center border-b border-r border-planner-sand bg-planner-warm text-[10px] font-medium text-planner-ink-muted"
          style={{ gridColumn: `1 / ${columns.length + 2}`, height: MOBILE_HEADER_TOP_HEIGHT }}
        >
          메모
        </div>
        {columns.map((col, colIndex) => (
          <div
            key={col.id}
            style={{ height: MOBILE_HEADER_SUB_HEIGHT }}
            className="overflow-hidden"
          >
            <ColumnHeader
              column={col}
              onRemove={removeColumn}
              leadingDivider={colIndex === 0}
              fillHeight
            />
          </div>
        ))}
        <button
          type="button"
          onClick={onAddColumn}
          style={{ height: MOBILE_HEADER_SUB_HEIGHT }}
          className="flex items-center justify-center border-b border-planner-sand bg-planner-warm text-lg text-planner-sage"
          aria-label="항목 추가"
        >
          +
        </button>

        {weeks.map((week) => {
          const isEvenMonth = week.primaryMonth % 2 === 0
          const rowBg = isEvenMonth ? 'bg-white' : 'bg-planner-warm'

          return (
            <div key={week.id} className="contents">
              {columns.map((col, colIndex) => (
                <div
                  key={col.id}
                  className={`border-b border-r border-planner-sand/60 ${rowBg} ${colIndex === 0 ? MEMO_CALENDAR_DIVIDER : ''}`}
                  style={{ height: MOBILE_WEEK_ROW_HEIGHT }}
                >
                  <ImeSafeTextarea
                    value={weekData[week.id]?.[col.id] || ''}
                    onChange={(value) => updateCell(week.id, col.id, value)}
                    className="h-full w-full resize-none bg-transparent px-2 py-1 text-xs leading-snug text-planner-ink focus:bg-white/80 focus:outline-none"
                    rows={1}
                  />
                </div>
              ))}
              <div
                className={`border-b border-planner-sand/60 ${rowBg}`}
                style={{ height: MOBILE_WEEK_ROW_HEIGHT }}
              />
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
    signIn,
    register,
    logout,
    deleteAccount,
    syncing,
    error,
    nickname,
    cloudEnabled,
    localOnly,
    useLocalMode,
    useGuestMode,
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
    return (
      <UserKeyGate
        onSignIn={signIn}
        onRegister={register}
        onBrowseAsGuest={useGuestMode}
        loading={loading}
        error={error}
      />
    )
  }

  return (
    <PlannerApp
      logout={logout}
      deleteAccount={deleteAccount}
      syncing={syncing && !localOnly}
      userKey={userKey}
      nickname={
        userKey === GUEST_USER_KEY
          ? '게스트'
          : localOnly
            ? '로컬 저장'
            : nickname || userKey
      }
      localOnly={localOnly}
    />
  )
}

function PlannerApp({ logout, deleteAccount, syncing, userKey, nickname, localOnly }) {
  const { pullFromCloud } = useCloudSync()
  const handleCloudRefresh = useCallback(
    () => pullFromCloud(),
    [pullFromCloud],
  )
  const routeInit = useMemo(() => parseAppRoute(), [])
  const accountReturnViewRef = useRef(routeInit.view === 'account' ? 'annual' : routeInit.view)

  const today = useMemo(() => {
    const d = new Date()
    d.setHours(0, 0, 0, 0)
    return d
  }, [])

  const defaultYear = AVAILABLE_YEARS.includes(today.getFullYear())
    ? today.getFullYear()
    : 2026

  const initialYear = useMemo(() => {
    if (routeInit.view === 'weekly') {
      const weekMonday = routeInit.selectedWeekMonday || getMondayOfWeek(today)
      const weekYear = weekMonday.getFullYear()
      if (AVAILABLE_YEARS.includes(weekYear)) return weekYear
    }
    if (routeInit.view === 'monthly' && routeInit.year && AVAILABLE_YEARS.includes(routeInit.year)) {
      return routeInit.year
    }
    if (routeInit.year && AVAILABLE_YEARS.includes(routeInit.year)) {
      return routeInit.year
    }
    return defaultYear
  }, [defaultYear, routeInit, today])

  const initialMonth = useMemo(() => {
    if (routeInit.view === 'monthly' && routeInit.selectedMonth !== null) {
      return routeInit.selectedMonth
    }
    return today.getMonth()
  }, [routeInit, today])

  const [year, setYear] = useState(initialYear)
  const [selectedMonth, setSelectedMonth] = useState(initialMonth)

  const weeks = useMemo(() => generateWeeks(year), [year])
  const monthSpans = useMemo(() => buildMonthSpans(weeks), [weeks])

  const { columns, weekData, dateColors, monthGoals, yearGoals, yearMemos, updateCell, setDateColor, updateMonthGoal, updateYearGoal, updateYearMemo, addColumn, removeColumn } =
    usePlannerStorage(year)

  const hasScrolledRef = useRef(false)
  const pendingTodayScrollRef = useRef(false)
  const [mobileTab, setMobileTab] = useState(routeInit.tab)
  const [showAddColumn, setShowAddColumn] = useState(false)
  const [view, setView] = useState(routeInit.view)
  const [selectedWeekMonday, setSelectedWeekMonday] = useState(() => {
    if (routeInit.selectedWeekMonday) return routeInit.selectedWeekMonday
    if (routeInit.view === 'weekly') return getMondayOfWeek(today)
    return null
  })
  const [todayScrollTick, setTodayScrollTick] = useState(0)
  const [colorMenu, setColorMenu] = useState(null)

  useEffect(() => {
    syncAppRoute({ view, year, selectedWeekMonday, selectedMonth, mobileTab })
  }, [view, year, selectedWeekMonday, selectedMonth, mobileTab])

  const openColorMenu = useCallback((date, event) => {
    if (date.getFullYear() !== year) return
    setColorMenu({
      x: event.clientX,
      y: event.clientY,
      dateKey: formatDateKey(date),
    })
  }, [year])

  const closeColorMenu = useCallback(() => {
    setColorMenu(null)
  }, [])

  const handleColorSelect = useCallback((colorId) => {
    if (!colorMenu) return
    setDateColor(colorMenu.dateKey, colorId)
    setColorMenu(null)
  }, [colorMenu, setDateColor])

  const changeWeek = useCallback((monday) => {
    const weekYear = monday.getFullYear()
    if (AVAILABLE_YEARS.includes(weekYear) && weekYear !== year) {
      setYear(weekYear)
    }
    setSelectedWeekMonday(monday)
  }, [year])

  const openWeek = useCallback((date) => {
    const dateYear = date.getFullYear()
    if (AVAILABLE_YEARS.includes(dateYear) && dateYear !== year) {
      setYear(dateYear)
    }
    setSelectedWeekMonday(getMondayOfWeek(date))
    setView('weekly')
  }, [year])

  const toggleYearOverview = useCallback(() => {
    setColorMenu(null)
    setView((current) => (current === 'yearOverview' ? 'annual' : 'yearOverview'))
  }, [])

  const goToYearPlanner = useCallback(() => {
    setColorMenu(null)
    setSelectedWeekMonday(null)
    setView('annual')
  }, [])

  const goToYearOverviewPage = useCallback(() => {
    setColorMenu(null)
    setSelectedWeekMonday(null)
    setView('yearOverview')
  }, [])

  const openYearOverview = useCallback(() => {
    setColorMenu(null)
    if (selectedWeekMonday) {
      const weekYear = selectedWeekMonday.getFullYear()
      if (AVAILABLE_YEARS.includes(weekYear) && weekYear !== year) {
        setYear(weekYear)
      }
    }
    setSelectedWeekMonday(null)
    setView('yearOverview')
  }, [selectedWeekMonday, year])

  const openYearOverviewFromMonthly = useCallback(() => {
    setColorMenu(null)
    setSelectedWeekMonday(null)
    setView('yearOverview')
  }, [])

  const navigateToAppView = useCallback((target) => {
    setColorMenu(null)
    if (target === 'account') {
      accountReturnViewRef.current = view
      setView('account')
      return
    }
    if (target === 'yearly') {
      setSelectedWeekMonday(null)
      setView('annual')
      return
    }
    if (target === 'weekly') {
      const monday =
        view === 'weekly' && selectedWeekMonday
          ? selectedWeekMonday
          : getMondayOfWeek(today)
      const weekYear = monday.getFullYear()
      if (AVAILABLE_YEARS.includes(weekYear) && weekYear !== year) {
        setYear(weekYear)
      }
      setSelectedWeekMonday(monday)
      setView('weekly')
      return
    }
    if (target === 'monthly') {
      setSelectedWeekMonday(null)
      const monthYear = AVAILABLE_YEARS.includes(year) ? year : today.getFullYear()
      if (AVAILABLE_YEARS.includes(monthYear)) {
        setYear(monthYear)
      }
      setSelectedMonth(today.getMonth())
      setView('monthly')
      return
    }
    setView(target)
  }, [today, year, view, selectedWeekMonday])

  const openAccount = useCallback(() => {
    navigateToAppView('account')
  }, [navigateToAppView])

  const closeAccount = useCallback(() => {
    const returnView = accountReturnViewRef.current
    if (returnView === 'weekly') {
      const monday =
        selectedWeekMonday || getMondayOfWeek(today)
      const weekYear = monday.getFullYear()
      if (AVAILABLE_YEARS.includes(weekYear) && weekYear !== year) {
        setYear(weekYear)
      }
      setSelectedWeekMonday(monday)
      setView('weekly')
      return
    }
    if (returnView === 'monthly') {
      setView('monthly')
      return
    }
    if (returnView === 'habit' || returnView === 'mandala' || returnView === 'memory' || returnView === 'yearOverview') {
      setView(returnView)
      return
    }
    setSelectedWeekMonday(null)
    setView('annual')
  }, [selectedWeekMonday, today, year])

  const changeYear = useCallback((nextYear) => {
    hasScrolledRef.current = false
    setYear(nextYear)
  }, [])

  const changeMonth = useCallback((nextYear, nextMonth) => {
    if (AVAILABLE_YEARS.includes(nextYear) && nextYear !== year) {
      setYear(nextYear)
    }
    setSelectedMonth(nextMonth)
  }, [year])

  const goToToday = useCallback(() => {
    if (view === 'weekly') {
      setView('annual')
      setSelectedWeekMonday(null)
    }
    if (view === 'yearOverview') {
      setView('annual')
    }
    if (view === 'mandala' || view === 'habit' || view === 'memory') {
      setView('annual')
    }
    if (view === 'monthly') {
      setSelectedMonth(today.getMonth())
    }

    const todayYear = today.getFullYear()
    if (year !== todayYear && AVAILABLE_YEARS.includes(todayYear)) {
      hasScrolledRef.current = false
      setYear(todayYear)
    }

    pendingTodayScrollRef.current = true
    setMobileTab('calendar')
    setTodayScrollTick((t) => t + 1)
  }, [view, year, today])

  useLayoutEffect(() => {
    if (view !== 'annual') return
    if (mobileTab !== 'calendar') return
    if (year !== today.getFullYear()) return
    if (!pendingTodayScrollRef.current && hasScrolledRef.current) return

    const tryScroll = () => {
      if (scrollToTodayAnchor('smooth')) {
        hasScrolledRef.current = true
        pendingTodayScrollRef.current = false
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
  }, [weeks, mobileTab, view, year, today, todayScrollTick])

  const showTodayButton = AVAILABLE_YEARS.includes(today.getFullYear())
  const isPlannerView = view === 'annual' || view === 'yearOverview'
  const activeNavItem =
    view === 'weekly'
      ? 'weekly'
      : view === 'monthly'
        ? 'monthly'
        : view === 'mandala'
          ? 'mandala'
          : view === 'habit'
            ? 'habit'
            : view === 'memory'
              ? 'memory'
              : 'yearly'
  const headerTitle =
    view === 'mandala'
      ? 'Mandal-Art'
      : view === 'habit'
        ? 'Habit Tracker'
        : view === 'memory'
          ? 'My Memory'
          : view === 'yearOverview'
          ? 'Calendar'
          : 'Yearly'
  const quickNavActiveView =
    view === 'annual'
      ? 'yearly'
      : view === 'yearOverview'
        ? 'yearOverview'
        : null
  const headerSubtitle =
    view === 'mandala'
      ? 'Manda(본질의 깨달음) + La(성취) + Art(기술)\n"본질에 집중하여 목적을 달성하게 돕는 만다라트로 목표와 계획을 관리하세요"'
      : view === 'habit'
        ? '한 달 습관을 주차별로 추적하세요'
        : view === 'memory'
          ? '생각나는 대로 적으면 키워드로 자동 분류됩니다'
          : view === 'yearOverview'
          ? '12개월 Calendar · 날짜를 누르면 Weekly로 이동합니다'
          : '날짜를 눌러 Weekly로 이동하세요'

  useEffect(() => {
    if (view !== 'annual' || year === today.getFullYear()) return
    document.querySelector('[data-planner-main]')?.scrollTo({ top: 0, behavior: 'smooth' })
  }, [year, view, today])

  if (view === 'account') {
    return (
      <div className="flex h-svh flex-col">
        <AccountSettingsView
          userKey={userKey}
          nickname={nickname}
          localOnly={localOnly}
          syncing={syncing}
          onBack={closeAccount}
          onLogout={logout}
          onDeleteAccount={deleteAccount}
        />
      </div>
    )
  }

  if (view === 'weekly' && selectedWeekMonday) {
    return (
      <div className="flex h-svh flex-col">
        <WeeklyView
          weekMonday={selectedWeekMonday}
          onWeekChange={changeWeek}
          today={today}
          monthGoals={monthGoals}
          onUpdateMonthGoal={updateMonthGoal}
          activeNavItem={activeNavItem}
          onNavigate={navigateToAppView}
          onOpenYearOverview={openYearOverview}
          onQuickNavYearPlanner={goToYearPlanner}
          onQuickNavMonthly={() => navigateToAppView('monthly')}
          onQuickNavWeekly={() => navigateToAppView('weekly')}
          onOpenAccount={openAccount}
        />
      </div>
    )
  }

  if (view === 'monthly') {
    return (
      <div className="flex h-svh flex-col">
        <MonthlyView
          year={year}
          month={selectedMonth}
          today={today}
          monthGoals={monthGoals}
          yearGoals={yearGoals}
          onUpdateMonthGoal={updateMonthGoal}
          onUpdateYearGoal={(goalId, updates) =>
            updateYearGoal(year, goalId, updates)
          }
          onMonthChange={changeMonth}
          onYearChange={setYear}
          onNavigate={navigateToAppView}
          onOpenWeek={openWeek}
          onOpenYearOverview={openYearOverviewFromMonthly}
          onQuickNavYearPlanner={goToYearPlanner}
          onQuickNavMonthly={() => navigateToAppView('monthly')}
          onQuickNavWeekly={() => navigateToAppView('weekly')}
          activeNavItem={activeNavItem}
          onOpenAccount={openAccount}
        />
      </div>
    )
  }

  return (
    <div className={['flex h-svh flex-col', isPlannerView && 'bg-planner-cream'].filter(Boolean).join(' ')}>
      <header
        className={[
          'sticky top-0 z-40 border-b border-planner-sand',
          isPlannerView ? 'bg-white' : 'bg-planner-cream/90 backdrop-blur-md',
        ].join(' ')}
      >
        <div className="mx-auto flex max-w-[1600px] items-center justify-between px-4 py-3 sm:px-6">
          <div>
            <div className="flex items-center gap-2">
              <AppNavMenu activeItem={activeNavItem} onNavigate={navigateToAppView} />
              <h1 className="text-lg font-medium tracking-tight text-planner-ink sm:text-xl">
                {headerTitle}
              </h1>
              {isPlannerView && (
                <button
                  type="button"
                  onClick={toggleYearOverview}
                  aria-label={view === 'yearOverview' ? 'Yearly 보기' : 'Calendar 보기'}
                  aria-pressed={view === 'yearOverview'}
                  className={[
                    'rounded-lg p-1.5 transition',
                    view === 'yearOverview'
                      ? 'bg-planner-sage text-white'
                      : 'text-planner-sage hover:bg-planner-sage-light',
                  ].join(' ')}
                >
                  <CalendarIcon className="size-5" />
                </button>
              )}
              <PlannerQuickNav
                activeView={quickNavActiveView}
                showCalendar={!isPlannerView}
                onYearOverview={goToYearOverviewPage}
                onYearPlanner={goToYearPlanner}
                onMonthly={() => navigateToAppView('monthly')}
                onWeekly={() => navigateToAppView('weekly')}
              />
            </div>
            <p
              className={[
                'text-xs text-planner-ink-muted sm:text-sm',
                view === 'mandala' && 'whitespace-pre-line',
              ]
                .filter(Boolean)
                .join(' ')}
            >
              {headerSubtitle}
            </p>
            <p className="mt-0.5 text-[11px] text-planner-sage">
              {nickname || userKey}
              {localOnly
                ? userKey === GUEST_USER_KEY
                  ? ' · 체험 모드 (이 기기에만 저장)'
                  : ' · 이 기기에만 저장'
                : syncing
                  ? ' · 저장 중…'
                  : ' · 동기화됨'}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <AccountButton onClick={openAccount} />
            {showTodayButton && isPlannerView && (
              <button
                type="button"
                onClick={goToToday}
                className="rounded-full border border-planner-sage-muted/50 bg-planner-sage-light px-4 py-1.5 text-xs font-medium text-planner-sage transition hover:bg-planner-sage hover:text-white sm:text-sm"
              >
                오늘로 이동
              </button>
            )}
          </div>
        </div>
        {isPlannerView && <YearNavigator year={year} onChange={changeYear} />}
        {view === 'annual' && (
          <MobileTabBar active={mobileTab} onChange={setMobileTab} />
        )}
      </header>

      <PullToRefresh
        onRefresh={handleCloudRefresh}
        disabled={localOnly}
        className={[
          'scrollbar-thin min-h-0 flex-1 overflow-auto overscroll-y-contain',
          isPlannerView && 'bg-planner-cream',
        ].filter(Boolean).join(' ')}
      >
        <div className="mx-auto max-w-[1600px] p-2 sm:p-3">
          {view === 'yearOverview' ? (
            <YearOverviewCalendar
              year={year}
              today={today}
              onDateSelect={openWeek}
              monthGoals={monthGoals[year] || {}}
              yearGoals={yearGoals[year]}
              yearMemo={yearMemos[year] || ''}
              onUpdateMonthGoal={(month, goalId, updates) =>
                updateMonthGoal(year, month, goalId, updates)
              }
              onUpdateYearGoal={(goalId, updates) =>
                updateYearGoal(year, goalId, updates)
              }
              onUpdateYearMemo={(memo) => updateYearMemo(year, memo)}
            />
          ) : view === 'mandala' ? (
            <MandalartView />
          ) : view === 'habit' ? (
            <HabitTracker today={today} />
          ) : view === 'memory' ? (
            <MemoryView />
          ) : (
            <>
          {year === today.getFullYear() && (
            <YearProgressBar year={year} today={today} />
          )}
          <div className="hidden overflow-hidden rounded-2xl border border-planner-sand bg-white shadow-soft lg:block">
            <PlannerGrid
              weeks={weeks}
              year={year}
              today={today}
              columns={columns}
              weekData={weekData}
              dateColors={dateColors}
              updateCell={updateCell}
              removeColumn={removeColumn}
              onAddColumn={() => setShowAddColumn(true)}
              monthSpans={monthSpans}
              onDateSelect={openWeek}
              onColorMenu={openColorMenu}
            />
          </div>

          <div className="overflow-hidden rounded-2xl border border-planner-sand bg-white shadow-soft lg:hidden">
            <MobileYearlyPanels
              mobileTab={mobileTab}
              setMobileTab={setMobileTab}
              weeks={weeks}
              year={year}
              today={today}
              monthSpans={monthSpans}
              dateColors={dateColors}
              onDateSelect={openWeek}
              onColorMenu={openColorMenu}
              columns={columns}
              weekData={weekData}
              updateCell={updateCell}
              removeColumn={removeColumn}
              onAddColumn={() => setShowAddColumn(true)}
            />
          </div>

          <p className="mt-3 text-center text-xs text-planner-ink-muted/60 lg:hidden">
            좌우로 스크롤해 달력과 일정을 함께 볼 수 있어요
          </p>
            </>
          )}
        </div>
      </PullToRefresh>

      <AddColumnModal
        open={showAddColumn}
        onClose={() => setShowAddColumn(false)}
        onAdd={addColumn}
      />

      {colorMenu && (
        <DateColorMenu
          x={colorMenu.x}
          y={colorMenu.y}
          currentColor={dateColors[colorMenu.dateKey]}
          onSelect={handleColorSelect}
          onClose={closeColorMenu}
        />
      )}
    </div>
  )
}

export default App
