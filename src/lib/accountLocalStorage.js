import { annualHasContent } from './annualSyncMerge.js'
import {
  clearHabitData,
  hasLocalHabitData,
  HABIT_STORAGE_KEY,
  loadHabitData,
  saveHabitData,
} from './habitStorage.js'
import {
  createDefaultMandalaData,
  hasLocalMandalaData,
  loadMandalaData,
  MANDALA_STORAGE_KEY,
  saveMandalaData,
} from './mandalaStorage.js'
import {
  hasLocalMonthlyData,
  loadMonthlyData,
  MONTHLY_STORAGE_KEY,
  saveMonthlyData,
} from './monthlyStorage.js'
import {
  ANNUAL_STORAGE_KEY,
  loadAnnualFromLocal,
  loadWeeklyFromLocal,
  saveAnnualToLocal,
  saveWeeklyToLocal,
  WEEKLY_STORAGE_KEY,
} from './plannerStorage.js'
import {
  enableLocalScopedMode,
  isLocalScopedMode,
  scopedStorageKey,
} from './scopedStorageKey.js'
import { getSavedUserKey, normalizeUserKey } from './userIdentity.js'

export { enableLocalScopedMode, isLocalScopedMode, scopedStorageKey } from './scopedStorageKey.js'

const LEGACY_KEYS = [
  ANNUAL_STORAGE_KEY,
  WEEKLY_STORAGE_KEY,
  HABIT_STORAGE_KEY,
  MANDALA_STORAGE_KEY,
  MONTHLY_STORAGE_KEY,
]

function readJson(key, fallback) {
  try {
    const raw = localStorage.getItem(key)
    if (!raw) return fallback
    return JSON.parse(raw)
  } catch {
    return fallback
  }
}

export function readLegacyPlannerSnapshot() {
  return {
    annualData: readJson(ANNUAL_STORAGE_KEY, null),
    weeklyData: readJson(WEEKLY_STORAGE_KEY, {}),
    habitData: readJson(HABIT_STORAGE_KEY, {}),
    mandalaData: readJson(MANDALA_STORAGE_KEY, null),
    monthlyData: readJson(MONTHLY_STORAGE_KEY, {}),
  }
}

export function clearLegacyPlannerLocal() {
  for (const key of LEGACY_KEYS) {
    localStorage.removeItem(key)
  }
}

export function hasLegacyPlannerLocal() {
  const snap = readLegacyPlannerSnapshot()
  if (annualHasContent(snap.annualData)) return true
  if (snap.weeklyData && Object.keys(snap.weeklyData).length > 0) return true
  if (snap.habitData && Object.keys(snap.habitData).length > 0) return true
  if (snap.monthlyData && Object.keys(snap.monthlyData).length > 0) return true
  if (snap.mandalaData) {
    const data = snap.mandalaData
    if (data.keyword?.trim() || data.resolution?.trim()) return true
    if (Array.isArray(data.cells) && data.cells.some((cell) => String(cell || '').trim())) {
      return true
    }
  }
  return false
}

export function savePlannerSnapshotForAccount(userKey, snapshot) {
  const key = normalizeUserKey(userKey)
  if (!key) return

  if (snapshot.annualData != null) saveAnnualToLocal(snapshot.annualData, key)
  if (snapshot.weeklyData != null) saveWeeklyToLocal(snapshot.weeklyData, key)
  if (snapshot.habitData != null) saveHabitData(snapshot.habitData, key)
  if (snapshot.mandalaData != null) {
    saveMandalaData(snapshot.mandalaData, key)
  } else {
    saveMandalaData(createDefaultMandalaData(), key)
  }
  if (snapshot.monthlyData != null) saveMonthlyData(snapshot.monthlyData, key)
}

export function clearPlannerLocalForAccount(userKey) {
  const key = normalizeUserKey(userKey)
  if (!key) return
  localStorage.removeItem(scopedStorageKey(ANNUAL_STORAGE_KEY, key))
  localStorage.removeItem(scopedStorageKey(WEEKLY_STORAGE_KEY, key))
  clearHabitData(key)
  localStorage.removeItem(scopedStorageKey(MANDALA_STORAGE_KEY, key))
  localStorage.removeItem(scopedStorageKey(MONTHLY_STORAGE_KEY, key))
}

export function hasScopedPlannerLocal(userKey) {
  const key = normalizeUserKey(userKey)
  if (!key) return false
  return (
    annualHasContent(loadAnnualFromLocal(key)) ||
    Object.keys(loadWeeklyFromLocal(key) || {}).length > 0 ||
    hasLocalHabitData(key) ||
    hasLocalMandalaData(key) ||
    hasLocalMonthlyData(key)
  )
}

/**
 * Ask how to handle leftover local planner data when entering an account.
 * Returns { keepLocalMerge: boolean } — whether hydrate may upload this account's local to cloud.
 */
export function prepareLocalDataForAccountSwitch(nextUserKey) {
  const nextKey = normalizeUserKey(nextUserKey)
  if (!nextKey || typeof window === 'undefined') {
    return { keepLocalMerge: false }
  }

  const previousKey = normalizeUserKey(getSavedUserKey())
  const legacy = hasLegacyPlannerLocal()
  const switching =
    Boolean(previousKey) && previousKey !== nextKey && hasScopedPlannerLocal(previousKey)

  if (!legacy && !switching && isLocalScopedMode()) {
    return { keepLocalMerge: true }
  }

  // Already scoped, same account, no legacy leftovers.
  if (!legacy && previousKey === nextKey) {
    enableLocalScopedMode()
    return { keepLocalMerge: true }
  }

  if (!legacy && !switching) {
    enableLocalScopedMode()
    return { keepLocalMerge: true }
  }

  const ownerHint = previousKey && previousKey !== nextKey ? previousKey : null
  const message = ownerHint
    ? `이 기기에 다른 계정(${ownerHint})의 로컬 데이터가 있습니다.\n\n확인: 계정별 저장으로 전환하고 이전 계정 데이터를 그 계정에 보관합니다.\n취소: 이 기기 로컬 플래너 데이터를 비운 뒤 새 계정으로 진행합니다.`
    : `이 기기에 저장된 로컬 플래너 데이터가 있습니다.\n\n확인: 계정별 저장으로 전환하고 지금 로그인하는 계정(${nextKey})에 보관합니다.\n취소: 이 기기 로컬 플래너 데이터를 비운 뒤 진행합니다.`

  const savePerAccount = window.confirm(message)

  if (savePerAccount) {
    const snapshot = legacy
      ? readLegacyPlannerSnapshot()
      : {
          annualData: loadAnnualFromLocal(previousKey),
          weeklyData: loadWeeklyFromLocal(previousKey),
          habitData: loadHabitData(previousKey),
          mandalaData: loadMandalaData(previousKey),
          monthlyData: loadMonthlyData(previousKey),
        }

    const saveToKey = ownerHint || nextKey
    savePlannerSnapshotForAccount(saveToKey, snapshot)
    clearLegacyPlannerLocal()
    enableLocalScopedMode()

    // Do not upload another account's data into the account being entered.
    return { keepLocalMerge: saveToKey === nextKey }
  }

  clearLegacyPlannerLocal()
  if (ownerHint) {
    // Keep previous account scoped data; only stop sharing via legacy keys.
  } else if (previousKey === nextKey) {
    clearPlannerLocalForAccount(nextKey)
  } else if (!previousKey) {
    // Unknown owner leftovers discarded via legacy clear already.
  }
  enableLocalScopedMode()
  return { keepLocalMerge: false }
}
