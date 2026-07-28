import {
  getDayIndexFromDate,
  getMondayOfWeek,
  getWeekIdFromMonday,
  WEEKLY_TODO_TASK_COUNT,
} from './weeklyChecklist.js'
import { isGoalPlanTaskId } from './goalPlanStorage.js'
import { TASK_STATUS } from './goalPlanSchema.js'

const DAY_TASK_LINES = WEEKLY_TODO_TASK_COUNT + 3

function pad(n) {
  return String(n).padStart(2, '0')
}

function parseLocalDate(dateStr) {
  const [year, month, day] = dateStr.split('-').map(Number)
  const date = new Date(year, month - 1, day)
  date.setHours(0, 0, 0, 0)
  return date
}

function padDayTasks(tasks) {
  const padded = [...(tasks || [])]
  while (padded.length < DAY_TASK_LINES) {
    padded.push({
      id: `task-${padded.length}`,
      text: '',
      done: false,
      postponed: false,
    })
  }
  return padded.slice(0, DAY_TASK_LINES).map((t, i) => ({
    id: t.id || `task-${i}`,
    text: t.text || '',
    done: !!t.done,
    postponed: !!t.postponed,
  }))
}

function normalizeWeekForSync(raw) {
  const dayTasks = {}
  for (let i = 0; i < 7; i += 1) {
    dayTasks[i] = padDayTasks(raw?.dayTasks?.[i] ?? raw?.dayTasks?.[String(i)])
  }
  return {
    weekGoals: raw?.weekGoals || [],
    memo: raw?.memo || '',
    dayNotes: raw?.dayNotes || {},
    dayTasks,
    filledSlots: raw?.filledSlots || {},
    ...(raw?.updatedAt ? { updatedAt: raw.updatedAt } : {}),
  }
}

function isTodoSlotEmpty(task) {
  return !String(task?.text || '').trim()
}

/**
 * Fill empty Weekly todo slots (0–5) with AI daily tasks.
 * Does not overwrite non-empty text.
 * @returns {{ weeklyData: object, filled: number, skipped: number }}
 */
export function syncDailyTasksToWeekly(weeklyData, goal) {
  const next = { ...(weeklyData || {}) }
  let filled = 0
  let skipped = 0

  const byDate = new Map()
  for (const task of goal.dailyTasks || []) {
    if (!task?.date || !task?.content) continue
    const list = byDate.get(task.date) || []
    list.push(task)
    byDate.set(task.date, list)
  }

  for (const [dateStr, tasks] of byDate) {
    const date = parseLocalDate(dateStr)
    if (Number.isNaN(date.getTime())) continue

    const monday = getMondayOfWeek(date)
    const weekId = getWeekIdFromMonday(monday)
    const dayIdx = getDayIndexFromDate(date)
    const week = normalizeWeekForSync(next[weekId])
    const dayTasks = [...week.dayTasks[dayIdx]]

    for (const task of tasks) {
      let placed = false
      for (let slot = 0; slot < WEEKLY_TODO_TASK_COUNT; slot += 1) {
        if (!isTodoSlotEmpty(dayTasks[slot])) continue
        dayTasks[slot] = {
          id: task.id,
          text: task.content,
          done: task.status === TASK_STATUS.COMPLETED,
          postponed: false,
        }
        filled += 1
        placed = true
        break
      }
      if (!placed) skipped += 1
    }

    next[weekId] = {
      ...week,
      dayTasks: {
        ...week.dayTasks,
        [dayIdx]: dayTasks,
      },
    }
  }

  return { weeklyData: next, filled, skipped }
}

/**
 * Sync Goal Plan task status into matching Weekly task done flags.
 */
export function syncGoalTaskStatusToWeekly(weeklyData, taskId, completed) {
  if (!isGoalPlanTaskId(taskId)) return weeklyData

  const next = { ...(weeklyData || {}) }
  let changed = false

  for (const [weekId, weekRaw] of Object.entries(next)) {
    if (weekId.startsWith('__')) continue
    const week = normalizeWeekForSync(weekRaw)
    let weekChanged = false
    const dayTasks = { ...week.dayTasks }

    for (let dayIdx = 0; dayIdx < 7; dayIdx += 1) {
      const tasks = [...dayTasks[dayIdx]]
      let dayChanged = false
      for (let i = 0; i < tasks.length; i += 1) {
        if (tasks[i].id !== taskId) continue
        if (tasks[i].done === completed) continue
        tasks[i] = { ...tasks[i], done: completed }
        dayChanged = true
      }
      if (dayChanged) {
        dayTasks[dayIdx] = tasks
        weekChanged = true
      }
    }

    if (weekChanged) {
      next[weekId] = { ...week, dayTasks }
      changed = true
    }
  }

  return changed ? next : weeklyData
}

/**
 * Apply Weekly task done changes back onto goal_plan_data for gd-* ids.
 */
export function syncWeeklyDoneToGoalPlan(goalPlanData, taskId, done) {
  if (!isGoalPlanTaskId(taskId)) return goalPlanData

  const goals = (goalPlanData?.goals || []).map((goal) => ({
    ...goal,
    dailyTasks: (goal.dailyTasks || []).map((task) => {
      if (task.id !== taskId) return task
      return {
        ...task,
        status: done ? TASK_STATUS.COMPLETED : TASK_STATUS.TODO,
      }
    }),
  }))

  return { goals }
}

export function todayDateString(now = new Date()) {
  return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`
}
