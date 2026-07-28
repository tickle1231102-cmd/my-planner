export const THEME_STORAGE_KEY = 'my-planner-theme'

export const THEMES = {
  light: {
    id: 'light',
    label: '라이트',
    description: '밝고 따뜻한 기본 테마',
    metaColor: '#7A9E7E',
  },
  dark: {
    id: 'dark',
    label: '다크',
    description: '세이지 무드를 유지한 어두운 테마',
    metaColor: '#1C1A18',
  },
  bw: {
    id: 'bw',
    label: '흑백 (B&W)',
    description: '무채색 베이스에 포인트 컬러만 강조하는 테마',
    metaColor: '#F7F7F8',
  },
}

export function isValidTheme(theme) {
  return theme === 'light' || theme === 'dark' || theme === 'bw'
}

export function getStoredTheme() {
  if (typeof window === 'undefined') return 'light'
  const saved = localStorage.getItem(THEME_STORAGE_KEY)
  return isValidTheme(saved) ? saved : 'light'
}

export function saveTheme(theme) {
  if (typeof window === 'undefined') return
  localStorage.setItem(THEME_STORAGE_KEY, theme)
}

export function applyTheme(theme) {
  if (typeof document === 'undefined') return

  const resolved = isValidTheme(theme) ? theme : 'light'
  const root = document.documentElement

  if (resolved === 'light') {
    root.removeAttribute('data-theme')
  } else {
    root.setAttribute('data-theme', resolved)
  }

  const meta = document.querySelector('meta[name="theme-color"]')
  if (meta) {
    meta.setAttribute('content', THEMES[resolved].metaColor)
  }
}
