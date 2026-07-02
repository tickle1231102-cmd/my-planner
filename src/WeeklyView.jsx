import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useCloudSync } from './context/CloudSyncContext.jsx'
import { formatDateWithWeekday, formatWeekRange } from './lib/dateFormat.js'
import { getDominantMonthAndYear } from './lib/monthGoals.js'
import { padMonthGoals, padWeekGoals } from './lib/goalLists.js'
import MonthGoalChecklist from './components/MonthGoalChecklist.jsx'
import { AppNavMenu } from './components/AppNavMenu.jsx'
import { CalendarIcon } from './components/CalendarIcon.jsx'
import { PlannerQuickNav } from './components/PlannerQuickNav.jsx'
import WeeklyHabitStrip, { MOBILE_RAIL_WIDTH_CLASS } from './components/WeeklyHabitStrip.jsx'

const WEEKLY_STORAGE_KEY = 'weekly-planner-v2'
const DAY_LABELS = ['월', '화', '수', '목', '금', '토', '일']
const START_HOUR = 6
const HOURS = Array.from({ length: 24 }, (_, i) => (START_HOUR + i) % 24)
const SLOTS_PER_HOUR = 6
const TIMETABLE_ROW_HEIGHT = 24
const TASK_LINES = HOURS.length
const DAY_TASK_LINES = TASK_LINES - 3
const TASK_ROW_HEIGHT = TIMETABLE_ROW_HEIGHT
const TASK_HEADER_HEIGHT = 26
const NOT_TODO_HEADER_HEIGHT = 22
const DAY_NOTE_HEIGHT = 72
const TIMETABLE_CELL_BORDER = 'border-planner-sage-muted/30'
const HOUR_LABEL_WIDTH = 'w-6'
const DAY_COLUMN_MIN_WIDTH = 'min-w-[84px]'
const SIDEBAR_WIDTH = 'lg:w-[252px]'
const TODO_TASK_COUNT = Math.floor(DAY_TASK_LINES / 2)
const MOBILE_DAY_NOTE_HEIGHT = 52

const TIMETABLE_PAINT_COLORS = [
  {
    id: 'sage',
    swatch: 'bg-planner-sage',
    filled: 'bg-planner-sage/65 hover:bg-planner-sage/75',
  },
  {
    id: 'mint',
    swatch: 'bg-planner-today-ring',
    filled: 'bg-planner-today-ring/55 hover:bg-planner-today-ring/65',
  },
  {
    id: 'mist',
    swatch: 'bg-planner-mist',
    filled: 'bg-planner-mist/50 hover:bg-planner-mist/60',
  },
  {
    id: 'sun',
    swatch: 'bg-planner-sun',
    filled: 'bg-planner-sun/70 hover:bg-planner-sun/80',
  },
  {
    id: 'peach',
    swatch: 'bg-planner-peach',
    filled: 'bg-planner-peach/65 hover:bg-planner-peach/75',
  },
]

const TIMETABLE_COLOR_BY_ID = Object.fromEntries(
  TIMETABLE_PAINT_COLORS.map((color) => [color.id, color]),
)
const DEFAULT_TIMETABLE_COLOR = TIMETABLE_PAINT_COLORS[0].id

function migrateFilledSlots(slots) {
  const next = {}
  for (const [key, value] of Object.entries(slots || {})) {
    if (value === true) next[key] = DEFAULT_TIMETABLE_COLOR
    else if (typeof value === 'string' && TIMETABLE_COLOR_BY_ID[value]) next[key] = value
  }
  return next
}

function getWeekOfMonth(date) {
  const first = new Date(date.getFullYear(), date.getMonth(), 1)
  const mondayOffset = (first.getDay() + 6) % 7
  return Math.ceil((date.getDate() + mondayOffset) / 7)
}

function formatWeekOfMonthLabel(days) {
  const { year, month } = getDominantMonthAndYear(days)
  const anchor =
    days.find((day) => day.getFullYear() === year && day.getMonth() === month) || days[0]
  return `${month + 1}월 ${getWeekOfMonth(anchor)}주차`
}

function pad(n) {
  return String(n).padStart(2, '0')
}

function getWeekIdFromMonday(monday) {
  return `${monday.getFullYear()}-${pad(monday.getMonth() + 1)}-${pad(monday.getDate())}`
}

function getWeekDays(monday) {
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(monday)
    d.setDate(monday.getDate() + i)
    d.setHours(0, 0, 0, 0)
    return d
  })
}

function formatHourLabel(hour) {
  return String(hour)
}

function isSameDay(a, b) {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  )
}

function createDayTasks() {
  return Array.from({ length: DAY_TASK_LINES }, (_, i) => ({
    id: `task-${i}`,
    text: '',
    done: false,
  }))
}

