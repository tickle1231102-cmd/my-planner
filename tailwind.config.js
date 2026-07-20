/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './app.html', './privacy.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        planner: {
          sage: 'var(--planner-sage)',
          'sage-light': 'var(--planner-sage-light)',
          'sage-muted': 'var(--planner-sage-muted)',
          mist: 'var(--planner-mist)',
          'mist-light': 'var(--planner-mist-light)',
          rose: 'var(--planner-rose)',
          'rose-light': 'var(--planner-rose-light)',
          cream: 'var(--planner-cream)',
          warm: 'var(--planner-warm)',
          sand: 'var(--planner-sand)',
          ink: 'var(--planner-ink)',
          'ink-muted': 'var(--planner-ink-muted)',
          today: 'var(--planner-today)',
          'today-ring': 'var(--planner-today-ring)',
          weekend: 'var(--planner-weekend)',
          'year-gold': 'var(--planner-year-gold)',
          sun: 'var(--planner-sun)',
          peach: 'var(--planner-peach)',
          slate: 'var(--planner-slate)',
          surface: 'var(--planner-surface)',
          'month-col': 'var(--planner-month-col)',
        },
      },
      fontFamily: {
        sans: ['"Noto Sans KR"', 'system-ui', 'sans-serif'],
      },
      boxShadow: {
        soft: 'var(--shadow-soft)',
        cell: 'var(--shadow-cell)',
      },
    },
  },
  plugins: [],
}
