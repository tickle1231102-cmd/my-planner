import { useEffect, useMemo, useState } from 'react'
import { useCloudSync } from './context/CloudSyncContext.jsx'
import ExcludedDatesPicker from './components/ExcludedDatesPicker.jsx'
import { generateActionPlan } from './lib/goalPlanClient.js'
import { SCOPE_LABELS, TASK_STATUS } from './lib/goalPlanSchema.js'
import {
  isGoalLinked,
  normalizeGoalLinkSettings,
} from './lib/goalPlanDisplay.js'
import {
  buildStoredGoal,
  goalInputFromStoredGoal,
  previousPlanSnapshot,
  rebuildStoredGoal,
} from './lib/goalPlanStorage.js'
import {
  removeGoalTasksFromWeekly,
  resyncGoalToWeekly,
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

function GoalForm({
  onCreated,
  disabled,
  busy,
  error,
  initialValues,
  submitLabel = 'AI 플랜 생성',
  revisionNotesLabel = '수정 요청 (선택)',
}) {
  const defaults = defaultDates()
  const [title, setTitle] = useState(initialValues?.title || '')
  const [description, setDescription] = useState(initialValues?.description || '')
  const [scope, setScope] = useState(initialValues?.scope || 'SHORT_TERM')
  const [startDate, setStartDate] = useState(initialValues?.startDate || defaults.startDate)
  const [endDate, setEndDate] = useState(initialValues?.endDate || defaults.endDate)
  const [excludedWeekdays, setExcludedWeekdays] = useState(
    initialValues?.excludedWeekdays ?? [0],
  )
  const [excludedDates, setExcludedDates] = useState(initialValues?.excludedDates || [])
  const [revisionNotes, setRevisionNotes] = useState('')

  useEffect(() => {
    if (!startDate || !endDate || endDate < startDate) return
    setExcludedDates((prev) =>
      prev.filter((date) => date >= startDate && date <= endDate),
    )
  }, [startDate, endDate])

  function toggleWeekday(day) {
    setExcludedWeekdays((prev) =>
      prev.includes(day) ? prev.filter((d) => d !== day) : [...prev, day].sort(),
    )
  }

  async function handleSubmit(event) {
    event.preventDefault()

    await onCreated({
      title: title.trim(),
      description: description.trim() || undefined,
      scope,
      startDate,
      endDate,
      excludedWeekdays,
      excludedDates,
      revisionNotes: revisionNotes.trim() || undefined,
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

      <fieldset>
        <legend className="mb-2 text-xs font-medium text-planner-ink-muted">제외 날짜</legend>
        <ExcludedDatesPicker
          startDate={startDate}
          endDate={endDate}
          value={excludedDates}
          onChange={setExcludedDates}
          disabled={disabled || busy}
        />
      </fieldset>

      {revisionNotesLabel && (
        <label className="block">
          <span className="mb-1 block text-xs font-medium text-planner-ink-muted">
            {revisionNotesLabel}
          </span>
          <textarea
            value={revisionNotes}
            onChange={(e) => setRevisionNotes(e.target.value)}
            rows={3}
            disabled={disabled || busy}
            placeholder="예: 주 3회 운동으로 줄이고, 주말은 완전 휴식. 월말까지 5kg 감량에 맞춰 조정."
            className="w-full rounded-xl border border-planner-sand bg-white px-4 py-3 text-sm text-planner-ink outline-none focus:border-planner-sage focus:ring-2 focus:ring-planner-sage/20"
          />
        </label>
      )}

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
        {busy ? 'AI가 플랜을 만드는 중…' : submitLabel}
      </button>
    </form>
  )
}

function GoalLinkSettingsPanel({ goal, onApply, syncMessage, busy }) {
  const [settings, setSettings] = useState(() =>
    normalizeGoalLinkSettings(goal.linkSettings),
  )
  const linked = isGoalLinked(goal)

  useEffect(() => {
    setSettings(normalizeGoalLinkSettings(goal.linkSettings))
  }, [goal.id, goal.linkSettings])

  const toggles = [
    {
      key: 'showOnYearPage',
      label: '연간 플래너',
      hint: '연간 페이지에 AI Plan 요약 표시',
    },
    {
      key: 'showOnMonthPage',
      label: '월간 플래너',
      hint: '월간 페이지에 테마·주차 목표 표시',
    },
    {
      key: 'showOnWeekPage',
      label: '주간 플래너',
      hint: '주간 focus goal 표시 + 할 일 연동',
    },
  ]

  return (
    <div className="rounded-2xl border border-planner-sand bg-white p-5 shadow-soft">
      <h3 className="text-sm font-medium text-planner-ink">플래너 연동</h3>
      <p className="mt-1 text-xs text-planner-ink-muted">
        {linked
          ? '연동 범위를 언제든 켜거나 끌 수 있습니다.'
          : '플랜을 확인한 뒤 연동할 범위를 선택하고 연동하기를 눌러 주세요.'}
      </p>

      <ul className="mt-3 space-y-2">
        {toggles.map(({ key, label, hint }) => (
          <li key={key}>
            <label className="flex cursor-pointer items-start justify-between gap-3 rounded-xl border border-planner-sand/80 px-3 py-2.5 transition hover:bg-planner-warm/40">
              <span>
                <span className="block text-sm text-planner-ink">{label}</span>
                <span className="mt-0.5 block text-[11px] text-planner-ink-muted">{hint}</span>
              </span>
              <input
                type="checkbox"
                checked={!!settings[key]}
                onChange={(event) =>
                  setSettings((prev) => ({ ...prev, [key]: event.target.checked }))
                }
                className="mt-1 size-4 shrink-0 accent-planner-sage"
              />
            </label>
          </li>
        ))}
      </ul>

      {syncMessage && (
        <p className="mt-3 text-sm text-planner-sage">{syncMessage}</p>
      )}

      <button
        type="button"
        disabled={busy}
        onClick={() => onApply(settings)}
        className="mt-4 w-full rounded-full bg-planner-sage px-4 py-2.5 text-sm font-medium text-white transition hover:bg-planner-sage/90 disabled:opacity-50"
      >
        {busy ? '적용 중…' : linked ? '연동 설정 저장' : '연동하기'}
      </button>
    </div>
  )
}

function PlanDashboard({
  goal,
  onToggleTask,
  onBack,
  onGoWeekly,
  onRegenerate,
  onApplyLinkSettings,
  syncMessage,
  busy,
  canGenerate,
}) {
  const [tab, setTab] = useState('summary')
  const [editing, setEditing] = useState(false)
  const [regenError, setRegenError] = useState('')
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
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={onGoWeekly}
            className="rounded-full border border-planner-sage px-3 py-1.5 text-xs font-medium text-planner-sage transition hover:bg-planner-sage hover:text-white"
          >
            Weekly로 이동
          </button>
          <button
            type="button"
            onClick={() => {
              setRegenError('')
              setEditing((open) => !open)
            }}
            disabled={!canGenerate || busy}
            className="rounded-full border border-planner-sand px-3 py-1.5 text-xs font-medium text-planner-ink-muted transition hover:border-planner-sage hover:text-planner-sage disabled:opacity-50"
          >
            {editing ? '수정 닫기' : '수정 · 재생성'}
          </button>
        </div>
      </div>

      {editing && (
        <div className="rounded-2xl border border-planner-sand bg-white p-5 shadow-soft">
          <h3 className="text-sm font-medium text-planner-ink">플랜 수정 후 재생성</h3>
          <p className="mt-1 text-xs text-planner-ink-muted">
            목표·기간·수정 요청을 바꾼 뒤 AI가 플랜을 다시 만듭니다. 주간 연동이 켜져 있으면
            Weekly 할 일도 갱신됩니다.
          </p>
          <div className="mt-4">
            <GoalForm
              initialValues={goalInputFromStoredGoal(goal)}
              onCreated={async (input) => {
                setRegenError('')
                try {
                  await onRegenerate(input)
                  setEditing(false)
                } catch (err) {
                  setRegenError(
                    err instanceof Error ? err.message : '플랜 재생성 실패',
                  )
                }
              }}
              disabled={!canGenerate}
              busy={busy}
              error={regenError}
              submitLabel={busy ? '재생성 중…' : 'AI 플랜 재생성'}
            />
          </div>
        </div>
      )}

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
      </div>

      <GoalLinkSettingsPanel
        goal={goal}
        onApply={onApplyLinkSettings}
        syncMessage={syncMessage}
        busy={busy}
      />

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
        ...prev,
        goals: [goal, ...(prev.goals || [])],
      }))

      setSelectedId(goal.id)
      setMode('detail')
    } catch (err) {
      setError(err instanceof Error ? err.message : '플랜 생성 실패')
    } finally {
      setBusy(false)
    }
  }

  function applyWeeklyLink(goal, settings, previousSettings) {
    const weekEnabled = settings.showOnWeekPage
    const weekWasEnabled = previousSettings.showOnWeekPage
    const displayParts = []
    if (settings.showOnYearPage) displayParts.push('연간')
    if (settings.showOnMonthPage) displayParts.push('월간')
    if (settings.showOnWeekPage) displayParts.push('주간')

    if (weekEnabled) {
      let filled = 0
      let skipped = 0
      updateWeekly((prev) => {
        const result = resyncGoalToWeekly(prev, goal)
        filled = result.filled
        skipped = result.skipped
        return result.weeklyData
      })
      const weeklyMsg =
        skipped > 0
          ? `Weekly ${filled}개 반영 · 슬롯 부족 ${skipped}개`
          : `Weekly ${filled}개 할 일 연동`
      return displayParts.length > 0
        ? `${displayParts.join('·')} 연동 · ${weeklyMsg}`
        : weeklyMsg
    }

    if (weekWasEnabled) {
      updateWeekly((prev) => removeGoalTasksFromWeekly(prev, goal.id))
    }

    if (displayParts.length === 0) {
      return weekWasEnabled
        ? '플래너 연동 해제 · Weekly 할 일 제거'
        : '플래너 연동이 모두 해제되었습니다'
    }

    return weekWasEnabled
      ? `${displayParts.join('·')} 연동 · Weekly 할 일 제거`
      : `${displayParts.join('·')} 플래너에 연동되었습니다`
  }

  function handleApplyLinkSettings(goalId, settings) {
    const goal = (goalPlanData?.goals || []).find((item) => item.id === goalId)
    if (!goal) return

    const normalized = normalizeGoalLinkSettings(settings)
    const previous = normalizeGoalLinkSettings(goal.linkSettings)
    const nextLinked = isGoalLinked({ linkSettings: normalized })

    const updatedGoal = {
      ...goal,
      linkSettings: normalized,
      linkedAt: nextLinked ? goal.linkedAt || new Date().toISOString() : null,
    }

    updateGoalPlan((prev) => ({
      ...prev,
      goals: (prev.goals || []).map((item) =>
        item.id === goalId ? updatedGoal : item,
      ),
    }))

    setSyncMessage(applyWeeklyLink(updatedGoal, normalized, previous))
  }

  async function handleRegenerate(input) {
    if (!selected) throw new Error('선택된 플랜이 없습니다')
    setBusy(true)
    setSyncMessage('')
    try {
      const payload = {
        ...input,
        previousPlan: previousPlanSnapshot(selected),
      }
      const data = await generateActionPlan(payload)
      const goal = rebuildStoredGoal(selected, data.input, data.actionPlan)

      updateGoalPlan((prev) => ({
        ...prev,
        goals: (prev.goals || []).map((item) =>
          item.id === selected.id ? goal : item,
        ),
      }))

      if (normalizeGoalLinkSettings(selected.linkSettings).showOnWeekPage) {
        setSyncMessage(
          applyWeeklyLink(
            goal,
            normalizeGoalLinkSettings(goal.linkSettings),
            normalizeGoalLinkSettings(selected.linkSettings),
          ),
        )
      } else {
        setSyncMessage('플랜이 재생성되었습니다')
      }
    } finally {
      setBusy(false)
    }
  }

  function handleToggleTask(taskId) {
    const goal = (goalPlanData?.goals || []).find((g) => g.id === selectedId)
    const current = goal?.dailyTasks?.find((t) => t.id === taskId)
    if (!current) return

    const nextCompleted = current.status !== TASK_STATUS.COMPLETED

    updateGoalPlan((prev) => ({
      ...prev,
      goals: (prev.goals || []).map((item) => {
        if (item.id !== selectedId) return item
        return {
          ...item,
          dailyTasks: item.dailyTasks.map((task) =>
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

    if (normalizeGoalLinkSettings(goal?.linkSettings).showOnWeekPage) {
      updateWeekly((prev) => syncGoalTaskStatusToWeekly(prev, taskId, nextCompleted))
    }
  }

  function handleDelete(goalId) {
    if (!window.confirm('이 AI 플랜을 삭제할까요? (Weekly에 이미 넣은 할 일은 그대로 둡니다)')) {
      return
    }
    updateGoalPlan((prev) => ({
      ...prev,
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
            목표를 입력하면 연·월·주·일 단위로 분해합니다. 생성 후 플랜을 확인하고 연동하기를
            눌러 플래너에 반영할 수 있습니다.
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
              revisionNotesLabel={null}
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
          onRegenerate={handleRegenerate}
          onApplyLinkSettings={(settings) => handleApplyLinkSettings(selected.id, settings)}
          syncMessage={syncMessage}
          busy={busy}
          canGenerate={canGenerate}
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
            목표를 분해하고, 확인 후 플래너에 연동합니다
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
            const linked = isGoalLinked(goal)
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
                      {linked ? ' · 연동됨' : ' · 미연동'}
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
