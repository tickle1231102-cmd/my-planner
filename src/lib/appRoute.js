const VALID_VIEWS = new Set(['annual', 'yearOverview', 'weekly', 'habit', 'mandala', 'monthly', 'account'])

export function formatWeekMonday(date) {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

export function parseWeekMonday(value) {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value)
  if (!match) return null

  const date = new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]))
  date.setHours(0, 0, 0, 0)
  if (Number.isNaN(date.getTime())) return null

  return date
}

export function parseMonthParam(value) {
  const month = Number(value)
  if (!Number.isFinite(month) || month < 1 || month > 12) return null
  return month - 1
}

export function parseAppRoute(search = window.location.search) {
  const params = new URLSearchParams(search)
  const rawView = params.get('view')
  const view = VALID_VIEWS.has(rawView) ? rawView : 'annual'

  const year = Number(params.get('year'))
  const tab = params.get('tab') === 'notes' ? 'notes' : 'calendar'

  let selectedWeekMonday = null
  if (view === 'weekly') {
    selectedWeekMonday = parseWeekMonday(params.get('week'))
  }

  let selectedMonth = null
  if (view === 'monthly') {
    selectedMonth = parseMonthParam(params.get('month'))
  }

  return {
    view,
    year: Number.isFinite(year) ? year : null,
    tab,
    selectedWeekMonday,
    selectedMonth,
  }
}

export function buildAppRoute({ view, year, selectedWeekMonday, selectedMonth, mobileTab }) {
  const params = new URLSearchParams()

  if (view && view !== 'annual') {
    params.set('view', view)
  }

  if (year) {
    params.set('year', String(year))
  }

  if (view === 'weekly' && selectedWeekMonday) {
    params.set('week', formatWeekMonday(selectedWeekMonday))
  }

  if (view === 'monthly' && selectedMonth !== null && selectedMonth !== undefined) {
    params.set('month', String(selectedMonth + 1))
  }

  if (view === 'annual' && mobileTab === 'notes') {
    params.set('tab', 'notes')
  }

  const query = params.toString()
  return query ? `?${query}` : ''
}

export function syncAppRoute(state) {
  const nextSearch = buildAppRoute(state)
  const currentSearch = window.location.search

  if (nextSearch === currentSearch) return

  const nextUrl = `${window.location.pathname}${nextSearch}${window.location.hash}`
  window.history.replaceState(null, '', nextUrl)
}
