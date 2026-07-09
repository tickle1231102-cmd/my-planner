import { useMemo } from 'react'
import {
  computeWeekDailyCounts,
  computeWeekProgressPercent,
  computeWeeklyHabitTotals,
  inViewDaysInChunk,
  isHabitWeekComplete,
} from '../lib/habitStorage.js'

export const HABIT_WEEK_THEMES = [
  {
    headerClass: 'bg-planner-mist-light',
    accent: '#8BAFC4',
    accentMuted: '#E3EEF4',
    labelClass: 'text-[#6E94AA]',
  },
  {
    headerClass: 'bg-planner-sage-light',
    accent: '#7A9E7E',
    accentMuted: '#E4EDE5',
    labelClass: 'text-planner-sage',
  },
  {
    headerClass: 'bg-planner-rose-light',
    accent: '#C4A0A0',
    accentMuted: '#F4EAEA',
    labelClass: 'text-planner-rose',
  },
  {
    headerClass: 'bg-planner-year-gold/60',
    accent: '#D4B87A',
    accentMuted: '#F5EDD8',
    labelClass: 'text-[#B89858]',
  },
  {
    headerClass: 'bg-planner-weekend',
    accent: '#5A9E82',
    accentMuted: '#EDF5EE',
    labelClass: 'text-planner-today-ring',
  },
]

function WeekProgressRing({ percent, accent, size = 88 }) {
  const radius = size / 2 - 6
  const stroke = 7
  const normalizedRadius = radius - stroke / 2
  const circumference = normalizedRadius * 2 * Math.PI
  const offset = circumference - (percent / 100) * circumference
  const center = size / 2

  return (
    <div
      className="relative mx-auto flex items-center justify-center"
      style={{ width: size, height: size }}
    >
      <svg width={size} height={size} className="-rotate-90">
        <circle
          cx={center}
          cy={center}
          r={normalizedRadius}
          fill="none"
          stroke="var(--planner-sand)"
          strokeWidth={stroke}
        />
        <circle
          cx={center}
          cy={center}
          r={normalizedRadius}
          fill="none"
          stroke={accent}
          strokeWidth={stroke}
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          strokeLinecap="round"
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-lg font-semibold text-planner-ink">{percent}%</span>
      </div>
    </div>
  )
}

function WeekHabitCheck({ checked, accent, onToggle }) {
  return (
    <button
      type="button"
      onClick={onToggle}
      className={[
        'flex size-4 shrink-0 items-center justify-center border transition',
        checked ? 'text-white' : 'border-planner-sand/90 bg-white',
      ].join(' ')}
      style={
        checked
          ? { borderColor: accent, backgroundColor: accent }
          : undefined
      }
      aria-pressed={checked}
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
    </button>
  )
}

function DailyCountCell({ value, accentMuted }) {
  return (
    <div
      className="flex h-7 items-center justify-center border-r border-planner-sand/50 text-[11px] font-medium text-planner-ink last:border-r-0"
      style={{ backgroundColor: value === null ? 'transparent' : accentMuted }}
    >
      {value === null ? '' : value}
    </div>
  )
}