function padDayTasks(tasks) {
  const padded = [...(tasks || [])]
  while (padded.length < DAY_TASK_LINES) {
    padded.push({
      id: `task-${padded.length}`,
      text: '',
      done: false,
    })
  }
  return padded.slice(0, DAY_TASK_LINES).map((t, i) => ({
    id: t.id || `task-${i}`,
    text: t.text || '',
    done: !!t.done,
  }))
}

function defaultDayNotes() {
  return Object.fromEntries(Array.from({ length: 7 }, (_, i) => [i, '']))
}

function migrateMemo(raw) {
  if (typeof raw?.memo === 'string') return raw.memo
  if (raw?.todos?.length) {
    return raw.todos
      .map((item) => item.text)
      .filter(Boolean)
      .join('\n')
  }
  return ''
}

function normalizeDayNotes(raw) {
  const notes = defaultDayNotes()
  if (!raw?.dayNotes) return notes
  for (let i = 0; i < 7; i++) {
    notes[i] = raw.dayNotes[i] ?? raw.dayNotes[String(i)] ?? ''
  }
  return notes
}

function defaultWeekData() {
  const dayTasks = {}
  for (let i = 0; i < 7; i++) dayTasks[i] = createDayTasks()
  return {
    weekGoals: padWeekGoals([]),
    memo: '',
    dayNotes: defaultDayNotes(),
    dayTasks,
    filledSlots: {},
  }
}

function slotKey(dayIdx, hour, slot) {
  return `${dayIdx}-${hour}-${slot}`
}

function parseSlotKey(key) {
  const parts = key.split('-')
  if (parts.length !== 3) return null
  const dayIdx = Number(parts[0])
  const hour = Number(parts[1])
  const slot = Number(parts[2])
  if ([dayIdx, hour, slot].some((n) => Number.isNaN(n))) return null
  return { dayIdx, hour, slot }
}

function findSlotCell(target) {
  if (!(target instanceof Element)) return null
  return target.closest('[data-slot-key]')
}

function useSlotPainter(setSlotFilled, { locked, paintColorId }) {
  const paintRef = useRef({ active: false, fillValue: DEFAULT_TIMETABLE_COLOR })
  const lastKeyRef = useRef(null)

  const paintKey = useCallback(
    (key, value) => {
      if (!key || key === lastKeyRef.current) return
      const parsed = parseSlotKey(key)
      if (!parsed) return
      lastKeyRef.current = key
      setSlotFilled(parsed.dayIdx, parsed.hour, parsed.slot, value)
    },
    [setSlotFilled],
  )

  const endPaint = useCallback(() => {
    paintRef.current.active = false
    lastKeyRef.current = null
  }, [])

  const startPaint = useCallback(
    (key, currentColorId) => {
      if (locked) return
      const value = currentColorId ? false : paintColorId
      paintRef.current = { active: true, fillValue: value }
      lastKeyRef.current = null
      paintKey(key, value)
    },
    [locked, paintColorId, paintKey],
  )

  const continuePaint = useCallback(
    (key) => {
      if (!paintRef.current.active || locked) return
      paintKey(key, paintRef.current.fillValue)
    },
    [locked, paintKey],
  )

  useEffect(() => {
    const onPointerMove = (e) => {
      if (!paintRef.current.active) return
      const cell = findSlotCell(document.elementFromPoint(e.clientX, e.clientY))
      if (!cell) return
      const key = cell.getAttribute('data-slot-key')
      if (key) continuePaint(key)
    }

    const onPointerUp = () => endPaint()

    window.addEventListener('pointermove', onPointerMove)
    window.addEventListener('pointerup', onPointerUp)
    window.addEventListener('pointercancel', onPointerUp)
    return () => {
      window.removeEventListener('pointermove', onPointerMove)
      window.removeEventListener('pointerup', onPointerUp)
      window.removeEventListener('pointercancel', onPointerUp)
    }
  }, [continuePaint, endPaint])

  return { startPaint }
}

function normalizeWeekData(raw) {
  const base = defaultWeekData()
  if (!raw) return base

  const dayTasks = { ...base.dayTasks }
  for (let i = 0; i < 7; i++) {
    dayTasks[i] = padDayTasks(raw.dayTasks?.[i])
  }

  return {
    weekGoals: padWeekGoals(raw.weekGoals),
    memo: migrateMemo(raw),
    dayNotes: normalizeDayNotes(raw),
    dayTasks,
    filledSlots: migrateFilledSlots(raw.filledSlots),
  }
}

