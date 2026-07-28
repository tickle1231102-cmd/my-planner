import { useMemo, useState } from 'react'
import { useCloudSync } from './context/CloudSyncContext.jsx'
import { generateActionPlan } from './lib/goalPlanClient.js'
import { SCOPE_LABELS, TASK_STATUS } from './lib/goalPlanSchema.js'
import { buildStoredGoal } from './lib/goalPlanStorage.js'
import {
  syncDailyTasksToWeekly,
  syncGoalTaskStatusToWeekly,
  todayDateString,
} from './lib/goalPlanWeeklySync.js'
import { WEEKDAY_LABELS_KO } from './lib/goalPlanWeek.js'
import { GUEST_USER_KEY, LOCAL_USER_KEY } from './lib/userIdentity.js'

const SCOPES = ['SHORT_TERM', 'MID_TERM', 'LONG_TERM']
const WEEKDAYS = [1, 2, 3, 4, 5, 6, 0] // Mon-first for UI

function defaultDates() {
  const start = new Date()
  const end = new Date()
  end.setDate(end.getDate() + 28)
  const fmt = (d) =>
    `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
  return { startDate: fmt(start), endDate: fmt(end) }
}

function GoalForm({ onCreated, disabled, busy, error }) {
  const defaults = defaultDates()
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [scope, setScope] = useState('SHORT_TERM')
  const [startDate, setStartDate] = useState(defaults.startDate)
  const [endDate, setEndDate] = useState(defaults.endDate)
  const [excludedWeekdays, setExcludedWeekdays] = useState([0])
  const [excludedDatesText, setExcludedDatesText] = useState('')

  function toggleWeekday(day) {
    setExcludedWeekdays((prev) =>
      prev.includes(day) ? prev.filter((d) => d !== day) : [...prev, day].sort(),
    )
  }

  async function handleSubmit(event) {
    event.preventDefault()
    const excludedDates = excludedDatesText
      .split(/[\s,]+/)
      .map((s) => s.trim())
      .filter(Boolean)

    await onCreated({
      title: title.trim(),
      description: description.trim() || undefined,
      scope,
      startDate,
      endDate,
      excludedWeekdays,
      excludedDates,
    })
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <label className="block">
        <span className="mb-1 block text-xs font-medium text-planner-ink-muted">목표 타이틀</span>
        <input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          required
          minLength={2}
          placeholder="예: 토익 850 달성"
          disabled={disabled || busy}
          className="w-full rounded-xl border border-planner-sand bg-white px-4 py-3 text-sm text-planner-ink outline-none focus:border-planner-sage focus:ring-2 focus:ring-planner-sage/20"
        />
      </label>

      <label className="block">
        <span className="mb-1 block text-xs font-medium text-planner-ink-muted">상세 설명 (선택)</span>
        <textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          rows={3}
          disabled={disabled || busy}
          placeholder="배경, 제약, 원하는 결과…"
          className="w-full rounded-xl border border-planner-sand bg-white px-4 py-3 text-sm text-planner-ink outline-none focus:border-planner-sage focus:ring-2 focus:ring-planner-sage/20"
        />
      </label>

      <fieldset>
        <legend className="mb-2 text-xs font-medium text-planner-ink-muted">목표 규모</legend>
        <div className="flex flex-wrap gap-2">
          {SCOPES.map((value) => (
            <button
              key={value}
              type="button"
              disabled={disabled || busy}
              onClick={() => setScope(value)}
              className={[
                'rounded-full px-3 py-1.5 text-xs font-medium transition',
                scope === value
                  ? 'bg-planner-sage text-white'
                  : 'bg-planner-warm text-planner-ink-muted hover:text-planner-ink',
              ].join(' ')}
            >
              {SCOPE_LABELS[value]}
            </button>
          ))}
        </div>
      </fieldset>

      <div className="grid gap-3 sm:grid-cols-2">
        <label className="block">
          <span className="mb-1 block text-xs font-medium text-planner-ink-muted">시작일</span>
          <input
            type="date"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
            required
            disabled={disabled || busy}
            className="w-full rounded-xl border border-planner-sand bg-white px-4 py-3 text-sm"
          />
        </label>
        <label className="block">
          <span className="mb-1 block text-xs font-medium text-planner-ink-muted">마감일</span>
          <input
            type="date"
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
            required
            disabled={disabled || busy}
            className="w-full rounded-xl border border-planner-sand bg-white px-4 py-3 text-sm"
          />
        </label>
      </div>

      <fieldset>
        <legend className="mb-2 text-xs font-medium text-planner-ink-muted">쉬는 요일</legend>
        <div className="flex flex-wrap gap-2">
          {WEEKDAYS.map((day) => (
            <button
              key={day}
              type="button"
              disabled={disabled || busy}
              onClick={() => toggleWeekday(day)}
              className={[
                'size-9 rounded-full text-xs font-medium transition',
                excludedWeekdays.includes(day)
                  ? 'bg-planner-sage text-white'
                  : 'bg-planner-warm text-planner-ink-muted',
              ].join(' ')}
            >
              {WEEKDAY_LABELS_KO[day]}
            </button>
          ))}
        </div>
      </fieldset>

      <label className="block">
        <span className="mb-1 block text-xs font-medium text-planner-ink-muted">
          제외 날짜 (YYYY-MM-DD, 쉼표/공백 구분)
        </span>
        <input
          value={excludedDatesText}
          onChange={(e) => setExcludedDatesText(e.target.value)}
          disabled={disabled || busy}
          placeholder="2026-08-15, 2026-09-01"
          className="w-full rounded-xl border border-planner-sand bg-white px-4 py-3 text-sm"
        />
      </label>

      {error && (
        <p className="rounded-xl border border-planner-rose/30 bg-planner-rose-light px-3 py-2 text-sm text-planner-rose">
          {error}
        </p>
      )}

      <button
        type="submit"
        disabled={disabled || busy}
        className="w-full rounded-full bg-planner-sage px-4 py-3 text-sm font-medium text-white transition hover:bg-planner-sage/90 disabled:opacity-50"
      >
        {busy ? 'AI가 플랜을 만드는 중…' : 'AI 플랜 생성'}
      </button>
    </form>
  )
}

function PlanDashboard({ goal, onToggleTask, onBack, onGoWeekly, syncMessage }) {
  const [tab, setTab] = useState('summary')
  const today = todayDateString()

  const completed = goal.dailyTasks.filter((t) => t.status === TASK_STATUS.COMPLETED).length
  const total = goal.dailyTasks.length
  const percent = total ? Math.round((completed / total) * 100) : 0

  const todayTasks = goal.dailyTasks.filter((t) => t.date === today)
  const upcoming = goal.dailyTasks
    .filter((t) => t.date > today)
    .slice(0, 12)

  const tabs = [
    { id: 'summary', label: '요약' },
    { id: 'yearly', label: '연간' },
    { id: 'monthly', label: '월간' },
    { id: 'weekly', label: '주간' },
    { id: 'today', label: '오늘' },
  ]

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <button
          type="button"
          onClick={onBack}
          className="text-sm text-planner-ink-muted transition hover:text-planner-sage"
        >
          ← 목록
        </button>
        <button
          type="button"
          onClick={onGoWeekly}
          className="rounded-full border border-planner-sage px-3 py-1.5 text-xs font-medium text-planner-sage transition hover:bg-planner-sage hover:text-white"
        >
          Weekly로 이동
        </button>
      </div>

      <div className="rounded-2xl border border-planner-sand bg-white p-5 shadow-soft">
        <h2 className="text-lg font-medium text-planner-ink">{goal.title}</h2>
        <p className="mt-1 text-sm text-planner-ink-muted">
          {SCOPE_LABELS[goal.scope]} · {goal.startDate} ~ {goal.endDate}
        </p>
        <div className="mt-4">
          <div className="mb-1 flex justify-between text-xs text-planner-ink-muted">
            <span>진행률</span>
            <span>
              {completed}/{total} ({percent}%)
            </span>
          </div>
          <div className="h-2 overflow-hidden rounded-full bg-planner-warm">
            <div
              className="h-full rounded-full bg-planner-sage transition-all"
              style={{ width: `${percent}%` }}
            />
          </div>
        </div>
        {syncMessage && (
          <p className="mt-3 text-sm text-planner-sage">{syncMessage}</p>
        )}
      </div>

      <div className="flex flex-wrap gap-1 rounded-xl border border-planner-sand bg-planner-warm/50 p-1">
        {tabs.map((item) => (
          <button
            key={item.id}
            type="button"
            onClick={() => setTab(item.id)}
            className={[
              'rounded-lg px-3 py-1.5 text-xs font-medium transition',
              tab === item.id
                ? 'bg-white text-planner-sage shadow-soft'
                : 'text-planner-ink-muted hover:text-planner-ink',
            ].join(' ')}
          >
            {item.label}
          </button>
        ))}
      </div>

      <div className="rounded-2xl border border-planner-sand bg-white p-5 shadow-soft">
        {tab === 'summary' && (
          <div className="space-y-3">
            <p className="text-sm leading-relaxed text-planner-ink">{goal.summary}</p>
            {goal.description && (
              <p className="text-sm text-planner-ink-muted">{goal.description}</p>
            )}
          </div>
        )}

        {tab === 'yearly' && (
          <ul className="space-y-3">
            {goal.yearlyPlans.map((item) => (
              <li key={item.year} className="border-b border-planner-sand pb-3 last:border-0">
                <p className="text-sm font-medium text-planner-sage">{item.year}년</p>
                <p className="mt-1 text-sm text-planner-ink">{item.summary}</p>
              </li>
            ))}
          </ul>
        )}

        {tab === 'monthly' && (
          <ul className="space-y-3">
            {goal.monthlyPlans.map((item) => (
              <li
                key={`${item.year}-${item.month}`}
                className="border-b border-planner-sand pb-3 last:border-0"
              >
                <p className="text-sm font-medium text-planner-sage">
                  {item.year}년 {item.month}월
                </p>
                <p className="mt-1 text-sm text-planner-ink">{item.theme}</p>
              </li>
            ))}
          </ul>
        )}

        {tab === 'weekly' && (
          <ul className="space-y-3">
            {goal.weeklyPlans.map((item) => (
              <li
                key={`${item.year}-${item.month}-${item.weekNumber}`}
                className="border-b border-planner-sand pb-3 last:border-0"
              >
                <p className="text-sm font-medium text-planner-sage">
                  {item.year}.{item.month} · {item.weekNumber}주차
                </p>
                <p className="mt-1 text-sm text-planner-ink">{item.focusGoal}</p>
              </li>
            ))}
          </ul>
        )}

        {tab === 'today' && (
          <div className="space-y-4">
            <div>
              <h3 className="text-sm font-medium text-planner-ink">오늘의 To-Do</h3>
              {todayTasks.length === 0 ? (
                <p className="mt-2 text-sm text-planner-ink-muted">오늘 예정된 할 일이 없습니다.</p>
              ) : (
                <ul className="mt-2 space-y-2">
                  {todayTasks.map((task) => (
                    <li key={task.id}>
                      <label className="flex cursor-pointer items-start gap-2 text-sm">
                        <input
                          type="checkbox"
                          checked={task.status === TASK_STATUS.COMPLETED}
                          onChange={() => onToggleTask(task.id)}
                          className="mt-0.5 accent-planner-sage"
                        />
                        <span
                          className={
                            task.status === TASK_STATUS.COMPLETED
                              ? 'text-planner-ink-muted line-through'
                              : 'text-planner-ink'
                          }
                        >
                          {task.content}
                          <span className="ml-1 text-xs text-planner-ink-muted">
                            ({task.estimatedMin}분)
                          </span>
                        </span>
                      </label>
                    </li>
                  ))}
                </ul>
              )}
            </div>
            {upcoming.length > 0 && (
              <div>
                <h3 className="text-sm font-medium text-planner-ink">다가오는 할 일</h3>
                <ul className="mt-2 space-y-2">
                  {upcoming.map((task) => (
                    <li key={task.id} className="text-sm text-planner-ink-muted">
                      <span className="font-medium text-planner-sage">{task.date}</span>{' '}
                      {task.content}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

export default function GoalPlanView({ onGoWeekly }) {
  const {
    userKey,
    goalPlanData,
    updateGoalPlan,
    updateWeekly,
  } = useCloudSync()

  const [mode, setMode] = useState('list') // list | create | detail
  const [selectedId, setSelectedId] = useState(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [syncMessage, setSyncMessage] = useState('')

  const goals = goalPlanData?.goals || []
  const selected = useMemo(
    () => (goalPlanData?.goals || []).find((g) => g.id === selectedId) || null,
    [goalPlanData, selectedId],
  )

  const canGenerate = userKey && userKey !== GUEST_USER_KEY && userKey !== LOCAL_USER_KEY

  async function handleCreate(input) {
    setBusy(true)
    setError('')
    setSyncMessage('')
    try {
      const data = await generateActionPlan(input)
      const goal = buildStoredGoal(data.input, data.actionPlan)

      updateGoalPlan((prev) => ({
        goals: [goal, ...(prev.goals || [])],
      }))

      let filled = 0
      let skipped = 0
      updateWeekly((prev) => {
        const result = syncDailyTasksToWeekly(prev, goal)
        filled = result.filled
        skipped = result.skipped
        return result.weeklyData
      })
      setSyncMessage(
        skipped > 0
          ? `Weekly에 ${filled}개 반영 · 슬롯 부족으로 ${skipped}개는 AI Plan에만 남김`
          : `Weekly에 ${filled}개 할 일이 반영되었습니다`,
      )

      setSelectedId(goal.id)
      setMode('detail')
    } catch (err) {
      setError(err instanceof Error ? err.message : '플랜 생성 실패')
    } finally {
      setBusy(false)
    }
  }

  function handleToggleTask(taskId) {
    const current = (goalPlanData?.goals || [])
      .find((g) => g.id === selectedId)
      ?.dailyTasks?.find((t) => t.id === taskId)
    if (!current) return

    const nextCompleted = current.status !== TASK_STATUS.COMPLETED

    updateGoalPlan((prev) => ({
      goals: (prev.goals || []).map((goal) => {
        if (goal.id !== selectedId) return goal
        return {
          ...goal,
          dailyTasks: goal.dailyTasks.map((task) =>
            task.id === taskId
              ? {
                  ...task,
                  status: nextCompleted ? TASK_STATUS.COMPLETED : TASK_STATUS.TODO,
                }
              : task,
          ),
        }
      }),
    }))
    updateWeekly((prev) => syncGoalTaskStatusToWeekly(prev, taskId, nextCompleted))
  }

  function handleDelete(goalId) {
    if (!window.confirm('이 AI 플랜을 삭제할까요? (Weekly에 이미 넣은 할 일은 그대로 둡니다)')) {
      return
    }
    updateGoalPlan((prev) => ({
      goals: (prev.goals || []).filter((g) => g.id !== goalId),
    }))
    if (selectedId === goalId) {
      setSelectedId(null)
      setMode('list')
    }
  }

  if (mode === 'create') {
    return (
      <div className="mx-auto max-w-xl space-y-4">
        <button
          type="button"
          onClick={() => setMode('list')}
          className="text-sm text-planner-ink-muted hover:text-planner-sage"
        >
          ← 목록
        </button>
        <div className="rounded-2xl border border-planner-sand bg-white p-5 shadow-soft sm:p-6">
          <h2 className="text-lg font-medium text-planner-ink">새 AI 플랜</h2>
          <p className="mt-1 text-sm text-planner-ink-muted">
            목표를 입력하면 연·월·주·일 단위로 분해하고 Weekly 할 일에 자동 반영합니다.
          </p>
          {!canGenerate && (
            <p className="mt-3 rounded-xl border border-planner-sand bg-planner-warm/50 px-3 py-2 text-sm text-planner-ink-muted">
              AI 플랜 생성은 클라우드 계정 로그인 후 사용할 수 있습니다.
            </p>
          )}
          <div className="mt-4">
            <GoalForm
              onCreated={handleCreate}
              disabled={!canGenerate}
              busy={busy}
              error={error}
            />
          </div>
        </div>
      </div>
    )
  }

  if (mode === 'detail' && selected) {
    return (
      <div className="mx-auto max-w-2xl">
        <PlanDashboard
          goal={selected}
          onToggleTask={handleToggleTask}
          onBack={() => {
            setMode('list')
            setSelectedId(null)
            setSyncMessage('')
          }}
          onGoWeekly={onGoWeekly}
          syncMessage={syncMessage}
        />
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-2xl space-y-4">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-medium text-planner-ink">AI Plan</h2>
          <p className="text-sm text-planner-ink-muted">
            목표를 분해해 Weekly 할 일로 연결합니다
          </p>
        </div>
        <button
          type="button"
          onClick={() => {
            setError('')
            setMode('create')
          }}
          className="rounded-full bg-planner-sage px-4 py-2 text-sm font-medium text-white transition hover:bg-planner-sage/90"
        >
          + 새 플랜
        </button>
      </div>

      {goals.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-planner-sand bg-white p-10 text-center shadow-soft">
          <p className="text-sm text-planner-ink-muted">아직 생성된 AI 플랜이 없습니다.</p>
          <button
            type="button"
            onClick={() => setMode('create')}
            className="mt-4 text-sm font-medium text-planner-sage hover:underline"
          >
            첫 플랜 만들기 →
          </button>
        </div>
      ) : (
        <ul className="space-y-2">
          {goals.map((goal) => {
            const done = goal.dailyTasks.filter((t) => t.status === TASK_STATUS.COMPLETED).length
            return (
              <li key={goal.id}>
                <div className="flex items-stretch gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedId(goal.id)
                      setSyncMessage('')
                      setMode('detail')
                    }}
                    className="min-w-0 flex-1 rounded-2xl border border-planner-sand bg-white px-4 py-3 text-left shadow-soft transition hover:border-planner-sage-muted"
                  >
                    <p className="truncate font-medium text-planner-ink">{goal.title}</p>
                    <p className="mt-0.5 text-xs text-planner-ink-muted">
                      {SCOPE_LABELS[goal.scope]} · {goal.startDate} ~ {goal.endDate} · {done}/
                      {goal.dailyTasks.length} 완료
                    </p>
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDelete(goal.id)}
                    className="rounded-xl px-3 text-xs text-planner-rose transition hover:bg-planner-rose-light"
                    aria-label="삭제"
                  >
                    삭제
                  </button>
                </div>
              </li>
            )
          })}
        </ul>
      )}
    </div>
  )
}
