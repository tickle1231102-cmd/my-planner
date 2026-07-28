import { getSavedUserKey, normalizeUserKey } from './userIdentity.js'
import { TASK_STATUS } from './goalPlanSchema.js'

export const GOAL_PLAN_STORAGE_KEY = 'goal-plan-v1'

export function goalPlanStorageKey(userKey) {
  const key = normalizeUserKey(userKey || getSavedUserKey() || '')
  if (!key) return GOAL_PLAN_STORAGE_KEY
  return `${GOAL_PLAN_STORAGE_KEY}:${key}`
}

export function createEmptyGoalPlanData() {
  return { goals: [] }
}

function normalizeDailyTask(task, index, goalId) {
  const date = typeof task?.date === 'string' ? task.date.slice(0, 10) : ''
  return {
    id: task?.id || `gd-${goalId}-${date || 'x'}-${index}`,
    date,
    content: task?.content || '',
    estimatedMin: Number.isFinite(task?.estimatedMin) ? task.estimatedMin : 25,
    status:
      task?.status === TASK_STATUS.COMPLETED ||
      task?.status === TASK_STATUS.IN_PROGRESS
        ? task.status
        : TASK_STATUS.TODO,
  }
}

function normalizeGoal(raw, index) {
  const id = raw?.id || `goal-${index}-${Date.now()}`
  return {
    id,
    title: raw?.title || '',
    description: raw?.description || '',
    scope: raw?.scope || 'SHORT_TERM',
    startDate: raw?.startDate || '',
    endDate: raw?.endDate || '',
    excludedWeekdays: Array.isArray(raw?.excludedWeekdays)
      ? raw.excludedWeekdays
      : [],
    excludedDates: Array.isArray(raw?.excludedDates) ? raw.excludedDates : [],
    createdAt: raw?.createdAt || new Date().toISOString(),
    summary: raw?.summary || '',
    yearlyPlans: Array.isArray(raw?.yearlyPlans)
      ? raw.yearlyPlans.map((item) => ({
          year: item.year,
          summary: item.summary || '',
        }))
      : [],
    monthlyPlans: Array.isArray(raw?.monthlyPlans)
      ? raw.monthlyPlans.map((item) => ({
          year: item.year,
          month: item.month,
          theme: item.theme || '',
        }))
      : [],
    weeklyPlans: Array.isArray(raw?.weeklyPlans)
      ? raw.weeklyPlans.map((item) => ({
          year: item.year,
          month: item.month,
          weekNumber: item.weekNumber,
          focusGoal: item.focusGoal || '',
        }))
      : [],
    dailyTasks: Array.isArray(raw?.dailyTasks)
      ? raw.dailyTasks.map((task, taskIndex) =>
          normalizeDailyTask(task, taskIndex, id),
        )
      : [],
  }
}

export function normalizeGoalPlanData(raw) {
  if (!raw || !Array.isArray(raw.goals)) return createEmptyGoalPlanData()
  return {
    goals: raw.goals.map((goal, index) => normalizeGoal(goal, index)),
  }
}

export function withDefaultGoalPlan(raw) {
  return normalizeGoalPlanData(raw)
}

export function isGoalPlanDataEmpty(raw) {
  const data = withDefaultGoalPlan(raw)
  return data.goals.length === 0
}

export function hasLocalGoalPlanData(userKey) {
  if (typeof window === 'undefined') return false
  try {
    const raw = localStorage.getItem(goalPlanStorageKey(userKey))
    if (!raw) return false
    return !isGoalPlanDataEmpty(JSON.parse(raw))
  } catch {
    return false
  }
}

export function loadGoalPlanData(userKey) {
  if (typeof window === 'undefined') return createEmptyGoalPlanData()
  try {
    const raw = localStorage.getItem(goalPlanStorageKey(userKey))
    if (!raw) return createEmptyGoalPlanData()
    return normalizeGoalPlanData(JSON.parse(raw))
  } catch {
    return createEmptyGoalPlanData()
  }
}

export function saveGoalPlanData(data, userKey) {
  if (typeof window === 'undefined') return
  localStorage.setItem(
    goalPlanStorageKey(userKey),
    JSON.stringify(withDefaultGoalPlan(data)),
  )
}

export function clearGoalPlanData(userKey) {
  if (typeof window === 'undefined') return
  localStorage.removeItem(goalPlanStorageKey(userKey))
}

export function clearAllGoalPlanData() {
  if (typeof window === 'undefined') return
  for (let index = localStorage.length - 1; index >= 0; index -= 1) {
    const key = localStorage.key(index)
    if (key === GOAL_PLAN_STORAGE_KEY || key?.startsWith(`${GOAL_PLAN_STORAGE_KEY}:`)) {
      localStorage.removeItem(key)
    }
  }
}

/** Build a stored goal from generate API output + user input. */
export function buildStoredGoal(input, actionPlan) {
  const id =
    typeof crypto !== 'undefined' && crypto.randomUUID
      ? crypto.randomUUID()
      : `goal-${Date.now()}`

  const dailyTasks = (actionPlan.dailyTasks || []).map((task, index) => ({
    id: `gd-${id}-${task.date}-${index}`,
    date: task.date,
    content: task.content,
    estimatedMin: task.estimatedMin,
    status: TASK_STATUS.TODO,
  }))

  return {
    id,
    title: input.title,
    description: input.description || '',
    scope: input.scope,
    startDate: input.startDate,
    endDate: input.endDate,
    excludedWeekdays: input.excludedWeekdays || [],
    excludedDates: input.excludedDates || [],
    createdAt: new Date().toISOString(),
    summary: actionPlan.summary || '',
    yearlyPlans: (actionPlan.yearlySummary || []).map((item) => ({
      year: item.year,
      summary: item.summary,
    })),
    monthlyPlans: (actionPlan.monthlyBreakdown || []).map((item) => ({
      year: item.year,
      month: item.month,
      theme: item.theme,
    })),
    weeklyPlans: (actionPlan.weeklyBreakdown || []).map((item) => ({
      year: item.year,
      month: item.month,
      weekNumber: item.weekNumber,
      focusGoal: item.focusGoal,
    })),
    dailyTasks,
  }
}

export function isGoalPlanTaskId(taskId) {
  return typeof taskId === 'string' && taskId.startsWith('gd-')
}
