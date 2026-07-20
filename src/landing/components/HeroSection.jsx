import { SIGNUP_URL } from '../content.js'
import { HeroMockup } from './MockPreview.jsx'

const TRUST_ITEMS = ['이메일 없이 ID만으로 시작', '모바일·PC 동기화', '로컬 전용 모드']

export function HeroSection() {
  return (
    <section className="relative overflow-hidden bg-planner-cream pt-24 pb-20 sm:pt-28 sm:pb-28 lg:min-h-[88vh] lg:pb-32">
      <div className="mx-auto grid max-w-6xl items-center gap-12 px-4 sm:px-6 lg:grid-cols-2 lg:gap-16">
        <div>
          <p className="text-xs font-medium tracking-[0.18em] text-planner-sage sm:text-sm">
            디지털 플래너 · 연간→주간 설계
          </p>
          <h1 className="mt-4 text-3xl font-medium leading-tight text-planner-ink sm:text-4xl lg:text-[2.75rem] lg:leading-[1.15]">
            한 해를 설계하고,
            <br />
            매주 실행하세요.
          </h1>
          <p className="mt-5 max-w-lg text-base leading-relaxed text-planner-ink-muted sm:text-lg">
            연간 목표부터 주간 루틴까지, 하나의 플래너에서.
            <br className="hidden sm:block" />
            Focal은 인생의 중심을 맞추는 방법입니다.
          </p>

          <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:items-center">
            <a
              href={SIGNUP_URL}
              className="inline-flex items-center justify-center rounded-full bg-planner-sage px-6 py-3.5 text-sm font-medium text-white transition hover:bg-planner-sage/90"
            >
              무료로 시작하기
            </a>
            <a
              href="#features"
              className="inline-flex items-center justify-center rounded-full border border-planner-sand bg-white px-6 py-3.5 text-sm font-medium text-planner-ink transition hover:border-planner-sage-muted hover:text-planner-sage"
            >
              기능 둘러보기 ↓
            </a>
          </div>

          <ul className="mt-8 flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:gap-x-5 sm:gap-y-2">
            {TRUST_ITEMS.map((item) => (
              <li key={item} className="flex items-center gap-2 text-sm text-planner-ink-muted">
                <span className="flex size-4 shrink-0 items-center justify-center rounded-full bg-planner-sage-light text-[10px] text-planner-sage">
                  ✓
                </span>
                {item}
              </li>
            ))}
          </ul>
        </div>

        <div className="mx-auto w-full max-w-md lg:max-w-none lg:justify-self-end">
          <HeroMockup />
        </div>
      </div>
    </section>
  )
}

export function ProblemSection() {
  const PROBLEMS = [
    {
      title: '앱마다 나뉜 계획',
      description: '캘린더, 메모, 습관 앱에 흩어진 일정과 목표. 어디에 적었는지 찾느라 시간을 씁니다.',
    },
    {
      title: '연간 목표와 주간 실행의 단절',
      description: '1월에 세운 목표가 3월 Weekly에는 흔적도 없어집니다. 큰 그림과 일상이 연결되지 않습니다.',
    },
    {
      title: '종이 플래너의 한계',
      description: '손으로 쓰는 감성은 좋지만, 검색·동기화·리마인더가 필요할 때는 디지털이 필요합니다.',
    },
  ]

  return (
    <section className="bg-planner-warm py-16 sm:py-24">
      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        <div className="mx-auto max-w-2xl text-center">
          <h2 className="text-2xl font-medium text-planner-ink sm:text-3xl">
            이런 경험, 있지 않나요?
          </h2>
          <p className="mt-3 text-planner-ink-muted">
            계획은 많은데 실행은 흩어지는 순간들
          </p>
        </div>

        <div className="mt-12 grid gap-5 sm:grid-cols-3">
          {PROBLEMS.map((item) => (
            <div
              key={item.title}
              className="rounded-2xl border border-planner-sand bg-white p-6 shadow-soft"
            >
              <div className="mb-4 flex size-10 items-center justify-center rounded-xl bg-planner-sage-light text-planner-sage">
                <span className="text-lg">·</span>
              </div>
              <h3 className="text-base font-medium text-planner-ink">{item.title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-planner-ink-muted">
                {item.description}
              </p>
            </div>
          ))}
        </div>

        <p className="mt-10 text-center text-sm font-medium text-planner-sage">
          Focal은 시간 축을 하나로 잇습니다 →
        </p>
      </div>
    </section>
  )
}
