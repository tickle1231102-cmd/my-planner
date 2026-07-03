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
import TimetableRoutinePanel from './components/TimetableRoutinePanel.jsx'
import { TimetableRoutineIcon } from './components/TimetableRoutineIcon.jsx'
import WeeklySidebarMonthCalendar from './components/WeeklySidebarMonthCalendar.jsx'
import {
  DEFAULT_TIMETABLE_COLOR,
  TIMETABLE_COLOR_BY_ID,
  TIMETABLE_PAINT_COLORS,
} from './lib/timetableColors.js'
import {
  TIMETABLE_ROUTINES_KEY,
  computeRoutineSlots,
  mergeFilledSlots,
  normalizeRoutines,
  toDateKey,
} from './lib/timetableRoutines.js'
import { buildChecklistDateKeys } from './lib/weeklyChecklist.js'

const WEEKLY_STORAGE_KEY = 'weekly-planner-v2'
const DAY_LABELS = ['월', '화', '수', '목', '금', '토', '일']
const START_HOUR = 6
const HOURS = Array.from({ length: 24 }, (_, i) => (START_HOUR + i) % 24)
const SLOTS_PER_HOUR = 6
const TIMETABLE_ROW_HEIGHT = 24
const TASK_LINES = HOURS.length
const TODO_TASK_COUNT = 6
const NOT_TODO_TASK_COUNT = 3
const DAY_TASK_LINES = TODO_TASK_COUNT + NOT_TODO_TASK_COUNT
const TASK_ROW_HEIGHT = TIMETABLE_ROW_HEIGHT
const TASK_HEADER_HEIGHT = 26
const NOT_TODO_HEADER_HEIGHT = 22
const DAY_NOTE_HEIGHT = 72
const TIMETABLE_CELL_BORDER = 'border-planner-sage-muted/30'
const HOUR_LABEL_WIDTH = 'w-6'
const DAY_COLUMN_MIN_WIDTH = 'min-w-[84px]'
const SIDEBAR_WIDTH = 'lg:w-[252px]'
const MOBILE_DAY_NOTE_HEIGHT = 52
const TASK_LONG_PRESS_MS = 480
const TASK_DRAG_LONG_PRESS_MS = 420

function migrateFilledSlots(slots) {
  const next = {}
  for (const [key, value] of Object.entries(slots || {})) {
    if (value === false) next[key] = false
    else if (value === true) next[key] = DEFAULT_TIMETABLE_COLOR
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
    postponed: false,
  }))
}

function padDayTasks(tasks) {
  const padded = [...(tasks || [])]
  while (padded.length < DAY_TASK_LINES) {
    padded.push({
      id: `task-${padded.length}`,
      text: '',
      done: false,
      postponed: false,
    })
  }
  return padded.slice(0, DAY_TASK_LINES).map((t, i) => ({
    id: t.id || `task-${i}`,
    text: t.text || '',
    done: !!t.done,
    postponed: !!t.postponed,
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

function findDayDropZone(target) {
  if (!(target instanceof Element)) return null
  const zone = target.closest('[data-day-drop-zone]')
  if (!zone) return null
  const dayIdx = Number(zone.getAttribute('data-day-drop-zone'))
  return Number.isNaN(dayIdx) ? null : dayIdx
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
        if (currentValue === value) return prev
        const next = { ...current.filledSlots }
        if (!value) next[key] = false
        else next[key] = value
        return {
          ...prev,
          [weekId]: { ...current, filledSlots: next },
        }
      })
    },
    [weekId, updateWeekly],
  )

  const moveDayTask = useCallback(
    (fromDayIdx, taskId, toDayIdx) => {
      if (fromDayIdx === toDayIdx) return
      updateWeekly((prev) => {
        const current = normalizeWeekData(prev[weekId])
        const fromTasks = [...current.dayTasks[fromDayIdx]]
        const fromIndex = fromTasks.findIndex((t) => t.id === taskId)
        if (fromIndex < 0) return prev

        const moving = fromTasks[fromIndex]
        if (!moving.done) return prev

        const toTasks = [...current.dayTasks[toDayIdx]]
        const emptyIndex = toTasks.findIndex(
          (t) => !t.text.trim() && !t.done && !t.postponed,
        )
        if (emptyIndex < 0) return prev

        toTasks[emptyIndex] = {
          ...toTasks[emptyIndex],
          text: moving.text,
          done: moving.done,
          postponed: moving.postponed,
        }
        fromTasks[fromIndex] = {
          ...fromTasks[fromIndex],
          text: '',
          done: false,
          postponed: false,
        }

        return {
          ...prev,
          [weekId]: {
            ...current,
            dayTasks: {
              ...current.dayTasks,
              [fromDayIdx]: fromTasks,
              [toDayIdx]: toTasks,
            },
          },
        }
      })
    },
    [weekId, updateWeekly],
  )

  return {
    weekData,
    setWeekGoal,
    setMemo,
    setDayNote,
    setDayTask,
    setSlotFilled,
    moveDayTask,
  }
}