export default function WeeklyAchievementBoard({
  weekChunks,
  habits,
  daysInMonth,
  onToggleWeekHabit,
}) {
  const visibleHabits = useMemo(
    () => habits.filter((habit) => habit.label.trim()),
    [habits],
  )

  const weekStats = useMemo(
    () =>
      weekChunks.map((chunk) => ({
        chunk,
        percent: computeWeekProgressPercent(habits, chunk),
        daily: computeWeekDailyCounts(habits, chunk),
        inViewDays: inViewDaysInChunk(chunk),
      })),
    [habits, weekChunks],
  )

  const weeklyHabitTotals = useMemo(
    () => computeWeeklyHabitTotals(habits, weekChunks, daysInMonth),
    [habits, weekChunks, daysInMonth],
  )

  const columnTemplate = `minmax(112px, 132px) repeat(${weekChunks.length}, minmax(0, 1fr))`

  return (
    <section className="overflow-hidden rounded-2xl border border-planner-sand bg-white shadow-soft">
      <div className="overflow-x-auto">
        <div className="min-w-[760px]">
          <div className="grid border-b border-planner-sand" style={{ gridTemplateColumns: columnTemplate }}>
            <div className="flex items-center border-r border-planner-sand bg-planner-warm/80 px-3 py-4">
              <p className="text-[11px] font-semibold leading-snug tracking-[0.14em] text-planner-ink">
                WEEKLY
                <br />
                PROGRESS
              </p>
            </div>

            {weekStats.map(({ chunk, percent, inViewDays }, index) => {
              const theme = HABIT_WEEK_THEMES[index % HABIT_WEEK_THEMES.length]
              return (
                <div
                  key={`progress-ring-${chunk.index}`}
                  className={[
                    'border-r border-planner-sand px-2 py-3 last:border-r-0',
                    theme.headerClass,
                    inViewDays === 0 && 'opacity-40',
                  ].join(' ')}
                >
                  <WeekProgressRing percent={percent} accent={theme.accent} />
                </div>
              )
            })}
          </div>

          <div className="grid border-b border-planner-sand" style={{ gridTemplateColumns: columnTemplate }}>
            <div className="flex items-center border-r border-planner-sand bg-planner-cream/60 px-3 py-2">
              <p className="text-[10px] font-medium leading-snug text-planner-ink-muted">
                Habits
                <br />
                Completed
              </p>
            </div>

            {weekStats.map(({ chunk, daily, inViewDays }, index) => {
              const theme = HABIT_WEEK_THEMES[index % HABIT_WEEK_THEMES.length]
              return (
                <div
                  key={`progress-completed-${chunk.index}`}
                  className={[
                    'border-r border-planner-sand px-1 py-1 last:border-r-0',
                    inViewDays === 0 && 'opacity-40',
                  ].join(' ')}
                >
                  <div className="grid grid-cols-7 overflow-hidden rounded-md border border-planner-sand/70">
                    {daily.completed.map((value, dayIndex) => (
                      <DailyCountCell
                        key={`${chunk.index}-done-${dayIndex}`}
                        value={value}
                        accentMuted={theme.accentMuted}
                      />
                    ))}
                  </div>
                </div>
              )
            })}
          </div>

          <div className="grid border-b border-planner-sand" style={{ gridTemplateColumns: columnTemplate }}>
            <div className="flex items-center border-r border-planner-sand bg-planner-cream/60 px-3 py-2">
              <p className="text-[10px] font-medium leading-snug text-planner-ink-muted">
                Habits
                <br />
                Incompleted
              </p>
            </div>

            {weekStats.map(({ chunk, daily, inViewDays }, index) => {
              const theme = HABIT_WEEK_THEMES[index % HABIT_WEEK_THEMES.length]
              return (
                <div
                  key={`progress-incomplete-${chunk.index}`}
                  className={[
                    'border-r border-planner-sand px-1 py-1 last:border-r-0',
                    inViewDays === 0 && 'opacity-40',
                  ].join(' ')}
                >
                  <div className="grid grid-cols-7 overflow-hidden rounded-md border border-planner-sand/70">
                    {daily.incomplete.map((value, dayIndex) => (
                      <DailyCountCell
                        key={`${chunk.index}-miss-${dayIndex}`}
                        value={value}
                        accentMuted={theme.accentMuted}
                      />
                    ))}
                  </div>
                </div>
              )
            })}
          </div>

          <div className="grid" style={{ gridTemplateColumns: columnTemplate }}>
            <div className="flex flex-col justify-center border-r border-planner-sand bg-planner-sage-light/70 px-3 py-4">
              <p className="text-[11px] font-semibold leading-snug tracking-[0.14em] text-planner-ink">
                WEEKLY
                <br />
                HABITS
              </p>
              <p className="mt-3 text-[10px] font-medium tracking-[0.12em] text-planner-ink-muted">
                COMPLETED
              </p>
              <p className="mt-1 text-sm font-semibold text-planner-sage">
                {weeklyHabitTotals.completed} / {weeklyHabitTotals.total}
              </p>
            </div>

            {weekStats.map(({ chunk, inViewDays }, index) => {
              const theme = HABIT_WEEK_THEMES[index % HABIT_WEEK_THEMES.length]
              return (
                <div
                  key={`habits-week-${chunk.index}`}
                  className={[
                    'border-r border-planner-sand last:border-r-0',
                    inViewDays === 0 && 'opacity-40',
                  ].join(' ')}
                >
                  <div
                    className={[
                      'border-b border-planner-sand/70 px-2 py-1.5 text-center text-[10px] font-semibold tracking-[0.12em]',
                      theme.headerClass,
                      theme.labelClass,
                    ].join(' ')}
                  >
                    WEEK-{chunk.index + 1}
                  </div>
                  <div className="min-h-[120px] space-y-1 px-2 py-2">
                    {visibleHabits.length === 0 ? (
                      <p className="py-4 text-center text-[10px] text-planner-ink-muted">
                        습관을 추가하면 주차별로 표시됩니다
                      </p>
                    ) : (
                      habits.map((habit, habitIndex) => {
                        if (!habit.label.trim()) return null
                        const checked = isHabitWeekComplete(habit, chunk, daysInMonth)
                        return (
                          <div
                            key={`${chunk.index}-${habit.id}`}
                            className="flex items-start gap-2 rounded-lg px-1 py-0.5"
                          >
                            <WeekHabitCheck
                              checked={checked}
                              accent={theme.accent}
                              onToggle={() => onToggleWeekHabit?.(habitIndex, chunk)}
                            />
                            <span className="min-w-0 flex-1 text-[11px] leading-snug text-planner-ink">
                              {habit.label}
                            </span>
                          </div>
                        )
                      })
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      </div>
    </section>
  )
}
