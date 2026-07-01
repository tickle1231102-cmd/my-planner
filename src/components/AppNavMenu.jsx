import { useEffect, useRef, useState } from 'react'
import { MenuIcon } from './MenuIcon.jsx'

const NAV_ITEMS = [
  { id: 'yearly', label: 'Yearly' },
  { id: 'monthly', label: 'Monthly' },
  { id: 'weekly', label: 'Weekly' },
  { id: 'mandala', label: '만다라트' },
  { id: 'habit', label: 'Habit Tracker' },
]

export function AppNavMenu({ activeItem, onNavigate }) {
  const [open, setOpen] = useState(false)
  const rootRef = useRef(null)

  useEffect(() => {
    if (!open) return

    const handlePointerDown = (event) => {
      if (!rootRef.current?.contains(event.target)) {
        setOpen(false)
      }
    }

    const handleKeyDown = (event) => {
      if (event.key === 'Escape') {
        setOpen(false)
      }
    }

    document.addEventListener('mousedown', handlePointerDown)
    document.addEventListener('keydown', handleKeyDown)

    return () => {
      document.removeEventListener('mousedown', handlePointerDown)
      document.removeEventListener('keydown', handleKeyDown)
    }
  }, [open])

  const handleSelect = (id) => {
    setOpen(false)
    onNavigate(id)
  }

  return (
    <div ref={rootRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        aria-label="메뉴"
        aria-expanded={open}
        aria-haspopup="menu"
        className={[
          'rounded-lg p-1.5 transition',
          open
            ? 'bg-planner-sage text-white'
            : 'text-planner-sage hover:bg-planner-sage-light',
        ].join(' ')}
      >
        <MenuIcon className="size-5" />
      </button>

      {open && (
        <div
          role="menu"
          className="absolute left-0 top-full z-50 mt-1 min-w-[168px] overflow-hidden rounded-xl border border-planner-sand bg-white py-1 shadow-soft"
        >
          {NAV_ITEMS.map((item) => (
            <button
              key={item.id}
              type="button"
              role="menuitem"
              onClick={() => handleSelect(item.id)}
              className={[
                'flex w-full px-4 py-2.5 text-left text-sm text-planner-ink transition hover:bg-planner-warm',
                activeItem === item.id && 'bg-planner-sage-light/60 font-medium text-planner-sage',
              ]
                .filter(Boolean)
                .join(' ')}
            >
              {item.label}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