function useTimetableRoutines() {
  const { weeklyData, updateWeekly } = useCloudSync()
  const routines = useMemo(
    () => normalizeRoutines(weeklyData[TIMETABLE_ROUTINES_KEY]),
    [weeklyData],
  )

  const setRoutines = useCallback(
    (nextRoutines) => {
      updateWeekly((prev) => ({
        ...prev,
        [TIMETABLE_ROUTINES_KEY]: normalizeRoutines(nextRoutines),
      }))
    },
    [updateWeekly],
  )

  return { routines, setRoutines }
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

function DottedCheckbox({ checked, postponed, onChange, className = '' }) {
  return (
    <button
      type="button"
      role="checkbox"
      aria-checked={checked}
      onClick={() => onChange(!checked)}
      className={[
        'flex size-3.5 shrink-0 items-center justify-center border text-[10px] font-bold leading-none transition',
        postponed
          ? 'border-planner-sun bg-planner-sun/90 text-planner-ink'
          : checked
            ? 'border-planner-sage bg-planner-sage text-white'
            : 'border-dashed border-planner-ink-muted/50 bg-white text-planner-ink',
        className,
      ].join(' ')}
    >
      {postponed ? (
        <span aria-hidden>→</span>
      ) : (
        checked && (
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
        )
      )}
    </button>
  )
}

function TaskPostponeMenu({ x, y, onPostpone, onClose }) {
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
      className="fixed z-50 min-w-[120px] rounded-xl border border-planner-sand bg-white p-1.5 shadow-soft"
      style={{ left: x, top: y }}
      role="menu"
      onContextMenu={(e) => e.preventDefault()}
    >
      <button
        type="button"
        role="menuitem"
        onClick={onPostpone}
        className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-xs text-planner-ink transition hover:bg-planner-warm"
      >
        <span className="font-semibold text-planner-sun">→</span>
        미루기
      </button>
    </div>
  )
}

