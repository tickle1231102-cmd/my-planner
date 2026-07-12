import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'
import { CloudSyncProvider } from './context/CloudSyncContext.jsx'
import { ThemeProvider } from './context/ThemeContext.jsx'
import { registerPushServiceWorker } from './lib/webPushClient.js'

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
  window.addEventListener('load', () => {
    registerPushServiceWorker().catch(() => {
      // Push is optional; ignore registration failures on unsupported browsers.
    })
  })
}
