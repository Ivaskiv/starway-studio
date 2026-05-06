import type { AiMentorDashboardTab, CurrentFlow, CurrentFlowStep, DailyHistoryEntryLike, DailyHistoryProgress, TimelineDayPresentation, TimelineDayTone, TimelineDot } from '@/features/daily-cycle/utils/dashboard.types'
import type { MicroTask as MicroTaskItem } from '@/features/microTask/types/types'
import { WHEEL_CATEGORIES } from '@/features/wheel/types/wheel.types'

export const TRIAL_PROGRESS_CLASS: Record<number, string> = {
  1: 'w-[14%]',
  2: 'w-[29%]',
  3: 'w-[43%]',
  4: 'w-[57%]',
  5: 'w-[71%]',
  6: 'w-[86%]',
  7: 'w-full',
}

export const FUNNEL_SEGMENTS = [
  { label: 'Практикум (free)', value: '—', widthClass: 'w-full', colorClass: 'bg-[#4d9de0]' },
  { label: 'Реєстрація', value: '—', widthClass: 'w-[60%]', colorClass: 'bg-[#3a7bd5]' },
  { label: 'Активація', value: '—', widthClass: 'w-[40%]', colorClass: 'bg-[#2d6bc4]' },
  { label: 'Підписка', value: '—', widthClass: 'w-[13%]', colorClass: 'bg-[#1f5aad]' },
] as const

export const WHEEL_LABEL_MAP = new Map(WHEEL_CATEGORIES.map(item => [item.id, item.nameUk]))
export const WHEEL_EMOJI_MAP = new Map(WHEEL_CATEGORIES.map(item => [item.id, item.emoji]))

export const formatWheelDate = (value: Date) =>
  value.toLocaleDateString('uk-UA', { day: 'numeric', month: 'long' })

export function formatRemainingDaysLabel(value: number) {
  if (value <= 0) return 'До кінця дня'
  if (value === 1) return 'Ще 1 день'
  if (value >= 2 && value <= 4) return `Ще ${value} дні`
  return `Ще ${value} днів`
}

export function formatCompactDate(value: Date) {
  return [
    String(value.getDate()).padStart(2, '0'),
    String(value.getMonth() + 1).padStart(2, '0'),
  ].join('.')
}

export function formatVerboseDate(value: Date | string) {
  const date = typeof value === 'string' ? new Date(value) : value
  return date.toLocaleDateString('uk-UA', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  })
}

export function formatCompactDateKey(dateKey: string) {
  const [year, month, day] = dateKey.split('-').map(Number)
  if (!year || !month || !day) return dateKey
  return formatCompactDate(new Date(year, month - 1, day))
}

export function formatVerboseDateKey(dateKey: string) {
  const [year, month, day] = dateKey.split('-').map(Number)
  if (!year || !month || !day) return dateKey
  return formatVerboseDate(new Date(year, month - 1, day))
}

export function buildJournalDayUrl(dayDateKey: string) {
  return `/dashboard/journal?date=${dayDateKey}`
}

export function getCycleProgressRingMetrics(percentValue: number) {
  const percent = Math.max(0, Math.min(100, Math.round(percentValue)))
  const radius = 68
  const circumference = 2 * Math.PI * radius
  const dashOffset = circumference * (1 - percent / 100)

  return {
    percent,
    radius,
    circumference,
    dashOffset,
  }
}

export function isWheelDue(lastWheelDate: Date | null, now: Date) {
  if (!lastWheelDate) return true
  const nextWheelDate = new Date(lastWheelDate.getTime() + 30 * 24 * 60 * 60 * 1000)
  return nextWheelDate <= now
}

export function toDateKey(value: Date | string) {
  const date = typeof value === 'string' ? new Date(value) : value
  return [
    String(date.getFullYear()),
    String(date.getMonth() + 1).padStart(2, '0'),
    String(date.getDate()).padStart(2, '0'),
  ].join('-')
}

export function getRelativeDateKey(baseDateKey: string, offsetDays: number) {
  const [year, month, day] = baseDateKey.split('-').map(Number)
  const date = new Date(year, (month ?? 1) - 1, day ?? 1)
  date.setDate(date.getDate() + offsetDays)
  return toDateKey(date)
}