function TaskRow({
  task,
  dayIdx,
  onText,
  onToggle,
  onPostpone,
  onStartTouchDrag,
  inputRef,
  onEnter,
  touchDragEnabled = false,
}) {
  const composingRef = useRef(false)
  const longPressTimerRef = useRef(null)
  const postponeTimerRef = useRef(null)
  const touchDragTimerRef = useRef(null)
  const touchStartRef = useRef(null)

  const clearTimers = useCallback(() => {
    if (longPressTimerRef.current !== null) {
      window.clearTimeout(longPressTimerRef.current)
      longPressTimerRef.current = null
    }
    if (postponeTimerRef.current !== null) {
      window.clearTimeout(postponeTimerRef.current)
      postponeTimerRef.current = null
    }
    if (touchDragTimerRef.current !== null) {
      window.clearTimeout(touchDragTimerRef.current)
      touchDragTimerRef.current = null
    }
  }, [])

  useEffect(() => () => clearTimers(), [clearTimers])

  const handleEnter = (e) => {
    if (e.key !== 'Enter') return
    if (e.nativeEvent.isComposing || composingRef.current || e.keyCode === 229) {
      return
    }

    e.preventDefault()
    onText(e.currentTarget.value)
    setTimeout(() => onEnter?.(), 20)
  }

  const handleContextMenu = (event) => {
    if (!onPostpone) return
    event.preventDefault()
    onPostpone(event)
  }

  const handleDragStart = (event) => {
    if (!task.done) {
      event.preventDefault()
      return
    }
    event.dataTransfer.setData(
      'application/json',
      JSON.stringify({ dayIdx, taskId: task.id }),
    )
    event.dataTransfer.effectAllowed = 'move'
  }

  const handleTouchStart = (event) => {
    if (event.touches.length !== 1) return
    const touch = event.touches[0]
    touchStartRef.current = { x: touch.clientX, y: touch.clientY }

    if (!task.done && onPostpone) {
      postponeTimerRef.current = window.setTimeout(() => {
        onPostpone({
          clientX: touch.clientX,
          clientY: touch.clientY,
        })
      }, TASK_LONG_PRESS_MS)
    }

    if (touchDragEnabled && task.done) {
      touchDragTimerRef.current = window.setTimeout(() => {
        onStartTouchDrag?.({
          dayIdx,
          taskId: task.id,
          clientX: touch.clientX,
          clientY: touch.clientY,
        })
        if (typeof navigator.vibrate === 'function') {
          navigator.vibrate(12)
        }
      }, TASK_DRAG_LONG_PRESS_MS)
    }
  }

  const handleTouchMove = (event) => {
    const start = touchStartRef.current
    if (!start || event.touches.length !== 1) return
    const touch = event.touches[0]
    const dx = touch.clientX - start.x
    const dy = touch.clientY - start.y
    if (dx * dx + dy * dy > 64) {
      if (postponeTimerRef.current !== null) {
        window.clearTimeout(postponeTimerRef.current)
        postponeTimerRef.current = null
      }
    }
  }

  const handleTouchEnd = () => {
    touchStartRef.current = null
    clearTimers()
  }

  return (
    <div
      draggable={task.done}
      onDragStart={handleDragStart}
      onContextMenu={handleContextMenu}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
      onTouchCancel={handleTouchEnd}
      className={[
        'flex items-center border-b',
        TIMETABLE_CELL_BORDER,
        task.done ? 'cursor-grab active:cursor-grabbing' : '',
      ].join(' ')}
      style={{ height: TASK_ROW_HEIGHT }}
    >
      <DottedCheckbox
        checked={task.done}
        postponed={task.postponed}
        onChange={(done) => onToggle({ done, postponed: done ? false : task.postponed })}
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

function TaskList({
  tasks,
  dayIdx,
  onText,
  onToggle,
  onPostpone,
  onStartTouchDrag,
  onTaskDrop,
  inputRefs,
  startIndex = 0,
  touchDragEnabled = false,
}) {
  const handleDragOver = (event) => {
    event.preventDefault()
    event.dataTransfer.dropEffect = 'move'
  }

  const handleDrop = (event) => {
    event.preventDefault()
    try {
      const payload = JSON.parse(event.dataTransfer.getData('application/json'))
      if (payload?.taskId != null && payload?.dayIdx != null) {
        onTaskDrop?.(payload.dayIdx, payload.taskId, dayIdx)
      }
    } catch {
      // ignore invalid drag payload
    }
  }

  return (
    <div
      data-day-drop-zone={dayIdx}
      onDragOver={handleDragOver}
      onDrop={handleDrop}
    >
      {tasks.map((task, index) => {
        const globalIndex = startIndex + index
        return (
          <TaskRow
            key={task.id}
            task={task}
            dayIdx={dayIdx}
            touchDragEnabled={touchDragEnabled}
            inputRef={(el) => {
              inputRefs.current[globalIndex] = el
            }}
            onText={(text) => onText(task.id, text)}
            onToggle={(updates) => onToggle(task.id, updates)}
            onPostpone={(event) => onPostpone?.(task.id, event)}
            onStartTouchDrag={onStartTouchDrag}
            onEnter={() => inputRefs.current[globalIndex + 1]?.focus()}
          />
        )
      })}
    </div>
  )
}

function computeDayAchievementRate(tasks) {
  const active = tasks.filter((task) => task.text.trim())
  if (active.length === 0) return 0
  const done = active.filter((task) => task.done).length
  return Math.round((done / active.length) * 100)
}

function DayAchievementBar({ percent, isToday, compact = false }) {
  return (
    <div
      className={[
        'shrink-0 border-t border-planner-sand/70 bg-planner-warm/35',
        compact ? 'px-1.5 py-1.5' : 'px-2 py-2',
      ].join(' ')}
    >
      <div
        className={[
          'mb-1 flex items-center justify-between font-medium text-planner-ink-muted',
          compact ? 'text-[8px]' : 'text-[9px]',
        ].join(' ')}
      >
        <span>{isToday ? '오늘 달성률' : '달성률'}</span>
        <span className="text-planner-sage">{percent}%</span>
      </div>
      <div className="h-1.5 overflow-hidden rounded-full bg-planner-sand">
        <div
          className="h-full rounded-full bg-planner-sage transition-[width]"
          style={{ width: `${percent}%` }}
        />
      </div>
    </div>
  )
}

function DayTasksPanel({
  dayIdx,
  tasks,
  dayNote,
  setDayTask,
  setDayNote,
  moveDayTask,
  onPostponeTask,
  onStartTouchDrag,
  showLabel,
  scrollable = false,
  compact = false,
  touchDragEnabled = false,
  dropHighlight = false,
  isToday = false,
}) {
  const inputRefs = useRef([])
  const todoTasks = tasks.slice(0, TODO_TASK_COUNT)
  const notTodoTasks = tasks.slice(TODO_TASK_COUNT)
  const noteHeight = compact ? MOBILE_DAY_NOTE_HEIGHT : DAY_NOTE_HEIGHT
  const achievementRate = useMemo(() => computeDayAchievementRate(tasks), [tasks])

  if (compact) {
    return (
      <div className="flex shrink-0 flex-col bg-white">
        {showLabel && (
          <p
            className="flex shrink-0 items-center border-b border-planner-sand/70 bg-planner-warm/50 px-1.5 text-[8px] font-medium tracking-[0.08em] text-planner-ink-muted/70"
            style={{ height: 22 }}
          >
            To do list
          </p>
        )}
        <textarea
          value={dayNote}
          onChange={(e) => setDayNote(dayIdx, e.target.value)}
          placeholder="메모"
          className="w-full shrink-0 resize-none border-b border-planner-sand/70 bg-white px-1.5 py-1 text-[10px] leading-snug text-planner-ink placeholder:text-planner-ink-muted/40 focus:outline-none"
          style={{ height: noteHeight }}
        />
        <div
          data-day-drop-zone={dayIdx}
          className={[
            dropHighlight && 'bg-planner-sage-light/40 ring-2 ring-inset ring-planner-sage/40',
          ]
            .filter(Boolean)
            .join(' ')}
        >
          <TaskList
            tasks={todoTasks}
            dayIdx={dayIdx}
            inputRefs={inputRefs}
            startIndex={0}
            touchDragEnabled={touchDragEnabled}
            onText={(taskId, text) => setDayTask(dayIdx, taskId, { text })}
            onToggle={(taskId, updates) => setDayTask(dayIdx, taskId, updates)}
            onPostpone={(taskId, event) => onPostponeTask?.(dayIdx, taskId, event)}
            onStartTouchDrag={onStartTouchDrag}
            onTaskDrop={moveDayTask}
          />
          <p
            className="flex shrink-0 items-center border-y border-planner-sand/70 bg-planner-warm/50 px-1.5 text-[8px] font-medium tracking-[0.08em] text-planner-ink-muted/70"
            style={{ height: 20 }}
          >
            Not to do list
          </p>
          <TaskList
            tasks={notTodoTasks}
            dayIdx={dayIdx}
            inputRefs={inputRefs}
            startIndex={TODO_TASK_COUNT}
            touchDragEnabled={touchDragEnabled}
            onText={(taskId, text) => setDayTask(dayIdx, taskId, { text })}
            onToggle={(taskId, updates) => setDayTask(dayIdx, taskId, updates)}
            onPostpone={(taskId, event) => onPostponeTask?.(dayIdx, taskId, event)}
            onStartTouchDrag={onStartTouchDrag}
            onTaskDrop={moveDayTask}
          />
        </div>
        <DayAchievementBar percent={achievementRate} isToday={isToday} compact />
      </div>
    )
  }

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
        data-day-drop-zone={dayIdx}
        className={[
          scrollable
            ? 'scrollbar-thin min-h-0 flex-1 overflow-y-auto'
            : 'shrink-0',
          dropHighlight && 'bg-planner-sage-light/40 ring-2 ring-inset ring-planner-sage/40',
        ]
          .filter(Boolean)
          .join(' ')}
      >
        <TaskList
          tasks={todoTasks}
          dayIdx={dayIdx}
          inputRefs={inputRefs}
          startIndex={0}
          touchDragEnabled={touchDragEnabled}
          onText={(taskId, text) => setDayTask(dayIdx, taskId, { text })}
          onToggle={(taskId, updates) => setDayTask(dayIdx, taskId, updates)}
          onPostpone={(taskId, event) => onPostponeTask?.(dayIdx, taskId, event)}
          onStartTouchDrag={onStartTouchDrag}
          onTaskDrop={moveDayTask}
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
          dayIdx={dayIdx}
          inputRefs={inputRefs}
          startIndex={TODO_TASK_COUNT}
          touchDragEnabled={touchDragEnabled}
          onText={(taskId, text) => setDayTask(dayIdx, taskId, { text })}
          onToggle={(taskId, updates) => setDayTask(dayIdx, taskId, updates)}
          onPostpone={(taskId, event) => onPostponeTask?.(dayIdx, taskId, event)}
          onStartTouchDrag={onStartTouchDrag}
          onTaskDrop={moveDayTask}
        />
      </div>
      <DayAchievementBar percent={achievementRate} isToday={isToday} compact={compact} />
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
        'min-h-0 min-w-0 w-full select-none border-r border-b last:border-r-0',
        TIMETABLE_CELL_BORDER,
        'transition',
        locked ? 'touch-pan-y cursor-default' : 'touch-none cursor-pointer active:opacity-80',
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
    <div className="flex w-full flex-col select-none">
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
  onOpenRoutines,
  collapsible = false,
  expanded = true,
  onToggleExpand,
}) {
  return (
    <div className="flex h-[22px] shrink-0 items-center gap-1.5 border-b border-planner-sand/70 bg-planner-warm/50 px-2">
      {collapsible && (
        <button
          type="button"
          onClick={onToggleExpand}
          aria-label={expanded ? '타임테이블 접기' : '타임테이블 펼치기'}
          aria-expanded={expanded}
          className="flex size-4 shrink-0 items-center justify-center rounded text-[10px] text-planner-sage transition hover:bg-planner-sand/70"
        >
          {expanded ? '▼' : '▶'}
        </button>
      )}
      <span className="shrink-0 text-[8px] font-medium tracking-[0.12em] text-planner-ink-muted/70">
        TIMETABLE
      </span>
      {(!collapsible || expanded) && (
        <>
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
          <div className="ml-auto flex items-center gap-0.5">
            <button
              type="button"
              onClick={onOpenRoutines}
              aria-label="반복 루틴 설정"
              title="반복 루틴"
              className="flex size-5 shrink-0 items-center justify-center rounded text-planner-ink-muted transition hover:bg-planner-sand/70 hover:text-planner-sage"
            >
              <TimetableRoutineIcon className="size-3.5" />
            </button>
            <button
              type="button"
              onClick={onToggleLock}
              aria-label={locked ? '타임테이블 잠금 해제' : '타임테이블 잠금'}
              aria-pressed={locked}
              title={locked ? '잠금 해제' : '잠금'}
              className={[
                'flex size-5 shrink-0 items-center justify-center rounded transition',
                locked
                  ? 'bg-planner-sage/20 text-planner-sage'
                  : 'text-planner-ink-muted/45 hover:bg-planner-sand/70 hover:text-planner-ink-muted',
              ].join(' ')}
            >
              <TimetableLockIcon locked={locked} />
            </button>
          </div>
        </>
      )}
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

const ACHIEVEMENT_BAR_HEIGHT = 44
const tasksPanelHeight =
  TASK_HEADER_HEIGHT +
  DAY_NOTE_HEIGHT +
  NOT_TODO_HEADER_HEIGHT +
  DAY_TASK_LINES * TASK_ROW_HEIGHT +
  ACHIEVEMENT_BAR_HEIGHT

function SidebarEdgeToggle({ expanded, onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={expanded ? '사이드바 접기' : '사이드바 펼치기'}
      aria-pressed={expanded}
      className={[
        'absolute top-0 z-20 flex h-[30px] w-5 items-center justify-center',
        'rounded-r-md border border-l-0 border-planner-sand bg-white shadow-soft transition',
        expanded ? 'right-0 translate-x-full' : 'left-0',
      ].join(' ')}
    >
      <svg viewBox="0 0 8 10" className="size-2.5" aria-hidden>
        {expanded ? (
          <polygon points="8,0 0,5 8,10" className="fill-planner-sage" />
        ) : (
          <polygon points="0,0 8,5 0,10" className="fill-planner-sage" />
        )}
      </svg>
    </button>
  )
}

function MobileDayColumn({
  dayIdx,
  days,
  today,
  weekData,
  filledSlots,
  setDayTask,
  setDayNote,
  moveDayTask,
  onPostponeTask,
  onStartTouchDrag,
  startPaint,
  paintColorId,
  onPaintColorChange,
  locked,
  onToggleLock,
  onOpenRoutines,
  dualColumn,
  columnWidth,
  dropHighlight,
  timetableExpanded,
  onToggleTimetable,
}) {
  const date = days[dayIdx]
  const isToday = isSameDay(date, today)
  const columnStyle =
    columnWidth > 0
      ? {
          width: columnWidth,
          minWidth: columnWidth,
          maxWidth: columnWidth,
          flexBasis: columnWidth,
        }
      : undefined

  return (
    <div
      className={[
        'flex h-full shrink-0 snap-start flex-col overflow-hidden',
        columnWidth > 0 ? '' : dualColumn ? 'min-w-[50%] max-w-[50%]' : 'min-w-full',
      ].join(' ')}
      style={columnStyle}
      data-day-column={dayIdx}
    >
      <div
        className={[
          'shrink-0 truncate border-b border-planner-sage/30 px-1 py-1 text-center text-[13px] font-semibold tracking-wide',
          isToday ? 'bg-planner-today text-planner-ink' : 'bg-planner-sage text-white',
        ].join(' ')}
      >
        {formatDateWithWeekday(date, DAY_LABELS[dayIdx])}
      </div>

      <div className="flex shrink-0 flex-col border-b border-planner-sand">
        <DayTasksPanel
          dayIdx={dayIdx}
          tasks={weekData.dayTasks[dayIdx]}
          dayNote={weekData.dayNotes[dayIdx] || ''}
          setDayTask={setDayTask}
          setDayNote={setDayNote}
          moveDayTask={moveDayTask}
          onPostponeTask={onPostponeTask}
          onStartTouchDrag={onStartTouchDrag}
          showLabel
          compact
          touchDragEnabled
          dropHighlight={dropHighlight}
          isToday={isToday}
        />
      </div>

      <div className="flex min-h-0 flex-1 flex-col overflow-hidden bg-white">
        <TimetableToolbar
          paintColorId={paintColorId}
          onPaintColorChange={onPaintColorChange}
          locked={locked}
          onToggleLock={onToggleLock}
          onOpenRoutines={onOpenRoutines}
          collapsible
          expanded={timetableExpanded}
          onToggleExpand={onToggleTimetable}
        />
        {timetableExpanded && (
          <div className="scrollbar-thin min-h-0 flex-1 overflow-y-auto overscroll-y-contain touch-pan-y">
            <DayTimetableColumn
              dayIdx={dayIdx}
              filledSlots={filledSlots}
              startPaint={startPaint}
              showHourLabels
              locked={locked}
            />
          </div>
        )}
      </div>
    </div>
  )
}

function MobileWeekScroller({
  weekId,
  days,
  today,
  weekData,
  filledSlots,
  setDayTask,
  setDayNote,
  moveDayTask,
  onPostponeTask,
  onStartTouchDrag,
  startPaint,
  paintColorId,
  onPaintColorChange,
  locked,
  onToggleLock,
  onOpenRoutines,
  dualColumn,
  dropHighlightDay,
  timetableExpanded,
  onToggleTimetable,
}) {
  const scrollRef = useRef(null)
  const [columnWidth, setColumnWidth] = useState(0)
  const initialScrollDoneRef = useRef(false)
  const prevColumnWidthRef = useRef(0)

  useEffect(() => {
    initialScrollDoneRef.current = false
    prevColumnWidthRef.current = 0
  }, [weekId])

  useEffect(() => {
    const el = scrollRef.current
    if (!el) return

    const updateColumnWidth = () => {
      const viewportWidth = el.clientWidth
      if (!viewportWidth) return
      setColumnWidth(dualColumn ? viewportWidth / 2 : viewportWidth)
    }

    updateColumnWidth()
    const observer = new ResizeObserver(updateColumnWidth)
    observer.observe(el)
    window.addEventListener('resize', updateColumnWidth)

    return () => {
      observer.disconnect()
      window.removeEventListener('resize', updateColumnWidth)
    }
  }, [dualColumn])

  useEffect(() => {
    const el = scrollRef.current
    if (!el || !columnWidth) return

    if (!initialScrollDoneRef.current) {
      const todayIdx = days.findIndex((day) => isSameDay(day, today))
      if (todayIdx < 0) return

      const scrollToToday = () => {
        el.scrollTo({ left: todayIdx * columnWidth, behavior: 'auto' })
        initialScrollDoneRef.current = true
        prevColumnWidthRef.current = columnWidth
      }

      scrollToToday()
      const frame = window.requestAnimationFrame(scrollToToday)
      return () => window.cancelAnimationFrame(frame)
    }

    const prevWidth = prevColumnWidthRef.current
    if (prevWidth > 0 && prevWidth !== columnWidth) {
      const dayIndex = Math.min(
        days.length - 1,
        Math.max(0, Math.round(el.scrollLeft / prevWidth)),
      )
      el.scrollTo({ left: dayIndex * columnWidth, behavior: 'auto' })
    }
    prevColumnWidthRef.current = columnWidth
  }, [weekId, days, today, columnWidth])

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
          filledSlots={filledSlots}
          setDayTask={setDayTask}
          setDayNote={setDayNote}
          moveDayTask={moveDayTask}
          onPostponeTask={onPostponeTask}
          onStartTouchDrag={onStartTouchDrag}
          startPaint={startPaint}
          paintColorId={paintColorId}
          onPaintColorChange={onPaintColorChange}
          locked={locked}
          onToggleLock={onToggleLock}
          onOpenRoutines={onOpenRoutines}
          dualColumn={dualColumn}
          columnWidth={columnWidth}
          dropHighlight={dropHighlightDay === dayIdx}
          timetableExpanded={timetableExpanded}
          onToggleTimetable={onToggleTimetable}
        />
      ))}
    </div>
  )
}

