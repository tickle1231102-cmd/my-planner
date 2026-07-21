import { scopedStorageKey } from './scopedStorageKey.js'

export const MANDALA_STORAGE_KEY = 'mandala-planner-v1'
export const MANDALA_CELL_COUNT = 81

function mandalaStorageKey(userKey) {
  return scopedStorageKey(MANDALA_STORAGE_KEY, userKey)
}

export function createDefaultMandalaData(year = new Date().getFullYear()) {
  return {
    year,
    keyword: '',
    resolution: '',
    cells: Array(MANDALA_CELL_COUNT).fill(''),
  }
}

export function normalizeMandalaData(raw) {
  const year = Number.isFinite(raw?.year) ? raw.year : new Date().getFullYear()
  const base = createDefaultMandalaData(year)
  const cells = Array.isArray(raw?.cells) ? [...raw.cells] : []

  while (cells.length < MANDALA_CELL_COUNT) cells.push('')
  if (cells.length > MANDALA_CELL_COUNT) cells.length = MANDALA_CELL_COUNT

  return {
    year,
    keyword: raw?.keyword || '',
    resolution: raw?.resolution || '',
    cells,
  }
}

export function loadMandalaData(userKey) {
  try {
    const raw = localStorage.getItem(mandalaStorageKey(userKey))
    if (!raw) return createDefaultMandalaData()
    return normalizeMandalaData(JSON.parse(raw))
  } catch {
    return createDefaultMandalaData()
  }
}

export function saveMandalaData(data, userKey) {
  localStorage.setItem(
    mandalaStorageKey(userKey),
    JSON.stringify(normalizeMandalaData(data)),
  )
}

export function hasLocalMandalaData(userKey) {
  const data = loadMandalaData(userKey)
  if (data.keyword.trim() || data.resolution.trim()) return true
  return data.cells.some((cell) => cell.trim())
}

export function isMandalaDataEmpty(mandalaData) {
  if (!mandalaData) return true
  if (mandalaData.keyword?.trim() || mandalaData.resolution?.trim()) return false
  if (!Array.isArray(mandalaData.cells)) return true
  return !mandalaData.cells.some((cell) => cell?.trim())
}

export function globalCellIndex(blockIndex, cellIndex) {
  return blockIndex * 9 + cellIndex
}

export function getMandalaCellClass(blockIndex, cellIndex) {
  const isCenterBlock = blockIndex === 4
  const isCenterCell = cellIndex === 4
  const isMainGoal = isCenterBlock && isCenterCell

  if (isMainGoal) {
    return 'bg-planner-year-gold/80 border-planner-sage/50'
  }
  if (isCenterCell) {
    return 'bg-planner-sage-light border-planner-sage/40'
  }
  if (isCenterBlock) {
    return 'bg-planner-sage-light/60 border-planner-sage/25'
  }
  return 'bg-planner-surface border-planner-sage/20'
}
