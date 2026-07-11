function pad(n) {
  return String(n).padStart(2, '0')
}

/** Matches WeeklyView TODO_TASK_COUNT (To do list only, not "Not to do"). */
export const WEEKLY_TODO_TASK_COUNT = 6

export function getMondayOfWeek(date) {
  const d = new Date(date)
  d.setHours(0, 0, 0, 0)
  const dow = d.getDay()
  d.setDate(d.getDate() + (dow === 0 ? -6 : 1 - dow))
  return d
}

export function getWeekIdFromMonday(monday) {
  return `${monday.getFullYear()}-${pad(monday.getMonth() + 1)}-${pad(monday.getDate())}`
}

export function getDayIndexFromDate(date) {
  return (date.getDay() + 6) % 7
}

function getDayTasksRaw(date, weeklyData) {
  const monday = getMondayOfWeek(date)
  const weekId = getWeekIdFromMonday(monday)
  const dayIdx = getDayIndexFromDate(date)
  const week = weeklyData?.[weekId]
  const tasks = week?.dayTasks?.[dayIdx] ?? week?.dayTasks?.[String(dayIdx)]
  return {
    monday,
    weekId,
    dayIdx,
    tasks: Array.isArray(tasks) ? tasks : [],
  }
}

/** Filled To-do list items only (non-empty text), excluding Not-to-do slots. */
export function getFilledTodoTasksForDate(date, weeklyData) {
  const { weekId, dayIdx, tasks } = getDayTasksRaw(date, weeklyData)
  const todos = tasks.slice(0, WEEKLY_TODO_TASK_COUNT)
  return {
    weekId,
    dayIdx,
    tasks: todos
      .filter((task) => String(task?.text || '').trim())
      .map((task, index) => ({
        id: task.id || `task-${index}`,
        text: String(task.text).trim(),
        done: !!task.done,
        postponed: !!task.postponed,
      })),
  }
}

function dayTasksHaveContent(tasks) {
  if (!Array.isArray(tasks)) return false
  return tasks.some((task) => String(task?.text || '').trim())
}

export function dateHasChecklistContent(date, weeklyData) {
  const { tasks } = getDayTasksRaw(date, weeklyData)
  return dayTasksHaveContent(tasks.slice(0, WEEKLY_TODO_TASK_COUNT))
}

export function buildMonthCells(year, month) {
  const firstDay = new Date(year, month, 1)
  const daysInMonth = new Date(year, month + 1, 0).getDate()
  const startOffset = (firstDay.getDay() + 6) % 7
  const cells = []

  for (let i = 0; i < startOffset; i += 1) cells.push(null)
  for (let day = 1; day <= daysInMonth; day += 1) {
    const date = new Date(year, month, day)
    date.setHours(0, 0, 0, 0)
    cells.push(date)
  }
  while (cells.length % 7 !== 0) cells.push(null)

  return cells
}

export function buildChecklistDateKeys(year, month, weeklyData, toDateKey) {
  const keys = new Set()
  for (const date of buildMonthCells(year, month)) {
    if (!date) continue
    if (dateHasChecklistContent(date, weeklyData)) {
      keys.add(toDateKey(date))
    }
  }
  return keys
}
