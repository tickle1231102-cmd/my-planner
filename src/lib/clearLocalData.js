import { clearHabitData } from './habitStorage.js'
import { clearMemoryData } from './memoryStorage.js'
import { MANDALA_STORAGE_KEY } from './mandalaStorage.js'
import { MONTHLY_STORAGE_KEY } from './monthlyStorage.js'
import {
  ANNUAL_STORAGE_KEY,
  WEEKLY_STORAGE_KEY,
} from './plannerStorage.js'
import { clearUserKey } from './userIdentity.js'

export function clearAllLocalPlannerData() {
  localStorage.removeItem(ANNUAL_STORAGE_KEY)
  localStorage.removeItem(WEEKLY_STORAGE_KEY)
  clearHabitData()
  localStorage.removeItem(MANDALA_STORAGE_KEY)
  localStorage.removeItem(MONTHLY_STORAGE_KEY)
  clearMemoryData()
  clearUserKey()
}
