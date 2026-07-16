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
import { clearAllLocalPlannerData, resetGuestLocalData } from '../lib/clearLocalData.js'
import { fetchAppData, isSupabaseConfigured, persistAppData } from '../lib/cloudApi.js'
import { syncWeeklyTodayRoute } from '../lib/appRoute.js'
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
  hasLocalData,
  isCloudEmpty,
  loadAnnualFromLocal,
  loadWeeklyFromLocal,
  saveAnnualToLocal,
  saveWeeklyToLocal,
} from '../lib/plannerStorage.js'
import {
  mergeAnnualData,
  stampAnnualChanges,
  withDefaultAnnual,
} from '../lib/annualSyncMerge.js'
import { mergeWeeklyData, stampWeeklyChanges } from '../lib/weeklySyncMerge.js'
import {
  clearUserKey,
  getSavedUserKey,
  GUEST_USER_KEY,
  LOCAL_USER_KEY,
  saveUserKey,
} from '../lib/userIdentity.js'

const CloudSyncContext = createContext(null)
const SAVE_DELAY_MS = 700
const AUTO_PULL_INTERVAL_MS = 30_000

function sessionNickname(key) {
  if (key === GUEST_USER_KEY) return '게스트'
  if (key === LOCAL_USER_KEY) return '로컬 저장'
  return ''
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
  const [pullGeneration, setPullGeneration] = useState(0)

  const saveTimerRef = useRef(null)
  const pendingSaveRef = useRef({})
  const lastPullAtRef = useRef(0)
  const pullInFlightRef = useRef(false)

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

  const applyCloudSnapshot = useCallback((cloud, key) => {
    const annual = withDefaultAnnual(cloud.annual_data)
    const weekly = cloud.weekly_data || {}
    const habit = cloud.habit_data || {}
    const mandala = cloud.mandala_data || loadMandalaData()
    const monthly = cloud.monthly_data || loadMonthlyData()
    const memory = withDefaultMemory(cloud.memory_data)

    setAnnualData(annual)
    setWeeklyData(weekly)
    setHabitData(habit)
    setMandalaData(mandala)
    setMonthlyData(monthly)
    setMemoryData(memory)

    saveAnnualToLocal(annual)
    saveWeeklyToLocal(weekly)
    saveHabitData(habit)
    saveMandalaData(mandala)
    saveMonthlyData(monthly)
    saveMemoryData(memory, key)
  }, [])

  const hydrateAfterAuth = useCallback(async (key, name = '', options = {}) => {
    const { isNewAccount = false } = options
    let cloud = await fetchAppData()
    const localAnnual = loadAnnualFromLocal()
    const cloudAnnual = cloud?.annual_data
    const mergedAnnual = mergeAnnualData(localAnnual, cloudAnnual)
    const annualNeedsPush =
      JSON.stringify(mergedAnnual) !==
      JSON.stringify(withDefaultAnnual(cloudAnnual))
    cloud = { ...cloud, annual_data: mergedAnnual }

    if (isCloudEmpty({ ...cloud, annual_data: cloudAnnual }) && hasLocalData()) {
      const annual_data = mergedAnnual
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
    } else if (annualNeedsPush) {
      // Local annual had content cloud was missing — push merged result.
      cloud = {
        ...(await persistAppData({ annual_data: mergedAnnual })),
        annual_data: mergedAnnual,
      }
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
    applyCloudSnapshot(cloud, key)
    setPullGeneration((value) => value + 1)
    lastPullAtRef.current = Date.now()
    setError('')
  }, [applyCloudSnapshot])

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
        saveAnnualToLocal(withDefaultAnnual(data.annual_data))
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
  }, [cloudEnabled, localOnly, userKey])

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

  const pullFromCloud = useCallback(
    async () => {
      if (
        !cloudEnabled ||
        localOnly ||
        !userKey ||
        userKey === GUEST_USER_KEY ||
        pullInFlightRef.current
      ) {
        return { ok: false }
      }

      pullInFlightRef.current = true

      if (saveTimerRef.current) {
        clearTimeout(saveTimerRef.current)
        saveTimerRef.current = null
      }

      await flushSave()

      setSyncing(true)
      try {
        const cloud = await fetchAppData()
        const localWeekly = loadWeeklyFromLocal()
        const cloudWeekly = cloud?.weekly_data || {}
        const mergedWeekly = mergeWeeklyData(localWeekly, cloudWeekly)
        const localAnnual = loadAnnualFromLocal()
        const cloudAnnual = cloud?.annual_data
        const mergedAnnual = mergeAnnualData(localAnnual, cloudAnnual)
        applyCloudSnapshot(
          { ...cloud, weekly_data: mergedWeekly, annual_data: mergedAnnual },
          userKey,
        )
        const patch = {}
        if (JSON.stringify(mergedWeekly) !== JSON.stringify(cloudWeekly)) {
          patch.weekly_data = mergedWeekly
        }
        if (
          JSON.stringify(mergedAnnual) !==
          JSON.stringify(withDefaultAnnual(cloudAnnual))
        ) {
          patch.annual_data = mergedAnnual
        }
        if (Object.keys(patch).length > 0) {
          scheduleSave(patch)
        }
        setPullGeneration((value) => value + 1)
        lastPullAtRef.current = Date.now()
        setError('')
        return { ok: true }
      } catch (err) {
        setError(err instanceof Error ? err.message : '동기화 실패')
        return { ok: false }
      } finally {
        setSyncing(false)
        pullInFlightRef.current = false
      }
    },
    [applyCloudSnapshot, cloudEnabled, flushSave, localOnly, scheduleSave, userKey],
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
        syncWeeklyTodayRoute()
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
    finishLocalSession(LOCAL_USER_KEY, sessionNickname(LOCAL_USER_KEY))
    setLoading(false)
  }, [finishLocalSession])

  const useGuestMode = useCallback(() => {
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current)
    pendingSaveRef.current = {}

    const fresh = resetGuestLocalData(GUEST_USER_KEY)

    setLocalOnly(true)
    saveUserKey(GUEST_USER_KEY)
    setUserKey(GUEST_USER_KEY)
    setNickname(sessionNickname(GUEST_USER_KEY))
    setAnnualData(withDefaultAnnual(fresh.annualData))
    setWeeklyData(fresh.weeklyData)
    setHabitData(fresh.habitData)
    setMandalaData(fresh.mandalaData)
    setMonthlyData(fresh.monthlyData)
    setMemoryData(fresh.memoryData)

    syncWeeklyTodayRoute()

    setReady(true)
    setError('')
    setLoading(false)
  }, [])

  const logout = useCallback(async () => {
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current)
    pendingSaveRef.current = {}

    const wasCloudSession = cloudEnabled && !localOnly
    const sessionKey = userKey

    if (wasCloudSession) {
      await signOutAccount()
      clearHabitData()
      if (sessionKey) clearMemoryData(sessionKey)
    } else if (sessionKey === GUEST_USER_KEY) {
      clearMemoryData(GUEST_USER_KEY)
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

      if (!cloudEnabled || saved === LOCAL_USER_KEY || saved === GUEST_USER_KEY) {
        if (
          saved === LOCAL_USER_KEY ||
          saved === GUEST_USER_KEY ||
          (!cloudEnabled && saved)
        ) {
          setLocalOnly(true)
          finishLocalSession(saved, sessionNickname(saved))
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
          if (!new URLSearchParams(window.location.search).get('view')) {
            syncWeeklyTodayRoute()
          }
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

  useEffect(() => {
    if (
      !ready ||
      localOnly ||
      !cloudEnabled ||
      !userKey ||
      userKey === GUEST_USER_KEY
    ) {
      return undefined
    }

    const tryAutoPull = () => {
      if (document.visibilityState !== 'visible') return
      if (Date.now() - lastPullAtRef.current < AUTO_PULL_INTERVAL_MS) return
      void pullFromCloud()
    }

    document.addEventListener('visibilitychange', tryAutoPull)
    const interval = window.setInterval(tryAutoPull, AUTO_PULL_INTERVAL_MS)

    return () => {
      document.removeEventListener('visibilitychange', tryAutoPull)
      window.clearInterval(interval)
    }
  }, [cloudEnabled, localOnly, pullFromCloud, ready, userKey])

  const updateAnnual = useCallback(
    (nextAnnual) => {
      setAnnualData((prev) => {
        const next = stampAnnualChanges(prev, nextAnnual)
        scheduleSave({ annual_data: next })
        return next
      })
    },
    [scheduleSave],
  )

  const updateWeekly = useCallback(
    (updater) => {
      setWeeklyData((prev) => {
        const rawNext = typeof updater === 'function' ? updater(prev) : updater
        const next = stampWeeklyChanges(prev, rawNext)
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
      useGuestMode,
      updateAnnual,
      updateWeekly,
      updateHabitData,
      updateMandala,
      updateMonthly,
      updateMemory,
      pullFromCloud,
      pullGeneration,
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
      useGuestMode,
      updateAnnual,
      updateWeekly,
      updateHabitData,
      updateMandala,
      updateMonthly,
      updateMemory,
      pullFromCloud,
      pullGeneration,
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