function useWeeklyStorage(weekId) {
  const { weeklyData, updateWeekly } = useCloudSync()

  const weekData = normalizeWeekData(weeklyData[weekId])

  const patchWeek = useCallback(
    (patch) => {
      updateWeekly((prev) => ({
        ...prev,
        [weekId]: { ...normalizeWeekData(prev[weekId]), ...patch },
      }))
    },
    [weekId, updateWeekly],
  )

  const setWeekGoal = useCallback(
    (goalId, updates) => {
      updateWeekly((prev) => {
        const current = normalizeWeekData(prev[weekId])
        return {
          ...prev,
          [weekId]: {
            ...current,
            weekGoals: current.weekGoals.map((goal) =>
              goal.id === goalId ? { ...goal, ...updates } : goal,
            ),
          },
        }
      })
    },
    [weekId, updateWeekly],
  )

  const setMemo = useCallback(
    (memo) => patchWeek({ memo }),
    [patchWeek],
  )

  const setDayNote = useCallback(
    (dayIdx, note) => {
      updateWeekly((prev) => {
        const current = normalizeWeekData(prev[weekId])
        return {
          ...prev,
          [weekId]: {
            ...current,
            dayNotes: { ...current.dayNotes, [dayIdx]: note },
          },
        }
      })
    },
    [weekId, updateWeekly],
  )

  const setDayTask = useCallback(
    (dayIdx, taskId, updates) => {
      updateWeekly((prev) => {
        const current = normalizeWeekData(prev[weekId])
        return {
          ...prev,
          [weekId]: {
            ...current,
            dayTasks: {
              ...current.dayTasks,
              [dayIdx]: current.dayTasks[dayIdx].map((t) =>
                t.id === taskId ? { ...t, ...updates } : t,
              ),
            },
          },
        }
      })
    },
    [weekId, updateWeekly],
  )

  const setSlotFilled = useCallback(
    (dayIdx, hour, slot, value) => {
      const key = slotKey(dayIdx, hour, slot)
      updateWeekly((prev) => {
        const current = normalizeWeekData(prev[weekId])
        const currentValue = current.filledSlots[key]
        if (currentValue === value || (!value && !currentValue)) return prev
        const next = { ...current.filledSlots }
        if (!value) delete next[key]
        else next[key] = value
        return {
          ...prev,
          [weekId]: { ...current, filledSlots: next },
        }
      })
    },
    [weekId, updateWeekly],
  )

  return { weekData, setWeekGoal, setMemo, setDayNote, setDayTask, setSlotFilled }
}

function SectionHeader({ children, compact = false }) {
  return (
    <div
      className={[
        'border-b border-planner-sage/30 bg-planner-sage text-center font-semibold text-white',
        compact
          ? 'px-1 py-1 text-[8px] tracking-[0.12em]'
          : 'px-2 py-1.5 text-[10px] tracking-[0.2em]',
      ].join(' ')}
    >
      {children}
    </div>
  )
}

