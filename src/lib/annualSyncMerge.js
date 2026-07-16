const DEFAULT_COLUMNS = [
  { id: 'schedule', label: '주요 일정' },
  { id: 'goals', label: '목표' },
]

export function withDefaultAnnual(annual) {
  return {
    columns: annual?.columns?.length ? annual.columns : DEFAULT_COLUMNS,
    weekData: annual?.weekData || {},
    dateColors: annual?.dateColors || {},
    monthGoals: annual?.monthGoals || {},
    yearGoals: annual?.yearGoals || {},
    yearMemos: annual?.yearMemos || {},
    year: annual?.year,
    updatedAt: annual?.updatedAt,
  }
}

export function getAnnualUpdatedAt(annual) {
  if (!annual?.updatedAt) return 0
  const parsed = Date.parse(annual.updatedAt)
  return Number.isFinite(parsed) ? parsed : 0
}

export function withAnnualUpdatedAt(annual) {
  return {
    ...withDefaultAnnual(annual),
    updatedAt: new Date().toISOString(),
  }
}

function isBlankString(value) {
  return typeof value !== 'string' || !value.trim()
}

function isEmptyWeekCell(value) {
  if (value == null) return true
  if (typeof value === 'string') return isBlankString(value)
  if (typeof value === 'object') {
    return Object.values(value).every((item) => isBlankString(item))
  }
  return false
}

function isEmptyGoalList(list) {
  if (!Array.isArray(list) || list.length === 0) return true
  return list.every((goal) => isBlankString(goal?.text))
}

function isEmptyMonthGoals(monthMap) {
  if (!monthMap || typeof monthMap !== 'object') return true
  return Object.values(monthMap).every((goals) => isEmptyGoalList(goals))
}

/** True when annual has any planner/calendar content beyond defaults. */
export function annualHasContent(annual) {
  const data = withDefaultAnnual(annual)
  if (Object.values(data.weekData).some((cell) => !isEmptyWeekCell(cell))) {
    return true
  }
  if (Object.keys(data.dateColors).length > 0) return true
  if (Object.values(data.monthGoals).some((months) => !isEmptyMonthGoals(months))) {
    return true
  }
  if (Object.values(data.yearGoals).some((goals) => !isEmptyGoalList(goals))) {
    return true
  }
  if (Object.values(data.yearMemos).some((memo) => !isBlankString(memo))) {
    return true
  }
  const defaultIds = DEFAULT_COLUMNS.map((column) => column.id).join(',')
  const columnIds = (data.columns || []).map((column) => column.id).join(',')
  if (columnIds && columnIds !== defaultIds) return true
  return false
}

function preferValue(localValue, cloudValue, preferLocal) {
  const localEmpty =
    localValue == null ||
    (typeof localValue === 'string' && isBlankString(localValue)) ||
    (typeof localValue === 'object' &&
      !Array.isArray(localValue) &&
      Object.keys(localValue).length === 0) ||
    (Array.isArray(localValue) && isEmptyGoalList(localValue))
  const cloudEmpty =
    cloudValue == null ||
    (typeof cloudValue === 'string' && isBlankString(cloudValue)) ||
    (typeof cloudValue === 'object' &&
      !Array.isArray(cloudValue) &&
      Object.keys(cloudValue).length === 0) ||
    (Array.isArray(cloudValue) && isEmptyGoalList(cloudValue))

  if (localEmpty && !cloudEmpty) return cloudValue
  if (cloudEmpty && !localEmpty) return localValue
  if (localEmpty && cloudEmpty) return preferLocal ? localValue : cloudValue
  return preferLocal ? localValue : cloudValue
}

