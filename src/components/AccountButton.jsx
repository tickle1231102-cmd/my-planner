import { PersonIcon } from './PersonIcon.jsx'

export function AccountButton({ onClick, className = '' }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label="회원 정보"
      title="회원 정보"
      className={[
        'flex size-9 items-center justify-center rounded-full border border-planner-sand text-planner-ink-muted transition hover:border-planner-sage-muted hover:bg-planner-sage-light hover:text-planner-sage',
        className,
      ].join(' ')}
    >
      <PersonIcon className="size-4" />
    </button>
  )
}
