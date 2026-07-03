export function HelpIcon({ className = 'size-5' }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden
    >
      <circle cx="12" cy="12" r="9" />
      <path d="M9.5 9.25a2.75 2.75 0 1 1 4.8 1.85c-.95.7-1.55 1.35-1.55 2.4" />
      <path d="M12 17.25h.01" />
    </svg>
  )
}
