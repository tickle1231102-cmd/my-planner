import { PILLARS } from '../content.js'

function FlowDiagram({ variant }) {
  if (variant === 'timeline') {
    return (
      <div className="flex items-center justify-center gap-2 sm:gap-3">
        {['Year', 'Month', 'Week'].map((node, i) => (
          <div key={node} className="flex items-center gap-2 sm:gap-3">
            <div className="rounded-xl border border-planner-sage/30 bg-planner-sage-light px-3 py-2 text-xs font-medium text-planner-sage sm:px-4 sm:text-sm">
              {node}
            </div>
            {i < 2 && <span className="text-planner-sage-muted">→</span>}
          </div>
        ))}
      </div>
    )
  }

  if (variant === 'mandala') {
    return (
      <div className="mx-auto grid w-fit grid-cols-3 gap-1">
        {Array.from({ length: 9 }, (_, i) => (
          <div
            key={i}
            className={[
              'size-8 rounded sm:size-10',
              i === 4 ? 'bg-planner-sage' : 'bg-planner-warm',
            ].join(' ')}
          />
        ))}
      </div>
    )
  }

  return (
    <div className="mx-auto flex max-w-xs flex-col gap-2">
      {['Mon', 'Wed', 'Fri'].map((d, i) => (
        <div key={d} className="flex items-center gap-2">
          <span className="w-8 text-xs text-planner-ink-muted">{d}</span>
          <div
            className="h-2 flex-1 rounded-full bg-planner-sage"
            style={{ width: `${60 + i * 15}%` }}
          />
        </div>
      ))}
    </div>
  )
}

export function PillarsSection() {
  const diagrams = ['timeline', 'mandala', 'habit']

  return (
    <section className="bg-planner-cream py-16 sm:py-24">
      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        <div className="mx-auto max-w-2xl text-center">
          <h2 className="text-2xl font-medium text-planner-ink sm:text-3xl">
            Focal이 다른 이유
          </h2>
        </div>

        <div className="mt-14 space-y-6">
          {PILLARS.map((pillar, index) => (
            <div
              key={pillar.step}
              className={[
                'grid items-center gap-8 rounded-2xl border border-planner-sand bg-white p-6 shadow-soft sm:p-8 lg:grid-cols-2',
                pillar.align === 'right' && 'lg:[&>*:first-child]:order-2',
              ].join(' ')}
            >
              <div>
                <span className="text-xs font-medium tracking-widest text-planner-sage">
                  {pillar.step}
                </span>
                <h3 className="mt-2 text-xl font-medium text-planner-ink">{pillar.title}</h3>
                <p className="mt-3 text-sm leading-relaxed text-planner-ink-muted sm:text-base">
                  {pillar.description}
                </p>
              </div>
              <div className="flex min-h-[120px] items-center justify-center rounded-xl bg-planner-warm/50 p-6">
                <FlowDiagram variant={diagrams[index]} />
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
