export const YEAR_GOAL_LINES = 5
export const MONTH_GOAL_LINES = 3
export const WEEK_GOAL_LINES = 5

export function padGoalList(goals, lineCount, idPrefix = 'goal') {
  const padded = [...(goals || [])]
  while (padded.length < lineCount) {
    padded.push({
      id: `${idPrefix}-${padded.length}`,
      text: '',
      done: false,
    })
  }
  return padded.slice(0, lineCount).map((item, index) => ({
    id: item.id || `${idPrefix}-${index}`,
    text: item.text || '',
    done: !!item.done,
  }))
}

export function padMonthGoals(goals) {
  return padGoalList(goals, MONTH_GOAL_LINES, 'goal')
}

export function padYearGoals(goals) {
  return padGoalList(goals, YEAR_GOAL_LINES, 'year-goal')
}

export function padWeekGoals(goals) {
  return padGoalList(goals, WEEK_GOAL_LINES, 'week-goal')
}
