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
  ANNUAL_STORAGE_KEY,
  DEFAULT_COLUMNS,
  saveAnnualToLocal,
  saveWeeklyToLocal,
  WEEKLY_STORAGE_KEY,
} from './plannerStorage.js'
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

  saveAnnualToLocal(fresh.annualData)
  saveWeeklyToLocal(fresh.weeklyData)
  clearHabitData()
  saveHabitData(fresh.habitData)
  saveMandalaData(fresh.mandalaData)
  saveMonthlyData(fresh.monthlyData)
  clearMemoryData(guestUserKey)
  saveMemoryData(fresh.memoryData, guestUserKey)

  return fresh
}

export function clearAllLocalPlannerData() {
  localStorage.removeItem(ANNUAL_STORAGE_KEY)
  localStorage.removeItem(WEEKLY_STORAGE_KEY)
  clearHabitData()
  localStorage.removeItem(MANDALA_STORAGE_KEY)
  localStorage.removeItem(MONTHLY_STORAGE_KEY)
  clearAllMemoryData()
  clearUserKey()
}
