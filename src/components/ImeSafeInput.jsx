import { forwardRef, useEffect, useRef, useState } from 'react'

export const ImeSafeInput = forwardRef(function ImeSafeInput(
  { value, onChange, onCompositionEnd, ...props },
  ref,
) {
  const composingRef = useRef(false)
  const [localValue, setLocalValue] = useState(value)

  useEffect(() => {
    if (!composingRef.current) {
      setLocalValue(value)
    }
  }, [value])

  return (
    <input
      {...props}
      ref={ref}
      value={localValue}
      onCompositionStart={(event) => {
        composingRef.current = true
        props.onCompositionStart?.(event)
      }}
      onCompositionEnd={(event) => {
        composingRef.current = false
        const next = event.currentTarget.value
        setLocalValue(next)
        onChange?.(next)
        onCompositionEnd?.(event)
      }}
      onChange={(event) => {
        const next = event.target.value
        setLocalValue(next)
        if (!composingRef.current) {
          onChange?.(next)
        }
      }}
    />
  )
})
