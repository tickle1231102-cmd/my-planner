import { useState } from 'react'
import { APP_URL, FAQ_ITEMS } from '../content.js'

export function FaqSection() {
  const [openIndex, setOpenIndex] = useState(null)

  return (
    <section id="faq" className="scroll-mt-20 bg-planner-warm py-16 sm:py-24">
      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        <div className="mx-auto max-w-2xl text-center">
          <h2 className="text-2xl font-medium text-planner-ink sm:text-3xl">자주 묻는 질문</h2>
        </div>

        <div className="mx-auto mt-12 grid max-w-4xl items-start gap-3 sm:grid-cols-2">
          {FAQ_ITEMS.map((item, index) => {
            const open = openIndex === index
            return (
              <div
                key={item.question}
                className="overflow-hidden rounded-xl border border-planner-sand bg-white shadow-soft"
              >
                <button
                  type="button"
                  onClick={() => setOpenIndex(open ? null : index)}
                  className="flex w-full items-start justify-between gap-3 px-4 py-4 text-left sm:px-5"
                >
                  <span className="text-sm font-medium text-planner-ink">{item.question}</span>
                  <span className="shrink-0 text-planner-sage">{open ? '−' : '+'}</span>
                </button>
                {open && (
                  <div className="border-t border-planner-sand px-4 pb-4 pt-2 sm:px-5">
                    <p className="text-sm leading-relaxed text-planner-ink-muted">{item.answer}</p>
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

export function LandingFooter() {
  return (
    <footer className="bg-planner-ink pb-24 pt-12 text-planner-cream md:pb-12">
      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        <div className="grid gap-10 sm:grid-cols-2 lg:grid-cols-4">
          <div className="lg:col-span-2">
            <p className="font-medium tracking-[0.2em]">FOCAL</p>
            <p className="mt-3 max-w-sm text-sm text-planner-cream/70">
              연간 설계부터 주간 실행까지. 인생의 중심을 맞추는 디지털 플래너.
            </p>
          </div>

          <div>
            <p className="text-xs font-medium tracking-wider text-planner-cream/50">제품</p>
            <ul className="mt-3 space-y-2 text-sm">
              <li><a href="#features" className="text-planner-cream/80 hover:text-white">기능</a></li>
              <li><a href="#how-it-works" className="text-planner-cream/80 hover:text-white">사용법</a></li>
              <li><a href={APP_URL} className="text-planner-cream/80 hover:text-white">앱 열기</a></li>
            </ul>
          </div>

          <div>
            <p className="text-xs font-medium tracking-wider text-planner-cream/50">지원</p>
            <ul className="mt-3 space-y-2 text-sm">
              <li><a href="#faq" className="text-planner-cream/80 hover:text-white">FAQ</a></li>
              <li><a href="/privacy" className="text-planner-cream/80 hover:text-white">Privacy</a></li>
            </ul>
          </div>
        </div>

        <p className="mt-12 border-t border-planner-cream/10 pt-6 text-xs text-planner-cream/50">
          © {new Date().getFullYear()} Focal
        </p>
      </div>
    </footer>
  )
}