function WeeklySidebarContent({
  compact,
  weekLabel,
  goalYear,
  goalMonth,
  syncedMonthGoals,
  weekGoals,
  handleMonthGoalUpdate,
  handleWeekGoalUpdate,
  days,
  today,
  checklistDateKeys,
  memo,
  setMemo,
  onOpenHabit,
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
          <WeeklySidebarMonthCalendar
            year={goalYear}
            month={goalMonth}
            weekDays={days}
            checklistDateKeys={checklistDateKeys}
            today={today}
            compact={compact}
          />
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

      <WeeklyHabitStrip days={days} compact={compact} onOpenHabit={onOpenHabit} />

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
  filledSlots,
  setDayTask,
  setDayNote,
  moveDayTask,
  onPostponeTask,
  startPaint,
  paintColorId,
  onPaintColorChange,
  locked,
  onToggleLock,
  onOpenRoutines,
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
        {dayIndices.map((di) => {
          const date = days[di]
          const dayIsToday = isSameDay(date, today)
          return (
          <div
            key={di}
            className={`${DAY_COLUMN_MIN_WIDTH} flex-1 border-r border-planner-sand last:border-r-0`}
          >
            <div
              className="border-b border-planner-sand"
              style={{ minHeight: tasksPanelHeight }}
            >
              <DayTasksPanel
                dayIdx={di}
                tasks={weekData.dayTasks[di]}
                dayNote={weekData.dayNotes[di] || ''}
                setDayTask={setDayTask}
                setDayNote={setDayNote}
                moveDayTask={moveDayTask}
                onPostponeTask={onPostponeTask}
                showLabel
                isToday={dayIsToday}
              />
            </div>
          </div>
        )})}
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
            onOpenRoutines={onOpenRoutines}
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
              filledSlots={filledSlots}
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
  const { weeklyData } = useCloudSync()
  const { weekData, setWeekGoal, setMemo, setDayNote, setDayTask, setSlotFilled, moveDayTask } =
    useWeeklyStorage(weekId)
  const { routines, setRoutines } = useTimetableRoutines()

  const displayFilledSlots = useMemo(() => {
    const routineSlots = computeRoutineSlots(days, routines)
    return mergeFilledSlots(weekData.filledSlots, routineSlots)
  }, [days, routines, weekData.filledSlots])

  const { year: goalYear, month: goalMonth } = useMemo(
    () => getDominantMonthAndYear(days),
    [days],
  )
  const syncedMonthGoals = useMemo(
    () => padMonthGoals(monthGoals?.[goalYear]?.[String(goalMonth)]),
    [monthGoals, goalYear, goalMonth],
  )

  const weekLabel = useMemo(() => formatWeekOfMonthLabel(days), [days])

  const checklistDateKeys = useMemo(
    () => buildChecklistDateKeys(goalYear, goalMonth, weeklyData, toDateKey),
    [goalYear, goalMonth, weeklyData],
  )

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
  const [timetableLocked, setTimetableLocked] = useState(true)
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(true)
  const [mobileTimetableExpanded, setMobileTimetableExpanded] = useState(true)
  const [postponeMenu, setPostponeMenu] = useState(null)
  const [touchDrag, setTouchDrag] = useState(null)
  const [dropHighlightDay, setDropHighlightDay] = useState(null)
  const [routinePanelOpen, setRoutinePanelOpen] = useState(false)
  const touchDragMetaRef = useRef(null)

  const { startPaint } = useSlotPainter(setSlotFilled, {
    locked: timetableLocked,
    paintColorId,
  })

  const handleOpenHabit = useCallback(() => {
    onNavigate?.('habit')
  }, [onNavigate])

  const handlePostponeTask = useCallback((dayIdx, taskId, event) => {
    setPostponeMenu({
      x: event.clientX,
      y: event.clientY,
      dayIdx,
      taskId,
    })
  }, [])

  const closePostponeMenu = useCallback(() => {
    setPostponeMenu(null)
  }, [])

  const applyPostpone = useCallback(() => {
    if (!postponeMenu) return
    setDayTask(postponeMenu.dayIdx, postponeMenu.taskId, {
      postponed: true,
      done: false,
    })
    setPostponeMenu(null)
  }, [postponeMenu, setDayTask])

  const handleStartTouchDrag = useCallback((payload) => {
    touchDragMetaRef.current = {
      fromDayIdx: payload.dayIdx,
      taskId: payload.taskId,
    }
    setTouchDrag({
      x: payload.clientX,
      y: payload.clientY,
    })
    setPostponeMenu(null)
  }, [])

  useEffect(() => {
    if (!touchDrag) return

    const handlePointerMove = (event) => {
      setTouchDrag({
        x: event.clientX,
        y: event.clientY,
      })
      const zone = findDayDropZone(document.elementFromPoint(event.clientX, event.clientY))
      setDropHighlightDay(zone)
    }

    const finish = (event) => {
      const meta = touchDragMetaRef.current
      if (meta) {
        const zone = findDayDropZone(document.elementFromPoint(event.clientX, event.clientY))
        if (zone !== null && zone !== meta.fromDayIdx) {
          moveDayTask(meta.fromDayIdx, meta.taskId, zone)
        }
      }
      touchDragMetaRef.current = null
      setTouchDrag(null)
      setDropHighlightDay(null)
    }

    window.addEventListener('pointermove', handlePointerMove)
    window.addEventListener('pointerup', finish)
    window.addEventListener('pointercancel', finish)

    return () => {
      window.removeEventListener('pointermove', handlePointerMove)
      window.removeEventListener('pointerup', finish)
      window.removeEventListener('pointercancel', finish)
    }
  }, [touchDrag !== null, moveDayTask])

  const isDesktop = useIsDesktop()
  const toggleMobileSidebar = useCallback(() => {
    setMobileSidebarOpen((open) => !open)
  }, [])
  const toggleMobileTimetable = useCallback(() => {
    setMobileTimetableExpanded((open) => !open)
  }, [])
  const openRoutinePanel = useCallback(() => {
    setRoutinePanelOpen(true)
  }, [])
  const closeRoutinePanel = useCallback(() => {
    setRoutinePanelOpen(false)
  }, [])

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
            goalYear={goalYear}
            goalMonth={goalMonth}
            syncedMonthGoals={syncedMonthGoals}
            weekGoals={weekData.weekGoals}
            handleMonthGoalUpdate={handleMonthGoalUpdate}
            handleWeekGoalUpdate={handleWeekGoalUpdate}
            days={days}
            today={today}
            checklistDateKeys={checklistDateKeys}
            memo={weekData.memo}
            setMemo={setMemo}
            onOpenHabit={handleOpenHabit}
          />
        </aside>

        <div
          className={[
            'relative h-full min-h-0 shrink-0 overflow-visible transition-[width] duration-200 lg:hidden',
            mobileSidebarOpen ? MOBILE_RAIL_WIDTH_CLASS : 'w-0',
          ].join(' ')}
        >
          <aside className="h-full overflow-y-auto overflow-x-hidden border-r border-planner-sand bg-white">
            <WeeklySidebarContent
              compact
              weekLabel={weekLabel}
              goalYear={goalYear}
              goalMonth={goalMonth}
              syncedMonthGoals={syncedMonthGoals}
              weekGoals={weekData.weekGoals}
              handleMonthGoalUpdate={handleMonthGoalUpdate}
              handleWeekGoalUpdate={handleWeekGoalUpdate}
              days={days}
              today={today}
              checklistDateKeys={checklistDateKeys}
              memo={weekData.memo}
              setMemo={setMemo}
              onOpenHabit={handleOpenHabit}
            />
          </aside>
          <SidebarEdgeToggle
            expanded={mobileSidebarOpen}
            onClick={toggleMobileSidebar}
          />
        </div>

        <div className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden">
          <div className="scrollbar-thin min-h-0 flex-1 overflow-hidden lg:overflow-auto">
            {isDesktop ? (
              <DesktopWeekGrid
                dayIndices={[0, 1, 2, 3, 4, 5, 6]}
                days={days}
                today={today}
                weekData={weekData}
                filledSlots={displayFilledSlots}
                setDayTask={setDayTask}
                setDayNote={setDayNote}
                moveDayTask={moveDayTask}
                onPostponeTask={handlePostponeTask}
                startPaint={startPaint}
                paintColorId={paintColorId}
                onPaintColorChange={setPaintColorId}
                locked={timetableLocked}
                onToggleLock={() => setTimetableLocked((prev) => !prev)}
                onOpenRoutines={openRoutinePanel}
              />
            ) : (
              <MobileWeekScroller
                weekId={weekId}
                days={days}
                today={today}
                weekData={weekData}
                filledSlots={displayFilledSlots}
                setDayTask={setDayTask}
                setDayNote={setDayNote}
                moveDayTask={moveDayTask}
                onPostponeTask={handlePostponeTask}
                onStartTouchDrag={handleStartTouchDrag}
                startPaint={startPaint}
                paintColorId={paintColorId}
                onPaintColorChange={setPaintColorId}
                locked={timetableLocked}
                onToggleLock={() => setTimetableLocked((prev) => !prev)}
                onOpenRoutines={openRoutinePanel}
                dualColumn={!mobileSidebarOpen}
                dropHighlightDay={dropHighlightDay}
                timetableExpanded={mobileTimetableExpanded}
                onToggleTimetable={toggleMobileTimetable}
              />
            )}
          </div>
        </div>
      </div>

      {postponeMenu && (
        <TaskPostponeMenu
          x={postponeMenu.x}
          y={postponeMenu.y}
          onPostpone={applyPostpone}
          onClose={closePostponeMenu}
        />
      )}

      {touchDrag && (
        <div
          className="pointer-events-none fixed z-[70] rounded-lg border border-planner-sage bg-white/95 px-3 py-2 text-xs font-medium text-planner-ink shadow-soft"
          style={{
            left: touchDrag.x + 12,
            top: touchDrag.y + 12,
          }}
        >
          다른 요일로 이동
        </div>
      )}

      {routinePanelOpen && (
        <TimetableRoutinePanel
          routines={routines}
          onChange={setRoutines}
          onClose={closeRoutinePanel}
        />
      )}
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
