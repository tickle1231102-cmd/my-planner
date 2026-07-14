import { useEffect } from 'react'
import { useCloudSync } from '../context/CloudSyncContext.jsx'

export function SyncNotice() {
  const { syncNotice, clearSyncNotice } = useCloudSync()

  useEffect(() => {
    if (!syncNotice) return undefined
    const timer = window.setTimeout(() => clearSyncNotice(), 2800)
    return () => window.clearTimeout(timer)
  }, [clearSyncNotice, syncNotice])

  if (!syncNotice) return null

  return (
    <div
      role="status"
      className="pointer-events-none fixed inset-x-0 top-14 z-[60] flex justify-center px-4"
    >
      <p className="rounded-full border border-planner-sage/30 bg-white/95 px-4 py-2 text-xs font-medium text-planner-sage shadow-soft backdrop-blur-sm">
        {syncNotice}
      </p>
    </div>
  )
}
