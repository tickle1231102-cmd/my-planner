import { getWeekAssignment, parseDateOnly } from './goalPlanWeek.js'

export const DEFAULT_GOAL_LINK_SETTINGS = {
  showOnYearPage: false,
  showOnMonthPage: false,
  showOnWeekPage: false,
}

/** @deprecated Global prefs — kept for backward compat only. */
export const DEFAULT_GOAL_PLAN_PREFERENCES = {
  showOnYearPage: true,
  showOnMonthPage: true,
  showOnWeekPage: true,
}

export function normalizeGoalLinkSettings(raw) {
  return {
    showOnYearPage: !!raw?.showOnYearPage,
    showOnMonthPage: !!raw?.showOnMonthPage,
    showOnWeekPage: !!raw?.showOnWeekPage,
  }
}

/** @deprecated */
export function normalizeGoalPlanPreferences(raw) {
  return {
    showOnYearPage:
      raw?.showOnYearPage !== undefined
        ? !!raw.showOnYearPage
        : DEFAULT_GOAL_PLAN_PREFERENCES.showOnYearPage,
    showOnMonthPage:
      raw?.showOnMonthPage !== undefined
        ? !!raw.showOnMonthPage
        : DEFAULT_GOAL_PLAN_PREFERENCES.showOnMonthPage,
    showOnWeekPage:
      raw?.showOnWeekPage !== undefined
        ? !!raw.showOnWeekPage
        : DEFAULT_GOAL_PLAN_PREFERENCES.showOnWeekPage,
  }
}

export function isGoalLinked(goal) {
  const settings = normalizeGoalLinkSettings(goal?.linkSettings)
  return settings.showOnYearPage || settings.showOnMonthPage || settings.showOnWeekPage
}

function goalOverlapsYear(goal, year) {
  const startYear = parseInt(String(goal.startDate).slice(0, 4), 10)
  const endYear = parseInt(String(goal.endDate).slice(0, 4), 10)
  if (Number.isFinite(startYear) && Number.isFinite(endYear)) {
    return year >= startYear && year <= endYear
  }
  return (goal.yearlyPlans || []).some((item) => item.year === year)
}

function goalOverlapsMonth(goal, year, monthIndex) {
  const month = monthIndex + 1
  const prefix = `${year}-${String(month).padStart(2, '0')}`
  const start = String(goal.startDate || '')
  const end = String(goal.endDate || '')
  if (start && end && start.slice(0, 7) <= prefix && end.slice(0, 7) >= prefix) {
    return true
  }
  return (goal.monthlyPlans || []).some(
    (item) => item.year === year && item.month === month,
  )
}

/** @returns {Array<{ goalId: string, title: string, summary: string }>} */
export function getYearPlanSummaries(goalPlanData, year) {
  return (goalPlanData?.goals || [])
    .filter((goal) => normalizeGoalLinkSettings(goal.linkSettings).showOnYearPage)
    .map((goal) => {
      const yearly = (goal.yearlyPlans || []).find((item) => item.year === year)
      if (!yearly && !goalOverlapsYear(goal, year)) return null
      return {
        goalId: goal.id,
        title: goal.title,
        summary: yearly?.summary || goal.summary || '',
      }
    })
    .filter(Boolean)
}

/** monthIndex: 0–11 (JS Date month) */
export function getMonthPlanSummaries(goalPlanData, year, monthIndex) {
  const month = monthIndex + 1
  return (goalPlanData?.goals || [])
    .filter((goal) => normalizeGoalLinkSettings(goal.linkSettings).showOnMonthPage)
    .map((goal) => {
      const monthly = (goal.monthlyPlans || []).find(
        (item) => item.year === year && item.month === month,
      )
      if (!monthly && !goalOverlapsMonth(goal, year, monthIndex)) return null
      return {
        goalId: goal.id,
        title: goal.title,
        theme: monthly?.theme || '',
      }
    })
    .filter(Boolean)
}

/** weekMonday: local Date (Monday 00:00) */
export function getWeekPlanSummaries(goalPlanData, weekMonday) {
  const utcMonday = parseDateOnly(
    `${weekMonday.getFullYear()}-${String(weekMonday.getMonth() + 1).padStart(2, '0')}-${String(weekMonday.getDate()).padStart(2, '0')}`,
  )
  const { year, month, weekNumber } = getWeekAssignment(utcMonday)

  return (goalPlanData?.goals || [])
    .filter((goal) => normalizeGoalLinkSettings(goal.linkSettings).showOnWeekPage)
    .map((goal) => {
      const weekly = (goal.weeklyPlans || []).find(
        (item) =>
          item.year === year && item.month === month && item.weekNumber === weekNumber,
      )
      if (!weekly) return null
      return {
        goalId: goal.id,
        title: goal.title,
        focusGoal: weekly.focusGoal || '',
        year,
        month,
        weekNumber,
      }
    })
    .filter(Boolean)
}

/** Weekly focus goals for all weeks in a calendar month (for monthly grid). */
export function getMonthWeeklyPlanSummaries(goalPlanData, year, monthIndex) {
  const month = monthIndex + 1
  const items = []
  for (const goal of goalPlanData?.goals || []) {
    if (!normalizeGoalLinkSettings(goal.linkSettings).showOnMonthPage) continue
    for (const weekly of goal.weeklyPlans || []) {
      if (weekly.year !== year || weekly.month !== month) continue
      items.push({
        goalId: goal.id,
        title: goal.title,
        focusGoal: weekly.focusGoal || '',
        weekNumber: weekly.weekNumber,
      })
    }
  }
  return items.sort((a, b) => a.weekNumber - b.weekNumber)
}
