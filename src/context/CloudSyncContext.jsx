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
  registerWithUserKey,
  signInWithUserKey,
  signOutAccount,
  deleteAccountRemotely,
} from '../lib/authAccount.js'
import { clearAllLocalPlannerData } from '../lib/clearLocalData.js'
import { fetchAppData, isSupabaseConfigured, persistAppData } from '../lib/cloudApi.js'
import {
  clearHabitData,
  hasLocalHabitData,
  isHabitDataEmpty,
  loadHabitData,
  saveHabitData,
} from '../lib/habitStorage.js'
import {
  createDefaultMandalaData,
  hasLocalMandalaData,
  isMandalaDataEmpty,
  loadMandalaData,
  saveMandalaData,
} from '../lib/mandalaStorage.js'
import {
  hasLocalMonthlyData,
  isMonthlyDataEmpty,
  loadMonthlyData,
  saveMonthlyData,
} from '../lib/monthlyStorage.js'
import {
  clearMemoryData,
  createEmptyMemoryData,
  hasLocalMemoryData,
  isMemoryDataEmpty,
  loadMemoryData,
  saveMemoryData,
  withDefaultMemory,
} from '../lib/memoryStorage.js'
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
  const [mandalaData, setMandalaData] = useState(() => loadMandalaData())
  const [monthlyData, setMonthlyData] = useState(() => loadMonthlyData())
  const [memoryData, setMemoryData] = useState(() => createEmptyMemoryData())

  const saveTimerRef = useRef(null)
  const pendingSaveRef = useRef({})

  const finishLocalSession = useCallback((key, name = '') => {
    saveUserKey(key)
    setUserKey(key)
    setNickname(name)
    setAnnualData(withDefaultAnnual(loadAnnualFromLocal()))
    setWeeklyData(loadWeeklyFromLocal())
    setHabitData(loadHabitData())
    setMandalaData(loadMandalaData())
    setMonthlyData(loadMonthlyData())
    setMemoryData(loadMemoryData(key))
    setReady(true)
    setError('')
  }, [])

  const hydrateAfterAuth = useCallback(async (key, name = '', options = {}) => {
    const { isNewAccount = false } = options
    let cloud = await fetchAppData()

    if (isCloudEmpty(cloud) && hasLocalData()) {
      const annual_data = loadAnnualFromLocal() || {
        columns: DEFAULT_COLUMNS,
        weekData: {},
      }
      const weekly_data = loadWeeklyFromLocal()
      const habit_data = isNewAccount ? {} : loadHabitData()
      const mandala_data = loadMandalaData()
      const monthly_data = loadMonthlyData()
      const memory_data = isNewAccount ? createEmptyMemoryData() : loadMemoryData(key)
      cloud = await persistAppData({
        nickname: name || undefined,
        annual_data,
        weekly_data,
        habit_data,
        mandala_data,
        monthly_data,
        memory_data,
      })
    } else if (
      !isNewAccount &&
      isHabitDataEmpty(cloud.habit_data) &&
      hasLocalHabitData()
    ) {
      cloud = await persistAppData({
        habit_data: loadHabitData(),
      })
    } else if (isMandalaDataEmpty(cloud.mandala_data) && hasLocalMandalaData()) {
      cloud = await persistAppData({
        mandala_data: loadMandalaData(),
      })
    } else if (isMonthlyDataEmpty(cloud.monthly_data) && hasLocalMonthlyData()) {
      cloud = await persistAppData({
        monthly_data: loadMonthlyData(),
      })
    } else if (isMemoryDataEmpty(cloud.memory_data) && hasLocalMemoryData(key)) {
      cloud = await persistAppData({
        memory_data: loadMemoryData(key),
      })
    } else if (name) {
      cloud = await persistAppData({ nickname: name })
    }

    const profile = await getAuthenticatedProfile()

    if (isNewAccount) {
      cloud = { ...cloud, habit_data: {}, memory_data: createEmptyMemoryData() }
      clearHabitData()
      clearMemoryData(key)
    }

    saveUserKey(key)
    setUserKey(key)
    setNickname(profile?.nickname || name || '')
    setAnnualData(withDefaultAnnual(cloud.annual_data))
    setWeeklyData(cloud.weekly_data || {})
    setHabitData(cloud.habit_data || {})
    setMandalaData(cloud.mandala_data || loadMandalaData())
    setMonthlyData(cloud.monthly_data || loadMonthlyData())
    setMemoryData(withDefaultMemory(cloud.memory_data))
    saveAnnualToLocal(cloud.annual_data)
    saveWeeklyToLocal(cloud.weekly_data || {})
    saveHabitData(cloud.habit_data || {})
    saveMandalaData(cloud.mandala_data || loadMandalaData())
    saveMonthlyData(cloud.monthly_data || loadMonthlyData())
    saveMemoryData(withDefaultMemory(cloud.memory_data), key)
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
      if (data?.mandala_data) {
        setMandalaData(data.mandala_data)
        saveMandalaData(data.mandala_data)
      }
      if (data?.monthly_data) {
        setMonthlyData(data.monthly_data)
        saveMonthlyData(data.monthly_data)
      }
      if (data?.memory_data) {
        const normalized = withDefaultMemory(data.memory_data)
        setMemoryData(normalized)
        saveMemoryData(normalized, userKey)
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
      if (patch.mandala_data) saveMandalaData(patch.mandala_data)
      if (patch.monthly_data) saveMonthlyData(patch.monthly_data)
      if (patch.memory_data) saveMemoryData(patch.memory_data, userKey)

      if (!cloudEnabled || localOnly) return

      if (saveTimerRef.current) clearTimeout(saveTimerRef.current)
      saveTimerRef.current = setTimeout(() => {
        flushSave()
      }, SAVE_DELAY_MS)
    },
    [cloudEnabled, flushSave, localOnly, userKey],
  )

  const runAuthAction = useCallback(
    async (action, options = {}) => {
      setLoading(true)
      setError('')

      try {
        if (!cloudEnabled) {
          throw new Error('SUPABASE_NOT_CONFIGURED')
        }

        const key = await action()
        const profile = await getAuthenticatedProfile()
        await hydrateAfterAuth(key, profile?.nickname || '', options)
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

  const signIn = useCallback(
    (rawKey, password) =>
      runAuthAction(() => signInWithUserKey(rawKey, password)),
    [runAuthAction],
  )

  const register = useCallback(
    (rawKey, password, rawNickname) =>
      runAuthAction(
        () => registerWithUserKey(rawKey, password, rawNickname?.trim() || ''),
        { isNewAccount: true },
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

    const wasCloudSession = cloudEnabled && !localOnly
    const sessionKey = userKey

    if (wasCloudSession) {
      await signOutAccount()
      clearHabitData()
      if (sessionKey) clearMemoryData(sessionKey)
    }

    clearUserKey()
    setUserKey(null)
    setNickname('')
    setReady(false)
    setLocalOnly(false)
    setAnnualData(withDefaultAnnual(loadAnnualFromLocal()))
    setWeeklyData(loadWeeklyFromLocal())
    setHabitData(wasCloudSession ? {} : loadHabitData())
    setMandalaData(loadMandalaData())
    setMonthlyData(loadMonthlyData())
    setMemoryData(createEmptyMemoryData())
  }, [cloudEnabled, localOnly, userKey])

  const deleteAccount = useCallback(async () => {
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current)
    pendingSaveRef.current = {}

    if (cloudEnabled && !localOnly) {
      await deleteAccountRemotely()
      await signOutAccount()
    }

    clearAllLocalPlannerData()
    setUserKey(null)
    setNickname('')
    setReady(false)
    setLocalOnly(false)
    setAnnualData(withDefaultAnnual({}))
    setWeeklyData({})
    setHabitData({})
    setMandalaData(createDefaultMandalaData())
    setMonthlyData({})
    setMemoryData(createEmptyMemoryData())
    setError('')
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

  const updateMandala = useCallback(
    (updater) => {
      setMandalaData((prev) => {
        const next = typeof updater === 'function' ? updater(prev) : updater
        scheduleSave({ mandala_data: next })
        return next
      })
    },
    [scheduleSave],
  )

  const updateMonthly = useCallback(
    (updater) => {
      setMonthlyData((prev) => {
        const next = typeof updater === 'function' ? updater(prev) : updater
        scheduleSave({ monthly_data: next })
        return next
      })
    },
    [scheduleSave],
  )

  const updateMemory = useCallback(
    (updater) => {
      setMemoryData((prev) => {
        const safePrev = withDefaultMemory(prev)
        const next =
          typeof updater === 'function' ? updater(safePrev) : withDefaultMemory(updater)
        const normalized = withDefaultMemory(next)
        scheduleSave({ memory_data: normalized })
        return normalized
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
      mandalaData,
      monthlyData,
      memoryData,
      signIn,
      register,
      logout,
      deleteAccount,
      useLocalMode,
      updateAnnual,
      updateWeekly,
      updateHabitData,
      updateMandala,
      updateMonthly,
      updateMemory,
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
      mandalaData,
      monthlyData,
      memoryData,
      signIn,
      register,
      logout,
      deleteAccount,
      useLocalMode,
      updateAnnual,
      updateWeekly,
      updateHabitData,
      updateMandala,
      updateMonthly,
      updateMemory,
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
