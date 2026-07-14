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

/** Keep the newer weekly entry when the same week exists on both devices. */
export function mergeWeeklyData(localWeekly = {}, cloudWeekly = {}) {
  const weekIds = new Set([
    ...Object.keys(localWeekly || {}),
    ...Object.keys(cloudWeekly || {}),
  ])
  const merged = {}

  for (const weekId of weekIds) {
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
