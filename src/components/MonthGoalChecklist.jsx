import { useRef } from 'react'

function GoalCheckbox({ checked, onChange, micro = false }) {
  return (
    <button
      type="button"
      role="checkbox"
      aria-checked={checked}
      onClick={() => onChange(!checked)}
      className={[
        'flex shrink-0 items-center justify-center border transition',
        micro
          ? 'mt-0.5 size-2 sm:size-3'
          : 'size-3.5',
        checked
          ? 'border-planner-sage bg-planner-sage'
          : 'border-dashed border-planner-ink-muted/50 bg-white',
      ].join(' ')}
    >
      {checked && (
        <svg
          viewBox="0 0 12 12"
          className={micro ? 'size-1.5 text-white sm:size-2' : 'size-2.5 text-white'}
          fill="none"
          aria-hidden
        >
          <path
            d="M2.5 6.2 4.8 8.5 9.5 3.5"
            stroke="currentColor"
            strokeWidth="1.6"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      )}
    </button>
  )
}

function MonthGoalRow({ goal, onText, onToggle, compact, micro, placeholder }) {
  const composingRef = useRef(false)

  return (
    <div
      className={[
        'flex border-b border-planner-sand/70 last:border-b-0',
        micro ? 'items-start gap-0.5 sm:gap-1' : 'items-center',
        compact || micro ? '' : 'min-h-[28px]',
      ].join(' ')}
    >
      <GoalCheckbox
        checked={goal.done}
        onChange={(done) => onToggle({ done })}
        micro={micro}
      />
      <input
        type="text"
        value={goal.text}
        onChange={(e) => onText(e.target.value)}
        onCompositionStart={() => {
          composingRef.current = true
        }}
        onCompositionEnd={() => {
          composingRef.current = false
        }}
        placeholder={placeholder}
        className={[
          'min-w-0 flex-1 border-0 bg-transparent text-planner-ink focus:outline-none',
          micro
            ? 'px-0 py-0 text-[5px] leading-snug sm:px-1 sm:text-[10px] lg:text-xs lg:leading-relaxed'
            : compact
              ? 'px-1.5 py-1 text-[10px] sm:text-[11px]'
              : 'px-1.5 py-1 text-xs leading-relaxed',
          goal.done && 'text-planner-ink-muted/70 line-through',
        ]
          .filter(Boolean)
          .join(' ')}
      />
    </div>
  )
}

export default function MonthGoalChecklist({
  goals,
  onUpdateGoal,
  compact = false,
  micro = false,
  className = '',
  placeholder = '월간 목표',
}) {
  return (
    <div className={className}>
      {goals.map((goal) => (
        <MonthGoalRow
          key={goal.id}
          goal={goal}
          compact={compact}
          micro={micro}
          placeholder={placeholder}
          onText={(text) => onUpdateGoal(goal.id, { text })}
          onToggle={(updates) => onUpdateGoal(goal.id, updates)}
        />
      ))}
    </div>
  )
}