export function getDailyHistoryProgress(
  entry: DailyHistoryEntryLike,
  taskStats?: {
    incompleteMicroTaskCount?: number
    totalMicroTaskCount?: number
  },
) {
  const content = entry.content && typeof entry.content === 'object' && !Array.isArray(entry.content)
    ? entry.content as Record<string, unknown>
    : null
  const finalizedAt = typeof content?.finalizedAt === 'string' ? content.finalizedAt : null
  const finalizedSession = typeof content?.finalizedSession === 'string' ? content.finalizedSession : null
  const morningMeta = content?.morningMeta && typeof content.morningMeta === 'object' && !Array.isArray(content.morningMeta)
    ? content.morningMeta as Record<string, unknown>
    : null
  const eveningMeta = content?.eveningMeta && typeof content.eveningMeta === 'object' && !Array.isArray(content.eveningMeta)
    ? content.eveningMeta as Record<string, unknown>
    : null
  const morningStarted = Boolean(content?.morning && typeof content.morning === 'object' && !Array.isArray(content.morning))
  const eveningStarted = Boolean(content?.evening && typeof content.evening === 'object' && !Array.isArray(content.evening))
  const skipped = entry.status === 'SKIPPED' || content?.status === 'SKIPPED'
  const entryDateKey = toDateKey(entry.date)
  const todayDateKey = toDateKey(new Date())
  const yesterdayDateKey = getRelativeDateKey(todayDateKey, -1)
  const isHistoricalDay = entryDateKey < yesterdayDateKey
  const incompleteMicroTaskCount = Math.max(0, taskStats?.incompleteMicroTaskCount ?? 0)
  const totalMicroTaskCount = Math.max(0, taskStats?.totalMicroTaskCount ?? 0)
  const completedMicroTaskCount = Math.max(0, totalMicroTaskCount - incompleteMicroTaskCount)
  const hasTaskProgress = completedMicroTaskCount > 0 || totalMicroTaskCount > 0
  const morningDone = typeof morningMeta?.completedAt === 'string'
  const eveningDone = typeof eveningMeta?.completedAt === 'string'
  const eveningFinalized = finalizedSession === 'evening' && Boolean(finalizedAt)
  const tasksDone = totalMicroTaskCount > 0
    ? incompleteMicroTaskCount === 0
    : eveningFinalized || skipped
  const allCoreStepsDone = morningDone && tasksDone && eveningDone
  const completedLateMarker = Boolean(
    entry.status === 'COMPLETED_LATE'
    || typeof entry.lateCompletedAt === 'string'
    || (content?.completedLate === true && finalizedSession === 'evening')
    || (finalizedSession === 'evening' && finalizedAt && toDateKey(finalizedAt) !== toDateKey(entry.date))
  )
  const legacyCompleted = Boolean(
    entry.status === 'COMPLETED'
    || (finalizedSession === 'evening' && finalizedAt && toDateKey(finalizedAt) === entryDateKey)
  )
  const completed = isHistoricalDay
    ? legacyCompleted && !completedLateMarker
    : allCoreStepsDone && !completedLateMarker
  const completedLate = isHistoricalDay
    ? completedLateMarker
    : allCoreStepsDone && completedLateMarker
  const hasAnalysis = Boolean(
    (typeof entry.aiAnalysis === 'string' && entry.aiAnalysis.trim().length > 0)
    || typeof content?.analysisGeneratedAt === 'string',
  )
  const analysisDone = completed || completedLate || Boolean(finalizedAt) || hasAnalysis
  const unfinishedStepCount = [morningDone, tasksDone, eveningDone].reduce(
    (sum, done) => sum + (done ? 0 : 1),
    0,
  )

  return {
    morningDone,
    tasksDone,
    eveningDone,
    analysisDone,
    hasTaskProgress,
    finalizedAt,
    skipped,
    hasProgress: morningStarted || eveningStarted || completed || completedLate || skipped || hasTaskProgress,
    completed,
    completedLate,
    unfinishedStepCount,
    incompleteMicroTaskCount,
    totalMicroTaskCount,
  } satisfies DailyHistoryProgress
}

