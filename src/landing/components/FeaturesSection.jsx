import { useState } from 'react'
import { FEATURES } from '../content.js'
import { MockPreview } from './MockPreview.jsx'

export function FeaturesSection() {
  const [activeId, setActiveId] = useState(FEATURES[0].id)
  const active = FEATURES.find((f) => f.id === activeId) ?? FEATURES[0]

  return (
    <section id="features" className="scroll-mt-20 bg-white py-16 sm:py-24">
      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        <div className="mx-auto max-w-2xl text-center">
          <h2 className="text-2xl font-medium text-planner-ink sm:text-3xl">
            모든 플래닝, 한 곳에서
          </h2>
          <p className="mt-3 text-planner-ink-muted">
            연간 설계부터 일상 기록까지 7가지 모듈
          </p>
        </div>

        <div className="mt-10 hidden flex-wrap justify-center gap-2 lg:flex">
          {FEATURES.map((feature) => (
            <button
              key={feature.id}
              type="button"
              onClick={() => setActiveId(feature.id)}
              className={[
                'rounded-full px-4 py-2 text-sm transition',
                activeId === feature.id
                  ? 'bg-planner-sage text-white'
                  : 'bg-planner-warm text-planner-ink-muted hover:text-planner-ink',
              ].join(' ')}
            >
              {feature.label}
            </button>
          ))}
        </div>

        <div className="mt-8 hidden grid-cols-2 gap-10 lg:grid lg:items-center">
          <div>
            <h3 className="text-2xl font-medium text-planner-ink">{active.title}</h3>
            <p className="mt-3 leading-relaxed text-planner-ink-muted">{active.description}</p>
            <ul className="mt-6 space-y-2">
              {active.bullets.map((bullet) => (
                <li key={bullet} className="flex items-start gap-2 text-sm text-planner-ink">
                  <span className="mt-1 size-1.5 shrink-0 rounded-full bg-planner-sage" />
                  {bullet}
                </li>
              ))}
            </ul>
            <p className="mt-6 text-sm text-planner-ink-muted">
              <span className="font-medium text-planner-sage">이런 분에게 → </span>
              {active.audience}
            </p>
          </div>
          <MockPreview type={active.preview} />
        </div>

        <div className="mt-8 space-y-3 lg:hidden">
          {FEATURES.map((feature) => {
            const open = activeId === feature.id
            return (
              <div
                key={feature.id}
                className="overflow-hidden rounded-2xl border border-planner-sand bg-planner-cream/30"
              >
                <button
                  type="button"
                  onClick={() => setActiveId(open ? '' : feature.id)}
                  className="flex w-full items-center justify-between px-4 py-4 text-left"
                >
                  <span className="font-medium text-planner-ink">{feature.label}</span>
                  <span className="text-planner-sage">{open ? '−' : '+'}</span>
                </button>
                {open && (
                  <div className="border-t border-planner-sand px-4 pb-4">
                    <h3 className="mt-3 font-medium text-planner-ink">{feature.title}</h3>
                    <p className="mt-2 text-sm text-planner-ink-muted">{feature.description}</p>
                    <div className="mt-4">
                      <MockPreview type={feature.preview} />
                    </div>
                    <ul className="mt-4 space-y-1.5">
                      {feature.bullets.map((bullet) => (
                        <li key={bullet} className="text-sm text-planner-ink-muted">
                          · {bullet}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      </div>
    </section>
  )
}
