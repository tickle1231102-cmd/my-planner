import { useCallback, useMemo, useRef, useState } from 'react'
import { ImeSafeTextarea } from './components/ImeSafeTextarea.jsx'
import { useDebouncedDraft } from './lib/debouncedDraft.js'
import { AppNavMenu } from './components/AppNavMenu.jsx'
import { CalendarIcon } from './components/CalendarIcon.jsx'
import { PlannerQuickNav } from './components/PlannerQuickNav.jsx'
import { AccountButton } from './components/AccountButton.jsx'
import MonthGoalChecklist from './components/MonthGoalChecklist.jsx'
import { useCloudSync } from './context/CloudSyncContext.jsx'
import { padMonthGoals, padWeekGoals } from './lib/goalLists.js'
import {
  getFilledTodoTasksForDate,
  getMondayOfWeek,
  getWeekIdFromMonday,
} from './lib/weeklyChecklist.js'
import {
  buildMonthGrid,
  getMonthEntry,
  MONTH_DISPLAY_NAMES,
  MONTH_INDEX_LABELS,
  setMonthEntry,
  WEEKDAY_LABELS,
} from './lib/monthlyStorage.js'

function padMonthNumber(month) {
  return String(month + 1).padStart(2, '0')
}

function isSameDay(year, month, day, today) {
  return (
    today.getFullYear() === year &&
    today.getMonth() === month &&
    today.getDate() === day
  )
}

function getMondayForWeekRow(grid, rowIndex, year, month) {
  const start = rowIndex * 7
  for (let i = 0; i < 7; i += 1) {
    const day = grid[start + i]
    if (day) {
      return getMondayOfWeek(new Date(year, month, day))
    }
  }
  return null
}

function WeekSideCell({ monday, memo, goals, onMemoChange, onUpdateGoal }) {
  if (!monday) {
    return (
      <div className="h-full min-h-0 border border-planner-sand/60 bg-planner-cream/30" />
    )
  }

  return (
    <div className="flex h-full min-h-0 flex-col border border-planner-sand/80 bg-planner-sage-light/35">
      <div className="min-h-0 flex-[0.42] border-b border-planner-sand/60">
        <ImeSafeTextarea
          value={memo}
          onChange={onMemoChange}
          className="h-full min-h-0 w-full resize-none bg-transparent px-1 py-0.5 text-[9px] leading-snug text-planner-ink placeholder:text-planner-ink-muted/35 focus:outline-none focus:ring-1 focus:ring-inset focus:ring-planner-sage-muted/40 sm:px-1.5 sm:py-1 sm:text-[10px]"
          placeholder=""
          aria-label="주간 메모"
        />
      </div>
      <div className="min-h-0 flex-[0.58] overflow-y-auto px-0.5 py-0.5 sm:px-1">
        <MonthGoalChecklist
          goals={goals}
          onUpdateGoal={onUpdateGoal}
          compact
          placeholder=""
        />
      </div>
    </div>
  )
}

function MonthIndexTabs({
  year,
  month,
  onSelectMonth,
  onSelectYear,
  onSelectNotes,
}) {
  return (
    <nav
      className="flex h-full w-11 shrink-0 flex-col border-l border-planner-sand bg-planner-ink sm:w-12"
      aria-label="월간 인덱스"
    >
      <button
        type="button"
        onClick={onSelectYear}
        className="border-b border-white/10 px-1 py-2 text-[9px] font-semibold tracking-wide text-planner-cream transition hover:bg-planner-sage"
        title={`${year} Yearly`}
      >
        {year}
      </button>

      {MONTH_INDEX_LABELS.map((label, index) => {
        const active = index === month
        return (
          <button
            key={label}
            type="button"
            onClick={() => onSelectMonth(index)}
            aria-current={active ? 'page' : undefined}
            className={[
              'flex flex-1 items-center justify-center border-b border-white/10 px-0.5 text-[8px] font-semibold tracking-[0.12em] transition sm:text-[9px]',
              active
                ? 'bg-planner-sage text-white'
                : 'text-planner-cream/90 hover:bg-planner-sage/80 hover:text-white',
            ].join(' ')}
            title={`${index + 1}월`}
          >
            <span className="[writing-mode:vertical-rl] rotate-180">{label}</span>
          </button>
        )
      })}

      <button
        type="button"
        onClick={onSelectNotes}
        className="px-1 py-2 text-[8px] font-semibold tracking-[0.14em] text-planner-cream transition hover:bg-planner-sage sm:text-[9px]"
        title="월간 노트"
      >
        <span className="[writing-mode:vertical-rl] rotate-180">NOTE</span>
      </button>
    </nav>
  )
}

