export const MONTHLY_STORAGE_KEY = 'monthly-planner-v1'

export function monthStorageKey(year, month) {
  return `${year}-${month}`
}

export function createDefaultMonthEntry() {
  return {
    notes: '',
    dayNotes: {},
  }
}

export function normalizeMonthEntry(raw) {
  return {
    notes: raw?.notes || '',
    dayNotes: raw?.dayNotes && typeof raw.dayNotes === 'object' ? { ...raw.dayNotes } : {},
  }
}

export function getMonthEntry(allData, year, month) {
  const key = monthStorageKey(year, month)
  return normalizeMonthEntry(allData[key])
}

export function setMonthEntry(allData, year, month, entry) {
  const key = monthStorageKey(year, month)
  return { ...allData, [key]: normalizeMonthEntry(entry) }
}

export function loadMonthlyData() {
  try {
    const raw = localStorage.getItem(MONTHLY_STORAGE_KEY)
    if (!raw) return {}
    const parsed = JSON.parse(raw)
    return parsed && typeof parsed === 'object' ? parsed : {}
  } catch {
    return {}
  }
}

export function saveMonthlyData(data) {
  localStorage.setItem(MONTHLY_STORAGE_KEY, JSON.stringify(data))
}

export function hasLocalMonthlyData() {
  return Object.keys(loadMonthlyData()).length > 0
}

export function isMonthlyDataEmpty(monthlyData) {
  if (!monthlyData || typeof monthlyData !== 'object') return true
  return !Object.values(monthlyData).some((entry) => {
    const normalized = normalizeMonthEntry(entry)
    if (normalized.notes.trim()) return true
    return Object.values(normalized.dayNotes).some((note) => String(note).trim())
  })
}

export function buildMonthGrid(year, month) {
  const firstDay = new Date(year, month, 1)
  const daysInMonth = new Date(year, month + 1, 0).getDate()
  const startOffset = (firstDay.getDay() + 6) % 7

  const cells = []
  for (let i = 0; i < startOffset; i += 1) cells.push(null)
  for (let day = 1; day <= daysInMonth; day += 1) cells.push(day)
  while (cells.length % 7 !== 0) cells.push(null)

  return cells
}

export const MONTH_INDEX_LABELS = [
  'JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN',
  'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC',
]

export const MONTH_DISPLAY_NAMES = [
  'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
  'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec',
]

export const WEEKDAY_LABELS = ['Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa', 'Su']
