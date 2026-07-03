function pad(n) {
  return String(n).padStart(2, '0')
}

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

function dayTasksHaveContent(tasks) {
  if (!Array.isArray(tasks)) return false
  return tasks.some((task) => String(task?.text || '').trim())
}

export function dateHasChecklistContent(date, weeklyData) {
  const monday = getMondayOfWeek(date)
  const weekId = getWeekIdFromMonday(monday)
  const week = weeklyData?.[weekId]
  if (!week) return false

  const dayIdx = (date.getDay() + 6) % 7
  const tasks = week.dayTasks?.[dayIdx] ?? week.dayTasks?.[String(dayIdx)]
  return dayTasksHaveContent(tasks)
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