function MobileMonthStrip({ year, month, onSelectMonth }) {
  return (
    <div className="flex shrink-0 gap-1 overflow-x-auto border-t border-planner-sand bg-white px-2 py-1.5 lg:hidden">
      {MONTH_INDEX_LABELS.map((label, index) => (
        <button
          key={label}
          type="button"
          onClick={() => onSelectMonth(index)}
          className={[
            'shrink-0 rounded-full px-2.5 py-1 text-[10px] font-semibold transition',
            index === month
              ? 'bg-planner-sage text-white'
              : 'bg-planner-warm text-planner-ink-muted hover:bg-planner-sage-light',
          ].join(' ')}
        >
          {label}
        </button>
      ))}
      <span className="shrink-0 self-center px-1 text-[10px] text-planner-ink-muted">
        {year}
      </span>
    </div>
  )
}

function DayTodoCheckbox({ checked, postponed, onChange }) {
  return (
    <button
      type="button"
      role="checkbox"
      aria-checked={checked}
      onClick={() => onChange(!checked)}
      className={[
        'mt-0.5 flex size-3 shrink-0 items-center justify-center border transition',
        postponed
          ? 'border-planner-peach bg-planner-peach/25'
          : checked
            ? 'border-planner-sage bg-planner-sage'
            : 'border-dashed border-planner-ink-muted/50 bg-white',
      ].join(' ')}
    >
      {checked && (
        <svg viewBox="0 0 12 12" className="size-2 text-white" fill="none" aria-hidden>
          <path
            d="M2.5 6.2 4.8 8.5 9.5 3.5"
            stroke="currentColor"
            strokeWidth="1.6"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      )}
    </button>
  )
}

function DayCell({ day, year, month, todos, today, onToggleTodo, onOpenWeek }) {
  if (!day) {
    return (
      <div className="h-full min-h-0 border border-planner-sand/60 bg-planner-cream/30" />
    )
  }

  const todayCell = isSameDay(year, month, day, today)
  const weekend = (() => {
    const date = new Date(year, month, day)
    const dow = date.getDay()
    return dow === 0 || dow === 6
  })()

  return (
    <div
      className={[
        'flex h-full min-h-0 flex-col border border-planner-sand/80',
        weekend ? 'bg-planner-weekend/50' : 'bg-white',
        todayCell ? 'ring-2 ring-inset ring-planner-today-ring' : '',
      ].join(' ')}
    >
      <button
        type="button"
        onClick={() => onOpenWeek?.(new Date(year, month, day))}
        className={[
          'shrink-0 rounded px-1 py-0.5 text-left text-[10px] font-medium transition hover:bg-planner-sage-light/60 sm:text-xs lg:px-1.5 lg:py-1',
          todayCell ? 'text-planner-sage' : 'text-planner-ink-muted hover:text-planner-sage',
        ].join(' ')}
        aria-label={`${month + 1}월 ${day}일 — 주간 플래너 열기`}
      >
        {day}
      </button>
      <div className="min-h-0 flex-1 space-y-0.5 overflow-y-auto px-1 pb-1 sm:px-1.5">
        {todos.map((task) => (
          <div key={task.id} className="flex items-start gap-1">
            <DayTodoCheckbox
              checked={task.done}
              postponed={task.postponed}
              onChange={(done) => onToggleTodo?.(task.id, { done, postponed: done ? false : task.postponed })}
            />
            <p
              className={[
                'min-w-0 flex-1 text-[9px] leading-snug text-planner-ink sm:text-[10px] lg:text-xs lg:leading-relaxed',
                task.done && 'text-planner-ink-muted/70 line-through',
                task.postponed && !task.done && 'text-planner-peach',
              ]
                .filter(Boolean)
                .join(' ')}
            >
              {task.text}
            </p>
          </div>
        ))}
      </div>
    </div>
  )
}

