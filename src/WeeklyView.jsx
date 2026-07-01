import { useCallback, useEffect, useMemo, useRef, useState } from 'react'

const WEEKLY_STORAGE_KEY = 'weekly-planner-v2'
const DAY_LABELS = ['월', '화', '수', '목', '금', '토', '일']
const START_HOUR = 6
const HOURS = Array.from({ length: 24 }, (_, i) => (START_HOUR + i) % 24)
const SLOTS_PER_HOUR = 6
const TIMETABLE_ROW_HEIGHT = 24
const TASK_LINES = HOURS.length
const TASK_ROW_HEIGHT = TIMETABLE_ROW_HEIGHT
const TASK_HEADER_HEIGHT = 26
const SIDEBAR_TODO_LINES = 10

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

function formatWeekRange(days) {
  const start = days[0]
  const end = days[6]
  if (start.getMonth() === end.getMonth()) {
    return `${start.getMonth() + 1}월 ${start.getDate()}일 – ${end.getDate()}일`
  }
  return `${start.getMonth() + 1}/${start.getDate()} – ${end.getMonth() + 1}/${end.getDate()}`
}

function formatHourLabel(hour) {
  if (hour === 0 || hour === 12) return '12'
  if (hour < 12) return String(hour)
  return String(hour - 12)
}

function isSameDay(a, b) {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  )
}

function createDayTasks() {
  return Array.from({ length: TASK_LINES }, (_, i) => ({
    id: `task-${i}`,
    text: '',
    done: false,
  }))
}

function padDayTasks(tasks) {
  const padded = [...(tasks || [])]
  while (padded.length < TASK_LINES) {
    padded.push({
      id: `task-${padded.length}`,
      text: '',
      done: false,
    })
  }
  return padded.slice(0, TASK_LINES).map((t, i) => ({
    id: t.id || `task-${i}`,
    text: t.text || '',
    done: !!t.done,
  }))
}

function createSidebarTodos() {
  return Array.from({ length: SIDEBAR_TODO_LINES }, (_, i) => ({
    id: `todo-${i}`,
    text: '',
    done: false,
  }))
}

function defaultWeekData() {
  const dayTasks = {}
  for (let i = 0; i < 7; i++) dayTasks[i] = createDayTasks()
  return {
    goal: '',
    todos: createSidebarTodos(),
    dayTasks,
    filledSlots: {},
  }
}

