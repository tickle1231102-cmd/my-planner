const BASE_COLUMNS = ['annual_data', 'weekly_data', 'habit_data']
const OPTIONAL_COLUMNS = ['mandala_data', 'monthly_data', 'memory_data']
const META_COLUMNS = ['updated_at']

export const MANDALA_MIGRATION_HINT =
  'DB에 만다라트 컬럼이 없습니다. Supabase SQL Editor에서 supabase/migrations/add_mandala_data.sql 을 실행해 주세요.'

export const MONTHLY_MIGRATION_HINT =
  'DB에 월간 플래너 컬럼이 없습니다. Supabase SQL Editor에서 supabase/migrations/add_monthly_data.sql 을 실행해 주세요.'

export const MEMORY_MIGRATION_HINT =
  'DB에 메모리 컬럼이 없습니다. Supabase SQL Editor에서 supabase/migrations/add_memory_data.sql 을 실행해 주세요.'

function buildSelectList(includeOptional = [...OPTIONAL_COLUMNS]) {
  return [...BASE_COLUMNS, ...includeOptional, ...META_COLUMNS].join(', ')
}

export const APP_DATA_SELECT_FULL = buildSelectList()
export const APP_DATA_SELECT_LEGACY = buildSelectList([])

function getMissingColumn(error) {
  const message = error?.message || ''
  if (!message.includes('does not exist')) return null

  for (const column of OPTIONAL_COLUMNS) {
    if (message.includes(column)) return column
  }

  return null
}

function migrationHintForColumn(column) {
  if (column === 'mandala_data') return MANDALA_MIGRATION_HINT
  if (column === 'monthly_data') return MONTHLY_MIGRATION_HINT
  if (column === 'memory_data') return MEMORY_MIGRATION_HINT
  return `DB에 ${column} 컬럼이 없습니다.`
}

export function isMissingMandalaColumnError(error) {
  return getMissingColumn(error) === 'mandala_data'
}

export function isMissingMonthlyColumnError(error) {
  return getMissingColumn(error) === 'monthly_data'
}

export function isMissingOptionalColumnError(error) {
  return Boolean(getMissingColumn(error))
}

export function optionalColumnMigrationHint(error) {
  const column = getMissingColumn(error)
  return column ? migrationHintForColumn(column) : null
}

async function selectWithFallback(supabase, userKey, selectList) {
  const { data, error } = await supabase
    .from('app_data')
    .select(selectList)
    .eq('user_key', userKey)
    .single()

  if (!error) return { data, missing: [] }

  const missingColumn = getMissingColumn(error)
  if (!missingColumn) throw error

  const remainingOptional = OPTIONAL_COLUMNS.filter(
    (column) => selectList.includes(column) && column !== missingColumn,
  )
  const nextSelect = buildSelectList(remainingOptional)
  const fallback = await selectWithFallback(supabase, userKey, nextSelect)

  return {
    data: { ...fallback.data, [missingColumn]: null },
    missing: [missingColumn, ...fallback.missing],
  }
}

export async function selectAppDataRow(supabase, userKey) {
  const { data } = await selectWithFallback(supabase, userKey, APP_DATA_SELECT_FULL)
  return data
}

async function upsertWithFallback(supabase, patch, selectList) {
  const { data, error } = await supabase
    .from('app_data')
    .upsert(patch)
    .select(selectList)
    .single()

  if (!error) return { data, missing: [] }

  const missingColumn = getMissingColumn(error)
  if (!missingColumn || patch[missingColumn] === undefined) throw error

  const { [missingColumn]: _ignored, ...legacyPatch } = patch
  const remainingOptional = OPTIONAL_COLUMNS.filter(
    (column) => selectList.includes(column) && column !== missingColumn,
  )
  const nextSelect = buildSelectList(remainingOptional)
  const fallback = await upsertWithFallback(supabase, legacyPatch, nextSelect)

  return {
    data: { ...fallback.data, [missingColumn]: null },
    missing: [missingColumn, ...fallback.missing],
  }
}

export async function upsertAppDataRow(supabase, patch) {
  const { data } = await upsertWithFallback(supabase, patch, APP_DATA_SELECT_FULL)
  return data
}

export async function insertAppDataRow(supabase, row) {
  const optionalInRow = OPTIONAL_COLUMNS.filter((column) => row[column] !== undefined)

  async function tryInsert(payload, remainingOptional) {
    const { error } = await supabase.from('app_data').insert(payload)
    if (!error) return

    const missingColumn = getMissingColumn(error)
    if (!missingColumn || payload[missingColumn] === undefined) throw error

    const { [missingColumn]: _ignored, ...legacyPayload } = payload
    const nextOptional = remainingOptional.filter((column) => column !== missingColumn)
    await tryInsert(legacyPayload, nextOptional)
  }

  await tryInsert(row, optionalInRow)
}
