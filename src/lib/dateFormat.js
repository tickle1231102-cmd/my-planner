export function formatDateLabel(date) {
  return `${date.getMonth() + 1}월 ${date.getDate()}일`
}

export function formatDateDayOnly(date) {
  return String(date.getDate())
}

export function formatDateWithWeekday(date, weekdayLabel) {
  return `${formatDateLabel(date)} (${weekdayLabel})`
}

export function formatWeekRange(days) {
  const start = days[0]
  const end = days[6]
  return `${formatDateLabel(start)} – ${formatDateLabel(end)}`
}
