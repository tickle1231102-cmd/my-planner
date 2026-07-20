import { useEffect, useState } from 'react'
import { APP_URL, NAV_LINKS, SIGNUP_URL } from '../content.js'

function FocalLogo({ className = '' }) {
  return (
    <span className={['font-medium tracking-[0.2em] text-planner-ink', className].join(' ')}>
      FOCAL
    </span>
  )
}

export function LandingHeader() {
  const [scrolled, setScrolled] = useState(false)
  const [menuOpen, setMenuOpen] = useState(false)

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 24)
    onScroll()
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  useEffect(() => {
    document.body.style.overflow = menuOpen ? 'hidden' : ''
    return () => {
      document.body.style.overflow = ''
    }
  }, [menuOpen])

  return (
    <>
      <header
        className={[
          'fixed inset-x-0 top-0 z-50 border-b transition-all duration-300',
          scrolled
            ? 'border-planner-sand bg-white/95 shadow-soft backdrop-blur-md'
            : 'border-transparent bg-planner-cream/80 backdrop-blur-sm',
        ].join(' ')}
      >
        <div className="mx-auto flex h-14 max-w-6xl items-center justify-between px-4 sm:h-16 sm:px-6">
          <a href="/" className="shrink-0">
            <FocalLogo />
          </a>

          <nav className="hidden items-center gap-8 md:flex">
            {NAV_LINKS.map((link) => (
              <a
                key={link.href}
                href={link.href}
                className="text-sm text-planner-ink-muted transition hover:text-planner-sage"
              >
                {link.label}
              </a>
            ))}
          </nav>

          <div className="hidden items-center gap-3 md:flex">
            <a
              href={APP_URL}
              className="rounded-full px-4 py-2 text-sm text-planner-ink-muted transition hover:text-planner-sage"
            >
              로그인
            </a>
            <a
              href={SIGNUP_URL}
              className="rounded-full bg-planner-sage px-4 py-2 text-sm font-medium text-white transition hover:bg-planner-sage/90"
            >
              시작하기
            </a>
          </div>

          <button
            type="button"
            aria-label="메뉴"
            aria-expanded={menuOpen}
            onClick={() => setMenuOpen((v) => !v)}
            className="rounded-lg p-2 text-planner-sage md:hidden"
          >
            <svg viewBox="0 0 24 24" className="size-5" fill="none" stroke="currentColor" strokeWidth="2">
              {menuOpen ? (
                <path strokeLinecap="round" d="M6 6l12 12M18 6L6 18" />
              ) : (
                <path strokeLinecap="round" d="M4 7h16M4 12h16M4 17h16" />
              )}
            </svg>
          </button>
        </div>

        {menuOpen && (
          <div className="border-t border-planner-sand bg-white px-4 py-4 md:hidden">
            <nav className="flex flex-col gap-1">
              {NAV_LINKS.map((link) => (
                <a
                  key={link.href}
                  href={link.href}
                  onClick={() => setMenuOpen(false)}
                  className="rounded-lg px-3 py-2.5 text-sm text-planner-ink transition hover:bg-planner-warm"
                >
                  {link.label}
                </a>
              ))}
              <hr className="my-2 border-planner-sand" />
              <a href={APP_URL} className="rounded-lg px-3 py-2.5 text-sm text-planner-ink-muted">
                로그인
              </a>
              <a
                href={SIGNUP_URL}
                className="mt-1 rounded-full bg-planner-sage px-3 py-2.5 text-center text-sm font-medium text-white"
              >
                시작하기
              </a>
            </nav>
          </div>
        )}
      </header>

      <div className="fixed inset-x-0 bottom-0 z-40 border-t border-planner-sand bg-white/95 p-3 backdrop-blur-md md:hidden">
        <a
          href={SIGNUP_URL}
          className="block w-full rounded-full bg-planner-sage py-3 text-center text-sm font-medium text-white"
        >
          무료로 시작하기
        </a>
      </div>
    </>
  )
}
