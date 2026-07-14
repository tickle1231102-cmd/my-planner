import { useCallback, useEffect, useRef, useState } from 'react'

const PULL_THRESHOLD = 64
const MAX_PULL = 96

function useMobilePullEnabled() {
  const [enabled, setEnabled] = useState(
    () =>
      typeof window !== 'undefined' &&
      window.matchMedia('(max-width: 1023px)').matches,
  )

  useEffect(() => {
    const media = window.matchMedia('(max-width: 1023px)')
    const onChange = () => setEnabled(media.matches)
    media.addEventListener('change', onChange)
    return () => media.removeEventListener('change', onChange)
  }, [])

  return enabled
}

export function PullToRefresh({
  children,
  onRefresh,
  disabled = false,
  className = '',
}) {
  const mobilePullEnabled = useMobilePullEnabled()
  const inactive = disabled || !mobilePullEnabled
  const scrollRef = useRef(null)
  const touchStartYRef = useRef(0)
  const pullingRef = useRef(false)
  const refreshingRef = useRef(false)

  const [pullDistance, setPullDistance] = useState(0)
  const [refreshing, setRefreshing] = useState(false)

  const canPull = useCallback(() => {
    const el = scrollRef.current
    if (!el || inactive || refreshingRef.current) return false
    return el.scrollTop <= 0
  }, [inactive])

  const handleTouchStart = useCallback(
    (event) => {
      if (inactive || event.touches.length !== 1) return
      if (!canPull()) return
      touchStartYRef.current = event.touches[0].clientY
      pullingRef.current = true
    },
    [canPull, inactive],
  )

  const handleTouchMove = useCallback(
    (event) => {
      if (!pullingRef.current || inactive || event.touches.length !== 1) return
      if (!canPull()) {
        setPullDistance(0)
        return
      }

      const delta = event.touches[0].clientY - touchStartYRef.current
      if (delta <= 0) {
        setPullDistance(0)
        return
      }

      event.preventDefault()
      setPullDistance(Math.min(delta * 0.45, MAX_PULL))
    },
    [canPull, inactive],
  )

  const finishPull = useCallback(async () => {
    if (!pullingRef.current) return
    pullingRef.current = false

    const shouldRefresh = pullDistance >= PULL_THRESHOLD
    setPullDistance(0)

    if (!shouldRefresh || inactive || refreshingRef.current) return

    refreshingRef.current = true
    setRefreshing(true)
    try {
      await onRefresh?.()
    } finally {
      refreshingRef.current = false
      setRefreshing(false)
    }
  }, [inactive, onRefresh, pullDistance])

  const handleTouchEnd = useCallback(() => {
    void finishPull()
  }, [finishPull])

  const handleTouchCancel = useCallback(() => {
    pullingRef.current = false
    setPullDistance(0)
  }, [])

  if (inactive) {
    return (
      <div className={className} data-planner-main="">
        {children}
      </div>
    )
  }

  const indicatorHeight = refreshing ? 44 : pullDistance
  const ready = pullDistance >= PULL_THRESHOLD

  return (
    <div
      ref={scrollRef}
      data-planner-main=""
      className={[
        'relative min-h-0 overscroll-y-contain touch-pan-y',
        className,
      ]
        .filter(Boolean)
        .join(' ')}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
      onTouchCancel={handleTouchCancel}
    >
      <div
        className="pointer-events-none flex items-end justify-center overflow-hidden text-xs font-medium text-planner-sage transition-[height] duration-150"
        style={{ height: indicatorHeight }}
        aria-hidden={!refreshing && pullDistance === 0}
      >
        {refreshing ? (
          <span className="pb-2">동기화 중…</span>
        ) : pullDistance > 0 ? (
          <span className="pb-2">{ready ? '놓으면 동기화' : '당겨서 동기화'}</span>
        ) : null}
      </div>
      {children}
    </div>
  )
}
