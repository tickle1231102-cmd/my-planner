export { MONTH_GOAL_LINES, padMonthGoals } from './goalLists.js'

export function getDominantMonthAndYear(days) {
  const counts = new Map()
  days.forEach((d) => {
    const key = `${d.getFullYear()}:${d.getMonth()}`
    counts.set(key, (counts.get(key) || 0) + 1)
  })
  const topKey = [...counts.entries()].sort((a, b) => b[1] - a[1])[0]?.[0]
  if (!topKey) {
    const d = days[0]
    return { year: d.getFullYear(), month: d.getMonth() }
  }
  const [year, month] = topKey.split(':').map(Number)
  return { year, month }
}
