import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react'
import {
  getAuthenticatedProfile,
  getUserKeyAuthStatus,
  linkLegacyUserKey,
  registerWithUserKey,
  signInWithUserKey,
  signOutAccount,
} from '../lib/authAccount.js'
import { fetchAppData, isSupabaseConfigured, persistAppData } from '../lib/cloudApi.js'
import {
  hasLocalHabitData,
  isHabitDataEmpty,
  loadHabitData,
  saveHabitData,
} from '../lib/habitStorage.js'
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
  saveUserKey,
} from '../lib/userIdentity.js'

const CloudSyncContext = createContext(null)
const LOCAL_USER_KEY = 'local-device'

const SAVE_DELAY_MS = 700

function withDefaultAnnual(annual) {
  return {
    columns: annual?.columns?.length ? annual.columns : DEFAULT_COLUMNS,
    weekData: annual?.weekData || {},
    dateColors: annual?.dateColors || {},
    monthGoals: annual?.monthGoals || {},
    yearGoals: annual?.yearGoals || {},
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
  const [habitData, setHabitData] = useState(() => loadHabitData())

  const saveTimerRef = useRef(null)
  const pendingSaveRef = useRef({})

  const finishLocalSession = useCallback((key, name = '') => {
    saveUserKey(key)
    setUserKey(key)
    setNickname(name)
    setAnnualData(withDefaultAnnual(loadAnnualFromLocal()))
    setWeeklyData(loadWeeklyFromLocal())
    setHabitData(loadHabitData())
    setReady(true)
    setError('')
  }, [])

  const hydrateAfterAuth = useCallback(async (key, name = '') => {
    let cloud = await fetchAppData()

    if (isCloudEmpty(cloud) && hasLocalData()) {
      const annual_data = loadAnnualFromLocal() || {
        columns: DEFAULT_COLUMNS,
        weekData: {},
      }
      const weekly_data = loadWeeklyFromLocal()
      const habit_data = loadHabitData()
      cloud = await persistAppData({
        nickname: name || undefined,
        annual_data,
        weekly_data,
        habit_data,
      })
    } else if (isHabitDataEmpty(cloud.habit_data) && hasLocalHabitData()) {
      cloud = await persistAppData({
        habit_data: loadHabitData(),
      })
    } else if (name) {
      cloud = await persistAppData({ nickname: name })
    }

    const profile = await getAuthenticatedProfile()

    saveUserKey(key)
    setUserKey(key)
    setNickname(profile?.nickname || name || '')
    setAnnualData(withDefaultAnnual(cloud.annual_data))
    setWeeklyData(cloud.weekly_data || {})
    setHabitData(cloud.habit_data || {})
    saveAnnualToLocal(cloud.annual_data)
    saveWeeklyToLocal(cloud.weekly_data || {})
    saveHabitData(cloud.habit_data || {})
    setError('')
  }, [])

  const flushSave = useCallback(async () => {
    const patch = pendingSaveRef.current
    pendingSaveRef.current = {}

    if (!cloudEnabled || localOnly || Object.keys(patch).length === 0) {
      return
    }

    setSyncing(true)
    try {
      const data = await persistAppData(patch)
      if (data?.annual_data) {
        setAnnualData(withDefaultAnnual(data.annual_data))
        saveAnnualToLocal(data.annual_data)
      }
      if (data?.weekly_data) {
        setWeeklyData(data.weekly_data)
        saveWeeklyToLocal(data.weekly_data)
      }
      if (data?.habit_data) {
        setHabitData(data.habit_data)
        saveHabitData(data.habit_data)
      }
      setError('')
    } catch (err) {
      setError(err instanceof Error ? err.message : '동기화 실패')
    } finally {
      setSyncing(false)
    }
  }, [cloudEnabled, localOnly])

  const scheduleSave = useCallback(
    (patch) => {
      if (!userKey) return

      pendingSaveRef.current = { ...pendingSaveRef.current, ...patch }

      if (patch.annual_data) saveAnnualToLocal(patch.annual_data)
      if (patch.weekly_data) saveWeeklyToLocal(patch.weekly_data)
      if (patch.habit_data) saveHabitData(patch.habit_data)

      if (!cloudEnabled || localOnly) return

      if (saveTimerRef.current) clearTimeout(saveTimerRef.current)
      saveTimerRef.current = setTimeout(() => {
        flushSave()
      }, SAVE_DELAY_MS)
    },
    [cloudEnabled, flushSave, localOnly, userKey],
  )

  const runAuthAction = useCallback(
    async (action) => {
      setLoading(true)
      setError('')

      try {
        if (!cloudEnabled) {
          throw new Error('SUPABASE_NOT_CONFIGURED')
        }

        const key = await action()
        const profile = await getAuthenticatedProfile()
        await hydrateAfterAuth(key, profile?.nickname || '')
        setLocalOnly(false)
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
    [cloudEnabled, hydrateAfterAuth],
  )

  const checkUserKeyStatus = useCallback(
    async (rawKey) => {
      if (!cloudEnabled) {
        throw new Error('SUPABASE_NOT_CONFIGURED')
      }
      return getUserKeyAuthStatus(rawKey)
    },
    [cloudEnabled],
  )

  const signIn = useCallback(
    (rawKey, password) =>
      runAuthAction(() => signInWithUserKey(rawKey, password)),
    [runAuthAction],
  )

  const register = useCallback(
    (rawKey, password, rawNickname) =>
      runAuthAction(() =>
        registerWithUserKey(rawKey, password, rawNickname?.trim() || ''),
      ),
    [runAuthAction],
  )

  const setLegacyPassword = useCallback(
    (rawKey, password, rawNickname) =>
      runAuthAction(() =>
        linkLegacyUserKey(rawKey, password, rawNickname?.trim() || ''),
      ),
    [runAuthAction],
  )

  const useLocalMode = useCallback(() => {
    setLocalOnly(true)
    finishLocalSession(LOCAL_USER_KEY, '로컬 저장')
    setLoading(false)
  }, [finishLocalSession])

  const logout = useCallback(async () => {
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current)
    pendingSaveRef.current = {}

    if (cloudEnabled && !localOnly) {
      await signOutAccount()
    }

    clearUserKey()
    setUserKey(null)
    setNickname('')
    setReady(false)
    setLocalOnly(false)
    setAnnualData(withDefaultAnnual(loadAnnualFromLocal()))
    setWeeklyData(loadWeeklyFromLocal())
    setHabitData(loadHabitData())
  }, [cloudEnabled, localOnly])

  useEffect(() => {
    let cancelled = false

    async function restore() {
      const saved = getSavedUserKey()

      if (!cloudEnabled || saved === LOCAL_USER_KEY) {
        if (saved === LOCAL_USER_KEY || (!cloudEnabled && saved)) {
          setLocalOnly(true)
          finishLocalSession(
            saved === LOCAL_USER_KEY ? LOCAL_USER_KEY : saved,
            saved === LOCAL_USER_KEY ? '로컬 저장' : '',
          )
        }
        if (!cancelled) setLoading(false)
        return
      }

      try {
        const profile = await getAuthenticatedProfile()
        if (!profile?.user_key) {
          if (saved) clearUserKey()
          if (!cancelled) setLoading(false)
          return
        }

        await hydrateAfterAuth(profile.user_key, profile.nickname || '')
        if (!cancelled) {
          setLocalOnly(false)
          setReady(true)
          setLoading(false)
        }
      } catch {
        await signOutAccount()
        clearUserKey()
        if (!cancelled) setLoading(false)
      }
    }

    restore()

    return () => {
      cancelled = true
    }
  }, [cloudEnabled, finishLocalSession, hydrateAfterAuth])

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

  const updateHabitData = useCallback(
    (updater) => {
      setHabitData((prev) => {
        const next = typeof updater === 'function' ? updater(prev) : updater
        scheduleSave({ habit_data: next })
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
      habitData,
      checkUserKeyStatus,
      signIn,
      register,
      setLegacyPassword,
      logout,
      useLocalMode,
      updateAnnual,
      updateWeekly,
      updateHabitData,
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
      habitData,
      checkUserKeyStatus,
      signIn,
      register,
      setLegacyPassword,
      logout,
      useLocalMode,
      updateAnnual,
      updateWeekly,
      updateHabitData,
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
