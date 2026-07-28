/** Parses YYYY-MM-DD as UTC midnight. */
export function parseDateOnly(value) {
  const [year, month, day] = value.split('-').map(Number)
  return new Date(Date.UTC(year, month - 1, day))
}

export function formatDateOnly(date) {
  const year = date.getUTCFullYear()
  const month = String(date.getUTCMonth() + 1).padStart(2, '0')
  const day = String(date.getUTCDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

/** Weekday for a date string (0=Sun … 6=Sat), UTC-aligned. */
export function getWeekdayFromDateString(dateStr) {
  return parseDateOnly(dateStr).getUTCDay()
}

export const WEEKDAY_LABELS_KO = {
  0: '일',
  1: '월',
  2: '화',
  3: '수',
  4: '목',
  5: '금',
  6: '토',
}

export const WEEKDAY_LABELS_EN = {
  0: 'Sunday',
  1: 'Monday',
  2: 'Tuesday',
  3: 'Wednesday',
  4: 'Thursday',
  5: 'Friday',
  6: 'Saturday',
}

export function isExcludedDate(dateStr, excludedWeekdays, excludedDates) {
  if (excludedDates.includes(dateStr)) return true
  return excludedWeekdays.includes(getWeekdayFromDateString(dateStr))
}

/** Monday (UTC) that starts the Mon–Sun week containing `date`. */
export function getMondayOfWeekUtc(date) {
  const day = date.getUTCDay()
  const daysFromMonday = day === 0 ? 6 : day - 1
  const monday = new Date(date)
  monday.setUTCDate(date.getUTCDate() - daysFromMonday)
  return monday
}

export function getWeekDaysUtc(monday) {
  return Array.from({ length: 7 }, (_, index) => {
    const day = new Date(monday)
    day.setUTCDate(monday.getUTCDate() + index)
    return day
  })
}

/**
 * Assigns a Mon–Sun week to the month with the most days.
 * Tie-breaker (3–3): month containing the Monday.
 */
export function assignWeekToMonth(monday) {
  const days = getWeekDaysUtc(monday)
  const counts = new Map()

  for (const day of days) {
    const key = `${day.getUTCFullYear()}-${day.getUTCMonth() + 1}`
    counts.set(key, (counts.get(key) ?? 0) + 1)
  }

  const mondayKey = `${monday.getUTCFullYear()}-${monday.getUTCMonth() + 1}`
  let bestKey = mondayKey
  let bestCount = 0

  for (const [key, count] of counts) {
    if (count > bestCount) {
      bestCount = count
      bestKey = key
    }
  }

  const tiedKeys = [...counts.entries()]
    .filter(([, count]) => count === bestCount)
    .map(([key]) => key)

  const winnerKey = tiedKeys.length > 1 ? mondayKey : bestKey
  const [year, month] = winnerKey.split('-').map(Number)
  return { year, month }
}

export function getWeekNumberInMonth(monday, year, month) {
  const firstOfMonth = new Date(Date.UTC(year, month - 1, 1))
  const lastOfMonth = new Date(Date.UTC(year, month, 0))

  let cursor = getMondayOfWeekUtc(firstOfMonth)
  cursor.setUTCDate(cursor.getUTCDate() - 7)

  const endCursor = getMondayOfWeekUtc(lastOfMonth)
  endCursor.setUTCDate(endCursor.getUTCDate() + 7)

  const weeksInMonth = []

  while (cursor <= endCursor) {
    const assigned = assignWeekToMonth(cursor)
    if (assigned.year === year && assigned.month === month) {
      weeksInMonth.push(new Date(cursor))
    }
    cursor.setUTCDate(cursor.getUTCDate() + 7)
  }

  const index = weeksInMonth.findIndex(
    (weekMonday) => weekMonday.getTime() === monday.getTime(),
  )

  if (index >= 0) return index + 1
  return weeksInMonth.length > 0 ? weeksInMonth.length : 1
}

export function getWeekAssignment(date) {
  const monday = getMondayOfWeekUtc(date)
  const { year, month } = assignWeekToMonth(monday)
  const weekNumber = getWeekNumberInMonth(monday, year, month)
  return { year, month, weekNumber }
}

export function weeklyPlanKey(year, month, weekNumber) {
  return `${year}-${month}-${weekNumber}`
}

export function weekClassificationPromptLines() {
  return [
    'Week classification rules:',
    '- Weeks run Monday (start) through Sunday (end).',
    '- Each week belongs to the month that contains the majority of its 7 days (4+ days wins).',
    '- If days are split 3–3 between two months, assign the week to the month containing the Monday.',
    '- weekNumber is the 1-based index of Mon–Sun weeks assigned to that month, in chronological order.',
    '- For weeklyBreakdown, set year/month/weekNumber using these rules for each week\'s Monday.',
  ]
}
