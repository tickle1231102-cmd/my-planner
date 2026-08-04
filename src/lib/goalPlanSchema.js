import { z } from 'zod'

const dateStringSchema = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, 'Date must be in YYYY-MM-DD format')

const goalScopeSchema = z.enum(['SHORT_TERM', 'MID_TERM', 'LONG_TERM'])

/** Weekday index matching Date.getDay(): 0 = Sunday … 6 = Saturday. */
export const weekdaySchema = z.number().int().min(0).max(6)

/** Validates user input before sending to the LLM pipeline. */
export const GoalInputSchema = z
  .object({
    title: z.string().min(2, 'Title must be at least 2 characters'),
    description: z.string().optional(),
    scope: goalScopeSchema,
    startDate: dateStringSchema,
    endDate: dateStringSchema,
    excludedWeekdays: z.array(weekdaySchema).default([]),
    excludedDates: z.array(dateStringSchema).default([]),
  })
  .refine((data) => data.endDate >= data.startDate, {
    message: 'endDate must be on or after startDate',
    path: ['endDate'],
  })
  .refine(
    (data) => new Set(data.excludedWeekdays).size === data.excludedWeekdays.length,
    {
      message: 'excludedWeekdays must not contain duplicates',
      path: ['excludedWeekdays'],
    },
  )
  .refine(
    (data) => new Set(data.excludedDates).size === data.excludedDates.length,
    {
      message: 'excludedDates must not contain duplicates',
      path: ['excludedDates'],
    },
  )
  .refine(
    (data) =>
      data.excludedDates.every(
        (date) => date >= data.startDate && date <= data.endDate,
      ),
    {
      message: 'Each excludedDate must fall within [startDate, endDate]',
      path: ['excludedDates'],
    },
  )

/** Optional context when regenerating an existing plan. */
export const PreviousPlanSchema = z.object({
  summary: z.string().optional(),
  yearlySummary: z
    .array(z.object({ year: z.number().int(), summary: z.string() }))
    .optional(),
  monthlyBreakdown: z
    .array(
      z.object({
        year: z.number().int(),
        month: z.number().int().min(1).max(12),
        theme: z.string(),
      }),
    )
    .optional(),
  weeklyBreakdown: z
    .array(
      z.object({
        year: z.number().int(),
        month: z.number().int().min(1).max(12),
        weekNumber: z.number().int().min(1),
        focusGoal: z.string(),
      }),
    )
    .optional(),
  dailyTasks: z
    .array(
      z.object({
        date: dateStringSchema,
        content: z.string(),
        estimatedMin: z.number().int().positive().optional(),
        status: z.string().optional(),
      }),
    )
    .optional(),
})

/** Extends goal input with optional regenerate fields. */
export const GeneratePlanRequestSchema = GoalInputSchema.and(
  z.object({
    revisionNotes: z.string().optional(),
    previousPlan: PreviousPlanSchema.optional(),
  }),
)

/** Validates structured LLM output for the action plan decomposition. */
export const ActionPlanOutputSchema = z.object({
  summary: z.string(),
  yearlySummary: z.array(
    z.object({
      year: z.number().int(),
      summary: z.string(),
    }),
  ),
  monthlyBreakdown: z.array(
    z.object({
      year: z.number().int(),
      month: z.number().int().min(1).max(12),
      theme: z.string(),
    }),
  ),
  weeklyBreakdown: z.array(
    z.object({
      year: z.number().int(),
      month: z.number().int().min(1).max(12),
      weekNumber: z.number().int().min(1),
      focusGoal: z.string(),
    }),
  ),
  dailyTasks: z.array(
    z.object({
      date: dateStringSchema,
      content: z.string(),
      estimatedMin: z.number().int().positive(),
    }),
  ),
})

export const TASK_STATUS = {
  TODO: 'TODO',
  IN_PROGRESS: 'IN_PROGRESS',
  COMPLETED: 'COMPLETED',
}

export const SCOPE_LABELS = {
  SHORT_TERM: '단기 (1~3개월)',
  MID_TERM: '중기 (3~6개월)',
  LONG_TERM: '장기 (1년+)',
}

export { dateStringSchema, goalScopeSchema }
