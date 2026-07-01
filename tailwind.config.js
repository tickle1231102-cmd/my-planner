/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        planner: {
          sage: '#7A9E7E',
          'sage-light': '#E4EDE5',
          'sage-muted': '#B5C9B7',
          mist: '#8BAFC4',
          'mist-light': '#E3EEF4',
          rose: '#C4A0A0',
          'rose-light': '#F4EAEA',
          cream: '#FAF7F2',
          warm: '#F0EBE3',
          sand: '#E8E2D8',
          ink: '#3D3832',
          'ink-muted': '#7A746C',
          today: '#C5E8D8',
          'today-ring': '#5A9E82',
          weekend: '#EDF5EE',
          'year-gold': '#E8D5A8',
        },
      },
      fontFamily: {
        sans: ['"Noto Sans KR"', 'system-ui', 'sans-serif'],
      },
      boxShadow: {
        soft: '0 2px 16px rgba(61, 56, 50, 0.06)',
        cell: 'inset 0 0 0 1px rgba(61, 56, 50, 0.06)',
      },
    },
  },
  plugins: [],
}
