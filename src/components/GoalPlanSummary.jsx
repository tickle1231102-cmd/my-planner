function SummaryItem({ title, body, meta }) {
  if (!body?.trim()) return null
  return (
    <li className="rounded-lg border border-planner-sage/20 bg-planner-sage-light/30 px-2.5 py-2">
      <p className="truncate text-[11px] font-medium text-planner-sage">{title}</p>
      {meta && (
        <p className="mt-0.5 text-[10px] text-planner-ink-muted">{meta}</p>
      )}
      <p className="mt-1 text-xs leading-relaxed text-planner-ink">{body}</p>
    </li>
  )
}

export default function GoalPlanSummary({
  title = 'AI Plan',
  items = [],
  weeklyItems = [],
  compact = false,
  className = '',
}) {
  const hasContent = items.length > 0 || weeklyItems.length > 0
  if (!hasContent) return null

  return (
    <section
      className={[
        'rounded-xl border border-planner-sage/25 bg-planner-sage-light/15',
        compact ? 'px-2 py-2' : 'px-3 py-3',
        className,
      ].join(' ')}
    >
      <h3
        className={[
          'font-semibold tracking-wide text-planner-sage',
          compact ? 'mb-1.5 text-[10px]' : 'mb-2 text-xs',
        ].join(' ')}
      >
        {title}
      </h3>
      <ul className={compact ? 'space-y-1.5' : 'space-y-2'}>
        {items.map((item) => (
          <SummaryItem
            key={item.goalId + (item.theme || item.summary || '')}
            title={item.title}
            body={item.theme || item.summary || item.focusGoal}
            meta={item.meta}
          />
        ))}
        {weeklyItems.map((item) => (
          <SummaryItem
            key={`${item.goalId}-${item.weekNumber}`}
            title={item.title}
            body={item.focusGoal}
            meta={`${item.weekNumber}주차`}
          />
        ))}
      </ul>
    </section>
  )
}
