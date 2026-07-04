import { useCallback, useMemo, useState } from 'react'
import { useCloudSync } from './context/CloudSyncContext.jsx'
import {
  buildWeekChunks,
  computeDailyProgress,
  computeOverallProgress,
  computeTotals,
  countHabitCompletedInMonth,
  createHabit,
  getDaysInMonth,
  getHabitCheck,
  getMonthData,
  setMonthData,
  slotKey,
  toggleHabitCheck,
  toggleHabitWeekComplete,
} from './lib/habitStorage.js'
import WeeklyAchievementBoard from './components/WeeklyAchievementBoard.jsx'

const MONTH_LABELS = [
  '1월', '2월', '3월', '4월', '5월', '6월',
  '7월', '8월', '9월', '10월', '11월', '12월',
]
const WEEKDAY_LABELS = ['월', '화', '수', '목', '금', '토', '일']
const AVAILABLE_YEARS = [2025, 2026, 2027, 2028]

const WEEK_BACKGROUNDS = [
  'bg-planner-sage-light',
  'bg-planner-warm',
  'bg-planner-weekend',
  'bg-planner-sage-light/70',
  'bg-planner-cream',
]

function useHabitTracker(year, month) {
  const { habitData, updateHabitData } = useCloudSync()

  const daysInMonth = getDaysInMonth(year, month)
  const monthData = useMemo(
    () => getMonthData(habitData, year, month),
    [habitData, year, month],
  )

  const updateMonth = useCallback(
    (updater) => {
      updateHabitData((prev) => {
        const current = getMonthData(prev, year, month)
        const next = typeof updater === 'function' ? updater(current) : updater
        return setMonthData(prev, year, month, next)
      })
    },
    [updateHabitData, year, month],
  )

  const updateHabit = useCallback(
    (habitId, patch) => {
      updateMonth((current) => ({
        habits: current.habits.map((habit) =>
          habit.id === habitId ? { ...habit, ...patch } : habit,
        ),
      }))
    },
    [updateMonth],
  )

  const toggleCheck = useCallback(
    (habitIndex, slot) => {
      updateHabitData((prev) => toggleHabitCheck(prev, habitIndex, slot))
    },
    [updateHabitData],
  )

  const toggleWeekHabit = useCallback(
    (habitIndex, chunk) => {
      updateHabitData((prev) => toggleHabitWeekComplete(prev, habitIndex, chunk, daysInMonth))
    },
    [updateHabitData, daysInMonth],
  )

  const isChecked = useCallback(
    (habitIndex, slot) => getHabitCheck(habitData, habitIndex, slot),
    [habitData],
  )

  const addHabit = useCallback(() => {
    updateMonth((current) => ({
      habits: [
        ...current.habits,
        createHabit(`habit-${Date.now()}`, daysInMonth),
      ],
    }))
  }, [daysInMonth, updateMonth])

  return {
    daysInMonth,
    habits: monthData.habits,
    updateHabit,
    toggleCheck,
    toggleWeekHabit,
    isChecked,
    addHabit,
  }
}

function ProgressRing({ percent }) {
  const radius = 42
  const stroke = 8
  const normalizedRadius = radius - stroke / 2
  const circumference = normalizedRadius * 2 * Math.PI
  const offset = circumference - (percent / 100) * circumference

  return (
    <div className="relative mx-auto flex size-[108px] items-center justify-center">
      <svg width="108" height="108" className="-rotate-90">
        <circle
          cx="54"
          cy="54"
          r={normalizedRadius}
          fill="none"
          stroke="#E8E2D8"
          strokeWidth={stroke}
        />
        <circle
          cx="54"
          cy="54"
          r={normalizedRadius}
          fill="none"
          stroke="#7A9E7E"
          strokeWidth={stroke}
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          strokeLinecap="round"
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-2xl font-semibold text-planner-ink">{percent}%</span>
        <span className="text-[10px] text-planner-ink-muted">완료</span>
      </div>
    </div>
  )
}