export function getTimelineDayPresentation(options: {
  dayDateKey: string
  todayDateKey: string
  yesterdayDateKey: string
  active: boolean
  showEveningSession: boolean
  recoveryDateKey: string | null
  recoveryTargetDateKey: string | null
  recoveryTargetSession: 'morning' | 'evening' | null
  dayProgress?: DailyHistoryProgress
}) {
  const {
    dayDateKey,
    todayDateKey,
    yesterdayDateKey,
    showEveningSession,
    recoveryDateKey,
    recoveryTargetDateKey,
    recoveryTargetSession,
    dayProgress,
  } = options

  const isCurrentDate = dayDateKey === todayDateKey
  const isFutureDate = dayDateKey > todayDateKey
  const finalizedAt = dayProgress?.finalizedAt ?? null
  const hasProgress = Boolean(dayProgress?.hasProgress)
  const skipped = Boolean(dayProgress?.skipped)
  const completed = Boolean(dayProgress?.completed)
  const completedLate = Boolean(dayProgress?.completedLate)
  const morningDone = Boolean(dayProgress?.morningDone)
  const tasksDone = Boolean(dayProgress?.tasksDone)
  const eveningDone = Boolean(dayProgress?.eveningDone)
  const hasTaskProgress = Boolean(dayProgress?.hasTaskProgress)
  const unfinishedStepCount = dayProgress?.unfinishedStepCount ?? 0
  const incompleteMicroTaskCount = dayProgress?.incompleteMicroTaskCount ?? 0
  const doneCount = completed || completedLate
    ? 3
    : [morningDone, tasksDone, eveningDone].filter(Boolean).length
  const matchesRecoveryTarget = dayDateKey === (recoveryDateKey ?? recoveryTargetDateKey)
  const isRecoveryTargetDay = Boolean(
    dayDateKey === yesterdayDateKey
    && !finalizedAt
    && !isFutureDate
    && !isCurrentDate
    && !completed
    && !completedLate
    && (matchesRecoveryTarget || hasProgress || Boolean(dayProgress)),
  )
  const canResumeDay = isRecoveryTargetDay
  const recoverySessionForDay: 'morning' | 'evening' | null = isRecoveryTargetDay
    ? (dayDateKey === recoveryTargetDateKey && recoveryTargetSession
      ? recoveryTargetSession
      : dayDateKey === recoveryDateKey
        ? (showEveningSession ? 'evening' : 'morning')
        : dayProgress?.morningDone
          ? 'evening'
          : 'morning')
    : null

  const baseDayTone = getTimelineDayTone({
    dayDateKey,
    todayDateKey,
    completed,
    completedLate,
    skipped,
    morningDone,
    tasksDone,
    eveningDone,
    hasTaskProgress,
  })
  const dayTone = isRecoveryTargetDay && baseDayTone === 'missed' ? 'partial' : baseDayTone
  const missed = dayTone === 'missed'
  const partial = dayTone === 'partial'

  return {
    hasProgress,
    finalizedAt,
    skipped,
    completed,
    completedLate,
    missed,
    partial,
    isRecoveryTargetDay,
    canResumeDay,
    recoverySessionForDay,
    unfinishedStepCount,
    incompleteMicroTaskCount,
    doneCount: Math.min(doneCount, 3),
    dayTone,
    dayLabel: getTimelineDayLabel({ tone: dayTone, isCompletedLate: completedLate, doneCount: Math.min(doneCount, 3) }),
    dayDots: getTimelineDots({
      tone: dayTone,
      morningDone: Boolean(dayProgress?.morningDone),
      tasksDone: Boolean(dayProgress?.tasksDone),
      eveningDone: Boolean(dayProgress?.eveningDone),
      isRecoveryTargetDay,
    }),
  } satisfies TimelineDayPresentation
}

export function getEntryTaskStats(entry: DailyHistoryEntryLike, tasks: MicroTaskItem[]) {
  const dateKey = toDateKey(entry.date)
  const sourceEntryIds = getEntrySourceIds(entry)

  const relatedTasks = tasks.filter((task) => {
    const createdDateKey = task.createdAt?.slice(0, 10) ?? null
    const completedDateKey = task.completedAt?.slice(0, 10) ?? null
    const dueDateKey = task.dueAt?.slice(0, 10) ?? task.expiresAt?.slice(0, 10) ?? null
    const belongsToEntry = task.generatedFromEntryId ? sourceEntryIds.includes(task.generatedFromEntryId) : false

    return createdDateKey === dateKey
      || completedDateKey === dateKey
      || dueDateKey === dateKey
      || belongsToEntry
  })

  return {
    totalMicroTaskCount: relatedTasks.length,
    incompleteMicroTaskCount: relatedTasks.filter((task) => {
      const status = task.status ?? 'PENDING'
      const meta = task.meta
      const manualUiStatus = meta && typeof meta === 'object' && !Array.isArray(meta)
        ? (meta as Record<string, unknown>).uiStatus
        : null
      const isDone = status === 'COMPLETED' || Boolean(task.completedAt) || manualUiStatus === 'done'
      const isSkipped = status === 'skipped' || status === 'expired' || manualUiStatus === 'skipped'
      return !isDone && !isSkipped
    }).length,
  }
}