function useMonthlyPlanner(year, month) {
  const { monthlyData, updateMonthly } = useCloudSync()

  const remoteEntry = useMemo(
    () => getMonthEntry(monthlyData, year, month),
    [monthlyData, year, month],
  )
  const resetKey = `${year}-${month}`

  const commitEntry = useCallback(
    (nextEntry) => {
      updateMonthly((prev) => setMonthEntry(prev, year, month, nextEntry))
    },
    [month, updateMonthly, year],
  )

  const [monthEntry, setMonthEntryDraft] = useDebouncedDraft(remoteEntry, commitEntry, {
    resetKey,
  })

  const setNotes = useCallback(
    (notes) => setMonthEntryDraft((entry) => ({ ...entry, notes })),
    [setMonthEntryDraft],
  )

  const setDayNote = useCallback(
    (day, note) => {
      setMonthEntryDraft((entry) => ({
        ...entry,
        dayNotes: { ...entry.dayNotes, [String(day)]: note },
      }))
    },
    [setMonthEntryDraft],
  )

  return { monthEntry, setNotes, setDayNote }
}

function MonthHeader({ month, year, compact = false }) {
  return (
    <div>
      <p
        className={[
          'font-medium leading-none tracking-tight text-planner-ink',
          compact ? 'text-2xl' : 'text-4xl sm:text-5xl xl:text-6xl',
        ].join(' ')}
      >
        {MONTH_DISPLAY_NAMES[month]}
      </p>
      <p className="mt-0.5 text-xs text-planner-ink-muted sm:mt-1 sm:text-sm">
        {padMonthNumber(month)} - {year}
      </p>
    </div>
  )
}

function MonthGoalsSection({ goals, year, month, onUpdateMonthGoal }) {
  return (
    <section className="rounded-xl border border-planner-sand bg-planner-warm/70 p-2.5 sm:p-3">
      <h2 className="mb-1.5 text-[10px] font-semibold uppercase tracking-[0.18em] text-planner-ink-muted sm:mb-2 sm:text-xs">
        Goal
      </h2>
      <MonthGoalChecklist
        goals={goals}
        onUpdateGoal={(goalId, updates) =>
          onUpdateMonthGoal?.(year, month, goalId, updates)
        }
        compact
      />
    </section>
  )
}

function MonthNotesSection({ monthEntry, notesRef, onSetNotes }) {
  return (
    <section
      ref={notesRef}
      className="rounded-xl border border-planner-sand bg-planner-warm/70 p-3"
    >
      <h2 className="mb-2 text-xs font-semibold uppercase tracking-[0.18em] text-planner-ink-muted">
        Notes
      </h2>
      <ImeSafeTextarea
        value={monthEntry.notes}
        onChange={onSetNotes}
        rows={5}
        className="min-h-[6rem] w-full resize-none bg-transparent text-xs leading-relaxed text-planner-ink placeholder:text-planner-ink-muted/50 focus:outline-none sm:text-sm"
        placeholder="이번 달 메모를 적어 보세요"
      />
    </section>
  )
}