function mergeRecordMaps(localMap = {}, cloudMap = {}, preferLocal, valueMerger) {
  const keys = new Set([
    ...Object.keys(localMap || {}),
    ...Object.keys(cloudMap || {}),
  ])
  const merged = {}

  for (const key of keys) {
    const localValue = localMap?.[key]
    const cloudValue = cloudMap?.[key]
    if (localValue == null) {
      merged[key] = cloudValue
      continue
    }
    if (cloudValue == null) {
      merged[key] = localValue
      continue
    }
    merged[key] = valueMerger
      ? valueMerger(localValue, cloudValue, preferLocal)
      : preferValue(localValue, cloudValue, preferLocal)
  }

  return merged
}

function mergeWeekCells(localCell, cloudCell, preferLocal) {
  if (typeof localCell === 'string' || typeof cloudCell === 'string') {
    return preferValue(localCell, cloudCell, preferLocal)
  }
  if (
    localCell &&
    cloudCell &&
    typeof localCell === 'object' &&
    typeof cloudCell === 'object'
  ) {
    return mergeRecordMaps(localCell, cloudCell, preferLocal)
  }
  return preferValue(localCell, cloudCell, preferLocal)
}

function mergeMonthGoalYears(localYear, cloudYear, preferLocal) {
  return mergeRecordMaps(localYear, cloudYear, preferLocal, (localMonth, cloudMonth, prefer) =>
    preferValue(localMonth, cloudMonth, prefer),
  )
}

function mergeColumns(localColumns, cloudColumns, preferLocal) {
  const local = Array.isArray(localColumns) ? localColumns : []
  const cloud = Array.isArray(cloudColumns) ? cloudColumns : []
  if (!local.length) return cloud.length ? cloud : DEFAULT_COLUMNS
  if (!cloud.length) return local
  const defaultIds = DEFAULT_COLUMNS.map((column) => column.id).join(',')
  const localIds = local.map((column) => column.id).join(',')
  const cloudIds = cloud.map((column) => column.id).join(',')
  if (localIds === defaultIds && cloudIds !== defaultIds) return cloud
  if (cloudIds === defaultIds && localIds !== defaultIds) return local
  return preferLocal ? local : cloud
}

/**
 * Merge local + cloud annual planner data.
 * Never discard filled local calendar/goal fields just because cloud is empty.
 * When both sides have content for the same key, prefer the newer updatedAt side.
 */
export function mergeAnnualData(localAnnual, cloudAnnual) {
  const local = withDefaultAnnual(localAnnual)
  const cloud = withDefaultAnnual(cloudAnnual)
  const localHas = annualHasContent(local)
  const cloudHas = annualHasContent(cloud)

  if (!localHas && !cloudHas) return cloud
  if (!localHas) return cloud
  if (!cloudHas) return local

  const localTs = getAnnualUpdatedAt(local)
  const cloudTs = getAnnualUpdatedAt(cloud)
  const preferLocal = localTs >= cloudTs

  return {
    columns: mergeColumns(local.columns, cloud.columns, preferLocal),
    weekData: mergeRecordMaps(local.weekData, cloud.weekData, preferLocal, mergeWeekCells),
    dateColors: mergeRecordMaps(local.dateColors, cloud.dateColors, preferLocal),
    monthGoals: mergeRecordMaps(
      local.monthGoals,
      cloud.monthGoals,
      preferLocal,
      mergeMonthGoalYears,
    ),
    yearGoals: mergeRecordMaps(local.yearGoals, cloud.yearGoals, preferLocal),
    yearMemos: mergeRecordMaps(local.yearMemos, cloud.yearMemos, preferLocal),
    year: preferValue(local.year, cloud.year, preferLocal),
    updatedAt: preferLocal ? local.updatedAt : cloud.updatedAt,
  }
}

export function stampAnnualChanges(prevAnnual, nextAnnual) {
  const prev = withDefaultAnnual(prevAnnual)
  const next = withDefaultAnnual(nextAnnual)
  const prevComparable = { ...prev, updatedAt: undefined }
  const nextComparable = { ...next, updatedAt: undefined }
  if (JSON.stringify(prevComparable) === JSON.stringify(nextComparable)) {
    return prev.updatedAt ? prev : withAnnualUpdatedAt(next)
  }
  return withAnnualUpdatedAt(next)
}
