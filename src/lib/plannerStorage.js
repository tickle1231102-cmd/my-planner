import { annualHasContent } from './annualSyncMerge.js'
import { scopedStorageKey } from './scopedStorageKey.js'
import { hasLocalHabitData } from './habitStorage.js'

export const ANNUAL_STORAGE_KEY = 'annual-planner-v1'
export const WEEKLY_STORAGE_KEY = 'weekly-planner-v2'

export const DEFAULT_COLUMNS = [
  { id: 'schedule', label: '주요 일정' },
  { id: 'goals', label: '목표' },
]

export function loadAnnualFromLocal(userKey) {
  try {
    const raw = localStorage.getItem(scopedStorageKey(ANNUAL_STORAGE_KEY, userKey))
    if (!raw) return null
    return JSON.parse(raw)
  } catch {
    return null
  }
}

export function loadWeeklyFromLocal(userKey) {
  try {
    const raw = localStorage.getItem(scopedStorageKey(WEEKLY_STORAGE_KEY, userKey))
    if (!raw) return {}
    return JSON.parse(raw)
  } catch {
    return {}
  }
}

export function saveAnnualToLocal(data, userKey) {
  if (data == null) return
  localStorage.setItem(
    scopedStorageKey(ANNUAL_STORAGE_KEY, userKey),
    JSON.stringify(data),
  )
}

export function saveWeeklyToLocal(data, userKey) {
  localStorage.setItem(
    scopedStorageKey(WEEKLY_STORAGE_KEY, userKey),
    JSON.stringify(data),
  )
}

export function isCloudEmpty(cloud) {
  if (!cloud) return true
  const weekly = cloud.weekly_data
  const weeklyEmpty = !weekly || Object.keys(weekly).length === 0
  return !annualHasContent(cloud.annual_data) && weeklyEmpty
}

export function hasLocalData(userKey) {
  const annual = loadAnnualFromLocal(userKey)
  const weekly = loadWeeklyFromLocal(userKey)
  const weeklyHas = weekly && Object.keys(weekly).length > 0
  return annualHasContent(annual) || weeklyHas || hasLocalHabitData(userKey)
}
