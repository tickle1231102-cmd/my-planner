import { useCallback, useMemo } from 'react'
import { useCloudSync } from '../context/CloudSyncContext.jsx'
import { getDominantMonthAndYear } from '../lib/monthGoals.js'
import { getHabitCheck, getMonthData, toggleHabitCheck } from '../lib/habitStorage.js'

const DAY_CIRCLE_LABELS = ['월', '화', '수', '목', '금', '토', '일']

function HabitDayCircle({ label, checked, onToggle }) {
  return (
    <button
      type="button"
      onClick={onToggle}
      className={[
        'flex size-6 shrink-0 items-center justify-center rounded-full border text-[8px] font-semibold transition sm:size-7 sm:text-[9px]',
        checked
          ? 'border-planner-today-ring bg-planner-today-ring text-planner-ink'
          : 'border-planner-today-ring bg-white text-planner-ink hover:bg-planner-sage-light/50',
      ].join(' ')}
      aria-pressed={checked}
    >
      {label}
    </button>
  )
}

export default function WeeklyHabitStrip({ days }) {
  const { habitData, updateHabitData } = useCloudSync()
  const { year, month } = useMemo(() => getDominantMonthAndYear(days), [days])

  const monthHabits = useMemo(
    () => getMonthData(habitData, year, month).habits,
    [habitData, year, month],
  )

  const visibleHabits = useMemo(
    () =>
      monthHabits
        .map((habit, index) => ({ habit, index }))
        .filter(({ habit }) => habit.label.trim()),
    [monthHabits],
  )

  const isChecked = useCallback(
    (habitIndex, date) => {
      const slot = {
        year: date.getFullYear(),
        month: date.getMonth(),
        day: date.getDate(),
      }
      return getHabitCheck(habitData, habitIndex, slot)
    },
    [habitData],
  )

  const toggle = useCallback(
    (habitIndex, date) => {
      const slot = {
        year: date.getFullYear(),
        month: date.getMonth(),
        day: date.getDate(),
      }
      updateHabitData((prev) => toggleHabitCheck(prev, habitIndex, slot))
    },
    [updateHabitData],
  )

  if (visibleHabits.length === 0) return null

  return (
    <div className="border-t border-planner-sand bg-white px-3 py-2.5">
      <div className="mb-2 text-[10px] font-medium tracking-[0.08em] text-planner-ink">
        Habit tracker
      </div>
      <div className="space-y-2.5">
        {visibleHabits.map(({ habit, index }) => (
          <div key={habit.id}>
            <p
              className="mb-1 truncate text-[10px] leading-tight text-planner-ink"
              title={habit.label}
            >
              {habit.label}
            </p>
            <div className="flex justify-between gap-1 px-0.5">
              {days.map((date, dayIdx) => (
                <HabitDayCircle
                  key={`${habit.id}-${dayIdx}`}
                  label={DAY_CIRCLE_LABELS[dayIdx]}
                  checked={isChecked(index, date)}
                  onToggle={() => toggle(index, date)}
                />
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
