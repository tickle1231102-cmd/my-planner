import { useMemo } from 'react'
import { formatDateLabel } from './lib/dateFormat.js'
import { padMonthGoals, padYearGoals } from './lib/goalLists.js'
import MonthGoalChecklist from './components/MonthGoalChecklist.jsx'
import { ImeSafeTextarea } from './components/ImeSafeTextarea.jsx'

const MONTH_LABELS = [
  '1월', '2월', '3월', '4월', '5월', '6월',
  '7월', '8월', '9월', '10월', '11월', '12월',
]
const OVERVIEW_DAY_LABELS = ['일', '월', '화', '수', '목', '금', '토']
const OVERVIEW_CALENDAR_CELLS = 42

function isSameDay(a, b) {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  )
}

function buildMonthCells(year, month) {
  const firstDay = new Date(year, month, 1)
  const daysInMonth = new Date(year, month + 1, 0).getDate()
  const leading = firstDay.getDay()
  const cells = []

  for (let i = 0; i < leading; i++) cells.push(null)
  for (let day = 1; day <= daysInMonth; day++) {
    const date = new Date(year, month, day)
    date.setHours(0, 0, 0, 0)
    cells.push(date)
  }
  while (cells.length % 7 !== 0) cells.push(null)
  while (cells.length < OVERVIEW_CALENDAR_CELLS) cells.push(null)

  return cells
}

function MiniMonth({ year, month, today, goals, onDateSelect, onUpdateGoal }) {
  const cells = useMemo(() => buildMonthCells(year, month), [year, month])
  const monthGoals = useMemo(() => padMonthGoals(goals), [goals])

  return (
    <div className="flex h-full flex-col items-center px-1 py-2">
      <h3 className="mb-2 text-sm font-bold tracking-wide text-planner-ink sm:text-base">
        {MONTH_LABELS[month]}
      </h3>
      <div className="grid w-full max-w-[168px] grid-cols-7 gap-y-0.5 text-center">
        {OVERVIEW_DAY_LABELS.map((label, i) => (
          <span
            key={label}
            className={[
              'text-[10px] font-medium sm:text-[11px]',
              i === 0 ? 'text-red-500' : 'text-planner-ink',
            ].join(' ')}
          >
            {label}
          </span>
        ))}
        {cells.map((date, index) => {
          if (!date) {
            return <span key={`empty-${index}`} className="h-5 sm:h-6" />
          }

          const isSunday = date.getDay() === 0
          const isToday = isSameDay(date, today)

          return (
            <button
              key={date.toISOString()}
              type="button"
              onClick={() => onDateSelect(date)}
              title={formatDateLabel(date)}
              className={[
                'h-5 text-[10px] leading-none transition hover:bg-planner-sage-light/60 sm:h-6 sm:text-[11px]',
                isSunday ? 'text-red-500' : 'text-planner-ink',
                isToday && 'rounded-full bg-planner-today font-bold ring-1 ring-planner-today-ring/50',
              ]
                .filter(Boolean)
                .join(' ')}
            >
              {date.getDate()}
            </button>
          )
        })}
      </div>
      <MonthGoalChecklist
        goals={monthGoals}
        compact
        placeholder="월간 목표"
        className="mt-2 w-full max-w-[168px] border-t border-planner-sand pt-1.5"
        onUpdateGoal={(goalId, updates) => onUpdateGoal(month, goalId, updates)}
      />
    </div>
  )
}

export default function YearOverviewCalendar({
  year,
  today,
  onDateSelect,
  monthGoals,
  yearGoals,
  yearMemo = '',
  onUpdateMonthGoal,
  onUpdateYearGoal,
  onUpdateYearMemo,
}) {
  const annualGoals = useMemo(() => padYearGoals(yearGoals), [yearGoals])

  return (
    <div className="rounded-2xl border border-planner-sand bg-white p-4 shadow-soft sm:p-6">
      <p className="mb-4 text-center text-2xl font-bold tracking-tight text-planner-ink sm:mb-6 sm:text-3xl">
        {year}
      </p>
      <div className="flex flex-col gap-6 lg:flex-row lg:items-start">
        <aside className="shrink-0 rounded-xl border border-planner-sand bg-planner-cream/40 p-3 lg:w-[200px]">
          <h3 className="mb-2 text-center text-sm font-bold tracking-wide text-planner-ink">
            연간 목표
          </h3>
          <MonthGoalChecklist
            goals={annualGoals}
            compact
            placeholder="연간 목표"
            onUpdateGoal={onUpdateYearGoal}
          />
          <div className="mt-3 border-t border-planner-sand pt-3">
            <h3 className="mb-2 text-center text-sm font-bold tracking-wide text-planner-ink">
              메모
            </h3>
            <ImeSafeTextarea
              value={yearMemo}
              onChange={(value) => onUpdateYearMemo?.(value)}
              rows={6}
              placeholder="올해 자유롭게 적어 보세요"
              className="min-h-[7.5rem] w-full resize-y rounded-lg border border-planner-sand/80 bg-white px-2.5 py-2 text-xs leading-relaxed text-planner-ink placeholder:text-planner-ink-muted/45 focus:border-planner-sage-muted focus:outline-none focus:ring-1 focus:ring-planner-sage-light"
            />
          </div>
        </aside>

        <div className="min-w-0 flex-1">
          <div className="grid grid-cols-2 gap-x-3 gap-y-4 sm:grid-cols-3 sm:gap-x-6 sm:gap-y-6 lg:grid-cols-3 xl:grid-cols-4">
            {Array.from({ length: 12 }, (_, month) => (
              <MiniMonth
                key={month}
                year={year}
                month={month}
                today={today}
                goals={monthGoals?.[String(month)]}
                onDateSelect={onDateSelect}
                onUpdateGoal={onUpdateMonthGoal}
              />
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
