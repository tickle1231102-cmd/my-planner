import { scopedStorageKey } from './scopedStorageKey.js'

export const HABIT_STORAGE_KEY = 'habit-tracker-v1'
export const DEFAULT_HABIT_COUNT = 8

function habitStorageKey(userKey) {
  return scopedStorageKey(HABIT_STORAGE_KEY, userKey)
}

export function monthKey(year, month) {
  return `${year}-${month}`
}

export function getDaysInMonth(year, month) {
  return new Date(year, month + 1, 0).getDate()
}

export function createHabit(id, daysInMonth) {
  return {
    id,
    label: '',
    goal: daysInMonth,
    checks: {},
  }
}

export function createDefaultMonthData(daysInMonth) {
  return {
    habits: Array.from({ length: DEFAULT_HABIT_COUNT }, (_, index) =>
      createHabit(`habit-${index}`, daysInMonth),
    ),
  }
}

export function normalizeMonthData(raw, daysInMonth) {
  const base = createDefaultMonthData(daysInMonth)
  if (!raw?.habits?.length) return base

  const habits = raw.habits.map((habit, index) => ({
    id: habit.id || `habit-${index}`,
    label: habit.label || '',
    goal: Number.isFinite(habit.goal) ? habit.goal : daysInMonth,
    checks: habit.checks || {},
  }))

  while (habits.length < DEFAULT_HABIT_COUNT) {
    habits.push(createHabit(`habit-${habits.length}`, daysInMonth))
  }

  return { habits }
}

export function loadHabitData(userKey) {
  try {
    const raw = localStorage.getItem(habitStorageKey(userKey))
    if (!raw) return {}
    return JSON.parse(raw)
  } catch {
    return {}
  }
}

export function saveHabitData(data, userKey) {
  localStorage.setItem(habitStorageKey(userKey), JSON.stringify(data))
}

export function clearHabitData(userKey) {
  localStorage.removeItem(habitStorageKey(userKey))
}

export function hasLocalHabitData(userKey) {
  const data = loadHabitData(userKey)
  return Object.keys(data).length > 0
}

export function isHabitDataEmpty(habitData) {
  return !habitData || Object.keys(habitData).length === 0
}

export function getMonthData(allData, year, month) {
  const daysInMonth = getDaysInMonth(year, month)
  const key = monthKey(year, month)
  return normalizeMonthData(allData[key], daysInMonth)
}

export function setMonthData(allData, year, month, monthData) {
  const key = monthKey(year, month)
  return { ...allData, [key]: monthData }
}

/** Monday = 0 … Sunday = 6 */
export function mondayBasedIndex(date) {
  return (date.getDay() + 6) % 7
}

export function buildWeekChunks(year, month) {
  const daysInMonth = getDaysInMonth(year, month)
  const weekStart = new Date(year, month, 1)
  weekStart.setDate(1 - mondayBasedIndex(weekStart))

  const lastDayDate = new Date(year, month, daysInMonth)
  const chunks = []

  while (true) {
    const slots = Array.from({ length: 7 }, (_, index) => {
      const date = new Date(weekStart)
      date.setDate(weekStart.getDate() + index)
      return {
        year: date.getFullYear(),
        month: date.getMonth(),
        day: date.getDate(),
        inViewMonth: date.getFullYear() === year && date.getMonth() === month,
      }
    })

    chunks.push({ index: chunks.length, slots })

    const weekEnd = slots[6]
    const weekEndDate = new Date(weekEnd.year, weekEnd.month, weekEnd.day)
    if (weekEndDate >= lastDayDate) break

    weekStart.setDate(weekStart.getDate() + 7)
  }

  return chunks
}

export function slotKey(slot) {
  return `${slot.year}-${slot.month}-${slot.day}`
}

export function getHabitCheck(allData, habitIndex, slot) {
  const monthData = getMonthData(allData, slot.year, slot.month)
  const habit = monthData.habits[habitIndex]
  if (!habit) return false
  return !!habit.checks[String(slot.day)]
}

export function countHabitCompletedInMonth(habit, daysInMonth) {
  let count = 0
  for (let day = 1; day <= daysInMonth; day += 1) {
    if (habit.checks[String(day)]) count += 1
  }
  return count
}

export function countDayCompleted(habits, day) {
  const key = String(day)
  return habits.filter((habit) => habit.checks[key]).length
}

export function computeDailyProgress(habits, daysInMonth) {
  const activeHabits = habits.filter((habit) => habit.label.trim())
  const habitCount = activeHabits.length || habits.length

  return Array.from({ length: daysInMonth }, (_, index) => {
    const day = index + 1
    const completed = countDayCompleted(activeHabits.length ? activeHabits : habits, day)
    return habitCount > 0 ? Math.round((completed / habitCount) * 100) : 0
  })
}

