export const TIMETABLE_PAINT_COLORS = [
  {
    id: 'sage',
    swatch: 'bg-planner-sage',
    filled: 'bg-planner-sage/65 hover:bg-planner-sage/75',
  },
  {
    id: 'mint',
    swatch: 'bg-planner-today-ring',
    filled: 'bg-planner-today-ring/55 hover:bg-planner-today-ring/65',
  },
  {
    id: 'mist',
    swatch: 'bg-planner-mist',
    filled: 'bg-planner-mist/50 hover:bg-planner-mist/60',
  },
  {
    id: 'sun',
    swatch: 'bg-planner-sun',
    filled: 'bg-planner-sun/70 hover:bg-planner-sun/80',
  },
  {
    id: 'peach',
    swatch: 'bg-planner-peach',
    filled: 'bg-planner-peach/65 hover:bg-planner-peach/75',
  },
  {
    id: 'slate',
    swatch: 'bg-planner-slate',
    filled: 'bg-planner-slate/75 hover:bg-planner-slate/85',
  },
]

export const TIMETABLE_COLOR_BY_ID = Object.fromEntries(
  TIMETABLE_PAINT_COLORS.map((color) => [color.id, color]),
)

export const DEFAULT_TIMETABLE_COLOR = TIMETABLE_PAINT_COLORS[0].id
