import { useEffect, useRef, useState } from 'react'
import {
  DAY_LABELS,
  TIMETABLE_HOURS,
  TIMETABLE_MINUTES,
  createRoutineId,
  defaultRoutineDraft,
  formatRoutineDays,
  formatRoutineRange,
  parseDateKey,
} from '../lib/timetableRoutines.js'
import {
  TIMETABLE_COLOR_BY_ID,
  TIMETABLE_PAINT_COLORS,
} from '../lib/timetableColors.js'
import { TimetableRoutineIcon } from './TimetableRoutineIcon.jsx'

function minuteToSlot(minute) {
  return Math.floor(minute / 10)
}

function slotToMinute(slot) {
  return slot * 10
}

function toggleDraftDay(draft, dayIdx) {
  const selected = new Set(draft.daysOfWeek)
  if (selected.has(dayIdx)) {
    if (selected.size === 1) return draft
    selected.delete(dayIdx)
  } else {
    selected.add(dayIdx)
  }
  return {
    ...draft,
    daysOfWeek: [...selected].sort((a, b) => a - b),
  }
}

function RoutineForm({ draft, onChange, onSubmit, submitLabel }) {
  return (
    <form
      className="space-y-3 rounded-xl border border-planner-sand bg-planner-warm/35 p-3"
      onSubmit={(event) => {
        event.preventDefault()
        onSubmit()
      }}
    >
      <div>
        <p className="mb-1.5 text-[10px] font-medium text-planner-ink-muted">요일</p>
        <div className="flex flex-wrap gap-1">
          {DAY_LABELS.map((label, dayIdx) => (
            <button
              key={label}
              type="button"
              onClick={() => onChange(toggleDraftDay(draft, dayIdx))}
              className={[
                'min-w-[30px] rounded-md px-2 py-1 text-[11px] font-medium transition',
                draft.daysOfWeek.includes(dayIdx)
                  ? 'bg-planner-sage text-white'
                  : 'bg-white text-planner-ink-muted hover:bg-planner-sand/60',
              ].join(' ')}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-2">
        <div>
          <p className="mb-1 text-[10px] font-medium text-planner-ink-muted">시작</p>
          <div className="flex gap-1">
            <select
              value={draft.startHour}
              onChange={(event) =>
                onChange({ ...draft, startHour: Number(event.target.value) })
              }
              className="min-w-0 flex-1 rounded-md border border-planner-sand bg-white px-2 py-1.5 text-xs text-planner-ink"
            >
              {TIMETABLE_HOURS.map((hour) => (
                <option key={`start-hour-${hour}`} value={hour}>
                  {String(hour).padStart(2, '0')}시
                </option>
              ))}
            </select>
            <select
              value={slotToMinute(draft.startSlot)}
              onChange={(event) =>
                onChange({
                  ...draft,
                  startSlot: minuteToSlot(Number(event.target.value)),
                })
              }
              className="min-w-0 flex-1 rounded-md border border-planner-sand bg-white px-2 py-1.5 text-xs text-planner-ink"
            >
              {TIMETABLE_MINUTES.map((minute) => (
                <option key={`start-minute-${minute}`} value={minute}>
                  {String(minute).padStart(2, '0')}분
                </option>
              ))}
            </select>
          </div>
        </div>

        <div>
          <p className="mb-1 text-[10px] font-medium text-planner-ink-muted">종료</p>
          <div className="flex gap-1">
            <select
              value={draft.endHour}
              onChange={(event) =>
                onChange({ ...draft, endHour: Number(event.target.value) })
              }
              className="min-w-0 flex-1 rounded-md border border-planner-sand bg-white px-2 py-1.5 text-xs text-planner-ink"
            >
              {TIMETABLE_HOURS.map((hour) => (
                <option key={`end-hour-${hour}`} value={hour}>
                  {String(hour).padStart(2, '0')}시
                </option>
              ))}
            </select>
            <select
              value={slotToMinute(draft.endSlot)}
              onChange={(event) =>
                onChange({
                  ...draft,
                  endSlot: minuteToSlot(Number(event.target.value)),
                })
              }
              className="min-w-0 flex-1 rounded-md border border-planner-sand bg-white px-2 py-1.5 text-xs text-planner-ink"
            >
              {TIMETABLE_MINUTES.map((minute) => (
                <option key={`end-minute-${minute}`} value={minute}>
                  {String(minute).padStart(2, '0')}분
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      <div>
        <p className="mb-1 text-[10px] font-medium text-planner-ink-muted">반복 종료일</p>
        <input
          type="date"
          value={draft.repeatUntil}
          min={draft.repeatFrom}
          onChange={(event) => onChange({ ...draft, repeatUntil: event.target.value })}
          className="w-full rounded-md border border-planner-sand bg-white px-2 py-1.5 text-xs text-planner-ink"
        />
      </div>

      <div>
        <p className="mb-1.5 text-[10px] font-medium text-planner-ink-muted">색상</p>
        <div className="flex flex-wrap gap-1.5">
          {TIMETABLE_PAINT_COLORS.map((color) => (
            <button
              key={color.id}
              type="button"
              onClick={() => onChange({ ...draft, colorId: color.id })}
              aria-label={`루틴 색상: ${color.id}`}
              aria-pressed={draft.colorId === color.id}
              className={[
                'size-5 rounded-full border border-white/80 shadow-sm transition',
                color.swatch,
                draft.colorId === color.id
                  ? 'ring-2 ring-planner-ink/25 ring-offset-1'
                  : 'opacity-90 hover:opacity-100',
              ].join(' ')}
            />
          ))}
        </div>
      </div>

      <button
        type="submit"
        className="w-full rounded-lg bg-planner-sage px-3 py-2 text-xs font-semibold text-white transition hover:bg-planner-sage/90"
      >
        {submitLabel}
      </button>
    </form>
  )
}

export default function TimetableRoutinePanel({ routines, onChange, onClose }) {
  const panelRef = useRef(null)
  const [draft, setDraft] = useState(() => defaultRoutineDraft())

  useEffect(() => {
    const handlePointer = (event) => {
      if (panelRef.current?.contains(event.target)) return
      onClose()
    }

    const handleKey = (event) => {
      if (event.key === 'Escape') onClose()
    }

    const pointerTimer = window.setTimeout(() => {
      window.addEventListener('pointerdown', handlePointer)
    }, 120)

    window.addEventListener('keydown', handleKey)

    return () => {
      window.clearTimeout(pointerTimer)
      window.removeEventListener('pointerdown', handlePointer)
      window.removeEventListener('keydown', handleKey)
    }
  }, [onClose])

  const addRoutine = () => {
    const repeatUntil = parseDateKey(draft.repeatUntil)
    const repeatFrom = parseDateKey(draft.repeatFrom)
    if (!repeatUntil || !repeatFrom || repeatUntil < repeatFrom) return
    if (!draft.daysOfWeek.length) return

    onChange([
      ...routines,
      {
        id: createRoutineId(),
        ...draft,
        daysOfWeek: [...draft.daysOfWeek],
      },
    ])
    setDraft(defaultRoutineDraft())
  }

  const removeRoutine = (routineId) => {
    onChange(routines.filter((routine) => routine.id !== routineId))
  }

  return (
    <div className="fixed inset-0 z-[80] flex items-end justify-center bg-planner-ink/20 p-3 sm:items-center">
      <div
        ref={panelRef}
        className="flex max-h-[min(88vh,720px)] w-full max-w-md flex-col overflow-hidden rounded-2xl border border-planner-sand bg-white shadow-soft"
        role="dialog"
        aria-labelledby="timetable-routine-title"
      >
        <div className="flex items-center gap-2 border-b border-planner-sand px-4 py-3">
          <span className="text-planner-sage">
            <TimetableRoutineIcon className="size-4" />
          </span>
          <div className="min-w-0 flex-1">
            <h2 id="timetable-routine-title" className="text-sm font-semibold text-planner-ink">
              반복 루틴
            </h2>
            <p className="text-[11px] text-planner-ink-muted">
              요일·시간·색상을 설정하면 타임테이블에 자동 반영됩니다.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="닫기"
            className="rounded-md px-2 py-1 text-sm text-planner-ink-muted transition hover:bg-planner-warm"
          >
            ✕
          </button>
        </div>

        <div className="scrollbar-thin space-y-3 overflow-y-auto px-4 py-3">
          {routines.length > 0 ? (
            <ul className="space-y-2">
              {routines.map((routine) => {
                const color = TIMETABLE_COLOR_BY_ID[routine.colorId]
                return (
                  <li
                    key={routine.id}
                    className="flex items-center gap-2 rounded-xl border border-planner-sand bg-planner-warm/25 px-3 py-2"
                  >
                    <span
                      className={[
                        'size-3 shrink-0 rounded-full border border-white/80',
                        color?.swatch || 'bg-planner-sage',
                      ].join(' ')}
                      aria-hidden
                    />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-xs font-medium text-planner-ink">
                        {formatRoutineDays(routine.daysOfWeek)} {formatRoutineRange(routine)}
                      </p>
                      <p className="text-[10px] text-planner-ink-muted">
                        ~ {routine.repeatUntil.replaceAll('-', '.')}
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => removeRoutine(routine.id)}
                      className="shrink-0 rounded-md px-2 py-1 text-[11px] text-planner-rose transition hover:bg-planner-rose-light"
                    >
                      삭제
                    </button>
                  </li>
                )
              })}
            </ul>
          ) : (
            <p className="rounded-xl border border-dashed border-planner-sand px-3 py-4 text-center text-xs text-planner-ink-muted">
              등록된 반복 루틴이 없습니다.
            </p>
          )}

          <RoutineForm
            draft={draft}
            onChange={setDraft}
            onSubmit={addRoutine}
            submitLabel="루틴 추가"
          />
        </div>
      </div>
    </div>
  )
}