export function getEntryContent(entry: DailyHistoryEntryLike | undefined | null) {
  return entry?.content && typeof entry.content === 'object' && !Array.isArray(entry.content)
    ? entry.content as Record<string, unknown>
    : null
}

export function hasSessionAnswers(content: Record<string, unknown> | null, session: 'morning' | 'evening') {
  const value = content?.[session]
  return Boolean(value && typeof value === 'object' && !Array.isArray(value) && Object.keys(value as Record<string, unknown>).length > 0)
}

export function getEntrySourceIds(entry: DailyHistoryEntryLike | null | undefined) {
  if (!entry) return []
  const sourceIds = Array.isArray(entry.sourceEntryIds)
    ? entry.sourceEntryIds.filter((value): value is string => typeof value === 'string' && value.length > 0)
    : []

  if (sourceIds.length > 0) return sourceIds
  return typeof entry.id === 'string' && entry.id.length > 0 ? [entry.id] : []
}

export function getLatestRecoveryTarget(
  history: DailyHistoryEntryLike[],
  todayDateKey: string,
) {
  const yesterdayDateKey = getRelativeDateKey(todayDateKey, -1)
  const sorted = [...history].sort((left, right) => new Date(right.date).getTime() - new Date(left.date).getTime())

  for (const entry of sorted) {
    const dateKey = toDateKey(entry.date)
    if (dateKey >= todayDateKey) continue
    if (dateKey !== yesterdayDateKey) continue

    const progress = getDailyHistoryProgress(entry)
    if (progress.finalizedAt || progress.skipped) continue

    const session: 'morning' | 'evening' = progress.morningDone ? 'evening' : 'morning'
    return {
      dateKey,
      session,
    }
  }

  return null
}

export function getFirstIncompleteStep(progress?: DailyHistoryProgress | null): CurrentFlowStep {
  if (!progress?.morningDone) return 'morning'
  if (!progress?.tasksDone) return 'tasks'
  if (!progress?.eveningDone) return 'evening'
  return 'analysis'
}

export function getTodayStep(options: {
  showMorningSession: boolean
  showEveningSession: boolean
  hasMorningAnswers: boolean
  hasTasksToday: boolean
  hasActiveMicroTasks: boolean
}): CurrentFlowStep {
  const {
    showMorningSession,
    showEveningSession,
    hasMorningAnswers,
    hasTasksToday,
    hasActiveMicroTasks,
  } = options

  if (showMorningSession) return 'morning'
  if (showEveningSession) return 'evening'
  if (!hasMorningAnswers) return 'morning'
  if (!hasTasksToday || hasActiveMicroTasks) return 'tasks'
  return 'evening'
}

export function resolveCurrentFlow(options: {
  todayDateKey: string
  yesterdayDateKey: string
  reportDayKey: string | null
  cycleRecoveryDateKey: string | null
  recoveryPromptDateKey: string | null
  recoveryTargetDateKey: string | null
  showMorningSession: boolean
  showEveningSession: boolean
  hasMorningAnswers: boolean
  hasTasksToday: boolean
  hasActiveMicroTasks: boolean
  yesterdayProgress: DailyHistoryProgress | null
  activeRecoveryProgress: DailyHistoryProgress | null
}): CurrentFlow {
  const {
    todayDateKey,
    yesterdayDateKey,
    reportDayKey,
    cycleRecoveryDateKey,
    recoveryPromptDateKey,
    recoveryTargetDateKey,
    showMorningSession,
    showEveningSession,
    hasMorningAnswers,
    hasTasksToday,
    hasActiveMicroTasks,
    yesterdayProgress,
    activeRecoveryProgress,
  } = options

  if (reportDayKey) {
    return { mode: 'history', dateKey: reportDayKey, step: 'analysis' }
  }

  if (cycleRecoveryDateKey) {
    return {
      mode: 'recovery',
      dateKey: cycleRecoveryDateKey,
      step: showMorningSession
        ? 'morning'
        : showEveningSession
          ? 'evening'
          : getFirstIncompleteStep(activeRecoveryProgress),
    }
  }

  if (
    recoveryPromptDateKey === yesterdayDateKey
    || (!cycleRecoveryDateKey && recoveryTargetDateKey === yesterdayDateKey)
  ) {
    return {
      mode: 'blocked',
      dateKey: yesterdayDateKey,
      step: getFirstIncompleteStep(yesterdayProgress),
    }
  }

  return {
    mode: 'today',
    dateKey: todayDateKey,
    step: getTodayStep({
      showMorningSession,
      showEveningSession,
      hasMorningAnswers,
      hasTasksToday,
      hasActiveMicroTasks,
    }),
  }
}

