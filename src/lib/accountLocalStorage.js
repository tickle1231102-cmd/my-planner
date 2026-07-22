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
 * Silently optimize local planner data for the account being entered.
 * Never copies another account's leftovers into nextKey.
 */
function autoPrepareLocalData(nextKey, previousKey, legacy) {
  if (legacy) {
    const snapshot = readLegacyPlannerSnapshot()
    if (previousKey && previousKey !== nextKey) {
      savePlannerSnapshotForAccount(previousKey, snapshot)
    } else if (previousKey === nextKey) {
      savePlannerSnapshotForAccount(nextKey, snapshot)
    }
    // Unknown-owner legacy is discarded to avoid cross-account leaks.
    clearLegacyPlannerLocal()
  }

  enableLocalScopedMode()
  return { keepLocalMerge: true }
}

/**
 * Handle leftover local planner data when entering an account.
 * Asks at most once on this device; afterwards always auto-optimizes.
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

  // Already decided on this device — never prompt again.
  if (isLocalScopedMode()) {
    return autoPrepareLocalData(nextKey, previousKey, legacy)
  }

  // Same account / nothing to decide.
  if (!legacy && !switching) {
    enableLocalScopedMode()
    return { keepLocalMerge: true }
  }

  const ownerHint = previousKey && previousKey !== nextKey ? previousKey : null
  const message = ownerHint
    ? `이 기기에 다른 계정(${ownerHint})의 로컬 데이터가 있습니다.\n\n확인: 계정별 저장으로 전환하고 이전 계정 데이터를 그 계정에 보관합니다.\n취소: 공유 로컬 데이터만 비우고, 이후부터는 계정별로 자동 저장합니다.\n\n이 안내는 이 기기에서 한 번만 표시됩니다.`
    : `이 기기에 저장된 로컬 플래너 데이터가 있습니다.\n\n확인: 계정별 저장으로 전환하고 지금 로그인하는 계정(${nextKey})에 보관합니다.\n취소: 공유 로컬 데이터를 비우고, 이후부터는 계정별로 자동 저장합니다.\n\n이 안내는 이 기기에서 한 번만 표시됩니다.`

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
    return { keepLocalMerge: saveToKey === nextKey }
  }

  clearLegacyPlannerLocal()
  if (!ownerHint && previousKey === nextKey) {
    clearPlannerLocalForAccount(nextKey)
  }
  enableLocalScopedMode()
  return { keepLocalMerge: false }
}