function DottedCheckbox({ checked, onChange, className = '' }) {
  return (
    <button
      type="button"
      role="checkbox"
      aria-checked={checked}
      onClick={() => onChange(!checked)}
      className={[
        'flex size-3.5 shrink-0 items-center justify-center border transition',
        checked
          ? 'border-planner-sage bg-planner-sage'
          : 'border-dashed border-planner-ink-muted/50 bg-white',
        className,
      ].join(' ')}
    >
      {checked && (
        <svg
          viewBox="0 0 12 12"
          className="size-2.5 text-white"
          fill="none"
          aria-hidden
        >
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

function TaskRow({ task, onText, onToggle, inputRef, onEnter }) {
  const composingRef = useRef(false)

  const handleEnter = (e) => {
    if (e.key !== 'Enter') return
    if (e.nativeEvent.isComposing || composingRef.current || e.keyCode === 229) {
      return
    }

    e.preventDefault()
    onText(e.currentTarget.value)
    setTimeout(() => onEnter?.(), 20)
  }

  return (
    <div
      className={[
        'flex items-center border-b',
        TIMETABLE_CELL_BORDER,
      ].join(' ')}
      style={{ height: TASK_ROW_HEIGHT }}
    >
      <DottedCheckbox
        checked={task.done}
        onChange={(done) => onToggle({ done })}
        className="mx-2 shrink-0"
      />
      <input
        ref={inputRef}
        type="text"
        value={task.text}
        onChange={(e) => onText(e.target.value)}
        onCompositionStart={() => {
          composingRef.current = true
        }}
        onCompositionEnd={() => {
          composingRef.current = false
        }}
        onKeyDown={handleEnter}
        className={[
          'min-w-0 flex-1 border-0 bg-transparent text-[11px] text-planner-ink focus:outline-none',
          task.done && 'text-planner-ink-muted/70 line-through',
        ]
          .filter(Boolean)
          .join(' ')}
      />
    </div>
  )
}

function TaskList({ tasks, onText, onToggle, inputRefs, startIndex = 0 }) {
  return (
    <>
      {tasks.map((task, index) => {
        const globalIndex = startIndex + index
        return (
          <TaskRow
            key={task.id}
            task={task}
            inputRef={(el) => {
              inputRefs.current[globalIndex] = el
            }}
            onText={(text) => onText(task.id, text)}
            onToggle={(updates) => onToggle(task.id, updates)}
            onEnter={() => inputRefs.current[globalIndex + 1]?.focus()}
          />
        )
      })}
    </>
  )
}

function DayTasksPanel({
  dayIdx,
  tasks,
  dayNote,
  setDayTask,
  setDayNote,
  showLabel,
  scrollable = false,
  compact = false,
}) {
  const inputRefs = useRef([])
  const todoTasks = tasks.slice(0, TODO_TASK_COUNT)
  const notTodoTasks = tasks.slice(TODO_TASK_COUNT)
  const noteHeight = compact ? MOBILE_DAY_NOTE_HEIGHT : DAY_NOTE_HEIGHT

  return (
    <div className={['flex flex-col bg-white', scrollable ? 'min-h-0 flex-1' : 'h-full'].join(' ')}>
      {showLabel && (
        <p
          className={[
            'flex shrink-0 items-center border-b border-planner-sand/70 bg-planner-warm/50 text-planner-ink-muted/70',
            compact ? 'px-1.5 text-[8px] tracking-[0.08em]' : 'px-2 text-[9px] tracking-[0.1em]',
            'font-medium',
          ].join(' ')}
          style={{ height: compact ? 22 : TASK_HEADER_HEIGHT }}
        >
          To do list
        </p>
      )}
      <textarea
        value={dayNote}
        onChange={(e) => setDayNote(dayIdx, e.target.value)}
        placeholder="메모"
        className={[
          'w-full shrink-0 resize-none border-b border-planner-sand/70 bg-white text-planner-ink placeholder:text-planner-ink-muted/40 focus:outline-none',
          compact ? 'px-1.5 py-1 text-[10px] leading-snug' : 'px-2 py-1.5 text-[11px] leading-relaxed',
        ].join(' ')}
        style={{ height: noteHeight }}
      />
      <div
        className={
          scrollable
            ? 'scrollbar-thin min-h-0 flex-1 overflow-y-auto'
            : 'min-h-0 flex-1 overflow-hidden'
        }
      >
        <TaskList
          tasks={todoTasks}
          inputRefs={inputRefs}
          startIndex={0}
          onText={(taskId, text) => setDayTask(dayIdx, taskId, { text })}
          onToggle={(taskId, updates) => setDayTask(dayIdx, taskId, updates)}
        />
        <p
          className={[
            'flex shrink-0 items-center border-y border-planner-sand/70 bg-planner-warm/50 text-planner-ink-muted/70',
            compact ? 'px-1.5 text-[8px] tracking-[0.08em]' : 'px-2 text-[9px] tracking-[0.1em]',
            'font-medium',
          ].join(' ')}
          style={{ height: compact ? 20 : NOT_TODO_HEADER_HEIGHT }}
        >
          Not to do list
        </p>
        <TaskList
          tasks={notTodoTasks}
          inputRefs={inputRefs}
          startIndex={TODO_TASK_COUNT}
          onText={(taskId, text) => setDayTask(dayIdx, taskId, { text })}
          onToggle={(taskId, updates) => setDayTask(dayIdx, taskId, updates)}
        />
      </div>
    </div>
  )
}

function TimeCell({ dayIdx, hour, slot, colorId, startPaint, locked }) {
  const key = slotKey(dayIdx, hour, slot)
  const filledClass =
    colorId && TIMETABLE_COLOR_BY_ID[colorId]
      ? TIMETABLE_COLOR_BY_ID[colorId].filled
      : TIMETABLE_COLOR_BY_ID[DEFAULT_TIMETABLE_COLOR].filled

  return (
    <div
      role="button"
      tabIndex={-1}
      aria-pressed={!!colorId}
      data-slot-key={key}
      onPointerDown={(e) => {
        if (locked || e.button !== 0) return
        e.preventDefault()
        e.currentTarget.setPointerCapture(e.pointerId)
        startPaint(key, colorId)
      }}
      className={[
        'min-h-0 min-w-0 w-full touch-none select-none border-r border-b last:border-r-0',
        TIMETABLE_CELL_BORDER,
        'transition',
        locked ? 'cursor-default' : 'cursor-pointer active:opacity-80',
        colorId ? filledClass : 'bg-white hover:bg-planner-sage-light/35',
      ].join(' ')}
      style={{ height: TIMETABLE_ROW_HEIGHT, minHeight: TIMETABLE_ROW_HEIGHT }}
    />
  )
}

function HourSlotRow({ dayIdx, hour, filledSlots, startPaint, locked }) {
  return (
    <div
      className="grid h-full w-full grid-cols-6"
      style={{ height: TIMETABLE_ROW_HEIGHT }}
    >
      {Array.from({ length: SLOTS_PER_HOUR }, (_, slot) => {
        const key = slotKey(dayIdx, hour, slot)
        const colorId = filledSlots[key]
        return (
          <TimeCell
            key={slot}
            dayIdx={dayIdx}
            hour={hour}
            slot={slot}
            colorId={colorId}
            startPaint={startPaint}
            locked={locked}
          />
        )
      })}
    </div>
  )
}

function DayTimetableColumn({ dayIdx, filledSlots, startPaint, showHourLabels, locked }) {
  return (
    <div className="flex w-full flex-col touch-none select-none">
      {HOURS.map((hour) => (
        <div key={hour} className="flex w-full" style={{ height: TIMETABLE_ROW_HEIGHT }}>
          {showHourLabels && (
            <div
              className={[
                'flex shrink-0 items-center justify-center border-r border-b bg-planner-warm text-[9px] font-medium text-planner-ink-muted/70',
                HOUR_LABEL_WIDTH,
                TIMETABLE_CELL_BORDER,
              ].join(' ')}
              style={{ height: TIMETABLE_ROW_HEIGHT }}
            >
              {formatHourLabel(hour)}
            </div>
          )}
          <div className="min-w-0 flex-1">
            <HourSlotRow
              dayIdx={dayIdx}
              hour={hour}
              filledSlots={filledSlots}
              startPaint={startPaint}
              locked={locked}
            />
          </div>
        </div>
      ))}
    </div>
  )
}

function TimetableLockIcon({ locked }) {
  if (locked) {
    return (
      <svg viewBox="0 0 16 16" className="size-3" aria-hidden>
        <path
          fill="currentColor"
          d="M5.5 7V5a2.5 2.5 0 0 1 5 0v2h.75A1.25 1.25 0 0 1 12.25 8.25v5.5A1.25 1.25 0 0 1 11 15H5a1.25 1.25 0 0 1-1.25-1.25v-5.5A1.25 1.25 0 0 1 5 7h.5Zm1.5 0h2V5a1 1 0 0 0-2 0v2Z"
        />
      </svg>
    )
  }

  return (
    <svg viewBox="0 0 16 16" className="size-3" aria-hidden>
      <path
        fill="currentColor"
        d="M5 7V5a3 3 0 0 1 6 0v1h.75A1.25 1.25 0 0 1 13 7.25v5.5A1.25 1.25 0 0 1 11.75 14H4.25A1.25 1.25 0 0 1 3 12.75v-5.5A1.25 1.25 0 0 1 4.25 7H5Zm1.5 0h3V5a1.5 1.5 0 0 0-3 0v2Z"
      />
    </svg>
  )
}

function TimetableToolbar({
  paintColorId,
  onPaintColorChange,
  locked,
  onToggleLock,
}) {
  return (
    <div className="flex h-[22px] shrink-0 items-center gap-1.5 border-b border-planner-sand/70 bg-planner-warm/50 px-2">
      <span className="shrink-0 text-[8px] font-medium tracking-[0.12em] text-planner-ink-muted/70">
        TIMETABLE
      </span>
      <div className="flex items-center gap-1">
        {TIMETABLE_PAINT_COLORS.map((color) => (
          <button
            key={color.id}
            type="button"
            onClick={() => onPaintColorChange(color.id)}
            aria-label={`타임테이블 색상: ${color.id}`}
            aria-pressed={paintColorId === color.id}
            className={[
              'size-3.5 shrink-0 rounded-full border border-white/70 shadow-sm transition',
              color.swatch,
              paintColorId === color.id
                ? 'ring-2 ring-planner-ink/20 ring-offset-1'
                : 'opacity-85 hover:opacity-100',
            ].join(' ')}
          />
        ))}
      </div>
      <button
        type="button"
        onClick={onToggleLock}
        aria-label={locked ? '타임테이블 잠금 해제' : '타임테이블 잠금'}
        aria-pressed={locked}
        title={locked ? '잠금 해제' : '잠금'}
        className={[
          'ml-auto flex size-5 shrink-0 items-center justify-center rounded transition',
          locked
            ? 'bg-planner-sage/20 text-planner-sage'
            : 'text-planner-ink-muted/45 hover:bg-planner-sand/70 hover:text-planner-ink-muted',
        ].join(' ')}
      >
        <TimetableLockIcon locked={locked} />
      </button>
    </div>
  )
}

function useIsDesktop() {
  const [isDesktop, setIsDesktop] = useState(
    () =>
      typeof window !== 'undefined' &&
      window.matchMedia('(min-width: 1024px)').matches,
  )

  useEffect(() => {
    const mq = window.matchMedia('(min-width: 1024px)')
    const onChange = (e) => setIsDesktop(e.matches)
    mq.addEventListener('change', onChange)
    return () => mq.removeEventListener('change', onChange)
  }, [])

  return isDesktop
}

const tasksPanelHeight =
  TASK_HEADER_HEIGHT +
  DAY_NOTE_HEIGHT +
  NOT_TODO_HEADER_HEIGHT +
  DAY_TASK_LINES * TASK_ROW_HEIGHT

function MobileDayColumn({
  dayIdx,
  days,
  today,
  weekData,
  setDayTask,
  setDayNote,
  startPaint,
  paintColorId,
  onPaintColorChange,
  locked,
  onToggleLock,
}) {
  const date = days[dayIdx]
  const isToday = isSameDay(date, today)

  return (
    <div className="flex h-full min-w-full shrink-0 snap-start flex-col overflow-hidden">
      <div
        className={[
          'shrink-0 border-b border-planner-sage/30 py-1 text-center text-[13px] font-semibold tracking-wide',
          isToday ? 'bg-planner-today text-planner-ink' : 'bg-planner-sage text-white',
        ].join(' ')}
      >
        {formatDateWithWeekday(date, DAY_LABELS[dayIdx])}
      </div>

      <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
        <div className="flex min-h-0 max-h-[48%] flex-col border-b border-planner-sand">
          <DayTasksPanel
            dayIdx={dayIdx}
            tasks={weekData.dayTasks[dayIdx]}
            dayNote={weekData.dayNotes[dayIdx] || ''}
            setDayTask={setDayTask}
            setDayNote={setDayNote}
            showLabel
            scrollable
            compact
          />
        </div>

        <div className="flex min-h-0 flex-1 flex-col overflow-hidden bg-white">
          <TimetableToolbar
            paintColorId={paintColorId}
            onPaintColorChange={onPaintColorChange}
            locked={locked}
            onToggleLock={onToggleLock}
          />
          <div className="scrollbar-thin min-h-0 flex-1 overflow-y-auto">
            <DayTimetableColumn
              dayIdx={dayIdx}
              filledSlots={weekData.filledSlots}
              startPaint={startPaint}
              showHourLabels
              locked={locked}
            />
          </div>
        </div>
      </div>
    </div>
  )
}

function MobileWeekScroller({
  days,
  today,
  weekData,
  setDayTask,
  setDayNote,
  startPaint,
  paintColorId,
  onPaintColorChange,
  locked,
  onToggleLock,
}) {
  const scrollRef = useRef(null)

  useEffect(() => {
    const todayIdx = days.findIndex((day) => isSameDay(day, today))
    if (todayIdx < 0 || !scrollRef.current) return

    const column = scrollRef.current.children[todayIdx]
    column?.scrollIntoView({ inline: 'start', block: 'nearest' })
  }, [days, today])

  return (
    <div
      ref={scrollRef}
      className="scrollbar-thin flex h-full snap-x snap-mandatory overflow-x-auto overflow-y-hidden"
    >
      {days.map((_, dayIdx) => (
        <MobileDayColumn
          key={dayIdx}
          dayIdx={dayIdx}
          days={days}
          today={today}
          weekData={weekData}
          setDayTask={setDayTask}
          setDayNote={setDayNote}
          startPaint={startPaint}
          paintColorId={paintColorId}
          onPaintColorChange={onPaintColorChange}
          locked={locked}
          onToggleLock={onToggleLock}
        />
      ))}
    </div>
  )
}

function WeeklySidebarContent({
  compact,
  weekLabel,
  goalMonth,
  syncedMonthGoals,
  weekGoals,
  handleMonthGoalUpdate,
  handleWeekGoalUpdate,
  days,
  memo,
  setMemo,
}) {
  return (
    <>
      {weekLabel && (
        <div
          className={[
            'border-b border-planner-sand bg-planner-warm/60',
            compact ? 'px-1.5 py-1.5' : 'hidden px-3 py-2.5 lg:block',
          ].join(' ')}
        >
          <p
            className={[
              'text-center font-medium text-planner-ink',
              compact ? 'text-[10px] leading-tight' : 'text-sm',
            ].join(' ')}
          >
            {weekLabel}
          </p>
        </div>
      )}

      <SectionHeader compact={compact}>GOAL</SectionHeader>
      <div className={compact ? 'bg-white px-1 py-1' : 'bg-white p-2'}>
        <p
          className={[
            'text-planner-ink-muted/70',
            compact ? 'mb-1 text-[8px] leading-tight' : 'mb-1.5 text-[10px]',
          ].join(' ')}
        >
          {goalMonth + 1}월 월간
        </p>
        <MonthGoalChecklist
          goals={syncedMonthGoals}
          placeholder="월간 목표"
          compact={compact}
          onUpdateGoal={handleMonthGoalUpdate}
        />
        <p
          className={[
            'text-planner-ink-muted/70',
            compact ? 'mb-1 mt-2 text-[8px] leading-tight' : 'mb-1.5 mt-3 text-[10px]',
          ].join(' ')}
        >
          주간 목표
        </p>
        <MonthGoalChecklist
          goals={weekGoals}
          placeholder="주간 목표"
          compact={compact}
          onUpdateGoal={handleWeekGoalUpdate}
        />
      </div>

      <WeeklyHabitStrip days={days} compact={compact} />

      <SectionHeader compact={compact}>MEMO</SectionHeader>
      <textarea
        value={memo}
        onChange={(e) => setMemo(e.target.value)}
        placeholder="메모"
        className={[
          'w-full resize-none bg-white text-planner-ink placeholder:text-planner-ink-muted/40 focus:outline-none',
          compact
            ? 'min-h-[88px] flex-1 px-1.5 py-1 text-[10px] leading-snug'
            : 'min-h-[120px] flex-1 p-2 text-xs leading-relaxed lg:min-h-[160px]',
        ].join(' ')}
      />
    </>
  )
}

function DesktopWeekGrid({
  dayIndices,
  days,
  today,
  weekData,
  setDayTask,
  setDayNote,
  startPaint,
  paintColorId,
  onPaintColorChange,
  locked,
  onToggleLock,
}) {
  return (
    <div className="min-w-[700px]">
      <div className="sticky top-0 z-20 flex border-b border-planner-sand bg-white">
        {dayIndices.map((di) => {
          const date = days[di]
          const isToday = isSameDay(date, today)
          return (
            <div
              key={di}
              className={[
                `${DAY_COLUMN_MIN_WIDTH} flex-1 border-r border-planner-sage/30 py-1 text-center text-[15px] font-semibold tracking-wider last:border-r-0`,
                isToday ? 'bg-planner-today text-planner-ink' : 'bg-planner-sage text-white',
              ].join(' ')}
            >
              {formatDateWithWeekday(date, DAY_LABELS[di])}
            </div>
          )
        })}
      </div>

      <div className="flex">
        {dayIndices.map((di) => (
          <div
            key={di}
            className={`${DAY_COLUMN_MIN_WIDTH} flex-1 border-r border-planner-sand last:border-r-0`}
          >
            <div
              className="border-b border-planner-sand"
              style={{ height: tasksPanelHeight }}
            >
              <DayTasksPanel
                dayIdx={di}
                tasks={weekData.dayTasks[di]}
                dayNote={weekData.dayNotes[di] || ''}
                setDayTask={setDayTask}
                setDayNote={setDayNote}
                showLabel
              />
            </div>
          </div>
        ))}
      </div>

      <div className="flex border-b border-planner-sand/70 bg-planner-warm/50">
        <div
          className={[
            'shrink-0 border-r bg-planner-warm/50',
            HOUR_LABEL_WIDTH,
            TIMETABLE_CELL_BORDER,
          ].join(' ')}
        />
        <div className="min-w-0 flex-1">
          <TimetableToolbar
            paintColorId={paintColorId}
            onPaintColorChange={onPaintColorChange}
            locked={locked}
            onToggleLock={onToggleLock}
          />
        </div>
      </div>

      <div className="flex">
        {dayIndices.map((di) => (
          <div
            key={di}
            className={`${DAY_COLUMN_MIN_WIDTH} flex-1 border-r border-planner-sand last:border-r-0`}
          >
            <DayTimetableColumn
              dayIdx={di}
              filledSlots={weekData.filledSlots}
              startPaint={startPaint}
              showHourLabels
              locked={locked}
            />
          </div>
        ))}
      </div>
    </div>
  )
}

function shiftWeekMonday(monday, weeks) {
  const next = new Date(monday)
  next.setDate(monday.getDate() + weeks * 7)
  next.setHours(0, 0, 0, 0)
  return next
}

export default function WeeklyView({
  weekMonday,
  onWeekChange,
  today,
  monthGoals,
  onUpdateMonthGoal,
  activeNavItem,
  onNavigate,
  onOpenYearOverview,
  onQuickNavYearPlanner,
  onQuickNavMonthly,
  onQuickNavWeekly,
}) {
  const weekId = useMemo(() => getWeekIdFromMonday(weekMonday), [weekMonday])
  const days = useMemo(() => getWeekDays(weekMonday), [weekMonday])
  const { weekData, setWeekGoal, setMemo, setDayNote, setDayTask, setSlotFilled } =
    useWeeklyStorage(weekId)

  const { year: goalYear, month: goalMonth } = useMemo(
    () => getDominantMonthAndYear(days),
    [days],
  )
  const syncedMonthGoals = useMemo(
    () => padMonthGoals(monthGoals?.[goalYear]?.[String(goalMonth)]),
    [monthGoals, goalYear, goalMonth],
  )

  const weekLabel = useMemo(() => formatWeekOfMonthLabel(days), [days])

  const handleMonthGoalUpdate = useCallback(
    (goalId, updates) => {
      onUpdateMonthGoal?.(goalYear, goalMonth, goalId, updates)
    },
    [onUpdateMonthGoal, goalYear, goalMonth],
  )

  const handleWeekGoalUpdate = useCallback(
    (goalId, updates) => {
      setWeekGoal(goalId, updates)
    },
    [setWeekGoal],
  )

  const [paintColorId, setPaintColorId] = useState(DEFAULT_TIMETABLE_COLOR)
  const [timetableLocked, setTimetableLocked] = useState(false)

  const { startPaint } = useSlotPainter(setSlotFilled, {
    locked: timetableLocked,
    paintColorId,
  })

  const isDesktop = useIsDesktop()

  return (
    <div className="flex h-full flex-col bg-planner-cream">
      <div className="flex shrink-0 items-center justify-between border-b border-planner-sand bg-white px-3 py-2 sm:px-4">
        <div className="flex min-w-0 shrink-0 items-center gap-2">
          <AppNavMenu activeItem={activeNavItem} onNavigate={onNavigate} />
          <h1 className="text-lg font-medium tracking-tight text-planner-ink sm:text-xl">
            Weekly
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
            activeView="weekly"
            showCalendar={false}
            onYearOverview={onOpenYearOverview}
            onYearPlanner={onQuickNavYearPlanner}
            onMonthly={onQuickNavMonthly}
            onWeekly={onQuickNavWeekly}
          />
        </div>
        <div className="flex min-w-0 flex-1 items-center justify-center gap-2 px-2">
          <button
            type="button"
            onClick={() => onWeekChange?.(shiftWeekMonday(weekMonday, -1))}
            className="flex size-7 shrink-0 items-center justify-center rounded-full border border-planner-sand text-planner-ink-muted transition hover:border-planner-sage-muted hover:bg-planner-sage-light hover:text-planner-sage"
            aria-label="지난 주"
          >
            ‹
          </button>
          <h2 className="truncate text-center text-xs font-medium text-planner-ink sm:text-sm">
            {formatWeekRange(days)}
          </h2>
          <button
            type="button"
            onClick={() => onWeekChange?.(shiftWeekMonday(weekMonday, 1))}
            className="flex size-7 shrink-0 items-center justify-center rounded-full border border-planner-sand text-planner-ink-muted transition hover:border-planner-sage-muted hover:bg-planner-sage-light hover:text-planner-sage"
            aria-label="다음 주"
          >
            ›
          </button>
        </div>
        <div className="w-8 shrink-0 lg:hidden" />
        <div className="hidden w-[120px] shrink-0 lg:block" />
      </div>

      <div className="flex min-h-0 flex-1 overflow-hidden lg:flex-row">
        <aside
          className={`hidden shrink-0 flex-col border-planner-sand bg-white ${SIDEBAR_WIDTH} lg:flex lg:border-r`}
        >
          <WeeklySidebarContent
            weekLabel={weekLabel}
            goalMonth={goalMonth}
            syncedMonthGoals={syncedMonthGoals}
            weekGoals={weekData.weekGoals}
            handleMonthGoalUpdate={handleMonthGoalUpdate}
            handleWeekGoalUpdate={handleWeekGoalUpdate}
            days={days}
            memo={weekData.memo}
            setMemo={setMemo}
          />
        </aside>

        <aside
          className={`flex h-full min-h-0 shrink-0 flex-col overflow-y-auto border-r border-planner-sand bg-white ${MOBILE_RAIL_WIDTH_CLASS} lg:hidden`}
        >
          <WeeklySidebarContent
            compact
            weekLabel={weekLabel}
            goalMonth={goalMonth}
            syncedMonthGoals={syncedMonthGoals}
            weekGoals={weekData.weekGoals}
            handleMonthGoalUpdate={handleMonthGoalUpdate}
            handleWeekGoalUpdate={handleWeekGoalUpdate}
            days={days}
            memo={weekData.memo}
            setMemo={setMemo}
          />
        </aside>

        <div className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden">
          <div className="scrollbar-thin min-h-0 flex-1 overflow-hidden lg:overflow-auto">
            {isDesktop ? (
              <DesktopWeekGrid
                dayIndices={[0, 1, 2, 3, 4, 5, 6]}
                days={days}
                today={today}
                weekData={weekData}
                setDayTask={setDayTask}
                setDayNote={setDayNote}
                startPaint={startPaint}
                paintColorId={paintColorId}
                onPaintColorChange={setPaintColorId}
                locked={timetableLocked}
                onToggleLock={() => setTimetableLocked((prev) => !prev)}
              />
            ) : (
              <MobileWeekScroller
                days={days}
                today={today}
                weekData={weekData}
                setDayTask={setDayTask}
                setDayNote={setDayNote}
                startPaint={startPaint}
                paintColorId={paintColorId}
                onPaintColorChange={setPaintColorId}
                locked={timetableLocked}
                onToggleLock={() => setTimetableLocked((prev) => !prev)}
              />
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

export { getWeekIdFromMonday }

function getMondayOfWeek(date) {
  const d = new Date(date)
  d.setHours(0, 0, 0, 0)
  const dow = d.getDay()
  d.setDate(d.getDate() + (dow === 0 ? -6 : 1 - dow))
  return d
}

export { getMondayOfWeek }