export function getTimelineDayTone(options: {
  dayDateKey: string
  todayDateKey: string
  completed: boolean
  completedLate: boolean
  skipped: boolean
  morningDone: boolean
  tasksDone: boolean
  eveningDone: boolean
  hasTaskProgress: boolean
}) {
  const {
    dayDateKey,
    todayDateKey,
    completed,
    completedLate,
    skipped,
    morningDone,
    tasksDone,
    eveningDone,
    hasTaskProgress,
  } = options
  const isPast = dayDateKey < todayDateKey
  const isToday = dayDateKey === todayDateKey
  const fullyCompleted = morningDone && tasksDone && eveningDone

  if (isToday) return 'active' satisfies TimelineDayTone
  if (!isPast) return 'future' satisfies TimelineDayTone
  if (completed || completedLate) return 'done' satisfies TimelineDayTone
  if (skipped && !morningDone && !hasTaskProgress && !eveningDone) return 'missed' satisfies TimelineDayTone
  if (fullyCompleted) return 'done' satisfies TimelineDayTone
  if (morningDone || hasTaskProgress || eveningDone) return 'partial' satisfies TimelineDayTone
  return 'missed' satisfies TimelineDayTone
}

export function getTimelineDayLabel(options: {
  tone: TimelineDayTone
  isCompletedLate: boolean
  doneCount: number
}) {
  const { tone, doneCount } = options

  if (tone === 'active') return 'активно'
  if (tone === 'partial') return `${doneCount}/3`
  if (tone === 'done') return ''
  if (tone === 'missed') return '---'
  if (tone === 'future') return 'далі'
  return ''
}

export function getTimelineCardClass(tone: TimelineDayTone) {
  switch (tone) {
    case 'active':
      return 'scale-[1.03] border border-[rgba(var(--accent-soft-rgb),0.44)] bg-[linear-gradient(180deg,rgba(58,123,213,0.24),rgba(32,83,158,0.14))] shadow-[0_14px_28px_rgba(0,0,0,0.22),0_0_0_1px_rgba(var(--accent-soft-rgb),0.18),inset_0_1px_0_rgba(255,255,255,0.12)]'
    case 'done':
      return 'border border-[rgba(120,190,120,0.22)] bg-[linear-gradient(180deg,rgba(118,181,124,0.22),rgba(118,181,124,0.12))] ring-1 ring-[rgba(120,190,120,0.18)] shadow-[inset_0_1px_0_rgba(255,255,255,0.05)]'
    case 'partial':
      return 'border border-[rgba(250,204,21,0.28)] bg-[linear-gradient(180deg,rgba(250,204,21,0.22),rgba(250,204,21,0.12))] ring-1 ring-[rgba(250,204,21,0.22)] shadow-[inset_0_1px_0_rgba(255,255,255,0.05)]'
    case 'missed':
      return 'border border-[rgba(248,113,113,0.22)] bg-[linear-gradient(180deg,rgba(248,113,113,0.18),rgba(248,113,113,0.10))] shadow-[inset_0_1px_0_rgba(255,255,255,0.04)]'
    case 'future':
      return 'border border-[rgba(255,255,255,0.05)] bg-[rgba(255,255,255,0.02)]'
  }
}

export function getTimelineDigitClass(tone: TimelineDayTone) {
  switch (tone) {
    case 'active':
      return 'bg-[rgba(var(--accent-soft-rgb),0.18)] text-[rgb(var(--accent-soft-rgb))]'
    case 'done':
      return 'bg-[rgba(120,190,120,0.16)] text-[var(--color-success)]'
    case 'partial':
      return 'bg-[rgba(250,204,21,0.16)] text-[rgb(250,204,21)]'
    case 'missed':
      return 'bg-[rgba(248,113,113,0.16)] text-[rgb(248,113,113)]'
    case 'future':
      return 'bg-[rgba(255,255,255,0.04)] text-[var(--text-muted)]'
  }
}

