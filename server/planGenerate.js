import { createGoogleGenerativeAI } from '@ai-sdk/google'
import { generateObject } from 'ai'
import { ZodError } from 'zod'
import {
  ActionPlanOutputSchema,
  GoalInputSchema,
} from '../src/lib/goalPlanSchema.js'
import {
  isExcludedDate,
  WEEKDAY_LABELS_EN,
  weekClassificationPromptLines,
} from '../src/lib/goalPlanWeek.js'

const SCOPE_LABELS = {
  SHORT_TERM: '1~3 months',
  MID_TERM: '3~6 months',
  LONG_TERM: '1 year or more',
}

function formatExcludedWeekdays(weekdays) {
  if (!weekdays?.length) return 'None'
  return weekdays
    .slice()
    .sort((a, b) => a - b)
    .map((day) => `${WEEKDAY_LABELS_EN[day]} (${day})`)
    .join(', ')
}

function formatExcludedDates(dates) {
  if (!dates?.length) return 'None'
  return dates.slice().sort().join(', ')
}

function buildRestDayPromptLines(input) {
  const excludedWeekdays = input.excludedWeekdays ?? []
  const excludedDates = input.excludedDates ?? []
  if (excludedWeekdays.length === 0 && excludedDates.length === 0) return []

  return [
    '',
    'Rest day / exclusion rules (mandatory):',
    `- Excluded weekdays (getDay 0=Sun … 6=Sat): ${formatExcludedWeekdays(excludedWeekdays)}`,
    `- Excluded specific dates: ${formatExcludedDates(excludedDates)}`,
    '- Do NOT assign any dailyTasks on excluded weekdays or excluded dates.',
    '- Rest days are intentional gaps — leave them empty; do not backfill tasks onto adjacent days.',
  ]
}

function filterExcludedDailyTasks(actionPlan, input) {
  const excludedWeekdays = input.excludedWeekdays ?? []
  const excludedDates = input.excludedDates ?? []
  if (excludedWeekdays.length === 0 && excludedDates.length === 0) {
    return actionPlan
  }

  const dailyTasks = actionPlan.dailyTasks.filter(
    (task) => !isExcludedDate(task.date, excludedWeekdays, excludedDates),
  )
  return { ...actionPlan, dailyTasks }
}

function buildActionPlanPrompt(input) {
  return [
    'You are an expert goal decomposition coach.',
    'Break the user\'s goal into a realistic, actionable hierarchy: yearly summaries, monthly themes, weekly focus goals, and daily tasks.',
    '',
    'Goal details:',
    `- Title: ${input.title}`,
    `- Description: ${input.description ?? 'None provided'}`,
    `- Scope: ${input.scope} (${SCOPE_LABELS[input.scope]})`,
    `- Start date: ${input.startDate}`,
    `- End date: ${input.endDate}`,
    ...buildRestDayPromptLines(input),
    '',
    'Daily task strategy (maximize execution):',
    '- Break work into the smallest actionable units — each dailyTask should be one clear action completable in a single sitting.',
    '- Prefer multiple small tasks per day over one vague large task.',
    '- Each task content must start with a strong action verb and include a concrete deliverable.',
    '- Keep estimatedMin between 10 and 45 minutes per task; split anything longer into separate tasks.',
    '- Avoid abstract phrasing; use specific steps.',
    '- Balance intensity across active days; respect excluded rest days.',
    '',
    'Structural requirements:',
    '- Cover the full period from startDate through endDate.',
    '- Assign dailyTasks only on dates within [startDate, endDate] (YYYY-MM-DD).',
    '- Distribute daily tasks across active (non-excluded) days.',
    ...weekClassificationPromptLines(),
    '- Keep daily task content concrete and executable within estimatedMin minutes.',
    '- Align monthly themes and weekly focus goals with the yearly summaries.',
    '- Write summary as a concise overview of the entire action plan.',
    '- Respond in Korean for all user-facing text fields (summary, themes, focusGoal, dailyTasks content).',
  ].join('\n')
}

function resolveGeminiApiKey() {
  return (
    process.env.GOOGLE_GENERATIVE_AI_API_KEY?.trim() ||
    process.env.GEMINI_API_KEY?.trim() ||
    ''
  )
}

/**
 * Generate an action plan via Gemini. Does not persist to DB —
 * the Focal client stores the result under the user's goal_plan_data.
 */
export async function handlePlanGenerateRequest(body) {
  const geminiApiKey = resolveGeminiApiKey()
  if (!geminiApiKey) {
    return {
      status: 500,
      body: {
        error: {
          message:
            'GOOGLE_GENERATIVE_AI_API_KEY (or GEMINI_API_KEY) is not configured on the server.',
          code: 'MISSING_GEMINI_API_KEY',
        },
      },
    }
  }

  let input
  try {
    input = GoalInputSchema.parse(body)
  } catch (error) {
    if (error instanceof ZodError) {
      return {
        status: 400,
        body: {
          error: {
            message: 'Invalid request payload',
            code: 'VALIDATION_ERROR',
            details: error.flatten(),
          },
        },
      }
    }
    throw error
  }

  try {
    const google = createGoogleGenerativeAI({ apiKey: geminiApiKey })
    const geminiModel = process.env.GEMINI_MODEL?.trim() || 'gemini-2.0-flash'

    const { object: rawActionPlan } = await generateObject({
      model: google(geminiModel),
      schema: ActionPlanOutputSchema,
      schemaName: 'ActionPlanOutput',
      schemaDescription:
        'Hierarchical action plan with yearly, monthly, weekly, and daily breakdown',
      prompt: buildActionPlanPrompt(input),
    })

    const actionPlan = filterExcludedDailyTasks(rawActionPlan, input)

    return {
      status: 201,
      body: {
        data: {
          input,
          actionPlan,
        },
      },
    }
  } catch (error) {
    console.error('[POST /api/plan/generate]', error)
    return {
      status: 500,
      body: {
        error: {
          message:
            error instanceof Error
              ? error.message
              : 'Failed to generate action plan.',
          code: 'INTERNAL_ERROR',
        },
      },
    }
  }
}