function MobileNotesCollapsible({
  monthEntry,
  expanded,
  onToggle,
  onSetNotes,
  notesRef,
}) {
  const hasNotes = Boolean(monthEntry.notes.trim())

  return (
    <section className="shrink-0 border-t border-planner-sand bg-white px-3 py-2 lg:hidden">
      <button
        type="button"
        onClick={onToggle}
        aria-expanded={expanded}
        className={[
          'flex w-full items-center justify-between rounded-xl border px-3 py-2.5 text-left transition',
          expanded
            ? 'border-planner-sage bg-planner-sage-light/50'
            : 'border-planner-sand bg-planner-warm/70 hover:border-planner-sage-muted',
        ].join(' ')}
      >
        <span className="text-xs font-semibold uppercase tracking-[0.18em] text-planner-ink-muted">
          Notes
        </span>
        <span className="flex items-center gap-2 text-xs text-planner-ink-muted">
          {hasNotes && !expanded && (
            <span className="max-w-[10rem] truncate text-planner-ink/70">
              {monthEntry.notes}
            </span>
          )}
          <span className="text-planner-sage" aria-hidden>
            {expanded ? '▲' : '▼'}
          </span>
        </span>
      </button>

      {expanded && (
        <div className="mt-2 max-h-[38vh] overflow-y-auto rounded-xl border border-planner-sand bg-planner-warm/70 p-3">
          <ImeSafeTextarea
            ref={notesRef}
            value={monthEntry.notes}
            onChange={onSetNotes}
            rows={6}
            className="min-h-[8rem] w-full resize-none bg-transparent text-sm leading-relaxed text-planner-ink placeholder:text-planner-ink-muted/50 focus:outline-none"
            placeholder="이번 달 메모를 적어 보세요"
          />
        </div>
      )}
    </section>
  )
}

