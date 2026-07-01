import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react'
import { fetchAppData, isSupabaseConfigured, persistAppData } from '../lib/cloudApi.js'
import {
  DEFAULT_COLUMNS,
  hasLocalData,
  isCloudEmpty,
  loadAnnualFromLocal,
  loadWeeklyFromLocal,
  saveAnnualToLocal,
  saveWeeklyToLocal,
} from '../lib/plannerStorage.js'
import {
  clearUserKey,
  getSavedUserKey,
  normalizeUserKey,
  saveUserKey,
} from '../lib/userIdentity.js'

const CloudSyncContext = createContext(null)
const LOCAL_USER_KEY = 'local-device'

const SAVE_DELAY_MS = 700

function withDefaultAnnual(annual) {
  return {
    columns: annual?.columns?.length ? annual.columns : DEFAULT_COLUMNS,
    weekData: annual?.weekData || {},
    year: annual?.year,
  }
}

export function CloudSyncProvider({ children }) {
  const cloudEnabled = isSupabaseConfigured()

  const [userKey, setUserKey] = useState(null)
  const [nickname, setNickname] = useState('')
  const [loading, setLoading] = useState(true)
  const [syncing, setSyncing] = useState(false)
  const [error, setError] = useState('')
  const [ready, setReady] = useState(false)
  const [localOnly, setLocalOnly] = useState(false)

  const [annualData, setAnnualData] = useState(() =>
    withDefaultAnnual(loadAnnualFromLocal()),
  )
  const [weeklyData, setWeeklyData] = useState(() => loadWeeklyFromLocal())

  const saveTimerRef = useRef(null)
  const pendingSaveRef = useRef({})

  const finishLocalSession = useCallback((key, name = '') => {
    saveUserKey(key)
    setUserKey(key)
    setNickname(name)
    setAnnualData(withDefaultAnnual(loadAnnualFromLocal()))
    setWeeklyData(loadWeeklyFromLocal())
    setReady(true)
    setError('')
  }, [])

  const flushSave = useCallback(
    async (key) => {
      const patch = pendingSaveRef.current
      pendingSaveRef.current = {}

      if (!key || !cloudEnabled || localOnly || Object.keys(patch).length === 0) {
        return
      }

      setSyncing(true)
      try {
        const data = await persistAppData(key, patch)
        if (data?.annual_data) {
          setAnnualData(withDefaultAnnual(data.annual_data))
          saveAnnualToLocal(data.annual_data)
        }
        if (data?.weekly_data) {
          setWeeklyData(data.weekly_data)
          saveWeeklyToLocal(data.weekly_data)
        }
        setError('')
      } catch (err) {
        setError(err instanceof Error ? err.message : '동기화 실패')
      } finally {
        setSyncing(false)
      }
    },
    [cloudEnabled, localOnly],
  )

  const scheduleSave = useCallback(
    (patch) => {
      if (!userKey) return

      pendingSaveRef.current = { ...pendingSaveRef.current, ...patch }

      if (patch.annual_data) saveAnnualToLocal(patch.annual_data)
      if (patch.weekly_data) saveWeeklyToLocal(patch.weekly_data)

      if (!cloudEnabled || localOnly) return

      if (saveTimerRef.current) clearTimeout(saveTimerRef.current)
      saveTimerRef.current = setTimeout(() => {
        flushSave(userKey)
      }, SAVE_DELAY_MS)
    },
    [cloudEnabled, flushSave, localOnly, userKey],
  )

  const login = useCallback(
    async (rawKey, rawNickname) => {
      const key = normalizeUserKey(rawKey)
      const name = rawNickname?.trim() || ''

      setLoading(true)
      setError('')

      try {
        if (!cloudEnabled) {
          throw new Error('SUPABASE_NOT_CONFIGURED')
        }

        let cloud = await fetchAppData(key)

        if (isCloudEmpty(cloud) && hasLocalData()) {
          const annual_data = loadAnnualFromLocal() || {
            columns: DEFAULT_COLUMNS,
            weekData: {},
          }
          const weekly_data = loadWeeklyFromLocal()
          cloud = await persistAppData(key, {
            nickname: name || undefined,
            annual_data,
            weekly_data,
          })
        } else if (name) {
          cloud = await persistAppData(key, { nickname: name })
        }

        saveUserKey(key)
        setUserKey(key)
        setNickname(name)
        setLocalOnly(false)
        setAnnualData(withDefaultAnnual(cloud.annual_data))
        setWeeklyData(cloud.weekly_data || {})
        saveAnnualToLocal(cloud.annual_data)
        saveWeeklyToLocal(cloud.weekly_data || {})
        setReady(true)
      } catch (err) {
        const message = err instanceof Error ? err.message : '연결 실패'
        if (message === 'SUPABASE_NOT_CONFIGURED') {
          setError(
            'Supabase가 설정되지 않았습니다. .env.local 파일을 확인하세요.',
          )
        } else {
          setError(message)
        }
        throw err
      } finally {
        setLoading(false)
      }
    },
    [cloudEnabled],
  )

  const useLocalMode = useCallback(() => {
    setLocalOnly(true)
    finishLocalSession(LOCAL_USER_KEY, '로컬 저장')
    setLoading(false)
  }, [finishLocalSession])

  const logout = useCallback(() => {
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current)
    pendingSaveRef.current = {}
    clearUserKey()
    setUserKey(null)
    setNickname('')
    setReady(false)
    setLocalOnly(false)
    setAnnualData(withDefaultAnnual(loadAnnualFromLocal()))
    setWeeklyData(loadWeeklyFromLocal())
  }, [])

  useEffect(() => {
    const saved = getSavedUserKey()
    if (!saved) {
      setLoading(false)
      return
    }

    if (!cloudEnabled || saved === LOCAL_USER_KEY) {
      setLocalOnly(true)
      finishLocalSession(saved, saved === LOCAL_USER_KEY ? '로컬 저장' : '')
      setLoading(false)
      return
    }

    login(saved).catch(() => {
      clearUserKey()
      setUserKey(null)
      setLoading(false)
    })
  }, [cloudEnabled, finishLocalSession, login])

  useEffect(() => {
    return () => {
      if (saveTimerRef.current) clearTimeout(saveTimerRef.current)
    }
  }, [])

  const updateAnnual = useCallback(
    (nextAnnual) => {
      const merged = withDefaultAnnual(nextAnnual)
      setAnnualData(merged)
      scheduleSave({ annual_data: merged })
    },
    [scheduleSave],
  )

  const updateWeekly = useCallback(
    (updater) => {
      setWeeklyData((prev) => {
        const next = typeof updater === 'function' ? updater(prev) : updater
        scheduleSave({ weekly_data: next })
        return next
      })
    },
    [scheduleSave],
  )

  const value = useMemo(
    () => ({
      userKey,
      nickname,
      loading,
      ready,
      syncing,
      error,
      cloudEnabled,
      localOnly,
      annualData,
      weeklyData,
      login,
      logout,
      useLocalMode,
      updateAnnual,
      updateWeekly,
    }),
    [
      userKey,
      nickname,
      loading,
      ready,
      syncing,
      error,
      cloudEnabled,
      localOnly,
      annualData,
      weeklyData,
      login,
      logout,
      useLocalMode,
      updateAnnual,
      updateWeekly,
    ],
  )

  return (
    <CloudSyncContext.Provider value={value}>
      {children}
    </CloudSyncContext.Provider>
  )
}

export function useCloudSync() {
  const ctx = useContext(CloudSyncContext)
  if (!ctx) {
    throw new Error('useCloudSync must be used within CloudSyncProvider')
  }
  return ctx
}
