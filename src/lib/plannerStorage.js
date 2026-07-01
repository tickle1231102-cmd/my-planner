import { hasLocalHabitData } from './habitStorage.js'

export const ANNUAL_STORAGE_KEY = 'annual-planner-v1'
export const WEEKLY_STORAGE_KEY = 'weekly-planner-v2'

export const DEFAULT_COLUMNS = [
  { id: 'schedule', label: '주요 일정' },
  { id: 'goals', label: '목표' },
]

export function loadAnnualFromLocal() {
  try {
    const raw = localStorage.getItem(ANNUAL_STORAGE_KEY)
    if (!raw) return null
    return JSON.parse(raw)
  } catch {
    return null
  }
}

export function loadWeeklyFromLocal() {
  try {
    const raw = localStorage.getItem(WEEKLY_STORAGE_KEY)
    if (!raw) return {}
    return JSON.parse(raw)
  } catch {
    return {}
  }
}

export function saveAnnualToLocal(data) {
  localStorage.setItem(ANNUAL_STORAGE_KEY, JSON.stringify(data))
}

export function saveWeeklyToLocal(data) {
  localStorage.setItem(WEEKLY_STORAGE_KEY, JSON.stringify(data))
}

export function isCloudEmpty(cloud) {
  if (!cloud) return true
  const annual = cloud.annual_data
  const weekly = cloud.weekly_data
  const annualEmpty =
    !annual?.weekData || Object.keys(annual.weekData).length === 0
  const weeklyEmpty = !weekly || Object.keys(weekly).length === 0
  const columnsDefault =
    !annual?.columns ||
    (annual.columns.length === 2 &&
      annual.columns[0]?.id === 'schedule' &&
      annual.columns[1]?.id === 'goals')
  return annualEmpty && weeklyEmpty && columnsDefault
}

export function hasLocalData() {
  const annual = loadAnnualFromLocal()
  const weekly = loadWeeklyFromLocal()
  const annualHas =
    annual?.weekData && Object.keys(annual.weekData).length > 0
  const weeklyHas = weekly && Object.keys(weekly).length > 0
  return annualHas || weeklyHas || hasLocalHabitData()
}
