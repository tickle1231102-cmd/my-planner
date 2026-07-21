import { clearHabitData, saveHabitData } from './habitStorage.js'
import {
  clearMemoryData,
  clearAllMemoryData,
  createEmptyMemoryData,
  saveMemoryData,
} from './memoryStorage.js'
import {
  createDefaultMandalaData,
  MANDALA_STORAGE_KEY,
  saveMandalaData,
} from './mandalaStorage.js'
import { MONTHLY_STORAGE_KEY, saveMonthlyData } from './monthlyStorage.js'
import {
  clearLegacyPlannerLocal,
  enableLocalScopedMode,
} from './accountLocalStorage.js'
import {
  ANNUAL_STORAGE_KEY,
  DEFAULT_COLUMNS,
  saveAnnualToLocal,
  saveWeeklyToLocal,
  WEEKLY_STORAGE_KEY,
} from './plannerStorage.js'
import { scopedStorageKey } from './scopedStorageKey.js'
import { clearUserKey } from './userIdentity.js'

export function createFreshPlannerState() {
  return {
    annualData: {
      columns: DEFAULT_COLUMNS,
      weekData: {},
      dateColors: {},
      monthGoals: {},
      yearGoals: {},
      yearMemos: {},
    },
    weeklyData: {},
    habitData: {},
    mandalaData: createDefaultMandalaData(),
    monthlyData: {},
    memoryData: createEmptyMemoryData(),
  }
}

/** Reset local storage to a new-account-like state for guest browsing. */
export function resetGuestLocalData(guestUserKey) {
  const fresh = createFreshPlannerState()

  clearLegacyPlannerLocal()
  enableLocalScopedMode()
  saveAnnualToLocal(fresh.annualData, guestUserKey)
  saveWeeklyToLocal(fresh.weeklyData, guestUserKey)
  clearHabitData(guestUserKey)
  saveHabitData(fresh.habitData, guestUserKey)
  saveMandalaData(fresh.mandalaData, guestUserKey)
  saveMonthlyData(fresh.monthlyData, guestUserKey)
  clearMemoryData(guestUserKey)
  saveMemoryData(fresh.memoryData, guestUserKey)

  return fresh
}

export function clearAllLocalPlannerData() {
  clearLegacyPlannerLocal()
  localStorage.removeItem(ANNUAL_STORAGE_KEY)
  localStorage.removeItem(WEEKLY_STORAGE_KEY)
  clearHabitData()
  localStorage.removeItem(MANDALA_STORAGE_KEY)
  localStorage.removeItem(MONTHLY_STORAGE_KEY)

  // Remove any scoped planner keys for known prefixes.
  const prefixes = [
    `${ANNUAL_STORAGE_KEY}:`,
    `${WEEKLY_STORAGE_KEY}:`,
    'habit-tracker-v1:',
    `${MANDALA_STORAGE_KEY}:`,
    `${MONTHLY_STORAGE_KEY}:`,
  ]
  for (let i = localStorage.length - 1; i >= 0; i -= 1) {
    const key = localStorage.key(i)
    if (prefixes.some((prefix) => key?.startsWith(prefix))) {
      localStorage.removeItem(key)
    }
  }

  clearAllMemoryData()
  clearUserKey()
}

export function clearActiveAccountLocalCache(userKey) {
  if (!userKey) {
    clearLegacyPlannerLocal()
    return
  }
  localStorage.removeItem(scopedStorageKey(ANNUAL_STORAGE_KEY, userKey))
  localStorage.removeItem(scopedStorageKey(WEEKLY_STORAGE_KEY, userKey))
  clearHabitData(userKey)
  localStorage.removeItem(scopedStorageKey(MANDALA_STORAGE_KEY, userKey))
  localStorage.removeItem(scopedStorageKey(MONTHLY_STORAGE_KEY, userKey))
}