function loadWeeklyData() {
  try {
    const raw = localStorage.getItem(WEEKLY_STORAGE_KEY)
    if (raw) return JSON.parse(raw)

    const legacy = localStorage.getItem('weekly-planner-v1')
    if (!legacy) return {}
    return JSON.parse(legacy)
  } catch {
    return {}
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

function useSlotPainter(setSlotFilled) {
  const paintRef = useRef({ active: false, fill: true })
  const lastKeyRef = useRef(null)

  const paintKey = useCallback(
    (key, filled) => {
      if (!key || key === lastKeyRef.current) return
      const parsed = parseSlotKey(key)
      if (!parsed) return
      lastKeyRef.current = key
      setSlotFilled(parsed.dayIdx, parsed.hour, parsed.slot, filled)
    },
    [setSlotFilled],
  )

  const endPaint = useCallback(() => {
    paintRef.current.active = false
    lastKeyRef.current = null
  }, [])

  const startPaint = useCallback(
    (key, currentlyFilled) => {
      const fill = !currentlyFilled
      paintRef.current = { active: true, fill }
      lastKeyRef.current = null
      paintKey(key, fill)
    },
    [paintKey],
  )

  const continuePaint = useCallback(
    (key) => {
      if (!paintRef.current.active) return
      paintKey(key, paintRef.current.fill)
    },
    [paintKey],
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
    goal: raw.goal || '',
    todos: raw.todos?.length ? raw.todos : base.todos,
    dayTasks,
    filledSlots: raw.filledSlots || {},
  }
}

function useWeeklyStorage(weekId) {
  const [allData, setAllData] = useState(loadWeeklyData)

  const weekData = normalizeWeekData(allData[weekId])

  useEffect(() => {
    localStorage.setItem(WEEKLY_STORAGE_KEY, JSON.stringify(allData))
  }, [allData])

  const patchWeek = useCallback(
    (patch) => {
      setAllData((prev) => ({
        ...prev,
        [weekId]: { ...normalizeWeekData(prev[weekId]), ...patch },
      }))
    },
    [weekId],
  )

  const setGoal = useCallback((goal) => patchWeek({ goal }), [patchWeek])

  const setSidebarTodo = useCallback(
    (todoId, updates) => {
      setAllData((prev) => {
        const current = normalizeWeekData(prev[weekId])
        return {
          ...prev,
          [weekId]: {
            ...current,
            todos: current.todos.map((t) =>
              t.id === todoId ? { ...t, ...updates } : t,
            ),
          },
        }
      })
    },
    [weekId],
  )

  const setDayTask = useCallback(
    (dayIdx, taskId, updates) => {
      setAllData((prev) => {
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
    [weekId],
  )

  const setSlotFilled = useCallback(
    (dayIdx, hour, slot, filled) => {
      const key = slotKey(dayIdx, hour, slot)
      setAllData((prev) => {
        const current = normalizeWeekData(prev[weekId])
        const isFilled = !!current.filledSlots[key]
        if (isFilled === filled) return prev
        const next = { ...current.filledSlots }
        if (filled) next[key] = true
        else delete next[key]
        return {
          ...prev,
          [weekId]: { ...current, filledSlots: next },
        }
      })
    },
    [weekId],
  )

  return { weekData, setGoal, setSidebarTodo, setDayTask, setSlotFilled }
}

function SectionHeader({ children }) {
  return (
    <div className="border-b border-planner-sage/30 bg-planner-sage px-2 py-1.5 text-center text-[10px] font-semibold tracking-[0.2em] text-white">
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
      className="flex items-center border-b border-planner-sand/80"
      style={{ height: TASK_ROW_HEIGHT }}
    >
      <div className="mx-1.5 h-full w-px self-stretch border-l border-dotted border-planner-sand" />
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
      <DottedCheckbox
        checked={task.done}
        onChange={(done) => onToggle({ done })}
        className="mx-2"
      />
    </div>
  )
}

function TaskList({ tasks, onText, onToggle }) {
  const inputRefs = useRef([])

  return (
    <>
      {tasks.map((task, index) => (
        <TaskRow
          key={task.id}
          task={task}
          inputRef={(el) => {
            inputRefs.current[index] = el
          }}
          onText={(text) => onText(task.id, text)}
          onToggle={(updates) => onToggle(task.id, updates)}
          onEnter={() => inputRefs.current[index + 1]?.focus()}
        />
      ))}
    </>
  )
}

function DayTasksPanel({ dayIdx, tasks, setDayTask, showLabel }) {
  return (
    <div className="flex h-full flex-col bg-white">
      {showLabel && (
        <p
          className="flex shrink-0 items-center border-b border-planner-sand px-2 text-[9px] font-medium tracking-[0.25em] text-planner-ink-muted/55"
          style={{ height: TASK_HEADER_HEIGHT }}
        >
          TASKS
        </p>
      )}
      <div className="min-h-0 flex-1">
        <TaskList
          tasks={tasks}
          onText={(taskId, text) => setDayTask(dayIdx, taskId, { text })}
          onToggle={(taskId, updates) => setDayTask(dayIdx, taskId, updates)}
        />
      </div>
    </div>
  )
}

function TimeCell({ dayIdx, hour, slot, filled, startPaint }) {
  const key = slotKey(dayIdx, hour, slot)

  return (
    <div
      role="button"
      tabIndex={-1}
      aria-pressed={filled}
      data-slot-key={key}
      onPointerDown={(e) => {
        if (e.button !== 0) return
        e.preventDefault()
        e.currentTarget.setPointerCapture(e.pointerId)
        startPaint(key, filled)
      }}
      className={[
        'min-h-0 min-w-0 w-full cursor-pointer touch-none select-none border-r border-planner-sand/90 last:border-r-0',
        'transition active:opacity-80',
        filled
          ? 'bg-planner-sage/65 hover:bg-planner-sage/75'
          : 'bg-white hover:bg-planner-sage-light/35',
      ].join(' ')}
      style={{ height: TIMETABLE_ROW_HEIGHT, minHeight: TIMETABLE_ROW_HEIGHT }}
    />
  )
}

function HourSlotRow({ dayIdx, hour, filledSlots, startPaint, className = '' }) {
  return (
    <div
      className={[
        'grid w-full grid-cols-6 border-b border-planner-sand',
        className,
      ]
        .filter(Boolean)
        .join(' ')}
      style={{ height: TIMETABLE_ROW_HEIGHT }}
    >
      {Array.from({ length: SLOTS_PER_HOUR }, (_, slot) => {
        const key = slotKey(dayIdx, hour, slot)
        const filled = !!filledSlots[key]
        return (
          <TimeCell
            key={slot}
            dayIdx={dayIdx}
            hour={hour}
            slot={slot}
            filled={filled}
            startPaint={startPaint}
          />
        )
      })}
    </div>
  )
}

function DayTimetableColumn({ dayIdx, filledSlots, startPaint, showHourLabels }) {
  return (
    <div className="flex min-w-0 flex-1 flex-col touch-none select-none">
      {HOURS.map((hour) => (
        <div key={hour} className="flex" style={{ height: TIMETABLE_ROW_HEIGHT }}>
          {showHourLabels && (
            <div
              className="flex w-7 shrink-0 items-center justify-center border-r border-b border-planner-sand bg-planner-warm text-[10px] font-medium text-planner-ink-muted/70"
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
            />
          </div>
        </div>
      ))}
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

const tasksPanelHeight = TASK_HEADER_HEIGHT + TASK_LINES * TASK_ROW_HEIGHT

function MobileDayPlanner({
  dayIdx,
  days,
  today,
  weekData,
  setDayTask,
  startPaint,
}) {
  const date = days[dayIdx]
  const isToday = isSameDay(date, today)

  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
      <div
        className={[
          'shrink-0 border-b border-planner-sage/30 py-1.5 text-center text-[11px] font-semibold tracking-wider',
          isToday ? 'bg-planner-today text-planner-ink' : 'bg-planner-sage text-white',
        ].join(' ')}
      >
        {DAY_LABELS[dayIdx]} {date.getMonth() + 1}/{date.getDate()}
      </div>

      <div className="flex min-h-0 flex-1 overflow-hidden">
        <div
          className="flex w-[42%] shrink-0 flex-col border-r border-planner-sand bg-white"
          style={{ height: tasksPanelHeight }}
        >
          <DayTasksPanel
            dayIdx={dayIdx}
            tasks={weekData.dayTasks[dayIdx]}
            setDayTask={setDayTask}
            showLabel
          />
        </div>

        <div
          className="flex min-w-0 flex-1 flex-col overflow-hidden"
          style={{ height: tasksPanelHeight }}
        >
          <p
            className="flex shrink-0 items-center border-b border-planner-sand bg-white px-2 text-[9px] font-medium tracking-[0.25em] text-planner-ink-muted/55"
            style={{ height: TASK_HEADER_HEIGHT }}
          >
            TIMETABLE
          </p>
          <div className="scrollbar-thin min-h-0 flex-1 overflow-auto">
            <div className="min-w-[300px]">
              <DayTimetableColumn
                dayIdx={dayIdx}
                filledSlots={weekData.filledSlots}
                startPaint={startPaint}
                showHourLabels
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

function DesktopWeekGrid({
  dayIndices,
  days,
  today,
  weekData,
  setDayTask,
  startPaint,
}) {
  return (
    <div className="min-w-[840px]">
      <div className="sticky top-0 z-20 flex border-b border-planner-sand bg-white">
        <div className="w-7 shrink-0 border-r border-planner-sand bg-planner-warm" />
        {dayIndices.map((di) => {
          const date = days[di]
          const isToday = isSameDay(date, today)
          return (
            <div
              key={di}
              className={[
                'min-w-[108px] flex-1 border-r border-planner-sage/30 py-1 text-center text-[10px] font-semibold tracking-wider last:border-r-0',
                isToday ? 'bg-planner-today text-planner-ink' : 'bg-planner-sage text-white',
              ].join(' ')}
            >
              {DAY_LABELS[di]} {date.getMonth() + 1}/{date.getDate()}
            </div>
          )
        })}
      </div>

      <div className="flex">
        <div className="w-7 shrink-0 border-r border-planner-sand bg-planner-warm">
          <div
            className="flex items-center justify-center border-b border-planner-sand text-[8px] font-medium tracking-wider text-planner-ink-muted/50 [writing-mode:vertical-rl]"
            style={{ height: tasksPanelHeight }}
          >
            TASKS
          </div>
          {HOURS.map((hour) => (
            <div
              key={hour}
              className="flex items-center justify-center border-b border-planner-sand text-[10px] font-medium text-planner-ink-muted/70"
              style={{ height: TIMETABLE_ROW_HEIGHT }}
            >
              {formatHourLabel(hour)}
            </div>
          ))}
        </div>

        {dayIndices.map((di) => (
          <div
            key={di}
            className="min-w-[108px] flex-1 border-r border-planner-sand last:border-r-0"
          >
            <div
              className="border-b border-planner-sand"
              style={{ height: tasksPanelHeight }}
            >
              <DayTasksPanel
                dayIdx={di}
                tasks={weekData.dayTasks[di]}
                setDayTask={setDayTask}
                showLabel
              />
            </div>
            {HOURS.map((hour) => (
              <HourSlotRow
                key={hour}
                dayIdx={di}
                hour={hour}
                filledSlots={weekData.filledSlots}
                startPaint={startPaint}
              />
            ))}
          </div>
        ))}
      </div>
    </div>
  )
}

export default function WeeklyView({ weekMonday, onBack, today }) {
  const weekId = useMemo(() => getWeekIdFromMonday(weekMonday), [weekMonday])
  const days = useMemo(() => getWeekDays(weekMonday), [weekMonday])
  const { weekData, setGoal, setSidebarTodo, setDayTask, setSlotFilled } =
    useWeeklyStorage(weekId)

  const { startPaint } = useSlotPainter(setSlotFilled)

  const isDesktop = useIsDesktop()

  const [mobileDay, setMobileDay] = useState(() => {
    const idx = days.findIndex((d) => isSameDay(d, today))
    return idx >= 0 ? idx : 0
  })

  const dayIndices = isDesktop ? [0, 1, 2, 3, 4, 5, 6] : [mobileDay]

  return (
    <div className="flex h-full flex-col bg-planner-cream">
      <div className="flex shrink-0 items-center justify-between border-b border-planner-sand bg-white px-3 py-2 sm:px-4">
        <button
          type="button"
          onClick={onBack}
          className="flex items-center gap-1 rounded-lg px-2 py-1 text-xs font-medium text-planner-sage transition hover:bg-planner-sage-light sm:text-sm"
        >
          ← 연간 보기
        </button>
        <h2 className="text-xs font-medium text-planner-ink sm:text-sm">
          {formatWeekRange(days)}
        </h2>
        <div className="w-16" />
      </div>

      <div className="flex min-h-0 flex-1 flex-col lg:flex-row">
        <aside className="flex w-full shrink-0 flex-col border-b border-planner-sand bg-white lg:w-[140px] lg:border-b-0 lg:border-r">
          <div className="hidden h-8 border-b border-planner-sand lg:block" />

          <div className="flex flex-1 flex-col">
            <SectionHeader>GOAL</SectionHeader>
            <textarea
              value={weekData.goal}
              onChange={(e) => setGoal(e.target.value)}
              placeholder="이번 주 목표"
              className="min-h-[72px] resize-none bg-white p-2 text-xs leading-relaxed text-planner-ink placeholder:text-planner-ink-muted/40 focus:outline-none lg:min-h-[120px] lg:flex-1"
            />

            <SectionHeader>TO DO LIST</SectionHeader>
            <div className="max-h-[140px] overflow-auto lg:max-h-none lg:flex-1">
              <TaskList
                tasks={weekData.todos}
                onText={(taskId, text) => setSidebarTodo(taskId, { text })}
                onToggle={(taskId, updates) => setSidebarTodo(taskId, updates)}
              />
            </div>
          </div>
        </aside>

        <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
          <div className="flex shrink-0 gap-0.5 overflow-x-auto border-b border-planner-sand bg-white p-1 lg:hidden">
            {days.map((date, i) => {
              const isToday = isSameDay(date, today)
              const active = mobileDay === i
              return (
                <button
                  key={i}
                  type="button"
                  onClick={() => setMobileDay(i)}
                  className={[
                    'shrink-0 rounded-md px-2.5 py-1 text-[10px] font-medium transition',
                    active
                      ? 'bg-planner-sage text-white'
                      : 'bg-planner-warm text-planner-ink-muted',
                    isToday && !active && 'ring-1 ring-planner-today-ring',
                  ]
                    .filter(Boolean)
                    .join(' ')}
                >
                  {DAY_LABELS[i]} {date.getMonth() + 1}/{date.getDate()}
                </button>
              )
            })}
          </div>

          <div className="scrollbar-thin min-h-0 flex-1 overflow-auto">
            {isDesktop ? (
              <DesktopWeekGrid
                dayIndices={dayIndices}
                days={days}
                today={today}
                weekData={weekData}
                setDayTask={setDayTask}
                startPaint={startPaint}
              />
            ) : (
              <MobileDayPlanner
                dayIdx={mobileDay}
                days={days}
                today={today}
                weekData={weekData}
                setDayTask={setDayTask}
                startPaint={startPaint}
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