export function getTimelineLabelClass(tone: TimelineDayTone) {
  switch (tone) {
    case 'active':
      return 'text-[rgb(var(--accent-soft-rgb))]'
    case 'done':
      return 'text-emerald-300'
    case 'partial':
      return 'text-amber-200'
    case 'missed':
      return 'text-rose-300'
    case 'future':
      return 'text-[var(--text-secondary)]'
  }
}

export function getTimelineDots(options: {
  tone: TimelineDayTone
  morningDone: boolean
  tasksDone: boolean
  eveningDone: boolean
  isRecoveryTargetDay: boolean
}) {
  const { tone, morningDone, tasksDone, eveningDone, isRecoveryTargetDay } = options

  if (tone === 'missed' || tone === 'future') {
    if (tone === 'missed') {
      if (isRecoveryTargetDay) {
        return [
          { toneClass: 'bg-amber-300/85 shadow-[0_0_0_2px_rgba(250,204,21,0.16)]', content: '', label: 'Ранок', tooltip: 'Вчорашній день ще очікує на завершення: почни з ранкової сесії.' },
          { toneClass: 'bg-amber-300/65 shadow-[0_0_0_2px_rgba(250,204,21,0.12)]', content: '', label: 'Мікрозавдання', tooltip: 'Мікрозавдання цього recovery-дня ще чекають на виконання.' },
          { toneClass: 'bg-amber-300/45 shadow-[0_0_0_2px_rgba(250,204,21,0.08)]', content: '', label: 'Вечір', tooltip: 'Вечірній підсумок цього recovery-дня ще не закрито.' },
        ] satisfies TimelineDot[]
      }
      return [
        { toneClass: 'bg-rose-400/85 shadow-[0_0_0_2px_rgba(251,113,133,0.16)]', content: '', label: 'Ранок', tooltip: 'День пропущено: ранкова сесія не завершена вчасно.' },
        { toneClass: 'bg-rose-400/65 shadow-[0_0_0_2px_rgba(251,113,133,0.12)]', content: '', label: 'Мікрозавдання', tooltip: 'День пропущено: мікрозавдання не були закриті.' },
        { toneClass: 'bg-rose-400/45 shadow-[0_0_0_2px_rgba(251,113,133,0.08)]', content: '', label: 'Вечір', tooltip: 'День пропущено: вечірній підсумок не завершено.' },
      ] satisfies TimelineDot[]
    }

    return [
      { toneClass: 'bg-white/18', content: '', label: 'Ранок', tooltip: 'Ранкова сесія ще попереду.' },
      { toneClass: 'bg-white/14', content: '', label: 'Мікрозавдання', tooltip: 'Мікрозавдання для цього дня ще попереду.' },
      { toneClass: 'bg-white/10', content: '', label: 'Вечір', tooltip: 'Вечірній підсумок для цього дня ще попереду.' },
    ] satisfies TimelineDot[]
  }

  if (tone === 'done') {
    return [
      { toneClass: 'bg-emerald-400/90 shadow-[0_0_0_2px_rgba(74,222,128,0.16)]', content: '', label: 'Ранок', tooltip: 'Ранкова сесія завершена.' },
      { toneClass: 'bg-emerald-400/75 shadow-[0_0_0_2px_rgba(74,222,128,0.12)]', content: '', label: 'Мікрозавдання', tooltip: 'Мікрозавдання дня закриті.' },
      { toneClass: 'bg-emerald-400/60 shadow-[0_0_0_2px_rgba(74,222,128,0.08)]', content: '', label: 'Вечір', tooltip: 'Вечірній підсумок завершений.' },
    ] satisfies TimelineDot[]
  }

  if (tone === 'active') {
    return [
      {
        toneClass: morningDone ? 'bg-emerald-400/90 shadow-[0_0_0_2px_rgba(74,222,128,0.16)]' : 'bg-sky-400/90 shadow-[0_0_0_2px_rgba(56,189,248,0.16)]',
        content: '',
        label: 'Ранок',
        tooltip: morningDone ? 'Ранкова сесія завершена.' : 'Ранкова сесія активна або в процесі.',
      },
      {
        toneClass: tasksDone ? 'bg-emerald-400/75 shadow-[0_0_0_2px_rgba(74,222,128,0.12)]' : 'bg-sky-400/75 shadow-[0_0_0_2px_rgba(56,189,248,0.12)]',
        content: '',
        label: 'Мікрозавдання',
        tooltip: tasksDone ? 'Мікрозавдання дня вже закриті.' : 'Мікрозавдання цього дня ще в процесі.',
      },
      {
        toneClass: eveningDone ? 'bg-emerald-400/60 shadow-[0_0_0_2px_rgba(74,222,128,0.08)]' : 'bg-sky-400/60 shadow-[0_0_0_2px_rgba(56,189,248,0.08)]',
        content: '',
        label: 'Вечір',
        tooltip: eveningDone ? 'Вечірній підсумок завершений.' : 'Вечірній підсумок ще не закрито.',
      },
    ] satisfies TimelineDot[]
  }

  return [
    {
      toneClass: morningDone ? 'bg-emerald-400/90 shadow-[0_0_0_2px_rgba(74,222,128,0.16)]' : 'bg-rose-400/90 shadow-[0_0_0_2px_rgba(251,113,133,0.16)]',
      content: '',
      label: 'Ранок',
      tooltip: morningDone ? 'Ранкова сесія завершена.' : 'Ранкова сесія ще не завершена.',
    },
    {
      toneClass: tasksDone ? 'bg-emerald-400/75 shadow-[0_0_0_2px_rgba(74,222,128,0.12)]' : 'bg-rose-400/75 shadow-[0_0_0_2px_rgba(251,113,133,0.12)]',
      content: '',
      label: 'Мікрозавдання',
      tooltip: tasksDone ? 'Мікрозавдання дня закриті.' : 'Мікрозавдання дня залишилися незавершеними.',
    },
    {
      toneClass: eveningDone ? 'bg-emerald-400/60 shadow-[0_0_0_2px_rgba(74,222,128,0.08)]' : 'bg-rose-400/60 shadow-[0_0_0_2px_rgba(251,113,133,0.08)]',
      content: '',
      label: 'Вечір',
      tooltip: eveningDone ? 'Вечірній підсумок завершений.' : 'Вечірній підсумок ще не завершено.',
    },
  ] satisfies TimelineDot[]
}