function DailyProgressChart({ values }) {
  const width = 520
  const height = 120
  const padding = { top: 12, right: 8, bottom: 22, left: 8 }
  const innerWidth = width - padding.left - padding.right
  const innerHeight = height - padding.top - padding.bottom

  const points = values.map((value, index) => {
    const x =
      values.length <= 1
        ? innerWidth / 2
        : (index / (values.length - 1)) * innerWidth
    const y = innerHeight - (value / 100) * innerHeight
    return { x, y, value, day: index + 1 }
  })

  const linePath = points
    .map((point, index) => `${index === 0 ? 'M' : 'L'} ${point.x} ${point.y}`)
    .join(' ')

  const areaPath = [
    `M 0 ${innerHeight}`,
    ...points.map((point) => `L ${point.x} ${point.y}`),
    `L ${innerWidth} ${innerHeight}`,
    'Z',
  ].join(' ')

  return (
    <svg
      viewBox={`0 0 ${width} ${height}`}
      className="h-full w-full"
      preserveAspectRatio="none"
      aria-hidden
    >
      <g transform={`translate(${padding.left} ${padding.top})`}>
        {[0, 25, 50, 75, 100].map((tick) => {
          const y = innerHeight - (tick / 100) * innerHeight
          return (
            <line
              key={tick}
              x1={0}
              y1={y}
              x2={innerWidth}
              y2={y}
              stroke="#E8E2D8"
              strokeWidth="1"
            />
          )
        })}
        <path d={areaPath} fill="#E4EDE5" opacity="0.85" />
        <path d={linePath} fill="none" stroke="#7A9E7E" strokeWidth="2.2" />
        {points.map((point) => (
          <circle
            key={point.day}
            cx={point.x}
            cy={point.y}
            r="2.5"
            fill="#5A9E82"
          />
        ))}
      </g>
    </svg>
  )
}

