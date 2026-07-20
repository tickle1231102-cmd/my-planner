import { APP_URL } from '../landing/content.js'

export default function PrivacyPage() {
  return (
    <div className="min-h-svh bg-planner-cream">
      <header className="border-b border-planner-sand bg-white">
        <div className="mx-auto flex h-14 max-w-3xl items-center justify-between px-4 sm:px-6">
          <a href="/" className="font-medium tracking-[0.2em] text-planner-ink">
            FOCAL
          </a>
          <a href={APP_URL} className="text-sm text-planner-sage hover:underline">
            앱 열기
          </a>
        </div>
      </header>

      <main className="mx-auto max-w-3xl px-4 py-12 sm:px-6">
        <h1 className="text-2xl font-medium text-planner-ink">개인정보처리방침</h1>
        <p className="mt-2 text-sm text-planner-ink-muted">최종 업데이트: 2026년 7월</p>

        <div className="mt-10 space-y-8 text-sm leading-relaxed text-planner-ink-muted">
          <section>
            <h2 className="text-base font-medium text-planner-ink">1. 수집하는 정보</h2>
            <p className="mt-2">
              Focal은 서비스 제공을 위해 다음 정보를 수집할 수 있습니다.
            </p>
            <ul className="mt-2 list-inside list-disc space-y-1">
              <li>계정 정보: 사용자 ID, 비밀번호(해시 저장), 선택적 닉네임</li>
              <li>플래너 데이터: 연·월·주 계획, 만다라트, 습관 기록, 메모 등</li>
              <li>기기 정보: 푸시 알림 구독 시 브라우저 푸시 엔드포인트</li>
            </ul>
          </section>

          <section>
            <h2 className="text-base font-medium text-planner-ink">2. 정보 이용 목적</h2>
            <ul className="mt-2 list-inside list-disc space-y-1">
              <li>플래너 서비스 제공 및 기기 간 동기화</li>
              <li>계정 인증 및 데이터 보존</li>
              <li>푸시 알림 발송 (사용자가 활성화한 경우)</li>
            </ul>
          </section>

          <section>
            <h2 className="text-base font-medium text-planner-ink">3. 정보 저장 및 보관</h2>
            <p className="mt-2">
              클라우드 모드를 사용하는 경우, 데이터는 Supabase(PostgreSQL)에 저장됩니다.
              로컬 전용 모드를 선택하면 데이터는 사용자의 브라우저 localStorage에만 저장되며
              외부 서버로 전송되지 않습니다.
            </p>
          </section>

          <section>
            <h2 className="text-base font-medium text-planner-ink">4. 정보 공유</h2>
            <p className="mt-2">
              Focal은 사용자 데이터를 제3자에게 판매하거나 광고 목적으로 제공하지 않습니다.
              서비스 운영에 필요한 클라우드 인프라(Supabase, Vercel)에 한해 데이터가
              처리될 수 있습니다.
            </p>
          </section>

          <section>
            <h2 className="text-base font-medium text-planner-ink">5. 데이터 삭제</h2>
            <p className="mt-2">
              앱 내 계정 설정에서 계정을 삭제하면 클라우드에 저장된 플래너 데이터가
              함께 삭제됩니다. 로컬 모드의 데이터는 브라우저 데이터 삭제 또는 앱 내
              데이터 초기화로 제거할 수 있습니다.
            </p>
          </section>

          <section>
            <h2 className="text-base font-medium text-planner-ink">6. 문의</h2>
            <p className="mt-2">
              개인정보 관련 문의는 앱 내 지원 채널을 통해 연락해 주세요.
            </p>
          </section>
        </div>

        <p className="mt-12">
          <a href="/" className="text-sm text-planner-sage hover:underline">
            ← 홈으로
          </a>
        </p>
      </main>
    </div>
  )
}
