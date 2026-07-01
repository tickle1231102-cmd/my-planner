import { CalendarIcon } from './CalendarIcon.jsx'

function NavCircle({ label, active, onClick, ariaLabel }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={ariaLabel}
      aria-current={active ? 'page' : undefined}
      className={[
        'flex size-7 shrink-0 items-center justify-center rounded-full border text-[11px] font-semibold leading-none transition',
        active
          ? 'border-planner-sage bg-planner-sage text-white'
          : 'border-planner-sand bg-white text-planner-sage hover:border-planner-sage-muted hover:bg-planner-sage-light',
      ].join(' ')}
    >
      {label}
    </button>
  )
}

export function PlannerQuickNav({
  activeView,
  showCalendar = true,
  onYearOverview,
  onYearPlanner,
  onMonthly,
  onWeekly,
}) {
  return (
    <div className="flex shrink-0 items-center gap-1">
      {showCalendar && (
        <button
          type="button"
          onClick={onYearOverview}
          aria-label="연간 캘린더 보기"
          aria-current={activeView === 'yearOverview' ? 'page' : undefined}
          className={[
            'flex size-7 shrink-0 items-center justify-center rounded-full border transition',
            activeView === 'yearOverview'
              ? 'border-planner-sage bg-planner-sage text-white'
              : 'border-planner-sand bg-white text-planner-sage hover:border-planner-sage-muted hover:bg-planner-sage-light',
          ].join(' ')}
        >
          <CalendarIcon className="size-4" />
        </button>
      )}
      <NavCircle
        label="Y"
        active={activeView === 'yearly'}
        onClick={onYearPlanner}
        ariaLabel="연간 플래너"
      />
      <NavCircle
        label="M"
        active={activeView === 'monthly'}
        onClick={onMonthly}
        ariaLabel="월간 플래너"
      />
      <NavCircle
        label="W"
        active={activeView === 'weekly'}
        onClick={onWeekly}
        ariaLabel="위클리 플래너"
      />
    </div>
  )
}
