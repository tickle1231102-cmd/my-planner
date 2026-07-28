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

const DEFAULT_MODEL = 'gemini-3.1-flash-lite'

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
    "Break the user's goal into a realistic, actionable hierarchy: yearly summaries, monthly themes, weekly focus goals, and daily tasks.",
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
    '- Prefer multiple small tasks per day over one vague large task (about 1–3 tasks per active day is enough).',
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
    '',
    'Output ONLY valid JSON (no markdown) matching this shape:',
    JSON.stringify({
      summary: 'string',
      yearlySummary: [{ year: 2026, summary: 'string' }],
      monthlyBreakdown: [{ year: 2026, month: 1, theme: 'string' }],
      weeklyBreakdown: [
        { year: 2026, month: 1, weekNumber: 1, focusGoal: 'string' },
      ],
      dailyTasks: [
        { date: 'YYYY-MM-DD', content: 'string', estimatedMin: 25 },
      ],
    }),
  ].join('\n')
}

function resolveGeminiApiKey() {
  return (
    process.env.GOOGLE_GENERATIVE_AI_API_KEY?.trim() ||
    process.env.GEMINI_API_KEY?.trim() ||
    ''
  )
}

function parseGeminiJson(text) {
  const trimmed = String(text || '').trim()
  const jsonMatch = trimmed.match(/\{[\s\S]*\}/)
  if (!jsonMatch) throw new Error('no JSON in Gemini response')
  return JSON.parse(jsonMatch[0])
}

async function generateActionPlanWithGemini(input) {
  const apiKey = resolveGeminiApiKey()
  const model = process.env.GEMINI_MODEL?.trim() || DEFAULT_MODEL
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`

  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents: [{ parts: [{ text: buildActionPlanPrompt(input) }] }],
      generationConfig: {
        temperature: 0.4,
        maxOutputTokens: 8192,
        responseMimeType: 'application/json',
      },
    }),
  })

  if (!response.ok) {
    const detail = await response.text().catch(() => '')
    if (response.status === 429) {
      const err = new Error(
        'Gemini API 할당량이 초과되었습니다. Google AI Studio에서 할당량/결제 상태를 확인하거나, 잠시 후 다시 시도해 주세요.',
      )
      err.code = 'GEMINI_QUOTA_EXCEEDED'
      err.detail = detail.slice(0, 300)
      throw err
    }
    if (response.status === 404 && /no longer available|not found/i.test(detail)) {
      const err = new Error(
        `Gemini 모델 "${model}"을(를) 사용할 수 없습니다. Vercel의 GEMINI_MODEL 환경 변수를 gemini-3.1-flash-lite로 변경하거나 제거해 주세요.`,
      )
      err.code = 'GEMINI_MODEL_UNAVAILABLE'
      err.detail = detail.slice(0, 300)
      throw err
    }
    throw new Error(`Gemini HTTP ${response.status}: ${detail.slice(0, 300)}`)
  }

  const payload = await response.json()
  const text = payload?.candidates?.[0]?.content?.parts?.[0]?.text
  if (!text) {
    const blockReason = payload?.candidates?.[0]?.finishReason || payload?.promptFeedback?.blockReason
    throw new Error(`empty Gemini response${blockReason ? ` (${blockReason})` : ''}`)
  }

  const raw = parseGeminiJson(text)
  return ActionPlanOutputSchema.parse(raw)
}

/**
 * Generate an action plan via Gemini REST (same pattern as memo classify).
 * Does not persist to DB — Focal client stores under goal_plan_data.
 */
export async function handlePlanGenerateRequest(body) {
  if (!resolveGeminiApiKey()) {
    return {
      status: 500,
      body: {
        error: {
          message:
            'GEMINI_API_KEY (or GOOGLE_GENERATIVE_AI_API_KEY) is not configured on the server.',
          code: 'MISSING_GEMINI_API_KEY',
        },
      },
    }
  }

  let input
  try {
    input = GoalInputSchema.parse(body ?? {})
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
    const rawActionPlan = await generateActionPlanWithGemini(input)
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
    const message =
      error instanceof Error ? error.message : 'Failed to generate action plan.'
    const code =
      error?.code === 'GEMINI_QUOTA_EXCEEDED'
        ? 'GEMINI_QUOTA_EXCEEDED'
        : error instanceof ZodError
          ? 'VALIDATION_ERROR'
          : 'INTERNAL_ERROR'
    return {
      status: code === 'GEMINI_QUOTA_EXCEEDED' ? 429 : 500,
      body: {
        error: {
          message,
          code,
        },
      },
    }
  }
}