export function computeOverallProgress(habits, daysInMonth) {
  const activeHabits = habits.filter((habit) => habit.label.trim())
  const list = activeHabits.length ? activeHabits : habits

  let completed = 0
  let total = 0

  for (const habit of list) {
    const done = countHabitCompletedInMonth(habit, daysInMonth)
    const goal = Math.max(habit.goal, 1)
    completed += Math.min(done, goal)
    total += goal
  }

  return total > 0 ? Math.round((completed / total) * 100) : 0
}

export function computeTotals(habits, daysInMonth) {
  const activeHabits = habits.filter((habit) => habit.label.trim())
  const list = activeHabits.length ? activeHabits : habits

  let completed = 0
  let total = 0

  for (const habit of list) {
    const done = countHabitCompletedInMonth(habit, daysInMonth)
    const goal = Math.max(habit.goal, 1)
    completed += Math.min(done, goal)
    total += goal
  }

  return { completed, total }
}

function getActiveHabits(habits) {
  const activeHabits = habits.filter((habit) => habit.label.trim())
  return activeHabits.length ? activeHabits : habits
}

export function inViewDaysInChunk(chunk) {
  return chunk.slots.filter((slot) => slot.inViewMonth).length
}

export function countHabitInWeek(habit, chunk) {
  let count = 0
  for (const slot of chunk.slots) {
    if (!slot.inViewMonth) continue
    if (habit.checks[String(slot.day)]) count += 1
  }
  return count
}

export function weekGoalForHabit(habit, chunk, daysInMonth) {
  const inView = inViewDaysInChunk(chunk)
  if (inView === 0) return 0
  return Math.min(inView, Math.max(1, Math.round((habit.goal * inView) / daysInMonth)))
}

export function isHabitWeekComplete(habit, chunk, daysInMonth) {
  const goal = weekGoalForHabit(habit, chunk, daysInMonth)
  if (goal === 0) return false
  return countHabitInWeek(habit, chunk) >= goal
}

export function computeWeekDailyCounts(habits, chunk) {
  const list = getActiveHabits(habits)
  const habitCount = list.length

  const completed = chunk.slots.map((slot) => {
    if (!slot.inViewMonth) return null
    return countDayCompleted(list, slot.day)
  })

  const incomplete = completed.map((value) =>
    value === null ? null : Math.max(habitCount - value, 0),
  )

  return { completed, incomplete, habitCount }
}

export function computeWeekProgressPercent(habits, chunk) {
  const list = getActiveHabits(habits)
  let completed = 0
  let total = 0

  for (const slot of chunk.slots) {
    if (!slot.inViewMonth) continue
    completed += countDayCompleted(list, slot.day)
    total += list.length
  }

  return total > 0 ? Math.round((completed / total) * 100) : 0
}

export function computeWeeklyHabitTotals(habits, weekChunks, daysInMonth) {
  const list = getActiveHabits(habits).filter((habit) => habit.label.trim())
  if (!list.length) {
    return { completed: 0, total: 0 }
  }

  let completed = 0
  let total = 0

  for (const chunk of weekChunks) {
    if (inViewDaysInChunk(chunk) === 0) continue
    for (const habit of list) {
      total += 1
      if (isHabitWeekComplete(habit, chunk, daysInMonth)) completed += 1
    }
  }

  return { completed, total }
}

export function toggleHabitCheck(allData, habitIndex, slot) {
  const current = getMonthData(allData, slot.year, slot.month)
  const habits = [...current.habits]
  const daysInSlotMonth = getDaysInMonth(slot.year, slot.month)

  while (habits.length <= habitIndex) {
    habits.push(createHabit(`habit-${habits.length}`, daysInSlotMonth))
  }

  const habit = habits[habitIndex]
  const key = String(slot.day)

  habits[habitIndex] = {
    ...habit,
    checks: { ...habit.checks, [key]: !habit.checks[key] },
  }

  return setMonthData(allData, slot.year, slot.month, { habits })
}

export function setHabitWeekChecks(allData, habitIndex, chunk, checked) {
  let result = allData

  for (const slot of chunk.slots) {
    if (!slot.inViewMonth) continue

    const current = getMonthData(result, slot.year, slot.month)
    const habits = [...current.habits]
    const daysInSlotMonth = getDaysInMonth(slot.year, slot.month)

    while (habits.length <= habitIndex) {
      habits.push(createHabit(`habit-${habits.length}`, daysInSlotMonth))
    }

    const habit = habits[habitIndex]
    const key = String(slot.day)

    if (!!habit.checks[key] === checked) continue

    habits[habitIndex] = {
      ...habit,
      checks: { ...habit.checks, [key]: checked },
    }

    result = setMonthData(result, slot.year, slot.month, { habits })
  }

  return result
}

export function toggleHabitWeekComplete(allData, habitIndex, chunk, daysInMonth) {
  const firstInView = chunk.slots.find((slot) => slot.inViewMonth)
  if (!firstInView) return allData

  const monthData = getMonthData(allData, firstInView.year, firstInView.month)
  const habit = monthData.habits[habitIndex]
  if (!habit) return allData

  const isComplete = isHabitWeekComplete(habit, chunk, daysInMonth)
  return setHabitWeekChecks(allData, habitIndex, chunk, !isComplete)
}
