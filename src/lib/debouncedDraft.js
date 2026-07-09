import { useCallback, useEffect, useRef, useState } from 'react'

export const DRAFT_DEBOUNCE_MS = 400

export function useDebouncedDraft(initialValue, commit, { debounceMs = DRAFT_DEBOUNCE_MS, resetKey } = {}) {
  const [draft, setDraft] = useState(initialValue)
  const draftRef = useRef(draft)
  const commitRef = useRef(commit)
  const timerRef = useRef(null)
  const dirtyRef = useRef(false)
  const resetKeyRef = useRef(resetKey)

  commitRef.current = commit
  draftRef.current = draft

  const flush = useCallback(() => {
    if (timerRef.current) {
      clearTimeout(timerRef.current)
      timerRef.current = null
    }
    if (!dirtyRef.current) return
    dirtyRef.current = false
    commitRef.current(draftRef.current)
  }, [])

  const schedule = useCallback(() => {
    if (timerRef.current) clearTimeout(timerRef.current)
    timerRef.current = setTimeout(flush, debounceMs)
  }, [debounceMs, flush])

  useEffect(() => {
    if (resetKeyRef.current !== resetKey) {
      flush()
      resetKeyRef.current = resetKey
      dirtyRef.current = false
      setDraft(initialValue)
      draftRef.current = initialValue
      return
    }

    if (!dirtyRef.current) {
      setDraft(initialValue)
      draftRef.current = initialValue
    }
  }, [flush, initialValue, resetKey])

  useEffect(() => () => flush(), [flush])

  const setDraftValue = useCallback(
    (updater) => {
      setDraft((prev) => {
        const next = typeof updater === 'function' ? updater(prev) : updater
        draftRef.current = next
        dirtyRef.current = true
        schedule()
        return next
      })
    },
    [schedule],
  )

  return [draft, setDraftValue, flush]
}