export function getSessionAnswers(content: Record<string, unknown> | null, session: 'morning' | 'evening') {
  const source = content?.[session]
  if (!source || typeof source !== 'object' || Array.isArray(source)) return []

  return Object.entries(source as Record<string, unknown>)
    .filter((entry): entry is [string, string] => typeof entry[1] === 'string' && entry[1].trim().length > 0)
    .map(([question, answer]) => ({
      id: `${session}-${question}`,
      question,
      answer,
    }))
}

export function getDailyDraftProgress(userId: string, session: 'morning' | 'evening', dateKey: string) {
  if (typeof window === 'undefined') return { hasDraft: false, step: 0, answersCount: 0 }

  try {
    const raw = window.localStorage.getItem(`starway_daily_cycle_draft:${userId || 'guest'}:${session}:${dateKey}`)
    if (!raw) return { hasDraft: false, step: 0, answersCount: 0 }
    const parsed = JSON.parse(raw) as { step?: unknown; answers?: unknown }
    const step = typeof parsed.step === 'number' ? parsed.step : 0
    const answersCount = parsed.answers && typeof parsed.answers === 'object' && !Array.isArray(parsed.answers)
      ? Object.keys(parsed.answers as Record<string, unknown>).length
      : 0
    return { hasDraft: step > 0 || answersCount > 0, step, answersCount }
  } catch {
    return { hasDraft: false, step: 0, answersCount: 0 }
  }
}

export function getManualMicroTasksKey(userId: string, dateKey: string) {
  return `starway_microtasks_manual:${userId || 'guest'}:${dateKey}`
}

export function getMicrotaskRegenerationKey(userId: string, dateKey: string) {
  return `starway_microtasks_regenerated:${userId || 'guest'}:${dateKey}`
}

export function loadManualMicroTask(userId: string, dateKey: string): MicroTaskItem | null {
  if (typeof window === 'undefined') return null

  try {
    const raw = window.localStorage.getItem(getManualMicroTasksKey(userId, dateKey))
    if (!raw) return null
    const parsed = JSON.parse(raw) as MicroTaskItem
    return parsed && typeof parsed === 'object' && typeof parsed.id === 'string' ? parsed : null
  } catch {
    return null
  }
}

