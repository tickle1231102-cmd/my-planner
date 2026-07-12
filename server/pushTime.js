const WEEKDAY_TO_IDX = {
  Mon: 0,
  Tue: 1,
  Wed: 2,
  Thu: 3,
  Fri: 4,
  Sat: 5,
  Sun: 6,
}

function pad(n) {
  return String(n).padStart(2, '0')
}

export function getZonedParts(date, timeZone) {
  const dtf = new Intl.DateTimeFormat('en-US', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    weekday: 'short',
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
  })

  const parts = {}
  for (const part of dtf.formatToParts(date)) {
    if (part.type !== 'literal') parts[part.type] = part.value
  }

  return {
    year: Number(parts.year),
    month: Number(parts.month),
    day: Number(parts.day),
    weekday: parts.weekday,
    hour: Number(parts.hour),
    minute: Number(parts.minute),
  }
}

export function getWeekIdAndDayIdxInTimeZone(timeZone, date = new Date()) {
  const zoned = getZonedParts(date, timeZone)
  const dayIdx = WEEKDAY_TO_IDX[zoned.weekday] ?? 0
  const mondayUtc = Date.UTC(zoned.year, zoned.month - 1, zoned.day - dayIdx, 12, 0, 0)
  const monday = new Date(mondayUtc)

  return {
    weekId: `${monday.getUTCFullYear()}-${pad(monday.getUTCMonth() + 1)}-${pad(monday.getUTCDate())}`,
    dayIdx,
    dateKey: `${zoned.year}-${pad(zoned.month)}-${pad(zoned.day)}`,
    hour: zoned.hour,
    minute: zoned.minute,
  }
}

export function isInNotifyWindow(notifyTime, hour, minute, windowMinutes = 15) {
  const [targetHour, targetMinute] = String(notifyTime)
    .slice(0, 5)
    .split(':')
    .map(Number)

  if (!Number.isFinite(targetHour) || !Number.isFinite(targetMinute)) return false

  const nowTotal = hour * 60 + minute
  const targetTotal = targetHour * 60 + targetMinute
  return nowTotal >= targetTotal && nowTotal < targetTotal + windowMinutes
}

const TODO_TASK_COUNT = 6

export function countUncheckedTodos(weeklyData, weekId, dayIdx) {
  const week = weeklyData?.[weekId]
  if (!week) return { total: 0, unchecked: 0 }

  const tasks = week.dayTasks?.[dayIdx] ?? week.dayTasks?.[String(dayIdx)] ?? []
  const todos = Array.isArray(tasks) ? tasks.slice(0, TODO_TASK_COUNT) : []
  const filled = todos.filter((task) => String(task?.text || '').trim())
  const unchecked = filled.filter((task) => !task.done)

  return {
    total: filled.length,
    unchecked: unchecked.length,
  }
}
