import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'
import { CloudSyncProvider } from './context/CloudSyncContext.jsx'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <CloudSyncProvider>
      <App />
    </CloudSyncProvider>
  </StrictMode>,
)
