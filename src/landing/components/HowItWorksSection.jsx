import { APP_URL, SIGNUP_URL, STEPS } from '../content.js'

export function HowItWorksSection() {
  return (
    <section id="how-it-works" className="scroll-mt-20 bg-planner-sage-light/40 py-16 sm:py-24">
      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        <div className="mx-auto max-w-2xl text-center">
          <h2 className="text-2xl font-medium text-planner-ink sm:text-3xl">
            4단계로 시작하는 Focal
          </h2>
        </div>

        <div className="mt-12 hidden lg:block">
          <div className="relative flex justify-between">
            <div className="absolute left-0 right-0 top-8 h-px bg-planner-sage-muted/50" />
            {STEPS.map((step) => (
              <div key={step.step} className="relative z-10 flex w-1/4 flex-col items-center px-2 text-center">
                <div className="flex size-16 items-center justify-center rounded-2xl border border-planner-sand bg-white text-sm font-medium text-planner-sage shadow-soft">
                  {step.step}
                </div>
                <h3 className="mt-4 font-medium text-planner-ink">{step.title}</h3>
                <p className="mt-1 text-xs text-planner-sage">{step.subtitle}</p>
                <p className="mt-2 text-sm text-planner-ink-muted">{step.description}</p>
              </div>
            ))}
          </div>
        </div>

        <div className="mt-10 space-y-0 lg:hidden">
          {STEPS.map((step, index) => (
            <div key={step.step} className="relative flex gap-4 pb-8 last:pb-0">
              {index < STEPS.length - 1 && (
                <div className="absolute left-[19px] top-10 bottom-0 w-px bg-planner-sage-muted/50" />
              )}
              <div className="relative z-10 flex size-10 shrink-0 items-center justify-center rounded-full border-2 border-planner-sage bg-white text-xs font-medium text-planner-sage">
                {step.step}
              </div>
              <div className="pt-1">
                <h3 className="font-medium text-planner-ink">{step.title}</h3>
                <p className="text-xs text-planner-sage">{step.subtitle}</p>
                <p className="mt-1 text-sm text-planner-ink-muted">{step.description}</p>
              </div>
            </div>
          ))}
        </div>

        <div className="mt-12 text-center">
          <a
            href={SIGNUP_URL}
            className="inline-flex rounded-full border border-planner-sage px-6 py-3 text-sm font-medium text-planner-sage transition hover:bg-planner-sage hover:text-white"
          >
            나도 이렇게 써볼래 →
          </a>
        </div>
      </div>
    </section>
  )
}

export function TrustSection() {
  return (
    <section className="bg-planner-cream py-16 sm:py-24">
      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        <div className="mx-auto max-w-2xl text-center">
          <h2 className="text-2xl font-medium text-planner-ink sm:text-3xl">
            내 데이터, 내가 선택합니다
          </h2>
        </div>

        <div className="mt-12 grid gap-6 sm:grid-cols-2">
          <div className="rounded-2xl border border-planner-sand bg-white p-6 shadow-soft sm:p-8">
            <div className="text-2xl">☁️</div>
            <h3 className="mt-4 text-lg font-medium text-planner-ink">클라우드 동기화</h3>
            <ul className="mt-4 space-y-2 text-sm text-planner-ink-muted">
              <li>· PC·모바일 자동 저장</li>
              <li>· ID + 비밀번호로 접속</li>
              <li>· 언제든 기기 변경 가능</li>
            </ul>
            <a
              href={SIGNUP_URL}
              className="mt-6 inline-flex rounded-full bg-planner-sage px-5 py-2.5 text-sm font-medium text-white transition hover:bg-planner-sage/90"
            >
              클라우드로 시작
            </a>
          </div>

          <div className="rounded-2xl border border-planner-sand bg-white p-6 shadow-soft sm:p-8">
            <div className="text-2xl">🔒</div>
            <h3 className="mt-4 text-lg font-medium text-planner-ink">로컬 전용 모드</h3>
            <ul className="mt-4 space-y-2 text-sm text-planner-ink-muted">
              <li>· 이 기기에만 저장</li>
              <li>· 이메일 없이 시작</li>
              <li>· 게스트 체험 가능</li>
            </ul>
            <a
              href={APP_URL}
              className="mt-6 inline-flex rounded-full border border-planner-sage px-5 py-2.5 text-sm font-medium text-planner-sage transition hover:bg-planner-sage-light"
            >
              로컬로 시작
            </a>
          </div>
        </div>

        <div className="mt-8 overflow-hidden rounded-2xl border border-planner-sand bg-white shadow-soft">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-planner-sand bg-planner-warm/50 text-left">
                <th className="px-4 py-3 font-medium text-planner-ink sm:px-6">기능</th>
                <th className="px-4 py-3 font-medium text-planner-sage sm:px-6">클라우드</th>
                <th className="px-4 py-3 font-medium text-planner-ink-muted sm:px-6">로컬</th>
              </tr>
            </thead>
            <tbody className="text-planner-ink-muted">
              {[
                ['기기 간 동기화', '✓', '—'],
                ['이메일 불필요', '✓', '✓'],
                ['만다라트·습관·메모', '✓', '✓'],
                ['푸시 알림', '✓', '—'],
              ].map(([label, cloud, local]) => (
                <tr key={label} className="border-b border-planner-sand/70 last:border-0">
                  <td className="px-4 py-3 sm:px-6">{label}</td>
                  <td className="px-4 py-3 text-planner-sage sm:px-6">{cloud}</td>
                  <td className="px-4 py-3 sm:px-6">{local}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </section>
  )
}

export function CtaSection() {
  return (
    <section className="bg-planner-sage py-16 sm:py-20">
      <div className="mx-auto max-w-3xl px-4 text-center sm:px-6">
        <h2 className="text-2xl font-medium text-white sm:text-3xl">
          지금, 나만의 플래너를 만들어 보세요
        </h2>
        <p className="mt-3 text-planner-sage-light/90">30초면 시작할 수 있어요.</p>
        <a
          href={SIGNUP_URL}
          className="mt-8 inline-flex rounded-full bg-white px-8 py-3.5 text-sm font-medium text-planner-sage transition hover:bg-planner-cream"
        >
          무료로 시작하기 →
        </a>
        <p className="mt-6 text-sm text-planner-sage-light/80">
          이미 계정이 있나요?{' '}
          <a href={APP_URL} className="underline hover:text-white">
            로그인
          </a>
        </p>
      </div>
    </section>
  )
}
