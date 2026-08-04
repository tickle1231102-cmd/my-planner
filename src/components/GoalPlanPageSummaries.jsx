import { useMemo } from 'react'
import { useCloudSync } from '../context/CloudSyncContext.jsx'
import GoalPlanSummary from './GoalPlanSummary.jsx'
import {
  getMonthPlanSummaries,
  getMonthWeeklyPlanSummaries,
  getWeekPlanSummaries,
  getYearPlanSummaries,
} from '../lib/goalPlanDisplay.js'

export function YearGoalPlanSummary({ year, compact, className }) {
  const { goalPlanData } = useCloudSync()
  const items = useMemo(
    () => getYearPlanSummaries(goalPlanData, year),
    [goalPlanData, year],
  )
  return (
    <GoalPlanSummary
      title="AI Plan · 연간"
      items={items}
      compact={compact}
      className={className}
    />
  )
}

export function MonthGoalPlanSummary({ year, month, compact, className }) {
  const { goalPlanData } = useCloudSync()
  const items = useMemo(
    () => getMonthPlanSummaries(goalPlanData, year, month),
    [goalPlanData, year, month],
  )
  const weeklyItems = useMemo(
    () => getMonthWeeklyPlanSummaries(goalPlanData, year, month),
    [goalPlanData, year, month],
  )
  return (
    <GoalPlanSummary
      title="AI Plan · 월간"
      items={items}
      weeklyItems={weeklyItems}
      compact={compact}
      className={className}
    />
  )
}

export function WeekGoalPlanSummary({ weekMonday, compact, className }) {
  const { goalPlanData } = useCloudSync()
  const items = useMemo(
    () => getWeekPlanSummaries(goalPlanData, weekMonday),
    [goalPlanData, weekMonday],
  )
  return (
    <GoalPlanSummary
      title="AI Plan · 주간"
      items={items.map((item) => ({
        ...item,
        meta: `${item.month}월 ${item.weekNumber}주차`,
      }))}
      compact={compact}
      className={className}
    />
  )
}