function HabitCheckCell({ checked, muted, onToggle }) {
  return (
    <button
      type="button"
      onClick={onToggle}
      className="flex h-7 w-full items-center justify-center p-0.5"
      aria-pressed={checked}
    >
      <span
        className={[
          'flex size-[18px] shrink-0 items-center justify-center border transition',
          checked
            ? 'border-planner-today-ring bg-planner-today-ring text-white'
            : [
                'border-planner-sand/90 bg-white',
                muted && 'opacity-50',
              ]
                .filter(Boolean)
                .join(' '),
        ].join(' ')}
      >
        {checked && (
          <svg viewBox="0 0 12 12" className="size-2.5" aria-hidden>
            <path
              d="M2.2 6.1 4.9 8.8 9.8 3.4"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.8"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        )}
      </span>
    </button>
  )
}

function ProgressBar({ completed, goal }) {
  const safeGoal = Math.max(goal, 1)
  const percent = Math.min((completed / safeGoal) * 100, 100)

  return (
    <div className="flex min-w-[88px] flex-1 items-center gap-2">
      <div className="h-2 flex-1 overflow-hidden rounded-full bg-planner-sand/80">
        <div
          className="h-full rounded-full bg-planner-sage transition-all"
          style={{ width: `${percent}%` }}
        />
      </div>
      <span className="w-12 shrink-0 text-right text-[11px] text-planner-ink-muted">
        {completed} / {goal}
      </span>
    </div>
  )
}

export default function HabitTracker({ today }) {
  const initialYear = AVAILABLE_YEARS.includes(today.getFullYear())
    ? today.getFullYear()
    : 2026
  const [year, setYear] = useState(initialYear)
  const [month, setMonth] = useState(today.getMonth())

  const { daysInMonth, habits, updateHabit, toggleCheck, toggleWeekHabit, isChecked, addHabit } = useHabitTracker(
    year,
    month,
  )
  const weekChunks = useMemo(() => buildWeekChunks(year, month), [year, month])
  const dailyProgress = useMemo(
    () => computeDailyProgress(habits, daysInMonth),
    [habits, daysInMonth],
  )
  const overallPercent = useMemo(
    () => computeOverallProgress(habits, daysInMonth),
    [habits, daysInMonth],
  )
  const totals = useMemo(() => computeTotals(habits, daysInMonth), [habits, daysInMonth])

  return (
    <div className="space-y-3">
      <section className="grid gap-3 lg:grid-cols-[220px_minmax(0,1fr)_150px]">
        <div className="rounded-2xl border border-planner-sand bg-white p-4 shadow-soft">
          <p className="text-[11px] font-medium tracking-[0.18em] text-planner-sage">
            HABIT TRACKER
          </p>
          <div className="mt-4 grid grid-cols-2 gap-2">
            <label className="block">
              <span className="mb-1 block text-[10px] font-medium text-planner-ink-muted">
                MONTH
              </span>
              <select
                value={month}
                onChange={(event) => setMonth(Number(event.target.value))}
                className="w-full rounded-lg border border-planner-sand bg-planner-cream px-2 py-1.5 text-sm text-planner-ink focus:border-planner-sage-muted focus:outline-none focus:ring-2 focus:ring-planner-sage-light"
              >
                {MONTH_LABELS.map((label, index) => (
                  <option key={label} value={index}>
                    {label}
                  </option>
                ))}
              </select>
            </label>
            <label className="block">
              <span className="mb-1 block text-[10px] font-medium text-planner-ink-muted">
                YEAR
              </span>
              <select
                value={year}
                onChange={(event) => setYear(Number(event.target.value))}
                className="w-full rounded-lg border border-planner-sand bg-planner-cream px-2 py-1.5 text-sm text-planner-ink focus:border-planner-sage-muted focus:outline-none focus:ring-2 focus:ring-planner-sage-light"
              >
                {AVAILABLE_YEARS.map((value) => (
                  <option key={value} value={value}>
                    {value}
                  </option>
                ))}
              </select>
            </label>
          </div>
        </div>

        <div className="rounded-2xl border border-planner-sand bg-white p-4 shadow-soft">
          <p className="mb-2 text-[11px] font-medium tracking-[0.14em] text-planner-ink-muted">
            DAILY PROGRESS
          </p>
          <div className="h-[120px]">
            <DailyProgressChart values={dailyProgress} />
          </div>
        </div>

        <div className="flex flex-col items-center justify-center rounded-2xl border border-planner-sand bg-white p-4 shadow-soft">
          <p className="mb-2 text-[11px] font-medium tracking-[0.14em] text-planner-ink-muted">
            OVERALL
          </p>
          <ProgressRing percent={overallPercent} />
        </div>
      </section>

      <section className="overflow-hidden rounded-2xl border border-planner-sand bg-white shadow-soft">
        <div className="overflow-x-auto">
          <div className="min-w-[980px]">
            <div className="grid grid-cols-[minmax(180px,220px)_minmax(0,1fr)_56px_minmax(150px,190px)] border-b border-planner-sand bg-planner-warm/70">
              <div className="border-r border-planner-sand px-3 py-2">
                <p className="text-[11px] font-medium tracking-[0.12em] text-planner-ink">
                  DAILY HABITS
                </p>
                <p className="mt-0.5 text-[10px] text-planner-ink-muted">
                  DAYS {daysInMonth} / {daysInMonth}
                </p>
              </div>

              <div
                className="grid border-r border-planner-sand"
                style={{ gridTemplateColumns: `repeat(${weekChunks.length}, minmax(0, 1fr))` }}
              >
                {weekChunks.map((chunk) => (
                  <div
                    key={`head-${chunk.index}`}
                    className={[
                      'border-r border-planner-sand/80 last:border-r-0',
                      WEEK_BACKGROUNDS[chunk.index % WEEK_BACKGROUNDS.length],
                    ].join(' ')}
                  >
                    <p className="border-b border-planner-sand/70 px-2 py-1 text-center text-[10px] font-medium text-planner-sage">
                      WEEK-{chunk.index + 1}
                    </p>
                    <div className="grid grid-cols-7 border-b border-planner-sand/70">
                      {WEEKDAY_LABELS.map((label) => (
                        <div
                          key={label}
                          className="border-r border-planner-sand/50 py-0.5 text-center text-[9px] text-planner-ink-muted last:border-r-0"
                        >
                          {label}
                        </div>
                      ))}
                    </div>
                    <div className="grid grid-cols-7">
                      {chunk.slots.map((slot) => (
                        <div
                          key={slotKey(slot)}
                          className={[
                            'border-r border-planner-sand/50 py-0.5 text-center text-[10px] font-medium last:border-r-0',
                            slot.inViewMonth ? 'text-planner-ink' : 'text-planner-ink-muted/45',
                          ].join(' ')}
                        >
                          {slot.day}
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>

              <div className="border-r border-planner-sand px-2 py-2 text-center">
                <p className="text-[10px] font-medium text-planner-ink-muted">GOAL</p>
              </div>

              <div className="px-3 py-2">
                <p className="text-[10px] font-medium text-planner-ink-muted">PROGRESS</p>
                <p className="mt-0.5 text-[10px] text-planner-sage">
                  COMPLETED {totals.completed} / {totals.total}
                </p>
              </div>
            </div>

            {habits.map((habit, habitIndex) => {
              const completed = countHabitCompletedInMonth(habit, daysInMonth)
              return (
                <div
                  key={habit.id}
                  className="grid grid-cols-[minmax(180px,220px)_minmax(0,1fr)_56px_minmax(150px,190px)] border-b border-planner-sand/70 last:border-b-0"
                >
                  <div className="border-r border-planner-sand px-2 py-1.5">
                    <input
                      type="text"
                      value={habit.label}
                      onChange={(event) =>
                        updateHabit(habit.id, { label: event.target.value })
                      }
                      placeholder="습관을 입력하세요"
                      className="w-full bg-transparent text-xs text-planner-ink placeholder:text-planner-ink-muted/45 focus:outline-none"
                    />
                  </div>

                  <div
                    className="grid border-r border-planner-sand"
                    style={{ gridTemplateColumns: `repeat(${weekChunks.length}, minmax(0, 1fr))` }}
                  >
                    {weekChunks.map((chunk) => {
                      const weekBg = WEEK_BACKGROUNDS[chunk.index % WEEK_BACKGROUNDS.length]
                      return (
                        <div
                          key={`${habit.id}-week-${chunk.index}`}
                          className={[
                            'grid grid-cols-7 border-r border-planner-sand/70 last:border-r-0',
                            weekBg,
                          ].join(' ')}
                        >
                          {chunk.slots.map((slot) => (
                            <div
                              key={`${habit.id}-${slotKey(slot)}`}
                              className="border-r border-planner-sand/50 p-0.5 last:border-r-0"
                            >
                              <HabitCheckCell
                                checked={isChecked(habitIndex, slot)}
                                muted={!slot.inViewMonth}
                                onToggle={() => toggleCheck(habitIndex, slot)}
                              />
                            </div>
                          ))}
                        </div>
                      )
                    })}
                  </div>

                  <div className="flex items-center justify-center border-r border-planner-sand px-1">
                    <input
                      type="number"
                      min={1}
                      max={daysInMonth}
                      value={habit.goal}
                      onChange={(event) =>
                        updateHabit(habit.id, {
                          goal: Math.max(1, Number(event.target.value) || 1),
                        })
                      }
                      className="w-10 rounded border border-planner-sand bg-planner-cream px-1 py-0.5 text-center text-[11px] text-planner-ink focus:border-planner-sage-muted focus:outline-none"
                    />
                  </div>

                  <div className="flex items-center px-2 py-1.5">
                    <ProgressBar completed={completed} goal={habit.goal} />
                  </div>
                </div>
              )
            })}
          </div>
        </div>

        <div className="border-t border-planner-sand bg-planner-cream/50 px-3 py-2">
          <button
            type="button"
            onClick={addHabit}
            className="text-xs font-medium text-planner-sage transition hover:text-planner-ink"
          >
            + 습관 추가
          </button>
        </div>
      </section>

      <WeeklyAchievementBoard
        weekChunks={weekChunks}
        habits={habits}
        daysInMonth={daysInMonth}
        onToggleWeekHabit={toggleWeekHabit}
      />
    </div>
  )
}
