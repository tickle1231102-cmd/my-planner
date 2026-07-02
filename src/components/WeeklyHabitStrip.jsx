import { useCallback, useMemo } from 'react'
import { useCloudSync } from '../context/CloudSyncContext.jsx'
import { getDominantMonthAndYear } from '../lib/monthGoals.js'
import { getHabitCheck, getMonthData, toggleHabitCheck } from '../lib/habitStorage.js'

const DAY_CIRCLE_LABELS = ['월', '화', '수', '목', '금', '토', '일']

/** 7열 habit 원형 버튼(20px) + gap + padding 기준 모바일 레일 폭 */
export const MOBILE_RAIL_WIDTH_CLASS = 'w-[168px]'

function HabitDayCircle({ label, checked, onToggle, compact }) {
  return (
    <button
      type="button"
      onClick={onToggle}
      className={[
        'flex shrink-0 items-center justify-center rounded-full border font-semibold transition',
        compact ? 'size-5 text-[8px]' : 'size-6 text-[8px] sm:size-7 sm:text-[9px]',
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

export default function WeeklyHabitStrip({ days, compact = false, onOpenHabit }) {
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
    <div
      className={[
        'border-t border-planner-sand bg-white',
        compact ? 'px-2 py-1.5' : 'px-3 py-2.5',
      ].join(' ')}
    >
      {onOpenHabit ? (
        <button
          type="button"
          onClick={onOpenHabit}
          className={[
            'text-left font-medium text-planner-sage transition hover:text-planner-sage/80 hover:underline',
            compact ? 'mb-1.5 text-[8px] leading-tight' : 'mb-2 text-[10px] tracking-[0.08em]',
          ].join(' ')}
        >
          Habit tracker
        </button>
      ) : (
        <div
          className={[
            'font-medium text-planner-ink',
            compact ? 'mb-1.5 text-[8px] leading-tight' : 'mb-2 text-[10px] tracking-[0.08em]',
          ].join(' ')}
        >
          Habit tracker
        </div>
      )}
      <div className={compact ? 'space-y-2' : 'space-y-2.5'}>
        {visibleHabits.map(({ habit, index }) => (
          <div key={habit.id}>
            <p
              className={[
                'leading-tight text-planner-ink',
                compact
                  ? 'mb-0.5 line-clamp-2 text-[8px] break-words'
                  : 'mb-1 truncate text-[10px]',
              ].join(' ')}
              title={habit.label}
            >
              {habit.label}
            </p>
            <div
              className={
                compact ? 'flex justify-between gap-0.5' : 'flex justify-between gap-1 px-0.5'
              }
            >
              {days.map((date, dayIdx) => (
                <HabitDayCircle
                  key={`${habit.id}-${dayIdx}`}
                  label={DAY_CIRCLE_LABELS[dayIdx]}
                  checked={isChecked(index, date)}
                  onToggle={() => toggle(index, date)}
                  compact={compact}
                />
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
