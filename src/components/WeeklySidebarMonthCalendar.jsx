import { useMemo } from 'react'
import { DAY_LABELS, toDateKey } from '../lib/timetableRoutines.js'
import { buildMonthCells } from '../lib/weeklyChecklist.js'

export default function WeeklySidebarMonthCalendar({
  year,
  month,
  weekDays,
  checklistDateKeys,
  today,
  compact = false,
  onSelectDate,
}) {
  const weekDateKeys = useMemo(
    () => new Set(weekDays.map((day) => toDateKey(day))),
    [weekDays],
  )
  const cells = useMemo(() => buildMonthCells(year, month), [year, month])

  return (
    <div className={compact ? 'px-1 pb-2 pt-1' : 'px-3 pb-3 pt-2'}>
      <div className="grid grid-cols-7 gap-0.5">
        {DAY_LABELS.map((label) => (
          <div
            key={label}
            className={[
              'text-center font-medium text-planner-sage',
              compact ? 'text-[8px]' : 'text-[10px]',
            ].join(' ')}
          >
            {label}
          </div>
        ))}

        {cells.map((date, index) => {
          if (!date) {
            return <div key={`empty-${index}`} className={compact ? 'h-6' : 'h-8'} />
          }

          const dateKey = toDateKey(date)
          const inCurrentWeek = weekDateKeys.has(dateKey)
          const hasChecklist = checklistDateKeys.has(dateKey)
          const isToday = isSameDay(date, today)
          const interactive = typeof onSelectDate === 'function'

          const className = [
            'flex flex-col items-center justify-center rounded-md',
            compact ? 'h-6 gap-0.5' : 'h-8 gap-1',
            inCurrentWeek ? 'bg-planner-today/75' : '',
            isToday && 'ring-1 ring-planner-today-ring/70',
            interactive && 'cursor-pointer transition hover:bg-planner-sage-light/70',
          ]
            .filter(Boolean)
            .join(' ')

          const content = (
            <>
              <span
                className={[
                  'leading-none',
                  compact ? 'text-[9px]' : 'text-[11px]',
                  inCurrentWeek
                    ? 'font-semibold text-planner-ink'
                    : 'text-planner-ink-muted',
                  isToday && 'text-planner-today-ring',
                ]
                  .filter(Boolean)
                  .join(' ')}
              >
                {date.getDate()}
              </span>
              {hasChecklist ? (
                <span
                  className={[
                    'shrink-0 rounded-full bg-planner-sage',
                    compact ? 'size-1' : 'size-1.5',
                  ].join(' ')}
                  aria-hidden
                />
              ) : (
                <span className={compact ? 'h-1' : 'h-1.5'} aria-hidden />
              )}
            </>
          )

          if (interactive) {
            return (
              <button
                key={dateKey}
                type="button"
                onClick={() => onSelectDate(date)}
                className={className}
                aria-label={`${date.getMonth() + 1}월 ${date.getDate()}일 주로 이동`}
              >
                {content}
              </button>
            )
          }

          return (
            <div key={dateKey} className={className}>
              {content}
            </div>
          )
        })}
      </div>
    </div>
  )
}

function isSameDay(a, b) {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  )
}