export default function MonthlyView({
  year,
  month,
  today,
  monthGoals,
  onUpdateMonthGoal,
  onMonthChange,
  onYearChange,
  onNavigate,
  onOpenWeek,
  onOpenYearOverview,
  onQuickNavYearPlanner,
  onQuickNavMonthly,
  onQuickNavWeekly,
  activeNavItem,
  onOpenAccount,
}) {
  const notesRef = useRef(null)
  const [mobileNotesOpen, setMobileNotesOpen] = useState(false)
  const { monthEntry, setNotes } = useMonthlyPlanner(year, month)
  const { weeklyData, updateWeekly } = useCloudSync()

  const goals = useMemo(
    () => padMonthGoals(monthGoals?.[year]?.[String(month)]),
    [monthGoals, year, month],
  )

  const grid = useMemo(() => buildMonthGrid(year, month), [year, month])
  const rowCount = useMemo(() => Math.ceil(grid.length / 7), [grid.length])

  const weekRows = useMemo(() => {
    return Array.from({ length: rowCount }, (_, rowIndex) => {
      const monday = getMondayForWeekRow(grid, rowIndex, year, month)
      const weekId = monday ? getWeekIdFromMonday(monday) : null
      const weekEntry = weekId ? weeklyData?.[weekId] : null
      return {
        monday,
        weekId,
        weekGoals: padWeekGoals(weekEntry?.weekGoals),
        memo: typeof weekEntry?.memo === 'string' ? weekEntry.memo : '',
      }
    })
  }, [grid, month, rowCount, weeklyData, year])

  const handleWeekGoalUpdate = useCallback(
    (weekId, goalId, updates) => {
      if (!weekId) return
      updateWeekly((prev) => {
        const current = prev[weekId] || {}
        const weekGoals = padWeekGoals(current.weekGoals).map((goal) =>
          goal.id === goalId ? { ...goal, ...updates } : goal,
        )
        return {
          ...prev,
          [weekId]: { ...current, weekGoals },
        }
      })
    },
    [updateWeekly],
  )

  const handleWeekMemoChange = useCallback(
    (weekId, memo) => {
      if (!weekId) return
      updateWeekly((prev) => {
        const current = prev[weekId] || {}
        return {
          ...prev,
          [weekId]: { ...current, memo },
        }
      })
    },
    [updateWeekly],
  )

  const handleDayTodoToggle = useCallback(
    (date, taskId, updates) => {
      const monday = getMondayOfWeek(date)
      const weekId = getWeekIdFromMonday(monday)
      const dayIdx = (date.getDay() + 6) % 7

      updateWeekly((prev) => {
        const current = prev[weekId] || {}
        const dayTasks = { ...(current.dayTasks || {}) }
        const list = Array.isArray(dayTasks[dayIdx])
          ? dayTasks[dayIdx]
          : Array.isArray(dayTasks[String(dayIdx)])
            ? dayTasks[String(dayIdx)]
            : []

        dayTasks[dayIdx] = list.map((task) =>
          task.id === taskId ? { ...task, ...updates } : task,
        )

        return {
          ...prev,
          [weekId]: { ...current, dayTasks },
        }
      })
    },
    [updateWeekly],
  )

  const handleSelectMonth = useCallback(
    (nextMonth) => {
      setMobileNotesOpen(false)
      onMonthChange?.(year, nextMonth)
    },
    [onMonthChange, year],
  )

  const handleSelectYear = useCallback(() => {
    onYearChange?.(year)
    onNavigate?.('yearly')
  }, [onNavigate, onYearChange, year])

  const handleSelectNotes = useCallback(() => {
    if (window.matchMedia('(min-width: 1024px)').matches) {
      notesRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' })
      notesRef.current?.focus()
      return
    }
    setMobileNotesOpen(true)
    requestAnimationFrame(() => {
      notesRef.current?.focus()
    })
  }, [])

  const toggleMobileNotes = useCallback(() => {
    setMobileNotesOpen((open) => !open)
  }, [])

  return (
    <div className="flex h-full flex-col overflow-hidden bg-planner-cream">
      <div className="flex shrink-0 items-center justify-between border-b border-planner-sand bg-white px-3 py-2 sm:px-4">
        <div className="flex min-w-0 items-center gap-2">
          <AppNavMenu activeItem={activeNavItem} onNavigate={onNavigate} />
          <h1 className="text-lg font-medium tracking-tight text-planner-ink sm:text-xl">
            Monthly
          </h1>
          <button
            type="button"
            onClick={onOpenYearOverview}
            aria-label="Calendar 보기"
            className="rounded-lg p-1.5 text-planner-sage transition hover:bg-planner-sage-light"
          >
            <CalendarIcon className="size-5" />
          </button>
          <PlannerQuickNav
            activeView="monthly"
            showCalendar={false}
            onYearOverview={onOpenYearOverview}
            onYearPlanner={onQuickNavYearPlanner}
            onMonthly={onQuickNavMonthly}
            onWeekly={onQuickNavWeekly}
          />
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <p className="hidden text-xs text-planner-ink-muted sm:block">
            {MONTH_DISPLAY_NAMES[month]} {year}
          </p>
          {onOpenAccount && <AccountButton onClick={onOpenAccount} />}
        </div>
      </div>

      <div className="flex min-h-0 flex-1 flex-col overflow-hidden lg:flex-row">
        <aside className="hidden shrink-0 border-b border-planner-sand bg-white px-4 py-4 lg:block lg:w-[220px] lg:border-b-0 lg:border-r xl:w-[252px]">
          <div className="mb-4">
            <MonthHeader month={month} year={year} />
          </div>
          <MonthGoalsSection
            goals={goals}
            year={year}
            month={month}
            onUpdateMonthGoal={onUpdateMonthGoal}
          />
          <div className="mt-3">
            <MonthNotesSection
              monthEntry={monthEntry}
              notesRef={notesRef}
              onSetNotes={setNotes}
            />
          </div>
        </aside>

        <div className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden">
          <div className="shrink-0 border-b border-planner-sand bg-white px-3 py-2 lg:hidden">
            <MonthHeader month={month} year={year} compact />
          </div>

          <div className="flex min-h-0 min-w-0 flex-1 overflow-hidden lg:flex-row">
            <main className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden p-1 sm:p-2 lg:p-3">
              <div className="flex h-full min-h-0 flex-col overflow-hidden rounded-xl border border-planner-sand bg-white shadow-soft">
                <div className="grid shrink-0 grid-cols-[minmax(72px,0.9fr)_repeat(7,minmax(0,1fr))] border-b border-planner-sand bg-planner-sage-light/50 sm:grid-cols-[minmax(88px,0.95fr)_repeat(7,minmax(0,1fr))]">
                  <div className="border-r border-planner-sand/70 px-0.5 py-1 text-center text-[8px] font-semibold uppercase leading-tight tracking-[0.06em] text-planner-sage sm:py-1.5 sm:text-[9px] lg:py-2 lg:text-[10px]">
                    Weekly goal
                  </div>
                  {WEEKDAY_LABELS.map((label, index) => (
                    <div
                      key={label}
                      className={[
                        'py-1 text-center text-[9px] font-semibold uppercase tracking-[0.12em] text-planner-ink-muted sm:py-1.5 sm:text-[10px] lg:py-2 lg:text-xs',
                        index >= 5 && 'text-planner-sage',
                      ].join(' ')}
                    >
                      {label}
                    </div>
                  ))}
                </div>

                <div
                  className="grid min-h-0 flex-1 grid-cols-[minmax(72px,0.9fr)_repeat(7,minmax(0,1fr))] sm:grid-cols-[minmax(88px,0.95fr)_repeat(7,minmax(0,1fr))]"
                  style={{ gridTemplateRows: `repeat(${rowCount}, minmax(0, 1fr))` }}
                >
                  {weekRows.map((weekRow, rowIndex) => {
                    const start = rowIndex * 7
                    return (
                      <div key={weekRow.weekId || `week-${rowIndex}`} className="contents">
                        <WeekSideCell
                          monday={weekRow.monday}
                          memo={weekRow.memo}
                          goals={weekRow.weekGoals}
                          onMemoChange={(value) =>
                            handleWeekMemoChange(weekRow.weekId, value)
                          }
                          onUpdateGoal={(goalId, updates) =>
                            handleWeekGoalUpdate(weekRow.weekId, goalId, updates)
                          }
                        />
                        {grid.slice(start, start + 7).map((day, dayIndex) => {
                          const date = day ? new Date(year, month, day) : null
                          const filledTodos = date
                            ? getFilledTodoTasksForDate(date, weeklyData).tasks
                            : []

                          return (
                            <DayCell
                              key={`${day ?? 'empty'}-${start + dayIndex}`}
                              day={day}
                              year={year}
                              month={month}
                              todos={filledTodos}
                              today={today}
                              onToggleTodo={(taskId, updates) =>
                                date && handleDayTodoToggle(date, taskId, updates)
                              }
                              onOpenWeek={onOpenWeek}
                            />
                          )
                        })}
                      </div>
                    )
                  })}
                </div>
              </div>
            </main>

            <div className="hidden h-full min-h-0 lg:flex">
              <MonthIndexTabs
                year={year}
                month={month}
                onSelectMonth={handleSelectMonth}
                onSelectYear={handleSelectYear}
                onSelectNotes={handleSelectNotes}
              />
            </div>
          </div>

          <aside className="shrink-0 space-y-2 border-t border-planner-sand bg-white px-3 py-2 lg:hidden">
            <MonthGoalsSection
              goals={goals}
              year={year}
              month={month}
              onUpdateMonthGoal={onUpdateMonthGoal}
            />
          </aside>

          <MobileNotesCollapsible
            monthEntry={monthEntry}
            expanded={mobileNotesOpen}
            onToggle={toggleMobileNotes}
            onSetNotes={setNotes}
            notesRef={notesRef}
          />
        </div>
      </div>

      <MobileMonthStrip
        year={year}
        month={month}
        onSelectMonth={handleSelectMonth}
      />
    </div>
  )
}