export function saveManualMicroTask(userId: string, dateKey: string, task: MicroTaskItem | null) {
  if (typeof window === 'undefined') return

  try {
    if (!task) {
      window.localStorage.removeItem(getManualMicroTasksKey(userId, dateKey))
      return
    }
    window.localStorage.setItem(getManualMicroTasksKey(userId, dateKey), JSON.stringify(task))
  } catch {
    // ignore
  }
}

export function loadMicrotaskRegenerationFlag(userId: string, dateKey: string) {
  if (typeof window === 'undefined') return false

  try {
    return window.localStorage.getItem(getMicrotaskRegenerationKey(userId, dateKey)) === '1'
  } catch {
    return false
  }
}

export function saveMicrotaskRegenerationFlag(userId: string, dateKey: string, used: boolean) {
  if (typeof window === 'undefined') return

  try {
    if (!used) {
      window.localStorage.removeItem(getMicrotaskRegenerationKey(userId, dateKey))
      return
    }
    window.localStorage.setItem(getMicrotaskRegenerationKey(userId, dateKey), '1')
  } catch {
    // ignore
  }
}

export function getMorningMeta(content: unknown) {
  if (!content || typeof content !== 'object' || Array.isArray(content)) return null
  const morningMeta = (content as Record<string, unknown>).morningMeta
  if (!morningMeta || typeof morningMeta !== 'object' || Array.isArray(morningMeta)) return null
  return morningMeta as Record<string, unknown>
}

export function buildManualMicroTask(userId: string, dateKey: string, text: string): MicroTaskItem {
  const now = new Date()
  const due = new Date(`${dateKey}T23:59:00`)
  const title = text.split(/\s+/).slice(0, 12).join(' ')

  return {
    id: `manual-${dateKey}-${Date.now()}`,
    userId,
    title,
    description: text,
    why: 'Створено вручну на сьогодні',
    steps: [],
    stepsCompleted: [],
    sphere: 'manual',
    priority: 'medium',
    xpReward: 10,
    daysToComplete: 1,
    dueAt: due.toISOString(),
    type: 'actionable',
    persist: false,
    source: 'manual',
    reason: 'growth',
    relatedEntity: { type: 'manual' },
    status: 'manual',
    taskKind: 'manual',
    createdAt: now.toISOString(),
    completedAt: undefined,
    expiresAt: due.toISOString(),
    generatedFromEntryId: undefined,
    schedule: {
      isMultiDay: false,
      currentDay: 1,
      totalDays: 1,
      label: null,
    },
    meta: {
      uiStatus: 'active',
    },
  }
}

export function getMicrotaskProgressToast(action: 'done' | 'skipped', remainingCount: number) {
  if (remainingCount > 0) {
    return action === 'done'
      ? `Завдання виконано. Залишилось ще ${remainingCount}.`
      : `Завдання пропущено. Залишилось ще ${remainingCount}.`
  }

  return action === 'done'
    ? 'Усі мікрозавдання на сьогодні закрито.'
    : 'Усі мікрозавдання на сьогодні вирішено.'
}

export function serializeMicroTaskList(tasks: MicroTaskItem[]) {
  return tasks
    .filter(task => task.status !== 'COMPLETED')
    .map(task => task.title.trim())
    .filter(Boolean)
    .join('\n')
}

export function getInitialTab(
  search: string,
  pathname: string,
): AiMentorDashboardTab {
  const params = new URLSearchParams(search)
  const section = params.get('section')

  if (pathname === '/dashboard/cycle') return 'cycle'
  if (pathname === '/dashboard/wheel') return 'wheel'
  if (pathname === '/dashboard/journal') return 'journal'
  if (pathname === '/dashboard/calendar') return 'journal'
  if (pathname === '/dashboard/microtasks') return 'microtasks'
  if (pathname === '/dashboard/tasks') return 'microtasks'
  if (pathname === '/dashboard/reports') return 'reports'

  switch (section) {
    case 'wheel':
      return 'wheel'
    case 'cycle':
      return 'cycle'
    case 'journal':
      return 'journal'
    case 'calendar':
      return 'journal'
    case 'tasks':
    case 'microtasks':
      return 'microtasks'
    case 'reports':
      return 'reports'
    default:
      return 'session'
  }
}
