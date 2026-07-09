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
}

export function isValidTheme(theme) {
  return theme === 'light' || theme === 'dark'
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

  if (resolved === 'dark') {
    root.setAttribute('data-theme', 'dark')
  } else {
    root.removeAttribute('data-theme')
  }

  const meta = document.querySelector('meta[name="theme-color"]')
  if (meta) {
    meta.setAttribute('content', THEMES[resolved].metaColor)
  }
}
