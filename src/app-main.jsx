import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'
import { CloudSyncProvider } from './context/CloudSyncContext.jsx'
import { ThemeProvider } from './context/ThemeContext.jsx'
import { registerPushServiceWorker } from './lib/webPushClient.js'
import { formatWeekMonday } from './lib/appRoute.js'
import { getMondayOfWeek } from './lib/weeklyChecklist.js'

function buildWeeklyEntryUrl() {
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const weekMonday = getMondayOfWeek(today)
  const params = new URLSearchParams({
    view: 'weekly',
    year: String(weekMonday.getFullYear()),
    week: formatWeekMonday(weekMonday),
  })
  return `/app?${params.toString()}`
}

function openWeeklyFromNotification() {
  window.location.assign(buildWeeklyEntryUrl())
}

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <ThemeProvider>
      <CloudSyncProvider>
        <App />
      </CloudSyncProvider>
    </ThemeProvider>
  </StrictMode>,
)

if ('serviceWorker' in navigator) {
  navigator.serviceWorker.addEventListener('message', (event) => {
    if (event.data?.type === 'FOCAL_OPEN_WEEKLY') {
      openWeeklyFromNotification()
    }
  })

  window.addEventListener('load', () => {
    registerPushServiceWorker().catch(() => {})
  })
}
