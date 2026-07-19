import { TIMETABLE_ROUTINES_KEY } from './timetableRoutines.js'

export function getWeekUpdatedAt(week) {
  if (!week?.updatedAt) return 0
  const parsed = Date.parse(week.updatedAt)
  return Number.isFinite(parsed) ? parsed : 0
}

export function withWeekUpdatedAt(week) {
  return {
    ...week,
    updatedAt: new Date().toISOString(),
  }
}

/** Meta keys stored alongside week entries in weekly_data (not week objects). */
export function isWeeklyMetaKey(key) {
  return typeof key === 'string' && key.startsWith('__')
}

function coerceRoutineList(raw) {
  if (Array.isArray(raw)) return raw
  if (raw && typeof raw === 'object') {
    // Recover arrays corrupted by older stampWeeklyChanges (...array → object).
    return Object.keys(raw)
      .filter((key) => key !== 'updatedAt' && /^\d+$/.test(key))
      .sort((a, b) => Number(a) - Number(b))
      .map((key) => raw[key])
      .filter((item) => item && typeof item === 'object')
  }
  return []
}

function mergeRoutineLists(localRaw, cloudRaw) {
  const local = coerceRoutineList(localRaw)
  const cloud = coerceRoutineList(cloudRaw)
  if (local.length === 0) return cloud
  if (cloud.length === 0) return local

  const byId = new Map()
  for (const routine of cloud) {
    if (routine?.id) byId.set(routine.id, routine)
  }
  for (const routine of local) {
    if (routine?.id) byId.set(routine.id, routine)
  }

  const merged = [...byId.values()]
  // Prefer the longer side when ids are missing/colliding oddly.
  if (merged.length === 0) return local.length >= cloud.length ? local : cloud
  return merged
}

/** Keep the newer weekly entry when the same week exists on both devices. */
export function mergeWeeklyData(localWeekly = {}, cloudWeekly = {}) {
  const weekIds = new Set([
    ...Object.keys(localWeekly || {}),
    ...Object.keys(cloudWeekly || {}),
  ])
  const merged = {}

  const localRoutines = localWeekly?.[TIMETABLE_ROUTINES_KEY]
  const cloudRoutines = cloudWeekly?.[TIMETABLE_ROUTINES_KEY]
  if (localRoutines != null || cloudRoutines != null) {
    merged[TIMETABLE_ROUTINES_KEY] = mergeRoutineLists(localRoutines, cloudRoutines)
  }

  for (const weekId of weekIds) {
    if (isWeeklyMetaKey(weekId)) continue

    const localWeek = localWeekly?.[weekId]
    const cloudWeek = cloudWeekly?.[weekId]

    if (!localWeek) {
      if (cloudWeek) merged[weekId] = cloudWeek
      continue
    }
    if (!cloudWeek) {
      merged[weekId] = localWeek
      continue
    }

    const localTs = getWeekUpdatedAt(localWeek)
    const cloudTs = getWeekUpdatedAt(cloudWeek)
    merged[weekId] = localTs >= cloudTs ? localWeek : cloudWeek
  }

  return merged
}

/** Apply updatedAt to weekly entries that changed in an updateWeekly call. */
export function stampWeeklyChanges(prev = {}, next = {}) {
  const result = { ...next }
  const weekIds = new Set([
    ...Object.keys(prev || {}),
    ...Object.keys(next || {}),
  ])

  for (const weekId of weekIds) {
    if (isWeeklyMetaKey(weekId)) {
      // Keep meta values (e.g. routine arrays) untouched — never wrap with updatedAt.
      if (weekId === TIMETABLE_ROUTINES_KEY && result[weekId] != null) {
        result[weekId] = coerceRoutineList(result[weekId])
      }
      continue
    }

    const prevWeek = prev?.[weekId]
    const nextWeek = next?.[weekId]
    if (!nextWeek) continue
    if (
      !prevWeek ||
      JSON.stringify(prevWeek) !== JSON.stringify(nextWeek)
    ) {
      result[weekId] = withWeekUpdatedAt(nextWeek)
    }
  }

  return result
}
