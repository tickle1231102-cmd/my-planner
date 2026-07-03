import { DEFAULT_TIMETABLE_COLOR, TIMETABLE_COLOR_BY_ID } from './timetableColors.js'

export const TIMETABLE_ROUTINES_KEY = '__timetableRoutines'
export const DAY_LABELS = ['월', '화', '수', '목', '금', '토', '일']
export const START_HOUR = 6
export const SLOTS_PER_HOUR = 6

function pad(n) {
  return String(n).padStart(2, '0')
}

export function toDateKey(date) {
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`
}

export function parseDateKey(key) {
  const [y, m, d] = String(key || '').split('-').map(Number)
  if (!y || !m || !d) return null
  const date = new Date(y, m - 1, d)
  date.setHours(0, 0, 0, 0)
  return date
}

export function slotKey(dayIdx, hour, slot) {
  return `${dayIdx}-${hour}-${slot}`
}

function normalizeDaysOfWeek(raw) {
  if (Array.isArray(raw?.daysOfWeek) && raw.daysOfWeek.length > 0) {
    return [...new Set(raw.daysOfWeek)]
      .map(Number)
      .filter((day) => day >= 0 && day <= 6)
      .sort((a, b) => a - b)
  }

  const dayOfWeek = Number(raw?.dayOfWeek)
  if (dayOfWeek >= 0 && dayOfWeek <= 6) return [dayOfWeek]
  return [0]
}

function normalizeRoutine(raw, index) {
  const colorId =
    typeof raw?.colorId === 'string' && TIMETABLE_COLOR_BY_ID[raw.colorId]
      ? raw.colorId
      : DEFAULT_TIMETABLE_COLOR

  const startHour = Number(raw?.startHour)
  const startSlot = Number(raw?.startSlot)
  const endHour = Number(raw?.endHour)
  const endSlot = Number(raw?.endSlot)

  return {
    id: raw?.id || `routine-${index}`,
    daysOfWeek: normalizeDaysOfWeek(raw),
    startHour: Number.isFinite(startHour) ? startHour : 9,
    startSlot: startSlot >= 0 && startSlot < SLOTS_PER_HOUR ? startSlot : 0,
    endHour: Number.isFinite(endHour) ? endHour : 10,
    endSlot: endSlot >= 0 && endSlot <= SLOTS_PER_HOUR ? endSlot : 0,
    colorId,
    repeatFrom:
      typeof raw?.repeatFrom === 'string' && raw.repeatFrom
        ? raw.repeatFrom
        : toDateKey(new Date()),
    repeatUntil:
      typeof raw?.repeatUntil === 'string' && raw.repeatUntil
        ? raw.repeatUntil
        : toDateKey(new Date()),
  }
}

export function normalizeRoutines(raw) {
  if (!Array.isArray(raw)) return []
  return raw.map((routine, index) => normalizeRoutine(routine, index))
}

function slotIndex(hour, slot) {
  return hour * SLOTS_PER_HOUR + slot
}

function isRoutineActiveOnDate(routine, date) {
  const key = toDateKey(date)
  return key >= routine.repeatFrom && key <= routine.repeatUntil
}

function forEachRoutineSlot(routine, callback) {
  const start = slotIndex(routine.startHour, routine.startSlot)
  let end = slotIndex(routine.endHour, routine.endSlot)
  if (end <= start) end = start + 1

  for (let index = start; index < end; index += 1) {
    const hour = Math.floor(index / SLOTS_PER_HOUR) % 24
    const slot = index % SLOTS_PER_HOUR
    callback(hour, slot)
  }
}

export function computeRoutineSlots(days, routines) {
  const result = {}
  const normalized = normalizeRoutines(routines)

  for (const routine of normalized) {
    for (const dayIdx of routine.daysOfWeek) {
      const date = days[dayIdx]
      if (!date || !isRoutineActiveOnDate(routine, date)) continue

      forEachRoutineSlot(routine, (hour, slot) => {
        result[slotKey(dayIdx, hour, slot)] = routine.colorId
      })
    }
  }

  return result
}

export function mergeFilledSlots(manualSlots, routineSlots) {
  const merged = { ...routineSlots }

  for (const [key, value] of Object.entries(manualSlots || {})) {
    if (value === false) delete merged[key]
    else if (value) merged[key] = value
  }

  return merged
}

export function formatRoutineTime(hour, slot) {
  const minutes = slot * 10
  return `${pad(hour)}:${pad(minutes)}`
}

export function formatRoutineRange(routine) {
  return `${formatRoutineTime(routine.startHour, routine.startSlot)}–${formatRoutineTime(
    routine.endHour,
    routine.endSlot,
  )}`
}

export function createRoutineId() {
  return `routine-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`
}

export function formatRoutineDays(daysOfWeek) {
  return daysOfWeek.map((day) => DAY_LABELS[day]).join(', ')
}

export function defaultRoutineDraft(today = new Date()) {
  const from = toDateKey(today)
  const untilDate = new Date(today)
  untilDate.setMonth(untilDate.getMonth() + 3)
  return {
    daysOfWeek: [(today.getDay() + 6) % 7],
    startHour: 9,
    startSlot: 0,
    endHour: 10,
    endSlot: 0,
    colorId: DEFAULT_TIMETABLE_COLOR,
    repeatFrom: from,
    repeatUntil: toDateKey(untilDate),
  }
}

export const TIMETABLE_HOURS = Array.from({ length: 24 }, (_, i) => (START_HOUR + i) % 24)
export const TIMETABLE_MINUTES = Array.from({ length: SLOTS_PER_HOUR }, (_, i) => i * 10)
