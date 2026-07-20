const PREVIEWS = {
  yearly: (
    <div className="grid grid-cols-7 gap-px rounded-lg bg-planner-sand/80 p-px text-[8px] sm:text-[9px]">
      {Array.from({ length: 28 }, (_, i) => (
        <div
          key={i}
          className={[
            'flex h-6 items-center justify-center bg-white sm:h-7',
            i % 7 === 5 && 'bg-planner-weekend',
            i === 10 && 'bg-planner-today ring-1 ring-planner-today-ring',
          ]
            .filter(Boolean)
            .join(' ')}
        >
          {i + 1}
        </div>
      ))}
    </div>
  ),
  calendar: (
    <div className="grid grid-cols-4 gap-1.5">
      {Array.from({ length: 12 }, (_, i) => (
        <div key={i} className="rounded border border-planner-sand bg-white p-1">
          <p className="text-[8px] font-medium text-planner-sage">{i + 1}월</p>
          <div className="mt-0.5 grid grid-cols-7 gap-px">
            {Array.from({ length: 7 }, (_, j) => (
              <div key={j} className="h-1 rounded-sm bg-planner-sage-light" />
            ))}
          </div>
        </div>
      ))}
    </div>
  ),
  monthly: (
    <div className="space-y-2">
      <div className="grid grid-cols-7 gap-1 text-[8px] text-planner-ink-muted">
        {['월', '화', '수', '목', '금', '토', '일'].map((d) => (
          <span key={d} className="text-center">{d}</span>
        ))}
      </div>
      <div className="grid grid-cols-7 gap-1">
        {Array.from({ length: 21 }, (_, i) => (
          <div key={i} className="h-5 rounded bg-planner-warm sm:h-6" />
        ))}
      </div>
      <div className="space-y-1">
        {['월간 목표 1', '월간 목표 2'].map((g) => (
          <div key={g} className="rounded border border-dashed border-planner-sand px-2 py-1 text-[9px] text-planner-ink-muted">
            {g}
          </div>
        ))}
      </div>
    </div>
  ),
  weekly: (
    <div className="space-y-2">
      <div className="flex gap-1">
        {['월', '화', '수', '목', '금'].map((d, i) => (
          <div
            key={d}
            className={[
              'flex-1 rounded px-1 py-1 text-center text-[8px]',
              i === 2 ? 'bg-planner-sage text-white' : 'bg-planner-warm text-planner-ink-muted',
            ].join(' ')}
          >
            {d}
          </div>
        ))}
      </div>
      <div className="space-y-1">
        {['09:00 미팅', '14:00 딥워크', '운동'].map((t) => (
          <div key={t} className="flex gap-2 rounded bg-planner-sage-light/60 px-2 py-1 text-[9px]">
            <span className="text-planner-sage">●</span>
            {t}
          </div>
        ))}
      </div>
    </div>
  ),
  mandala: (
    <div className="grid grid-cols-3 gap-1">
      {Array.from({ length: 9 }, (_, i) => (
        <div
          key={i}
          className={[
            'flex aspect-square items-center justify-center rounded text-[7px]',
            i === 4 ? 'bg-planner-sage text-white font-medium' : 'bg-planner-warm text-planner-ink-muted',
          ].join(' ')}
        >
          {i === 4 ? '핵심' : ''}
        </div>
      ))}
    </div>
  ),
  habit: (
    <div className="space-y-1.5">
      {['운동', '독서', '명상'].map((h, row) => (
        <div key={h} className="flex items-center gap-1.5">
          <span className="w-8 text-[8px] text-planner-ink-muted">{h}</span>
          <div className="flex flex-1 gap-1">
            {Array.from({ length: 7 }, (_, col) => (
              <div
                key={col}
                className={[
                  'h-4 flex-1 rounded-sm',
                  col <= row + 2 ? 'bg-planner-sage' : 'bg-planner-sand',
                ].join(' ')}
              />
            ))}
          </div>
        </div>
      ))}
    </div>
  ),
  memory: (
    <div className="space-y-2">
      <div className="rounded-lg border border-planner-sand bg-planner-warm/50 p-2 text-[9px] text-planner-ink-muted">
        빠른 캡처: 오늘의 아이디어...
      </div>
      <div className="flex flex-wrap gap-1">
        {['아이디어', '회고', '학습'].map((c) => (
          <span key={c} className="rounded-full bg-planner-sage-light px-2 py-0.5 text-[8px] text-planner-sage">
            {c}
          </span>
        ))}
      </div>
    </div>
  ),
}

export function MockPreview({ type, className = '' }) {
  return (
    <div
      className={[
        'overflow-hidden rounded-2xl border border-planner-sand bg-white p-4 shadow-soft sm:p-5',
        className,
      ].join(' ')}
    >
      <div className="mb-3 flex items-center gap-1.5">
        <span className="size-2 rounded-full bg-planner-rose/70" />
        <span className="size-2 rounded-full bg-planner-sun/80" />
        <span className="size-2 rounded-full bg-planner-sage/70" />
      </div>
      {PREVIEWS[type] ?? PREVIEWS.yearly}
    </div>
  )
}

export function HeroMockup() {
  return (
    <div className="relative">
      <div className="absolute -right-6 -top-6 size-32 rounded-full bg-planner-sage-light/60 blur-2xl sm:size-48" />
      <div className="absolute -bottom-4 -left-4 size-24 rounded-full bg-planner-mist-light/50 blur-2xl sm:size-36" />
      <div className="relative rotate-1 transition hover:rotate-0">
        <MockPreview type="yearly" className="shadow-[0_8px_40px_rgba(61,56,50,0.12)]" />
        <div className="absolute -bottom-4 -left-4 w-[55%] rotate-[-2deg] sm:-bottom-6 sm:-left-6">
          <MockPreview type="weekly" className="scale-95 shadow-soft" />
        </div>
      </div>
    </div>
  )
}
