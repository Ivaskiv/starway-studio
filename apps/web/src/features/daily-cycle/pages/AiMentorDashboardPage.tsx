// apps/web/src/features/daily-cycle/components/AiMentorDashboard.tsx
/*
 * AUDIT (confirm block / незакритий вчорашній день)
 * - Today entry points live here: active day card, "Почати ранок", "Мікрозавдання", "Вечір".
 * - Existing yesterday/catchup logic already lived here and in `useDailyCycle`.
 * - Existing skip API already exists via `useSkipPreviousDayMutation` -> POST `/daily/skip`.
 * - Existing modal wrapper already exists in the app: `BaseModal`.
 * - This file now hosts one shared `useTodayGuard` instance so confirm UI is not duplicated.
 */

import { useAppSelector } from '@/app/hooks'
import { useAuth } from '@/features/auth/hooks/useAuth'
import { useSystemState } from '@/features/auth/hooks/useSystemState'
import {
  useGetTelegramLinkUrlQuery,
  useGetTelegramStatusQuery,
} from '@/features/auth/services/auth.api'
import { selectUserRole } from '@/features/auth/services/auth.slice'
import { useGenerateDeepLinkMutation } from '@/features/auth/services/deeplinks.api'
import ExpiredTrialModal from '@/features/daily-cycle/components/ExpiredTrialModal'
import ReportsTabContent from '@/features/daily-cycle/components/ReportsTabContent'
import CycleProgressPanel from '@/features/daily-cycle/components/CycleProgressPanel'
import CycleQuickActions from '@/features/daily-cycle/components/CycleQuickActions'
import CycleDayReportModal from '@/features/daily-cycle/components/CycleDayReportModal'
import CycleStepCards, { type CycleStepCardItem } from '@/features/daily-cycle/components/CycleStepCards'
import WheelMonthlyBoard from '@/features/daily-cycle/components/WheelMonthlyBoard'
import { BaseModal } from '@/features/modals/BaseModal'
import { useGetDailyHistoryQuery, useGetTodayEntryQuery, useSkipPreviousDayMutation, useSubmitDailyCycleMutation } from '@/features/daily-cycle/services/daily.api'
import { useTodayGuard } from '@/features/daily-cycle/hooks/useDailyCycle'
import type { DailyCycleEntry } from '@/features/daily-cycle/types/daily.types'
import JournalPage from '@/features/journal/JournalPage'
import { MicroTaskList } from '@/features/microTask/components/MicroTaskList'
import { useMicroTasks } from '@/features/microTask/hooks/useMicroTasks'
import type { MicroTask as MicroTaskItem } from '@/features/microTask/types/types'
import { useSendSessionHandoffMutation } from '@/features/notifications/services/notifications.api'
import { useGetTrialStatusQuery } from '@/features/trial/services/trial.api'
import { getMentorLifecycleState } from '@/features/trial/utils/mentorLifecycle'
import { getTrialDaysLeft } from '@/features/trial/utils/trialProgress'
import { useUserProgress } from '@/features/user/hooks/useUserProgress'
import { WheelChart } from '@/features/wheel/components/WheelChart'
import { WheelForm } from '@/features/wheel/components/WheelForm'
import { useGetLatestWheelAssessmentQuery } from '@/features/wheel/services/wheel.api'
import { WHEEL_CATEGORIES } from '@/features/wheel/types/wheel.types'
import { useGetUpcomingSessionQuery } from '@/features/zoom/services/zoom.api'
import { GlassCard } from '@/ui'
import { ArrowUp, BellRing, BookOpen, CheckCircle2, Crosshair, Download, LayoutGrid, MoonStar, Plus, RefreshCcw, SunMedium, Target, X } from 'lucide-react'
import { useCallback, useEffect, useMemo, useRef, useState, type Dispatch, type SetStateAction } from 'react'
import toast from 'react-hot-toast'
import { useLocation, useNavigate } from 'react-router-dom'
import { DailyCycleFlow } from './DailyCyclePage'

// ─── Types ────────────────────────────────────────────────────────────────

type DashboardUser = {
  id: string
  firstName?: string
  name?: string
  abilities?: string[]
  settings?: {
    accentColor?: string
  }
}

type RecoveryBlockedIntent = 'active_day' | 'morning' | 'tasks' | 'evening'

const TRIAL_PROGRESS_CLASS: Record<number, string> = {
  1: 'w-[14%]',
  2: 'w-[29%]',
  3: 'w-[43%]',
  4: 'w-[57%]',
  5: 'w-[71%]',
  6: 'w-[86%]',
  7: 'w-full',
}

const FUNNEL_SEGMENTS = [
  { label: 'Практикум (free)', value: '—', widthClass: 'w-full', colorClass: 'bg-[#4d9de0]' },
  { label: 'Реєстрація', value: '—', widthClass: 'w-[60%]', colorClass: 'bg-[#3a7bd5]' },
  { label: 'Активація', value: '—', widthClass: 'w-[40%]', colorClass: 'bg-[#2d6bc4]' },
  { label: 'Підписка', value: '—', widthClass: 'w-[13%]', colorClass: 'bg-[#1f5aad]' },
] as const

const WHEEL_LABEL_MAP = new Map(WHEEL_CATEGORIES.map(item => [item.id, item.nameUk]))
const WHEEL_EMOJI_MAP = new Map(WHEEL_CATEGORIES.map(item => [item.id, item.emoji]))

const formatWheelDate = (value: Date) =>
  value.toLocaleDateString('uk-UA', { day: 'numeric', month: 'long' })

function formatRemainingDaysLabel(value: number) {
  if (value <= 0) return 'До кінця дня'
  if (value === 1) return 'Ще 1 день'
  if (value >= 2 && value <= 4) return `Ще ${value} дні`
  return `Ще ${value} днів`
}

function formatCompactDate(value: Date) {
  return [
    String(value.getDate()).padStart(2, '0'),
    String(value.getMonth() + 1).padStart(2, '0'),
  ].join('.')
}

function formatVerboseDate(value: Date | string) {
  const date = typeof value === 'string' ? new Date(value) : value
  return date.toLocaleDateString('uk-UA', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  })
}

function formatCompactDateKey(dateKey: string) {
  const [year, month, day] = dateKey.split('-').map(Number)
  if (!year || !month || !day) return dateKey
  return formatCompactDate(new Date(year, month - 1, day))
}

function buildJournalDayUrl(dayDateKey: string) {
  return `/dashboard/journal?date=${dayDateKey}`
}

function getCycleProgressRingMetrics(percentValue: number) {
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

function isWheelDue(lastWheelDate: Date | null, now: Date) {
  if (!lastWheelDate) return true
  const nextWheelDate = new Date(lastWheelDate.getTime() + 30 * 24 * 60 * 60 * 1000)
  return nextWheelDate <= now
}

function toDateKey(value: Date | string) {
  const date = typeof value === 'string' ? new Date(value) : value
  return [
    String(date.getFullYear()),
    String(date.getMonth() + 1).padStart(2, '0'),
    String(date.getDate()).padStart(2, '0'),
  ].join('-')
}

function getRelativeDateKey(baseDateKey: string, offsetDays: number) {
  const [year, month, day] = baseDateKey.split('-').map(Number)
  const date = new Date(year, (month ?? 1) - 1, day ?? 1)
  date.setDate(date.getDate() + offsetDays)
  return toDateKey(date)
}

type DailyHistoryEntryLike = {
  id?: string
  date: Date | string
  status?: string
  aiAnalysis?: string | null
  lateCompletedAt?: string | null
  canCatchUpUntil?: string | null
  content?: unknown
  sourceEntryIds?: string[]
}

type DailyHistoryProgress = {
  morningDone: boolean
  eveningDone: boolean
  finalizedAt: string | null
  skipped: boolean
  hasProgress: boolean
  completed: boolean
  completedLate: boolean
  unfinishedStepCount: number
  incompleteMicroTaskCount: number
}

type TimelineDayPresentation = {
  hasProgress: boolean
  finalizedAt: string | null
  skipped: boolean
  completed: boolean
  completedLate: boolean
  missed: boolean
  partial: boolean
  isRecoveryTargetDay: boolean
  canResumeDay: boolean
  recoverySessionForDay: 'morning' | 'evening' | null
  unfinishedStepCount: number
  incompleteMicroTaskCount: number
  dayTone: TimelineDayTone
  dayLabel: string
  dayDots: TimelineDot[]
}

type TimelineDot = {
  colorClass: string
  label: string
  tooltip: string
}

function getDailyHistoryProgress(
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
  const morningMeta = content?.morningMeta && typeof content.morningMeta === 'object' && !Array.isArray(content.morningMeta)
    ? content.morningMeta as Record<string, unknown>
    : null
  const eveningMeta = content?.eveningMeta && typeof content.eveningMeta === 'object' && !Array.isArray(content.eveningMeta)
    ? content.eveningMeta as Record<string, unknown>
    : null
  const morningStarted = Boolean(content?.morning && typeof content.morning === 'object' && !Array.isArray(content.morning))
  const eveningStarted = Boolean(content?.evening && typeof content.evening === 'object' && !Array.isArray(content.evening))
  const status = typeof entry.status === 'string' ? entry.status : typeof content?.status === 'string' ? String(content.status) : null
  const skipped = entry.status === 'SKIPPED' || content?.status === 'SKIPPED'
  const completed = Boolean(
    status === 'COMPLETED'
    || (finalizedAt && toDateKey(finalizedAt) === toDateKey(entry.date))
  )
  const completedLate = Boolean(
    entry.status === 'COMPLETED_LATE'
    || typeof entry.lateCompletedAt === 'string'
    || content?.completedLate === true
    || (finalizedAt && toDateKey(finalizedAt) !== toDateKey(entry.date))
  )
  const incompleteMicroTaskCount = Math.max(0, taskStats?.incompleteMicroTaskCount ?? 0)
  const hasTaskProgress = (taskStats?.totalMicroTaskCount ?? 0) > 0
  const morningDone = typeof morningMeta?.completedAt === 'string'
  const eveningDone = typeof eveningMeta?.completedAt === 'string'
  const tasksDone = hasTaskProgress && incompleteMicroTaskCount === 0
  const analysisDone = completed || completedLate || Boolean(finalizedAt)
  const unfinishedStepCount = [morningDone, tasksDone, eveningDone, analysisDone].reduce(
    (sum, done) => sum + (done ? 0 : 1),
    0,
  )

  return {
    morningDone,
    eveningDone,
    finalizedAt,
    skipped,
    hasProgress: morningStarted || eveningStarted || completed || completedLate || skipped || hasTaskProgress,
    completed,
    completedLate,
    unfinishedStepCount,
    incompleteMicroTaskCount,
  }
}

function getTimelineDayPresentation(options: {
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
    active,
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
  const unfinishedStepCount = dayProgress?.unfinishedStepCount ?? 0
  const incompleteMicroTaskCount = dayProgress?.incompleteMicroTaskCount ?? 0
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

  const staleIncomplete = Boolean(
    !isCurrentDate
    && !isFutureDate
    && dayDateKey < yesterdayDateKey
    && hasProgress
    && !completed
    && !completedLate
    && !finalizedAt
  )
  const missed = Boolean((skipped || staleIncomplete) && !isCurrentDate && !isFutureDate && !isRecoveryTargetDay)
  const partial = Boolean(
    !active
    && !isFutureDate
    && !completed
    && !completedLate
    && !missed
    && (isRecoveryTargetDay || hasProgress),
  )
  const dayTone = getTimelineDayTone({
    isActive: active,
    isFuture: isFutureDate,
    isCompleted: completed,
    isCompletedLate: completedLate,
    isPartial: partial,
    isMissed: missed,
  })

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
    dayTone,
    dayLabel: getTimelineDayLabel({ tone: dayTone, isCompletedLate: completedLate }),
    dayDots: getTimelineDots({
      tone: dayTone,
      morningDone: Boolean(dayProgress?.morningDone),
      hasStarted: hasProgress,
      eveningDone: Boolean(dayProgress?.eveningDone),
    }),
  } satisfies TimelineDayPresentation
}

function getEntryTaskStats(entry: DailyHistoryEntryLike, tasks: MicroTaskItem[]) {
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
      return status !== 'COMPLETED' && !task.completedAt
    }).length,
  }
}

function getEntryContent(entry: DailyHistoryEntryLike | undefined | null) {
  return entry?.content && typeof entry.content === 'object' && !Array.isArray(entry.content)
    ? entry.content as Record<string, unknown>
    : null
}

function hasSessionAnswers(content: Record<string, unknown> | null, session: 'morning' | 'evening') {
  const value = content?.[session]
  return Boolean(value && typeof value === 'object' && !Array.isArray(value) && Object.keys(value as Record<string, unknown>).length > 0)
}

function getEntrySourceIds(entry: DailyHistoryEntryLike | null | undefined) {
  if (!entry) return []
  const sourceIds = Array.isArray(entry.sourceEntryIds)
    ? entry.sourceEntryIds.filter((value): value is string => typeof value === 'string' && value.length > 0)
    : []

  if (sourceIds.length > 0) return sourceIds
  return typeof entry.id === 'string' && entry.id.length > 0 ? [entry.id] : []
}

function getLatestRecoveryTarget(
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

type TimelineDayTone = 'active' | 'done' | 'partial' | 'missed' | 'future'

function getTimelineDayTone(options: {
  isActive: boolean
  isFuture: boolean
  isCompleted: boolean
  isCompletedLate: boolean
  isPartial: boolean
  isMissed: boolean
}) {
  const { isActive, isFuture, isCompleted, isCompletedLate, isPartial, isMissed } = options

  if (isActive) return 'active' satisfies TimelineDayTone
  if (isCompleted || isCompletedLate) return 'done' satisfies TimelineDayTone
  if (isPartial) return 'partial' satisfies TimelineDayTone
  if (isMissed) return 'missed' satisfies TimelineDayTone
  return 'future' satisfies TimelineDayTone
}

function getTimelineDayLabel(options: {
  tone: TimelineDayTone
  isCompletedLate: boolean
}) {
  const { tone, isCompletedLate } = options

  if (tone === 'active') return 'активно'
  if (tone === 'partial') return 'очікує'
  if (tone === 'done') return isCompletedLate ? 'вик. невч.' : 'готово'
  if (tone === 'missed') return 'пропущено'
  if (tone === 'future') return 'далі'
  return ''
}

function getTimelineCardClass(tone: TimelineDayTone) {
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

function getTimelineDigitClass(tone: TimelineDayTone) {
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

function getTimelineLabelClass(tone: TimelineDayTone) {
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

function getTimelineDots(options: {
  tone: TimelineDayTone
  morningDone: boolean
  hasStarted: boolean
  eveningDone: boolean
}) {
  const { tone, morningDone, hasStarted, eveningDone } = options

  if (tone === 'missed' || tone === 'future') {
    if (tone === 'missed') {
      return [
        { colorClass: 'bg-rose-400', label: 'Ранок', tooltip: 'День пропущено: ранкова сесія не завершена вчасно.' },
        { colorClass: 'bg-rose-400', label: 'Мікрозавдання', tooltip: 'День пропущено: мікрозавдання не були закриті.' },
        { colorClass: 'bg-rose-400', label: 'Вечір', tooltip: 'День пропущено: вечірній підсумок не завершено.' },
      ] satisfies TimelineDot[]
    }

    return [
      { colorClass: 'bg-white/15', label: 'Ранок', tooltip: 'Ранкова сесія ще попереду.' },
      { colorClass: 'bg-white/15', label: 'Мікрозавдання', tooltip: 'Мікрозавдання для цього дня ще попереду.' },
      { colorClass: 'bg-white/15', label: 'Вечір', tooltip: 'Вечірній підсумок для цього дня ще попереду.' },
    ] satisfies TimelineDot[]
  }

  if (tone === 'done') {
    return [
      { colorClass: 'bg-emerald-400', label: 'Ранок', tooltip: 'Ранкова сесія завершена.' },
      { colorClass: 'bg-amber-300', label: 'Мікрозавдання', tooltip: 'Мікрозавдання дня закриті.' },
      { colorClass: 'bg-cyan-400', label: 'Вечір', tooltip: 'Вечірній підсумок завершений.' },
    ] satisfies TimelineDot[]
  }

  if (tone === 'active') {
    return [
      {
        colorClass: morningDone ? 'bg-emerald-400' : 'bg-sky-400',
        label: 'Ранок',
        tooltip: morningDone ? 'Ранкова сесія завершена.' : 'Ранкова сесія активна або в процесі.',
      },
      {
        colorClass: hasStarted ? 'bg-amber-300' : 'bg-white/15',
        label: 'Мікрозавдання',
        tooltip: hasStarted ? 'У дні вже є прогрес або відкриті задачі.' : 'Мікрозавдання ще не відкриті.',
      },
      {
        colorClass: eveningDone ? 'bg-cyan-400' : 'bg-white/15',
        label: 'Вечір',
        tooltip: eveningDone ? 'Вечірній підсумок завершений.' : 'Вечірній підсумок ще не закрито.',
      },
    ] satisfies TimelineDot[]
  }

  return [
    {
      colorClass: morningDone ? 'bg-emerald-400' : 'bg-white/15',
      label: 'Ранок',
      tooltip: morningDone ? 'Ранкова сесія завершена.' : 'Ранкова сесія ще не завершена.',
    },
    {
      colorClass: hasStarted ? 'bg-amber-300' : 'bg-white/15',
      label: 'Мікрозавдання',
      tooltip: hasStarted ? 'У день уже є незавершений прогрес.' : 'Мікрозавдання ще не відкриті.',
    },
    {
      colorClass: eveningDone ? 'bg-cyan-400' : 'bg-white/15',
      label: 'Вечір',
      tooltip: eveningDone ? 'Вечірній підсумок завершений.' : 'Вечірній підсумок ще не завершено.',
    },
  ] satisfies TimelineDot[]
}

function getSessionAnswers(content: Record<string, unknown> | null, session: 'morning' | 'evening') {
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

type AiMentorDashboardTab =
  | 'session'
  | 'wheel'
  | 'cycle'
  | 'journal'
  | 'microtasks'
  | 'reports'

type MicrotaskPromptIntent = 'generate' | 'regenerate'
type MicrotaskPromptStage = 'choice' | 'edit'

function getDailyDraftProgress(userId: string, session: 'morning' | 'evening', dateKey: string) {
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

function getManualMicroTasksKey(userId: string, dateKey: string) {
  return `starway_microtasks_manual:${userId || 'guest'}:${dateKey}`
}

function getMicrotaskRegenerationKey(userId: string, dateKey: string) {
  return `starway_microtasks_regenerated:${userId || 'guest'}:${dateKey}`
}

function loadManualMicroTask(userId: string, dateKey: string): MicroTaskItem | null {
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

function saveManualMicroTask(userId: string, dateKey: string, task: MicroTaskItem | null) {
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

function loadMicrotaskRegenerationFlag(userId: string, dateKey: string) {
  if (typeof window === 'undefined') return false

  try {
    return window.localStorage.getItem(getMicrotaskRegenerationKey(userId, dateKey)) === '1'
  } catch {
    return false
  }
}

function saveMicrotaskRegenerationFlag(userId: string, dateKey: string, used: boolean) {
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

function getMorningMeta(content: unknown) {
  if (!content || typeof content !== 'object' || Array.isArray(content)) return null
  const morningMeta = (content as Record<string, unknown>).morningMeta
  if (!morningMeta || typeof morningMeta !== 'object' || Array.isArray(morningMeta)) return null
  return morningMeta as Record<string, unknown>
}

function buildManualMicroTask(userId: string, dateKey: string, text: string): MicroTaskItem {
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

function getMicrotaskProgressToast(action: 'done' | 'skipped', remainingCount: number) {
  if (remainingCount > 0) {
    return action === 'done'
      ? `Завдання виконано. Залишилось ще ${remainingCount}.`
      : `Завдання пропущено. Залишилось ще ${remainingCount}.`
  }

  return action === 'done'
    ? 'Усі мікрозавдання на сьогодні закрито.'
    : 'Усі мікрозавдання на сьогодні вирішено.'
}

function serializeMicroTaskList(tasks: MicroTaskItem[]) {
  return tasks
    .filter(task => task.status !== 'COMPLETED')
    .map(task => task.title.trim())
    .filter(Boolean)
    .join('\n')
}

function getInitialTab(
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

function CycleSummaryCard({
  onLockedOpen,
  onOpenWheelFrame,
  onStartMorningSession,
  onStartEveningSession,
  onOpenRecoveryDay,
  onTryOpenToday,
  onShowTasks,
  onShowReports,
  onCloseMorningSession,
  onCloseEveningSession,
  onOpenMicroTasks,
  onOpenProgress,
  onComplete,
  onSkipPreviousDay,
  openDayNoticeKey,
  setOpenDayNoticeKey,
  recoveryPromptDateKey,
  recoveryDateKey,
  recoveryTargetDateKey,
  recoveryTargetSession,
  yesterdayDateKey,
  showMorningSession,
  showEveningSession,
  hasMorningProgress,
  hasMorningAnswers,
  hasActiveMicroTasks,
  hasTasksToday,
  todayMicroTaskCount,
  activeTodayMicroTaskCount,
  completedTodayMicroTaskCount,
  resumeIntentAfterRecovery,
  onConsumeResumeIntent,
}: {
  onLockedOpen: () => void
  onOpenWheelFrame: () => void
  onStartMorningSession: () => void
  onStartEveningSession: () => void
  onOpenRecoveryDay: (dateKey: string, session: 'morning' | 'evening') => void
  onTryOpenToday: (onProceed: () => void) => void
  onShowTasks: () => void
  onShowReports: () => void
  onCloseMorningSession: () => void
  onCloseEveningSession: () => void
  onOpenMicroTasks: () => void
  onOpenProgress: () => void
  onComplete?: () => void
  onSkipPreviousDay: (dateKey: string) => void
  openDayNoticeKey: string | null
  setOpenDayNoticeKey: Dispatch<SetStateAction<string | null>>
  recoveryPromptDateKey: string | null
  recoveryDateKey: string | null
  recoveryTargetDateKey: string | null
  recoveryTargetSession: 'morning' | 'evening' | null
  yesterdayDateKey: string
  showMorningSession: boolean
  showEveningSession: boolean
  hasMorningProgress: boolean
  hasMorningAnswers: boolean
  hasActiveMicroTasks: boolean
  hasTasksToday: boolean
  todayMicroTaskCount: number
  activeTodayMicroTaskCount: number
  completedTodayMicroTaskCount: number
  resumeIntentAfterRecovery: RecoveryBlockedIntent | null
  onConsumeResumeIntent: () => void
}) {
  const { user } = useAuth()
  const { dayNumber: journeyDay, journeySteps, currentStep } = useUserProgress()
  const { data: trial, isLoading } = useGetTrialStatusQuery()
  const { accessControl, subscription, getModuleAccess } = useSystemState()
  const navigate = useNavigate()
  const dashboardUser = user as DashboardUser
  const userId = dashboardUser?.id

  const mentorLifecycleState = getMentorLifecycleState({
    trial,
    accessControl,
    subscription,
    aiMentorModule: getModuleAccess('AI_MENTOR'),
  })
  const isLocked = mentorLifecycleState === 'paused_trial_ended'
  const isPaidCycle = Boolean(trial?.isPaid || subscription?.isActive || accessControl?.hasSubscription)
  const totalDays = isPaidCycle ? 30 : 7
  const currentDay = journeyDay || Math.max(1, trial?.currentDay ?? 1)
  const trialDaysLeft = trial?.isActive ? getTrialDaysLeft(Math.min(currentDay, 7)) : 0
  const now = new Date()
  const todayDateKey = toDateKey(now)
  const timelineAnchorDate = useMemo(() => new Date(), [])
  const timelineStartDate = useMemo(() => {
    const start = new Date(timelineAnchorDate)
    start.setDate(start.getDate() - Math.max(0, currentDay - 1))
    return start
  }, [currentDay, timelineAnchorDate])
  const { data: dailyHistory = [], refetch: refetchDailyHistory } = useGetDailyHistoryQuery(undefined, { skip: !userId })
  const { data: latestWheel } = useGetLatestWheelAssessmentQuery(userId ?? '', { skip: !userId })
  const { tasks: cycleMicroTasks } = useMicroTasks()
  const [reportDayKey, setReportDayKey] = useState<string | null>(null)

  const historyByDate = useMemo(() => {
    return dailyHistory.reduce<Record<string, DailyHistoryProgress>>((acc, entry) => {
      const key = toDateKey(entry.date)
      acc[key] = getDailyHistoryProgress(entry, getEntryTaskStats(entry, cycleMicroTasks))

      return acc
    }, {})
  }, [cycleMicroTasks, dailyHistory])
  const recoveryTarget = useMemo(
    () => getLatestRecoveryTarget(dailyHistory, todayDateKey),
    [dailyHistory, todayDateKey],
  )
  const recoverySession = recoveryDateKey
    ? (showEveningSession ? 'evening' : 'morning')
    : recoveryTarget?.session ?? null

  const lastWheelDate = latestWheel
    ? new Date(latestWheel.completedAt ?? latestWheel.createdAt)
    : null
  const wheelDue = isWheelDue(lastWheelDate, now)
  const cycleFlowSteps = useMemo(() => {
    return [
      { id: 'morning', label: 'Ранок' },
      { id: 'tasks', label: 'Мікрозавдання' },
      { id: 'evening', label: 'Вечір' },
      { id: 'report', label: 'Аналіз дня' },
    ].map((item, index) => ({
      ...item,
      number: index + 1,
      status: journeySteps.find(step => step.id === item.id)?.status ?? 'locked',
    }))
  }, [journeySteps])
  const isActivePeriod = showMorningSession || showEveningSession || hasMorningProgress || hasMorningAnswers || hasActiveMicroTasks
  const currentCycleStepIndex = ({
    wheel: 1,
    morning: 1,
    tasks: 2,
    evening: 3,
    report: 4,
  } as const)[currentStep] ?? 1
  const completedCycleStepsCount = cycleFlowSteps.filter((step) => step.status === 'done').length
  const monthPercent = Math.round((currentDay / Math.max(totalDays, 1)) * 100)
  const xpToday = completedCycleStepsCount * 30
  const chartDays = Math.max(totalDays, 30)
  const chartPoints = Array.from({ length: chartDays }, (_, index) => {
    const dayDate = new Date(timelineStartDate)
    dayDate.setDate(timelineStartDate.getDate() + index)
    const dayDateKey = toDateKey(dayDate)
    const dayProgress = historyByDate[dayDateKey]

    if (!dayProgress && dayDateKey > todayDateKey) return null
    if (!dayProgress) return 0
    if (dayProgress.completed || dayProgress.completedLate) return 4
    if (dayProgress.eveningDone) return 3
    if (dayProgress.morningDone && dayProgress.hasProgress) return 2
    if (dayProgress.hasProgress) return 1
    return 0
  })
  const taskCardBadge = activeTodayMicroTaskCount > 0 ? `${activeTodayMicroTaskCount} завдання` : undefined
  const isTaskStepActive = currentStep === 'tasks' || (hasMorningAnswers && !showMorningSession && !showEveningSession && (hasActiveMicroTasks || hasTasksToday))
  const isEveningStepActive = currentStep === 'evening'
    || (hasMorningAnswers && !hasActiveMicroTasks && !showMorningSession && !showEveningSession && cycleFlowSteps[2]?.status !== 'done')
  const analysisReady = cycleFlowSteps[3]?.status === 'active' || cycleFlowSteps[3]?.status === 'done'
  const visualCycleStepIndex = analysisReady
    ? 4
    : (showEveningSession || isEveningStepActive)
      ? 3
      : (hasMorningAnswers || hasMorningProgress || isTaskStepActive || currentCycleStepIndex >= 2)
        ? 2
        : 1
  const completedTodayStepCount = completedCycleStepsCount
  const progressPercent = Math.round((completedTodayStepCount / 4) * 100)
  const progressRing = getCycleProgressRingMetrics(progressPercent)
  const stepCards: CycleStepCardItem[] = [
    {
      number: 1,
      icon: <SunMedium className="h-6 w-6" />,
      title: 'Ранок',
      subtitle: 'Сесія дня',
      checks: ['Ранкова рефлексія', 'Колесо балансу', 'Налаштування фокусу'],
      status: cycleFlowSteps[0]?.status === 'done' ? 'completed' : cycleFlowSteps[0]?.status === 'active' ? 'active' : 'waiting',
      ctaLabel: cycleFlowSteps[0]?.status === 'done' ? 'Відкрити' : 'Почати ▶',
      statusText: hasMorningProgress ? 'Є прогрес у сесії' : 'Займе 2 хв',
      showArrow: true,
      iconToneClass: 'border-[rgba(55,138,221,0.18)] bg-[rgba(55,138,221,0.14)] text-[#8DC4FF]',
      onClick: () => (isLocked ? onLockedOpen() : onStartMorningSession()),
    },
    {
      number: 2,
      icon: <ArrowUp className="h-6 w-6" />,
      title: 'Мікрозавдання',
      subtitle: activeTodayMicroTaskCount > 0 ? `${activeTodayMicroTaskCount} завдання` : hasTasksToday ? 'Є задачі на день' : 'Очікує',
      checks: ['Персональні задачі', 'Трекер прогресу', 'Швидке завершення'],
      status: (
        cycleFlowSteps[1]?.status === 'done'
          ? 'completed'
          : isTaskStepActive || cycleFlowSteps[1]?.status === 'active'
            ? 'active'
            : hasMorningAnswers
              ? 'waiting'
              : 'locked'
      ),
      ctaLabel: hasMorningAnswers ? 'Виконати' : 'Стане доступно 🔒',
      statusText: `${completedTodayMicroTaskCount} / ${Math.max(todayMicroTaskCount, activeTodayMicroTaskCount, hasTasksToday ? 1 : 0)}`,
      badge: taskCardBadge,
      iconToneClass: 'border-[rgba(239,159,39,0.18)] bg-[rgba(239,159,39,0.14)] text-[#F2B24B]',
      badgeToneClass: 'border-[rgba(55,138,221,0.24)] bg-[rgba(55,138,221,0.12)] text-[#78B9FF]',
      showArrow: true,
      onClick: () => (isLocked ? onLockedOpen() : onShowTasks()),
    },
    {
      number: 3,
      icon: <MoonStar className="h-6 w-6" />,
      title: 'Вечір',
      subtitle: hasMorningAnswers ? 'Очікує' : 'Після ранку',
      checks: ['Вечірня рефлексія', 'Підсумки дня', 'План на завтра'],
      status: (
        cycleFlowSteps[2]?.status === 'done'
          ? 'completed'
          : isEveningStepActive || cycleFlowSteps[2]?.status === 'active'
            ? 'active'
            : hasMorningAnswers
              ? 'waiting'
              : 'locked'
      ),
      ctaLabel: hasMorningAnswers ? 'Почати ▶' : 'Стане доступно 🔒',
      statusText: hasMorningAnswers ? (hasActiveMicroTasks ? 'Стане доступно 🔒' : 'Займе 2 хв') : 'Заблоковано',
      iconToneClass: 'border-[rgba(129,105,255,0.18)] bg-[rgba(129,105,255,0.12)] text-[#A48BFF]',
      showArrow: true,
      onClick: () => (isLocked ? onLockedOpen() : onStartEveningSession()),
    },
    {
      number: 4,
      icon: <LayoutGrid className="h-6 w-6" />,
      title: 'Аналіз дня',
      subtitle: 'Після вечора',
      checks: ['Колесо балансу', 'Статистика дня', 'Інсайти'],
      status: (
        cycleFlowSteps[3]?.status === 'done'
          ? 'completed'
          : cycleFlowSteps[3]?.status === 'active'
            ? 'active'
            : hasMorningAnswers
              ? 'waiting'
              : 'locked'
      ),
      ctaLabel: cycleFlowSteps[3]?.status === 'active' ? 'Відкрити' : 'Стане доступно 🔒',
      statusText: cycleFlowSteps[3]?.status === 'active' ? 'Готово до перегляду' : 'Заблоковано',
      iconToneClass: 'border-[rgba(74,163,104,0.18)] bg-[rgba(74,163,104,0.12)] text-[#71C58A]',
      onClick: () => (isLocked ? onLockedOpen() : onShowReports()),
    },
  ]
  const quickActions = [
    {
      id: 'wheel',
      icon: <Crosshair className="h-4 w-4" />,
      label: 'Оновити\nколесо балансу',
      onClick: () => (isLocked ? onLockedOpen() : onOpenWheelFrame()),
    },
    {
      id: 'task',
      icon: <Plus className="h-4 w-4" />,
      label: 'Додати\nмікрозавдання',
      onClick: () => (isLocked ? onLockedOpen() : onShowTasks()),
    },
    {
      id: 'journal',
      icon: <BookOpen className="h-4 w-4" />,
      label: 'Переглянути\nжурнал',
      onClick: () => (isLocked ? onLockedOpen() : navigate('/dashboard/journal')),
    },
    {
      id: 'focus',
      icon: <Target className="h-4 w-4" />,
      label: 'Налаштувати\nфокус',
      onClick: () => (isLocked ? onLockedOpen() : onStartMorningSession()),
    },
  ]
  const progressMetrics = [
    { value: String(currentDay), label: 'день' },
    { value: String(visualCycleStepIndex), label: 'крок', sublabel: 'з 4' },
    { value: `${monthPercent}%`, label: 'місяць', color: '#378ADD' },
    { value: `+${xpToday}`, label: 'XP', color: '#EF9F27' },
  ]
  const reportEntry = useMemo(
    () => dailyHistory.find((entry) => reportDayKey && toDateKey(entry.date) === reportDayKey) ?? null,
    [dailyHistory, reportDayKey],
  )
  const reportContent = useMemo(() => getEntryContent(reportEntry), [reportEntry])
  const reportEntryIds = useMemo(() => getEntrySourceIds(reportEntry), [reportEntry])
  const reportTasks = useMemo(() => {
    if (!reportDayKey) return []

    return cycleMicroTasks.filter((task) => {
      const createdDateKey = task.createdAt?.slice(0, 10) ?? null
      const completedDateKey = task.completedAt?.slice(0, 10) ?? null
      const dueDateKey = task.dueAt?.slice(0, 10) ?? task.expiresAt?.slice(0, 10) ?? null
      const belongsToEntry = task.generatedFromEntryId ? reportEntryIds.includes(task.generatedFromEntryId) : false

      return createdDateKey === reportDayKey
        || completedDateKey === reportDayKey
        || dueDateKey === reportDayKey
        || belongsToEntry
    })
  }, [cycleMicroTasks, reportDayKey, reportEntryIds])
  const reportMorningAnswers = useMemo(() => getSessionAnswers(reportContent, 'morning'), [reportContent])
  const reportEveningAnswers = useMemo(() => getSessionAnswers(reportContent, 'evening'), [reportContent])

  useEffect(() => {
    if (resumeIntentAfterRecovery !== 'active_day') return
    if (recoveryPromptDateKey || recoveryTargetDateKey) return

    setReportDayKey(todayDateKey)
    onConsumeResumeIntent()
  }, [onConsumeResumeIntent, recoveryPromptDateKey, recoveryTargetDateKey, resumeIntentAfterRecovery, todayDateKey])

  return (
    <div className="dashboard-liquid-card--soft !overflow-visible">
      <div className="bg-[linear-gradient(180deg,rgba(var(--accent-rgb),0.16),rgba(255,255,255,0.02)_58%,rgba(255,255,255,0.01))] p-4">
        <div className="mb-3 border-b border-[rgba(255,255,255,0.06)] pb-4">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
            <div className="min-w-0 flex-1">
              <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-[rgb(var(--accent-soft-rgb))]">
                ABsystem
              </p>
              <h2 className="mt-3 text-[1.85rem] font-black leading-[0.96] tracking-[-0.03em] text-[var(--text-primary)] sm:text-[2.15rem] lg:text-[2.35rem] xl:text-[2.55rem]">
                Продовжуй роботу
              </h2>
              <p className="mt-2.5 max-w-[42rem] text-[0.92rem] leading-5 text-[var(--text-secondary)] sm:text-[0.96rem] sm:leading-6">
                Відкрий потрібний блок і зроби наступну дію без зайвих переходів.
              </p>
              <div className="mt-4 grid grid-cols-1 gap-2.5 sm:grid-cols-2 xl:flex xl:flex-wrap">
                <div className="inline-flex min-h-[54px] min-w-0 items-center gap-3 rounded-[18px] border border-[rgba(255,255,255,0.08)] bg-[rgba(10,16,28,0.64)] px-4">
                  <span className="text-[1.3rem] sm:text-[1.45rem]">🔥</span>
                  <div>
                    <p className="text-[1.2rem] font-bold leading-none text-[var(--text-primary)] sm:text-[1.35rem]">{currentDay}</p>
                    <p className="mt-0.5 text-[0.88rem] font-semibold text-[var(--text-primary)] sm:text-[0.92rem]">День {currentDay} з {totalDays}</p>
                  </div>
                </div>
                <div className="inline-flex min-h-[54px] min-w-0 items-center gap-3 rounded-[18px] border border-[rgba(255,255,255,0.08)] bg-[rgba(10,16,28,0.64)] px-4 sm:col-span-2 xl:min-w-[290px]">
                  <span className="h-5 w-5 flex-shrink-0 rounded-full bg-[radial-gradient(circle_at_30%_30%,#8E68FF,#378ADD_70%)] sm:h-6 sm:w-6" />
                  <p className="truncate text-[0.88rem] font-semibold text-[var(--text-primary)] sm:text-[0.92rem]">
                    {isPaidCycle ? 'Новий місячний цикл' : 'Новий тижневий цикл'} · {formatCompactDate(new Date())}
                  </p>
                </div>
                <div className="inline-flex min-h-[54px] min-w-0 items-center gap-3 rounded-[18px] border border-[rgba(255,255,255,0.08)] bg-[rgba(10,16,28,0.64)] px-4 sm:max-w-[190px]">
                  <span className="text-[1.2rem] sm:text-[1.35rem]">🪴</span>
                  <p className="text-[0.88rem] font-semibold text-[var(--text-primary)] sm:text-[0.92rem]">Учень</p>
                </div>
              </div>
            </div>

            <div className="flex justify-start lg:min-w-[156px] lg:justify-end xl:min-w-[196px]">
              <div className="relative flex h-[132px] w-[132px] items-center justify-center sm:h-[148px] sm:w-[148px] xl:h-[176px] xl:w-[176px]">
                <svg viewBox="0 0 180 180" className="h-full w-full">
                  <circle
                    cx="90"
                    cy="90"
                    r={progressRing.radius}
                    fill="none"
                    stroke="rgba(255,255,255,0.08)"
                    strokeWidth="9"
                  />
                  <circle
                    cx="90"
                    cy="90"
                    r={progressRing.radius}
                    fill="none"
                    stroke="#63A8FF"
                    strokeWidth="9"
                    strokeLinecap="round"
                    strokeDasharray={progressRing.circumference}
                    strokeDashoffset={progressRing.dashOffset}
                    transform="rotate(-90 90 90)"
                  />
                </svg>
                <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
                  <p className="text-[0.8rem] font-semibold text-[var(--text-primary)] sm:text-[0.88rem] xl:text-[0.95rem]">Крок {visualCycleStepIndex} з 4</p>
                  <p className="mt-1 text-[2.35rem] font-black leading-none text-[var(--text-primary)] sm:text-[2.6rem] xl:mt-1.5 xl:text-[3.15rem]">{progressRing.percent}%</p>
                  <p className="mt-1.5 text-[0.72rem] font-semibold uppercase tracking-[0.1em] text-[var(--text-secondary)] sm:text-[0.78rem] xl:mt-2 xl:text-[0.82rem]">виконано</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="mb-3 overflow-x-auto overflow-y-visible pt-1.5 pb-4">
          <div className="flex w-max gap-2 px-1.5">
              {Array.from({ length: totalDays }).map((_, index) => {
                const day = index + 1
                const dayDate = new Date(timelineStartDate)
                dayDate.setDate(timelineStartDate.getDate() + index)
                const dayDateKey = toDateKey(dayDate)
                const dayProgress = historyByDate[dayDateKey]
                  ?? (
                    dayDateKey === yesterdayDateKey && recoveryTargetDateKey === yesterdayDateKey
                      ? {
                          morningDone: false,
                          eveningDone: false,
                          finalizedAt: null,
                          skipped: false,
                          hasProgress: false,
                          completed: false,
                          completedLate: false,
                          unfinishedStepCount: 4,
                          incompleteMicroTaskCount: 0,
                        } satisfies DailyHistoryProgress
                      : undefined
                  )
                const active = day === currentDay
                const {
                  hasProgress,
                  finalizedAt,
                  isRecoveryTargetDay,
                  completed,
                  completedLate,
                  unfinishedStepCount,
                  incompleteMicroTaskCount,
                  dayTone,
                  dayLabel,
                  dayDots,
                } = getTimelineDayPresentation({
                  dayDateKey,
                  todayDateKey: toDateKey(now),
                  yesterdayDateKey,
                  active,
                  showEveningSession,
                  recoveryDateKey,
                  recoveryTargetDateKey,
                  recoveryTargetSession,
                  dayProgress,
                })
                const hasBellNotice = Boolean(isRecoveryTargetDay)
                const isBellOpen = openDayNoticeKey === dayDateKey

              return (
                <button
                  key={day}
                  type="button"
                  disabled={dayDateKey > todayDateKey}
                  className={[
                    'relative flex h-[156px] w-[72px] flex-shrink-0 flex-col overflow-visible rounded-[18px] px-[10px] py-2.5 text-center transition-all disabled:cursor-default',
                    isBellOpen ? 'z-30' : 'z-0',
                    getTimelineCardClass(dayTone),
                    dayDateKey <= todayDateKey ? 'cursor-pointer hover:border-amber-300/50' : '',
                  ].join(' ')}
                  onClick={() => {
                    if (dayDateKey > todayDateKey) return
                    if (active) {
                      onTryOpenToday(() => setReportDayKey(dayDateKey))
                      return
                    }
                    setReportDayKey(dayDateKey)
                  }}
                >
                  {hasBellNotice ? (
                    <span className="pointer-events-none absolute inset-x-0 top-2 z-20 flex justify-end px-2">
                      <span
                        role="button"
                        tabIndex={-1}
                        aria-label="Незавершений день"
                        title="Незавершений день"
                        onClick={(event) => {
                          event.stopPropagation()
                          console.info('[AiMentorDashboard] recovery bell toggled', {
                            dayDateKey,
                            isRecoveryTargetDay,
                            hasProgress,
                            finalizedAt,
                          })
                          setOpenDayNoticeKey(current => current === dayDateKey ? null : dayDateKey)
                        }}
                        className={[
                          'pointer-events-auto relative inline-flex h-5 w-5 items-center justify-center rounded-full border transition-all',
                          isBellOpen
                            ? 'border-[rgba(var(--accent-rgb),0.32)] bg-[rgba(var(--accent-rgb),0.14)] text-[rgb(var(--accent-soft-rgb))]'
                            : 'border-[rgba(255,255,255,0.08)] bg-[rgba(255,255,255,0.03)] text-[var(--text-muted)] hover:text-[var(--text-primary)]',
                        ].join(' ')}
                      >
                        <BellRing className="h-3 w-3" />
                        <span className="absolute -right-1.5 -top-1.5 inline-flex min-h-[14px] min-w-[14px] items-center justify-center rounded-full bg-amber-400 px-1 text-[9px] font-bold leading-none text-slate-950">
                          {unfinishedStepCount}
                        </span>
                      </span>
                    </span>
                  ) : null}
                  {isBellOpen ? (
                    <div className="absolute right-0 top-[calc(100%+0.45rem)] z-50 w-56 rounded-xl border border-[rgba(var(--accent-rgb),0.2)] bg-[rgba(10,14,24,0.98)] px-3 py-2 text-left text-[11px] leading-4 text-[var(--text-primary)] shadow-[0_18px_36px_rgba(0,0,0,0.28)]">
                      Залишилось {unfinishedStepCount} незавершені кроки{incompleteMicroTaskCount > 0 ? ` і ${incompleteMicroTaskCount} мікрозавдання` : ''}. Повернись сюди, щоб дозавершити вчорашній день.
                    </div>
                  ) : null}
                  <div className="flex h-full min-h-0 flex-1 flex-col justify-between">
                    <div className="flex min-h-[70px] flex-col items-center justify-start">
                      <div
                        className={[
                          'inline-flex h-8 w-8 items-center justify-center rounded-full text-sm font-bold leading-none',
                          getTimelineDigitClass(dayTone),
                        ].join(' ')}
                      >
                        {day}
                      </div>
                      <div className="mt-2 flex h-[28px] items-start justify-center overflow-hidden">
                        <div className={['max-w-full text-[9px] font-semibold uppercase tracking-[0.12em] leading-[1.15]', getTimelineLabelClass(dayTone)].join(' ')}>
                          {dayLabel}
                        </div>
                      </div>
                    </div>

                    <div className="flex min-h-[70px] flex-col justify-end">
                      <div className="group relative flex min-h-[18px] items-center justify-center gap-1.5">
                        {dayDots.map((dot, dotIndex) => (
                          <span key={`${dayDateKey}-dot-${dotIndex}`} className="group/dot relative inline-flex">
                            <span
                              className={[
                                'h-2.5 w-2.5 flex-shrink-0 rounded-full transition-transform duration-200 group-hover:scale-110',
                                dot.colorClass,
                              ].join(' ')}
                              aria-label={`${dot.label}: ${dot.tooltip}`}
                            />
                            <span className="pointer-events-none absolute left-1/2 top-full z-20 mt-2 hidden w-36 -translate-x-1/2 rounded-xl border border-[rgba(255,255,255,0.08)] bg-[rgba(11,16,30,0.96)] px-2 py-1.5 text-[10px] text-[var(--text-secondary)] shadow-[0_12px_24px_rgba(0,0,0,0.22)] group-hover/dot:block">
                              <strong className="block text-[var(--text-primary)]">{dot.label}</strong>
                              {dot.tooltip}
                            </span>
                          </span>
                        ))}
                        {active ? (
                          <span className="group/tooltip relative ml-1 inline-flex items-center">
                            <button
                              type="button"
                              className="inline-flex h-4 w-4 items-center justify-center rounded-full border border-emerald-400/30 bg-emerald-400/12 text-emerald-300 shadow-[inset_0_1px_0_rgba(255,255,255,0.08)]"
                              aria-label="Активний день готовий до перегляду"
                            >
                              <CheckCircle2 className="h-3 w-3" />
                            </button>
                            <span className="pointer-events-none absolute left-1/2 top-full z-20 mt-2 hidden w-44 -translate-x-1/2 rounded-xl border border-[rgba(255,255,255,0.08)] bg-[rgba(11,16,30,0.96)] px-2 py-1.5 text-[10px] text-[var(--text-secondary)] shadow-[0_12px_24px_rgba(0,0,0,0.22)] group-hover/tooltip:block">
                              Сьогодні активний день: дивись, що вже готово, і переходь до наступного кроку.
                            </span>
                          </span>
                        ) : null}
                      </div>
                      <div className="mt-1 min-h-[16px] text-[10px] font-medium text-[rgb(var(--accent-soft-rgb))]">
                        {formatCompactDateKey(dayDateKey)}
                      </div>
                      {isRecoveryTargetDay ? (
                        <div className="mt-1 h-[30px] overflow-hidden text-[9px] leading-3 text-amber-100/85">
                          {incompleteMicroTaskCount > 0
                            ? `${incompleteMicroTaskCount} мікрозавд. ще відкриті`
                            : ''}
                        </div>
                      ) : (
                        <div className="mt-1 h-[30px]" />
                      )}
                    </div>
                  </div>
                </button>
              )
            })}
          </div>
        </div>

        <div className="mb-3 flex items-center justify-between gap-4 border-t border-[rgba(255,255,255,0.06)] pt-3.5">
          <div>
            <p className="text-[0.98rem] font-semibold text-[var(--text-primary)]">
              Крок {visualCycleStepIndex} з 4 · {cycleFlowSteps[visualCycleStepIndex - 1]?.label ?? 'Ранок'}
            </p>
          </div>
          <div className="flex min-w-[160px] items-center gap-3">
            <div className="h-1.5 flex-1 rounded-full bg-[rgba(255,255,255,0.08)]">
              <div
                className="h-full rounded-full bg-[#378ADD] transition-all"
                style={{ width: `${progressRing.percent}%` }}
              />
            </div>
            <span className="text-[0.86rem] font-semibold text-[rgb(var(--accent-soft-rgb))]">{progressRing.percent}%</span>
          </div>
        </div>

        <div className="mb-3">
          <CycleStepCards items={stepCards} />
        </div>

        <div className="mb-3 rounded-[22px] border border-[rgba(255,255,255,0.08)] bg-[rgba(255,255,255,0.04)] px-4 py-3.5">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex items-center gap-4">
              <svg width="40" height="40" viewBox="0 0 44 44" className="flex-shrink-0">
                <circle cx="22" cy="22" r="16" fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth="4" />
                <circle cx="22" cy="22" r="16" fill="none" stroke="#378ADD" strokeWidth="4" strokeLinecap="round" strokeDasharray="34 100" transform="rotate(-90 22 22)" />
                <circle cx="22" cy="22" r="16" fill="none" stroke="#7CDB8B" strokeWidth="4" strokeLinecap="round" strokeDasharray="22 100" transform="rotate(12 22 22)" />
                <circle cx="22" cy="22" r="16" fill="none" stroke="#8E68FF" strokeWidth="4" strokeLinecap="round" strokeDasharray="18 100" transform="rotate(112 22 22)" />
              </svg>
              <div>
                <p className="text-[1rem] font-semibold text-[var(--text-primary)]">
                  {wheelDue ? 'Оновити колесо балансу' : 'Колесо балансу актуальне'}
                </p>
                <p className="mt-1 text-[0.85rem] text-[var(--text-secondary)]">
                  {wheelDue
                    ? 'Відкрий баланс сфер і зроби 1 крок до гармонії.'
                    : `Останнє оновлення ${lastWheelDate ? formatWheelDate(lastWheelDate) : 'нещодавно'}.`}
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={() => {
                if (isLocked) {
                  onLockedOpen()
                  return
                }
                onOpenWheelFrame()
              }}
              className="inline-flex min-h-[38px] items-center justify-center rounded-lg bg-[#378ADD] px-4 py-2 text-[0.86rem] font-semibold text-white transition-all hover:brightness-110"
            >
              Оновити
            </button>
          </div>
        </div>

        {showMorningSession ? (
          <div className="mt-4 rounded-[24px] border border-[rgba(var(--accent-soft-rgb),0.14)] bg-[rgba(0,0,0,0.12)] p-2 sm:p-3">
              <DailyCycleFlow
              embedded
              initialSession="morning"
              initialDateKey={recoveryDateKey ?? undefined}
              onComplete={onComplete}
              onClose={onCloseMorningSession}
              onOpenMicroTasks={onOpenMicroTasks}
              onOpenProgress={onOpenProgress}
            />
          </div>
        ) : showEveningSession ? (
          <div className="mt-4 rounded-[24px] border border-[rgba(var(--accent-soft-rgb),0.14)] bg-[rgba(0,0,0,0.12)] p-2 sm:p-3">
              <DailyCycleFlow
              embedded
              initialSession="evening"
              initialDateKey={recoveryDateKey ?? undefined}
              onComplete={onComplete}
              onClose={onCloseEveningSession}
              onOpenMicroTasks={onOpenMicroTasks}
              onOpenProgress={onOpenProgress}
            />
          </div>
        ) : (
          <div className="grid gap-3 lg:grid-cols-2 lg:items-stretch">
            <CycleQuickActions actions={quickActions} />
            <CycleProgressPanel metrics={progressMetrics} points={chartPoints} />
          </div>
        )}

        {reportDayKey ? (
          <CycleDayReportModal
            dateKey={reportDayKey}
            entry={reportEntry}
            morningAnswers={reportMorningAnswers}
            eveningAnswers={reportEveningAnswers}
            tasks={reportTasks}
            onClose={() => setReportDayKey(null)}
          />
        ) : null}
      </div>
    </div>
  )
}

function JourneySection({
  onOpenWheelFrame,
  onOpenCycle,
  onOpenMicroTasks,
  onLockedOpen,
  onOpenRecoveryDay,
}: {
  onOpenWheelFrame: () => void
  onOpenCycle: (session: 'morning' | 'evening') => void
  onOpenMicroTasks: () => void
  onLockedOpen: () => void
  onOpenRecoveryDay: (dateKey: string, session: 'morning' | 'evening') => void
}) {
  const { user } = useAuth()
  const {
    dayNumber: journeyDay,
    journeySteps,
  } = useUserProgress()
  const { accessControl, subscription, getModuleAccess } = useSystemState()
  const { data: trial, isLoading } = useGetTrialStatusQuery()
  const navigate = useNavigate()
  const dashboardUser = user as DashboardUser
  const userId = dashboardUser?.id
  const hasWheelAccess = Boolean(
    (trial?.isActive ?? false)
    || (trial?.isPaid ?? false)
    || subscription?.isActive
    || accessControl?.hasSubscription
  )
  const { data: latestWheel } = useGetLatestWheelAssessmentQuery(userId ?? '', {
    skip: !userId,
  })
  const { tasks: microTasks } = useMicroTasks()
  const { data: todayEntry } = useGetTodayEntryQuery(undefined, {
    skip: !userId,
    pollingInterval: 10_000,
    refetchOnFocus: true,
    refetchOnReconnect: true,
  })
  const hasMorningAnswers = Boolean(
    todayEntry?.content
    && typeof todayEntry.content === 'object'
    && !Array.isArray(todayEntry.content)
    && (todayEntry.content as Record<string, unknown>).morning
    && typeof (todayEntry.content as Record<string, unknown>).morning === 'object'
    && !Array.isArray((todayEntry.content as Record<string, unknown>).morning),
  )
  const { data: dailyHistory = [], refetch: refetchDailyHistory } = useGetDailyHistoryQuery(undefined, {
    skip: !userId,
  })
  const [skipPreviousDay, { isLoading: isSkippingPreviousDay }] = useSkipPreviousDayMutation()
  const { data: upcomingZoom } = useGetUpcomingSessionQuery(undefined, {
    skip: !userId,
  })
  const { data: telegramStatus } = useGetTelegramStatusQuery()
  const { data: telegramLinkData, isFetching: isTelegramLinkLoading } = useGetTelegramLinkUrlQuery()
  const [generateDeepLink, { isLoading: isGeneratingTelegramResume }] = useGenerateDeepLinkMutation()
  const [sendSessionHandoff, { isLoading: isSendingSessionHandoff }] = useSendSessionHandoffMutation()
  const sessionSyncKeyRef = useRef<string | null>(null)

  const mentorLifecycleState = getMentorLifecycleState({
    trial,
    accessControl,
    subscription,
    aiMentorModule: getModuleAccess('AI_MENTOR'),
  })
  const isTrialExpired = mentorLifecycleState === 'paused_trial_ended'
  const isPaid = mentorLifecycleState === 'paid'
  const isLocked = isTrialExpired && !isPaid
  const hasNoTrial = mentorLifecycleState === 'never_started'
  const totalDays = 7
  const currentDay = journeyDay || Math.min(7, Math.max(1, trial?.currentDay ?? 1))
  const trialDaysLeft = trial?.isActive ? getTrialDaysLeft(currentDay) : 0
  const isJustStarted = currentDay === 1 && (trial?.progress ?? 0) < 5
  const progressClass = TRIAL_PROGRESS_CLASS[currentDay] ?? 'w-full'
  const timelineAnchorDate = useMemo(() => new Date(), [])
  const timelineStartDate = useMemo(() => {
    const start = new Date(timelineAnchorDate)
    start.setDate(start.getDate() - Math.max(0, currentDay - 1))
    return start
  }, [currentDay, timelineAnchorDate])
  const now = new Date()
  const isAfterMorning = now.getHours() >= 9
  const isAfterEvening = now.getHours() >= 21
  const todayDateKey = toDateKey(now)
  const historyByDate = useMemo(() => {
    return dailyHistory.reduce<Record<string, DailyHistoryProgress>>((acc, entry) => {
      const key = toDateKey(entry.date)
      acc[key] = getDailyHistoryProgress(entry)

      return acc
    }, {})
  }, [dailyHistory])
  const recoveryTarget = useMemo(
    () => getLatestRecoveryTarget(dailyHistory, todayDateKey),
    [dailyHistory, todayDateKey],
  )
  const normalizedContent = useMemo(() => {
    const rawContent = todayEntry?.content
    return rawContent && typeof rawContent === 'object' && !Array.isArray(rawContent)
      ? rawContent as Record<string, unknown>
      : null
  }, [todayEntry?.content])
  const isMorningDone = Boolean(
    normalizedContent?.morning
    && typeof normalizedContent.morning === 'object'
    && !Array.isArray(normalizedContent.morning),
  )
  const isEveningDone = Boolean(
    normalizedContent?.evening
    && typeof normalizedContent.evening === 'object'
    && !Array.isArray(normalizedContent.evening),
  )
  const todayMicroTasks = useMemo(
    () => microTasks.filter(task => task.createdAt?.slice(0, 10) === todayDateKey),
    [microTasks, todayDateKey],
  )
  const activeCarryOverMicroTasks = useMemo(
    () =>
      microTasks.filter((task) => {
        if ((task.status ?? 'PENDING') !== 'PENDING') return false

        const createdKey = task.createdAt?.slice(0, 10) ?? null
        const dueKey = task.dueAt?.slice(0, 10) ?? task.expiresAt?.slice(0, 10) ?? null
        const isMultiDay = Boolean(task.schedule?.isMultiDay || (task.daysToComplete ?? 1) > 1)

        if (!isMultiDay) return false
        if (createdKey === todayDateKey) return false
        if (createdKey && createdKey > todayDateKey) return false
        if (dueKey && dueKey < todayDateKey) return false

        return true
      }),
    [microTasks, todayDateKey],
  )
  const activeTodayMicroTasks = useMemo(
    () => todayMicroTasks.filter(task => (task.status ?? 'PENDING') === 'PENDING'),
    [todayMicroTasks],
  )
  const completedTodayMicroTasks = useMemo(
    () => todayMicroTasks.filter(task => (task.status ?? 'PENDING') === 'COMPLETED'),
    [todayMicroTasks],
  )
  const currentDate = new Date()
  const lastWheelDate = latestWheel
    ? new Date(latestWheel.completedAt ?? latestWheel.createdAt)
    : null
  const nextWheelDate = lastWheelDate
    ? new Date(lastWheelDate.getTime() + 30 * 24 * 60 * 60 * 1000)
    : null
  const formatShortDate = (value: Date) =>
    value.toLocaleDateString('uk-UA', { day: 'numeric', month: 'short' })
  const wheelSubtitle = lastWheelDate
    ? `Було ${formatShortDate(lastWheelDate)} · далі ${nextWheelDate ? formatShortDate(nextWheelDate) : '—'}`
    : 'Пройти колесо балансу'
  const wheelStatus: 'done' | 'pending' =
    lastWheelDate
      ? nextWheelDate && nextWheelDate <= currentDate ? 'pending' : 'done'
      : 'pending'
  const hasUpcomingZoomToday = Boolean(
    upcomingZoom?.scheduledAt
    && upcomingZoom.status === 'SCHEDULED'
    && upcomingZoom.scheduledAt.slice(0, 10) === todayDateKey,
  )
  const zoomTimeLabel = upcomingZoom?.scheduledAt
    ? new Date(upcomingZoom.scheduledAt).toLocaleTimeString('uk-UA', { hour: '2-digit', minute: '2-digit' })
    : null
  const morningDraft = getDailyDraftProgress(userId ?? '', 'morning', todayDateKey)
  const eveningDraft = getDailyDraftProgress(userId ?? '', 'evening', todayDateKey)
  const activeSessionMicroTasks = useMemo(() => {
    const merged = [...activeTodayMicroTasks]

    for (const task of activeCarryOverMicroTasks) {
      if (merged.some((current) => current.id === task.id)) continue
      merged.push(task)
    }

    return merged
  }, [activeCarryOverMicroTasks, activeTodayMicroTasks])
  const currentMultiDayTask = useMemo(
    () => activeSessionMicroTasks.find((task) => task.schedule?.isMultiDay),
    [activeSessionMicroTasks],
  )
  const microTasksDeadlineLine = useMemo(() => {
    if (!activeSessionMicroTasks.length) return null

    const dueDates = activeSessionMicroTasks
      .map((task) => task.dueAt ?? task.expiresAt ?? null)
      .filter((value): value is string => Boolean(value))
      .map((value) => new Date(value))
      .filter((value) => !Number.isNaN(value.getTime()))
      .sort((left, right) => left.getTime() - right.getTime())

    const nearestDueDate = dueDates[0]
    if (nearestDueDate) {
      const endOfDueDate = new Date(nearestDueDate)
      endOfDueDate.setHours(23, 59, 59, 999)
      const remainingDays = Math.max(0, Math.ceil((endOfDueDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)))
      return formatRemainingDaysLabel(remainingDays)
    }

    if (currentMultiDayTask?.schedule?.label) {
      return currentMultiDayTask.schedule.label
    }

    return 'У процесі'
  }, [activeSessionMicroTasks, currentMultiDayTask, now])
  const microTasksSubtitle = (() => {
    if (activeSessionMicroTasks.length > 0) {
      if (currentMultiDayTask?.schedule?.label) return currentMultiDayTask.schedule.label
      if (activeCarryOverMicroTasks.length > 0) {
        return `У процесі ${activeSessionMicroTasks.length} · багатоденний фокус`
      }
      return `${completedTodayMicroTasks.length}/${todayMicroTasks.length} закрито сьогодні`
    }

    if (todayMicroTasks.length > 0) {
      return `${completedTodayMicroTasks.length}/${todayMicroTasks.length} закрито сьогодні`
    }

    if (!isMorningDone) {
      return 'Сформуються після ранкової сесії'
    }

    return 'На сьогодні нових задач ще немає'
  })()
  if (isLoading) return (
    <div className="rounded-xl border border-[var(--border)] bg-[var(--bg-secondary)] p-6 text-center">
      <p className="text-sm text-[var(--text-muted)]">Завантажуємо твій шлях...</p>
    </div>
  )

  if (hasNoTrial) return (
    <div className="dashboard-liquid-card--soft">
      <div className="bg-[linear-gradient(180deg,rgba(var(--accent-rgb),0.12),rgba(255,255,255,0.02))] p-5">
        <p className="mb-1 text-[10px] font-semibold uppercase tracking-widest text-[var(--accent)]">
          МІЙ ШЛЯХ
        </p>
        <h2 className="text-xl font-bold text-[var(--text-primary)]">
          Розпочни свій шлях ✦
        </h2>
        <p className="mt-2 text-sm text-[var(--text-muted)]">
          7 днів безкоштовно — ранкові питання, вечірня рефлексія,
          колесо балансу та аналіз стану.
        </p>
      </div>
      <div className="p-4">
        <div className="mb-4 grid grid-cols-3 gap-3">
          {[
            { icon: '🌞', label: 'Ранкові питання', sub: 'щодня о 09:00' },
            { icon: '🌙', label: 'Вечірня рефлексія', sub: 'щодня о 21:00' },
            { icon: '⚖️', label: 'Колесо балансу', sub: 'раз на місяць' },
          ].map(item => (
            <div
              key={item.label}
              className="rounded-xl border border-[var(--border-primary)] bg-[rgba(255,255,255,0.03)] p-3 text-center shadow-[inset_0_1px_0_rgba(255,255,255,0.04)]"
            >
              <span className="text-xl">{item.icon}</span>
              <p className="mt-2 text-xs font-medium text-[var(--text-primary)]">{item.label}</p>
              <p className="mt-0.5 text-[10px] text-[var(--text-muted)]">{item.sub}</p>
            </div>
          ))}
        </div>
        <div className="dashboard-liquid-edge">
          <button
            type="button"
            className="btn-liquid-dashboard btn-liquid-dashboard--primary"
            onClick={() => navigate('/dashboard/ai-mentor')}
          >
            ▶ Розпочати 7 днів безкоштовно
          </button>
        </div>
      </div>
    </div>
  )

  const tasks: Array<{
    icon: string
    title: string
    sub: string
    detail?: string | null
    status: 'done' | 'pending' | 'locked' | 'time-locked'
    path: string
  }> = [
    {
      icon: '🌞',
      title: 'Ранкові питання',
      sub: '6 + 4 питань · ~5 хв',
      status: isMorningDone ? 'done' : (isAfterMorning || morningDraft.hasDraft) ? 'pending' : 'time-locked',
      path: '/dashboard/cycle?session=morning',
    },
    {
      icon: '📋',
      title: 'Мікрозавдання',
      sub: microTasksSubtitle,
      detail: microTasksDeadlineLine,
      status: activeSessionMicroTasks.length > 0
        ? 'pending'
        : todayMicroTasks.length > 0
          ? 'done'
          : isMorningDone
            ? 'locked'
            : 'time-locked',
      path: '/dashboard/ai-mentor?section=tasks&source=daily-cycle',
    },
    {
      icon: '🌙',
      title: 'Вечірня рефлексія',
      sub: 'Афірмації + підсумок дня',
      status: isEveningDone ? 'done' : (isAfterEvening || eveningDraft.hasDraft) ? 'pending' : 'time-locked',
      path: '/dashboard/cycle?session=evening',
    },
    {
      icon: '⚖️',
      title: 'Колесо балансу',
      sub: wheelSubtitle,
      status: wheelStatus,
      path: '/dashboard/wheel',
    },
  ]

  if (hasUpcomingZoomToday) {
    tasks.splice(3, 0, {
      icon: '🎥',
      title: 'Zoom-сесія',
      sub: `${zoomTimeLabel ?? 'Сьогодні'} · ${upcomingZoom?.topic ?? 'Запланована зустріч'}`,
      status: 'pending',
      path: '/dashboard/sessions',
    })
  }

  const nextTask = (() => {
    if (!isMorningDone) return tasks.find(task => task.title === 'Ранкові питання') ?? tasks[0]
    if (activeSessionMicroTasks.length > 0) return tasks.find(task => task.title === 'Мікрозавдання') ?? tasks[0]
    if (!isEveningDone && isAfterEvening) return tasks.find(task => task.title === 'Вечірня рефлексія') ?? tasks[0]
    if (wheelStatus === 'pending') return tasks.find(task => task.title === 'Колесо балансу') ?? tasks[0]
    if (!isEveningDone) return tasks.find(task => task.title === 'Вечірня рефлексія') ?? tasks[0]
    return tasks.find(task => task.title === 'Колесо балансу') ?? tasks[0]
  })()
  const primaryActionLabel =
    nextTask.title === 'Ранкові питання'
      ? (morningDraft.hasDraft ? '▶ Продовжити' : '▶ Почати')
      : nextTask.title === 'Мікрозавдання'
        ? `▶ Відкрити мікрозавдання${activeSessionMicroTasks.length > 0 ? ` · ${activeSessionMicroTasks.length}` : ''}`
        : nextTask.title === 'Вечірня рефлексія'
          ? (eveningDraft.hasDraft || isAfterEvening ? '▶ Продовжити' : '▶ Відкрити вечірню рефлексію')
          : nextTask.title === 'Zoom-сесія'
            ? '▶ Відкрити Zoom-сесію'
          : '▶ Оновити колесо балансу'
  const openTask = (task: (typeof tasks)[number]) => {
    if (isLocked) {
      onLockedOpen()
      return
    }
    if (task.path.startsWith('/dashboard/cycle')) {
      const session = task.path.includes('evening') ? 'evening' : 'morning'
      onOpenCycle(session)
      return
    }
    if (task.path.includes('section=tasks')) {
      onOpenMicroTasks()
      return
    }
    if (task.path === '/dashboard/wheel') {
      onOpenWheelFrame()
      return
    }
    navigate(task.path)
  }

  const telegramSessionTarget = nextTask.title === 'Вечірня рефлексія'
    ? 'evening'
    : nextTask.title === 'Ранкові питання'
      ? 'morning'
      : null

  useEffect(() => {
    if (!userId || !telegramStatus?.botActive || !telegramSessionTarget || isLocked) return

    const syncKey = `${userId}:${telegramSessionTarget}:${todayDateKey}:session-tab`
    if (sessionSyncKeyRef.current === syncKey) return
    sessionSyncKeyRef.current = syncKey

    void sendSessionHandoff({
      session: telegramSessionTarget,
      step: telegramSessionTarget === 'morning' ? morningDraft.step : eveningDraft.step,
      answers: {},
      date: new Date().toISOString(),
    }).unwrap().catch(error => {
      console.warn('[AiMentorDashboard] session tab handoff sync failed', {
        session: telegramSessionTarget,
        error,
      })
    })
  }, [
    eveningDraft.step,
    isLocked,
    morningDraft.step,
    sendSessionHandoff,
    telegramSessionTarget,
    telegramStatus?.botActive,
    todayDateKey,
    userId,
  ])

  const handleOpenTelegramSession = async () => {
    if (!telegramSessionTarget) return

    if (!telegramStatus?.botActive) {
      if (telegramLinkData?.url) {
        window.open(telegramLinkData.url, '_blank', 'noopener,noreferrer')
      }
      return
    }

    try {
      const result = await generateDeepLink({
        action: 'resume_task',
        source: 'web',
        target: 'telegram',
        path: `/dashboard/cycle?session=${telegramSessionTarget}`,
        payload: {
          session: telegramSessionTarget,
          step: telegramSessionTarget === 'morning' ? morningDraft.step : eveningDraft.step,
          answers: {},
          date: new Date().toISOString(),
        },
      }).unwrap()

      window.open(result.telegramUrl, '_blank', 'noopener,noreferrer')
    } catch (error) {
      console.error('[AiMentorDashboard] telegram resume link failed:', error)
      if (telegramLinkData?.url) {
        window.open(telegramLinkData.url, '_blank', 'noopener,noreferrer')
      }
    }
  }

  return (
    <section className="space-y-4">
      {isJustStarted && (
        <div className="rounded-xl border border-[var(--accent)] bg-[var(--accent-bg,var(--bg-secondary))] p-4 text-center">
          <p className="text-sm font-medium text-[var(--accent)]">
            🎉 Вітаємо! Твій 7-денний шлях розпочато
          </p>
          <p className="mt-1 text-xs text-[var(--text-muted)]">
            Щодня о 09:00 — ранкові питання · о 21:00 — вечірня рефлексія
          </p>
        </div>
      )}
      {isTrialExpired && !isPaid && (
        <div className="dashboard-liquid-card--soft">
          <div className="bg-[linear-gradient(180deg,rgba(var(--accent-rgb),0.12),rgba(255,255,255,0.02))] p-5">
            <p className="mb-1 text-[10px] font-semibold uppercase tracking-widest text-[var(--accent)]">
              ТВІЙ ШЛЯХ · ПАУЗА
            </p>
            <h2 className="text-xl font-bold text-[var(--text-primary)]">
              7 днів завершено 🎯
            </h2>
            <p className="mt-1 text-sm text-[var(--text-muted)]">
              Ти пройшов пробний період. Продовж щоб зберегти прогрес
              і розблокувати повний доступ.
            </p>
          </div>
          <div className="space-y-3 p-4">
            {[
              { plan: 'Тиждень', price: '7€', desc: 'Продовжити знайомство', key: 'WEEK' },
              { plan: 'Місяць', price: '30€', desc: 'Глибинна робота', key: 'MONTH' },
              { plan: 'Рік', price: '300€', desc: 'Максимальна економія', key: 'YEAR' },
            ].map(p => (
              <div
                key={p.key}
                className="flex items-center justify-between rounded-xl border border-[var(--border-primary)] bg-[rgba(255,255,255,0.02)] px-4 py-3 shadow-[inset_0_1px_0_rgba(255,255,255,0.04)]"
              >
                <div>
                  <p className="text-sm font-medium text-[var(--text-primary)]">{p.plan}</p>
                  <p className="text-xs text-[var(--text-muted)]">{p.desc}</p>
                </div>
                <span className="text-lg font-bold text-[var(--accent)]">{p.price}</span>
              </div>
            ))}
            <div className="dashboard-liquid-edge">
              <button
                type="button"
                className="btn-liquid-dashboard btn-liquid-dashboard--primary"
                onClick={() => navigate('/dashboard/subscription')}
              >
                Продовжити шлях →
              </button>
            </div>
          </div>
        </div>
      )}
      <div className="dashboard-liquid-card">
        <div className="bg-[linear-gradient(180deg,rgba(var(--accent-rgb),0.18),rgba(255,255,255,0.02)_58%,rgba(255,255,255,0.01))] p-5">
          <div className="mb-4 border-b border-[rgba(255,255,255,0.06)] pb-4">
            <div className="flex items-center gap-3">
            <span className="text-2xl font-bold text-[var(--accent)]">🔥 {currentDay}</span>
            <div className="min-w-0">
              <p className="text-sm font-medium text-[var(--text-primary)]">день поспіль</p>
              <p className="text-xs text-[var(--text-muted)]">День {currentDay} з {totalDays} · залишилось {trialDaysLeft} дн.</p>
            </div>
            {telegramSessionTarget && !isLocked ? (
              <button
                type="button"
                onClick={() => { void handleOpenTelegramSession() }}
                disabled={isGeneratingTelegramResume || isSendingSessionHandoff}
                className={[
                  'rounded-xl border px-3 py-1.5 text-[11px] font-semibold tracking-[0.04em] transition-all',
                  'border-[rgba(var(--accent-soft-rgb),0.34)] bg-[rgba(var(--accent-rgb),0.08)] text-[rgb(var(--accent-soft-rgb))]',
                  (isGeneratingTelegramResume || isSendingSessionHandoff)
                    ? 'opacity-70'
                    : 'hover:border-[rgba(var(--accent-soft-rgb),0.46)] hover:bg-[rgba(var(--accent-rgb),0.14)]',
                ].join(' ')}
              >
                {telegramStatus?.botActive
                  ? (isGeneratingTelegramResume ? 'Відкриваємо Telegram...' : '💬 Відповідати в Telegram')
                  : (isTelegramLinkLoading ? 'Генеруємо Telegram...' : 'Підключити Telegram')}
              </button>
            ) : null}
            <div className="ml-auto overflow-x-auto pb-1">
              <div className="flex w-max gap-2">
                {Array.from({ length: totalDays }).map((_, i) => {
                  const day = i + 1
                  const dayDate = new Date(timelineStartDate)
                  dayDate.setDate(timelineStartDate.getDate() + (day - 1))
                  const dayDateKey = toDateKey(dayDate)
                  const dayProgress = historyByDate[dayDateKey]
                  const summaryYesterdayDateKey = getRelativeDateKey(todayDateKey, -1)
                  const {
                    hasProgress,
                    completed,
                    completedLate,
                    missed,
                    canResumeDay,
                    dayTone,
                    dayLabel,
                    dayDots,
                  } = getTimelineDayPresentation({
                    dayDateKey,
                    todayDateKey,
                    yesterdayDateKey: summaryYesterdayDateKey,
                    active: day === currentDay,
                    showEveningSession: false,
                    recoveryDateKey: null,
                    recoveryTargetDateKey: recoveryTarget?.dateKey ?? null,
                    recoveryTargetSession: recoveryTarget?.session ?? null,
                    dayProgress,
                  })
                  return (
                    <div
                      key={day}
                      title={
                        day === currentDay
                          ? 'Сьогоднішній день: тут видно прогрес ранку, мікрозавдань і вечора.'
                          : canResumeDay
                            ? 'Незавершений день. Натисни, щоб повернутися в точку зупинки.'
                            : completedLate
                              ? 'День завершено пізніше, але закрито.'
                              : completed
                                ? 'Увесь день закрито.'
                              : missed
                                ? 'Пропущено: цього дня не було дій.'
                                : hasProgress
                                  ? 'Є незавершені кроки.'
                                  : 'День ще не активовано.'
                      }
                      className={[
                        'relative flex h-[112px] w-[56px] flex-shrink-0 flex-col justify-between overflow-visible rounded-2xl px-2.5 py-2 text-center transition-all',
                        isLocked
                          ? 'bg-[rgba(255,255,255,0.02)] opacity-25 grayscale cursor-not-allowed'
                          : [
                            getTimelineCardClass(dayTone),
                            'shadow-[inset_0_1px_0_rgba(255,255,255,0.05)]',
                          ].join(' ')
                        ,
                        dayDateKey <= todayDateKey ? 'cursor-pointer hover:border-amber-300/50' : '',
                      ].join(' ')}
                      onClick={() => {
                        if (dayDateKey > todayDateKey || isLocked) return
                        navigate(buildJournalDayUrl(dayDateKey))
                      }}
                    >
                      <div className="flex h-full min-h-0 flex-1 flex-col justify-between">
                        <div className="flex min-h-[48px] flex-col items-center justify-start">
                          <div
                            className={[
                              'text-sm font-semibold leading-none',
                              dayTone === 'active'
                                ? 'text-[var(--accent)]'
                                : dayTone === 'partial'
                                  ? 'text-[rgb(250,204,21)]'
                                  : dayTone === 'done'
                                    ? 'text-[var(--color-success)]'
                                    : dayTone === 'missed'
                                      ? 'text-[rgb(248,113,113)]'
                                      : 'text-[var(--text-muted)]',
                            ].join(' ')}
                          >
                            {day}
                          </div>
                          <div className="mt-1 flex h-[18px] items-start justify-center overflow-hidden">
                            <div className={['max-w-full text-[8px] font-semibold uppercase leading-[1.05]', getTimelineLabelClass(dayTone)].join(' ')}>
                              {dayLabel}
                            </div>
                          </div>
                        </div>
                        <div className="flex min-h-[30px] flex-col justify-end">
                          <div className="flex min-h-[12px] items-center justify-center gap-1">
                            {dayDots.map((dot, dotIndex) => (
                              <span key={`${dayDateKey}-mini-dot-${dotIndex}`} className="group/dot relative inline-flex">
                                <span
                                  className={['h-1.5 w-1.5 flex-shrink-0 rounded-full', dot.colorClass].join(' ')}
                                  aria-label={`${dot.label}: ${dot.tooltip}`}
                                />
                                <span className="pointer-events-none absolute left-1/2 top-full z-20 mt-2 hidden w-32 -translate-x-1/2 rounded-xl border border-[rgba(255,255,255,0.08)] bg-[rgba(11,16,30,0.96)] px-2 py-1.5 text-[10px] text-[var(--text-secondary)] shadow-[0_12px_24px_rgba(0,0,0,0.22)] group-hover/dot:block">
                                  <strong className="block text-[var(--text-primary)]">{dot.label}</strong>
                                  {dot.tooltip}
                                </span>
                              </span>
                            ))}
                          </div>
                          <div className="mt-1 min-h-[14px] text-[8px] font-medium text-[rgb(var(--accent-soft-rgb))]">
                            {formatCompactDateKey(dayDateKey)}
                          </div>
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          </div>
          </div>
          <p className="mb-1 text-[10px] font-semibold uppercase tracking-widest text-[var(--accent)]">
            ДЕНЬ {currentDay} · МІЙ ШЛЯХ
          </p>
          <h2 className="text-xl font-bold text-[var(--text-primary)]">Ранкова сесія</h2>
          <p className="mt-1 text-sm text-[var(--text-muted)]">
            Зафіксуй стан та отримай мікрозавдання на день
          </p>
          <div className="mt-3 h-1 rounded-full bg-[var(--border)]">
            <div
              className={['h-full rounded-full bg-[var(--accent)] transition-all', progressClass].join(' ')}
            />
          </div>
          <p className="mt-1 text-[10px] text-[var(--text-muted)]">
            Прогрес {Math.round((currentDay / totalDays) * 100)}%
          </p>
        </div>
        <div className="divide-y divide-[var(--border)] p-4">
          {tasks.map(task => (
            <div
              key={task.title}
              className={[
                'flex items-center gap-3 py-3',
                task.status === 'pending' || task.status === 'done' ? 'cursor-pointer' : '',
                isLocked ? 'pointer-events-none opacity-40' : '',
              ].join(' ')}
              onClick={() => {
                if (isLocked) return
                if (task.status === 'pending' || task.status === 'done') {
                  openTask(task)
                }
              }}
            >
              <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-xl bg-[rgba(255,255,255,0.03)] text-sm shadow-[inset_0_1px_0_rgba(255,255,255,0.05)]">
                {task.icon}
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium text-[var(--text-primary)]">{task.title}</p>
                <p className="text-xs text-[var(--text-muted)]">{task.sub}</p>
                {task.detail ? (
                  <p className="mt-1 text-[11px] font-medium text-[rgb(var(--accent-soft-rgb))]">{task.detail}</p>
                ) : null}
              </div>
              <span
                className={[
                  'flex-shrink-0 rounded-full px-2 py-1 text-xs',
                  task.status === 'done' ? 'bg-[var(--color-success-bg)] text-[var(--color-success)]' :
                  task.status === 'pending' ? 'bg-[var(--bg-tertiary)] text-[var(--accent)]' :
                  task.status === 'time-locked' ? 'bg-[var(--bg-tertiary)] text-[var(--text-secondary)]' :
                  'bg-[var(--bg-tertiary)] text-[var(--text-muted)]'
                ].join(' ')}
              >
                {task.status === 'done' ? '✓ Готово' :
                  task.status === 'pending' ? 'Сьогодні' :
                  task.status === 'time-locked' ? (
                    <span className="flex items-center gap-1">
                      <span>🕐</span>
                      <span>
                        {task.title === 'Ранкові питання'
                          ? '09:00'
                          : task.title === 'Вечірня рефлексія'
                            ? '21:00'
                            : <span className="flex items-center gap-1">
  <span>⏳</span>
  <span>Далі</span>
</span>}
                      </span>
                    </span>
                  ) : '🔒'}
              </span>
            </div>
          ))}
        </div>
        <div>
          {isLocked ? (
            <button
              type="button"
              className="btn-liquid-dashboard btn-liquid-dashboard--tint"
              onClick={() => navigate('/dashboard/subscription')}
            >
              Розблокувати доступ →
            </button>
          ) : (
            <button
              type="button"
              className="btn-liquid-dashboard btn-liquid-dashboard--primary"
              onClick={() => openTask(nextTask)}
            >
              {primaryActionLabel}
            </button>
          )}
        </div>
      </div>
    </section>
  )
}

function Greeting({
  name,
  isExpert,
  isSuperAdmin,
  mode = 'default',
}: {
  name: string
  isExpert: boolean
  isSuperAdmin: boolean
  mode?: 'default' | 'cycle'
}) {
  if (!isExpert && !isSuperAdmin && mode === 'cycle') return null

  if (!isExpert && !isSuperAdmin) {
    return (
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-xl font-semibold text-[var(--text-primary)]">
            Твій особистий простір зростання
          </p>
        </div>
        <span className="inline-flex items-center gap-1.5 rounded-full border border-[var(--border-primary)] bg-[var(--bg-secondary)] px-3 py-1 text-xs font-medium text-[var(--text-muted)]">
          🌱 Учень
        </span>
      </div>
    )
  }

  return (
    <div className="flex items-start justify-between gap-4">
      <div>
        <p className="mb-1 text-xs font-semibold uppercase tracking-widest text-[var(--accent)]">
          {isSuperAdmin ? 'SuperAdmin' : 'Кабінет коуча'}
        </p>
        <h1 className="text-2xl font-bold text-[var(--text-primary)]">
          {isSuperAdmin
            ? `SuperAdmin · ${name}`
            : isExpert
              ? `Starway by Nadya · ${name}`
              : `Кабінет · ${name}`}
        </h1>
        <p className="mt-1 text-sm text-[var(--text-muted)]">
          {isSuperAdmin
            ? 'Повний доступ — всі коучі, учні, аналітика'
            : isExpert
              ? 'Панель коуча — учні, продукти, система'
              : 'Твій особистий простір зростання'}
        </p>
      </div>
      <span
        className={[
          'mt-2 inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-medium',
          isSuperAdmin
            ? 'border-[var(--accent)] bg-[var(--accent-bg,var(--bg-secondary))] text-[var(--accent)]'
            : 'border-[var(--border-primary)] bg-[var(--bg-secondary)] text-[var(--text-secondary)]',
        ].join(' ')}
      >
        {isSuperAdmin ? '⭐ SuperAdmin' : '🎓 Коуч'}
      </span>
    </div>
  )
}

function ExpertStatsSection({ isSuperAdmin }: { isSuperAdmin: boolean }) {
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {[
          { label: isSuperAdmin ? 'Всіх учнів (всі коучі)' : 'Активних учнів', value: '—', icon: '👥', sub: 'підключається' },
          { label: 'Завершують день', value: '—', icon: '📊', sub: 'підключається' },
          { label: 'Потреб уваги', value: '—', icon: '⚠️', sub: 'підключається' },
          { label: 'Дохід місяця', value: '—', icon: '💰', sub: 'підключається' },
        ].map(s => (
          <div key={s.label} className="rounded-[18px] border border-[rgba(255,255,255,0.06)] bg-[rgba(255,255,255,0.03)] px-4 py-4">
            <div className="mb-2 text-2xl">{s.icon}</div>
            <p className="text-2xl font-bold text-[var(--text-primary)]">{s.value}</p>
            <p className="mt-0.5 text-sm text-[var(--text-muted)]">{s.label}</p>
            <p className="mt-1 text-xs text-[var(--text-muted-light)]">{s.sub}</p>
          </div>
        ))}
      </div>

      <div className="rounded-[20px] border border-[rgba(255,255,255,0.06)] bg-[rgba(255,255,255,0.03)] p-5">
        <h2 className="mb-4 text-sm font-semibold text-[var(--text-primary)]">
          {isSuperAdmin ? 'Загальна воронка — всі коучі' : 'Воронка — конверсія'}
        </h2>
        {FUNNEL_SEGMENTS.map(f => (
          <div key={f.label} className="mb-3 flex items-center gap-3">
            <span className="w-24 flex-shrink-0 text-xs text-[var(--text-muted)]">{f.label}</span>
            <div className="h-1.5 flex-1 rounded-full bg-[var(--border)]">
              <div
                className={['h-full rounded-full transition-all', f.widthClass, f.colorClass].join(' ')}
              />
            </div>
            <span className="w-6 text-right text-xs text-[#4d9de0]">{f.value}</span>
          </div>
        ))}
      </div>

      <div className="rounded-[20px] border border-[rgba(255,255,255,0.06)] bg-[rgba(255,255,255,0.03)] p-5">
        <h2 className="mb-4 text-sm font-semibold text-[var(--text-primary)]">
          Аналітика — рекомендації
        </h2>
        {[
          { icon: '🎯', text: 'Підключіть аналітику щоб побачити рекомендації' },
          { icon: '📣', text: 'Дані з\'являться після першого запуску навчального сценарію' },
          { icon: '🔍', text: 'SEO аналіз стане доступний після налаштування' },
        ].map((r, i) => (
          <div key={i} className="flex items-start gap-3 border-b border-[var(--border)] py-2.5 last:border-0">
            <span className="flex-shrink-0 text-base">{r.icon}</span>
            <span className="text-xs leading-relaxed text-[var(--text-muted)]">{r.text}</span>
          </div>
        ))}
      </div>
    </div>
  )
}

function FunnelConversionSection() { return null }

function AIProducerRecommendations() { return null }

function WheelStatusNotice({ onOpenInline }: { onOpenInline: () => void }) {
  const { user } = useAuth()
  const { accessControl, subscription } = useSystemState()
  const { data: trial } = useGetTrialStatusQuery()
  const dashboardUser = user as DashboardUser
  const userId = dashboardUser?.id
  const hasWheelAccess = Boolean(
    (trial?.isActive ?? false)
    || (trial?.isPaid ?? false)
    || subscription?.isActive
    || accessControl?.hasSubscription
  )
  const { data: latestWheel } = useGetLatestWheelAssessmentQuery(userId ?? '', {
    skip: !userId || !hasWheelAccess,
  })

  if (!hasWheelAccess) return null

  const now = new Date()
  const lastWheelDate = latestWheel
    ? new Date(latestWheel.completedAt ?? latestWheel.createdAt)
    : null
  const nextWheelDate = lastWheelDate
    ? new Date(lastWheelDate.getTime() + 30 * 24 * 60 * 60 * 1000)
    : null

  const needsWheel = !lastWheelDate || (nextWheelDate ? nextWheelDate <= now : false)

  if (!needsWheel) return null

  return (
    <div className="dashboard-liquid-card--soft">
      <div className="p-4">
        <div>
          <p className="mb-1 text-[10px] font-semibold uppercase tracking-widest text-[var(--accent)]">
            КОЛЕСО БАЛАНСУ
          </p>
          <p className="text-sm font-medium text-[var(--text-primary)]">
            {!lastWheelDate ? 'Пройти колесо балансу' : 'Час оновити колесо балансу'}
          </p>
          <p className="mt-1 text-xs text-[var(--text-muted)]">
            {!lastWheelDate
              ? 'Ще не було жодного проходження. Заповни 8 сфер і отримай новий зріз стану.'
              : `Було ${formatWheelDate(lastWheelDate)} · наступне було заплановане на ${nextWheelDate ? formatWheelDate(nextWheelDate) : '—'}`}
          </p>
        </div>
      </div>
      <div>
        <button
          type="button"
          onClick={onOpenInline}
          className="btn-liquid-dashboard btn-liquid-dashboard--primary"
        >
          Відкрити колесо →
        </button>
      </div>
    </div>
  )
}

function WheelInlineFrame({
  isOpen,
  onClose,
}: {
  isOpen: boolean
  onClose: () => void
}) {
  const { user } = useAuth()
  const accessToken = useAppSelector(state => state.auth.accessToken)
  const dashboardUser = user as DashboardUser
  const userId = dashboardUser?.id

  const {
    data: latestWheel,
    isLoading,
    refetch,
  } = useGetLatestWheelAssessmentQuery(userId ?? '', {
    skip: !userId || !isOpen,
    refetchOnFocus: true,
    pollingInterval: isOpen ? 30_000 : 0,
  })

  if (!isOpen || !userId) return null

  const lastWheelDate = latestWheel
    ? new Date(latestWheel.completedAt ?? latestWheel.createdAt)
    : null
  const nextWheelDate = lastWheelDate
    ? new Date(lastWheelDate.getTime() + 30 * 24 * 60 * 60 * 1000)
    : null
  const weakestId = latestWheel?.gaps?.[0]
  const strongestId = latestWheel?.strengths?.[0]
  const weakestLabel = weakestId ? (WHEEL_LABEL_MAP.get(weakestId) ?? weakestId) : '—'
  const strongestLabel = strongestId ? (WHEEL_LABEL_MAP.get(strongestId) ?? strongestId) : '—'
  const weakestEmoji = weakestId ? (WHEEL_EMOJI_MAP.get(weakestId) ?? '⚖️') : '⚖️'
  const strongestEmoji = strongestId ? (WHEEL_EMOJI_MAP.get(strongestId) ?? '✨') : '✨'
  const summaryText = latestWheel?.notes?.trim()
    ? latestWheel.notes
    : `Зараз найбільше уваги просить сфера "${weakestLabel}". Найсильніша опора — "${strongestLabel}".`

  const handleDownloadPdf = async () => {
    if (!latestWheel?.id) return
    try {
      const headers: Record<string, string> = {}
      if (accessToken) headers.Authorization = `Bearer ${accessToken}`
      const response = await fetch(`/api/wheel/${latestWheel.id}/pdf`, {
        headers,
        credentials: 'include',
      })
      if (!response.ok) throw new Error('pdf_failed')
      const blob = await response.blob()
      const url = URL.createObjectURL(blob)
      const anchor = document.createElement('a')
      anchor.href = url
      anchor.download = `wheel-report-${toDateKey(new Date())}.pdf`
      anchor.click()
      setTimeout(() => URL.revokeObjectURL(url), 5000)
    } catch (error) {
      console.error('[Dashboard] wheel pdf failed:', error)
    }
  }

  return (
    <div className="dashboard-liquid-card relative">
      <button
        type="button"
        onClick={onClose}
        className="absolute right-4 top-4 z-10 inline-flex h-9 w-9 items-center justify-center rounded-full border border-[rgba(255,255,255,0.12)] bg-[linear-gradient(180deg,rgba(255,255,255,0.08),rgba(255,255,255,0.03))] text-[var(--text-muted)] shadow-[inset_0_1px_0_rgba(255,255,255,0.10),0_10px_24px_rgba(0,0,0,0.18)] transition-all hover:bg-[linear-gradient(180deg,rgba(255,255,255,0.12),rgba(255,255,255,0.05))] hover:text-[var(--text-primary)]"
        aria-label="Закрити колесо"
      >
        <X className="h-4 w-4" />
      </button>
      <div className="dashboard-liquid-edge--top flex flex-wrap items-start justify-between gap-3 p-5 pr-16 sm:pr-20">
        <div>
          <p className="mb-1 text-[10px] font-semibold uppercase tracking-widest text-[var(--accent)]">
            КОЛЕСО БАЛАНСУ
          </p>
          <h2 className="text-lg font-bold text-[var(--text-primary)]">
            {!latestWheel ? 'Заповни колесо прямо тут' : 'Твій зріз стану по 8 сферах'}
          </h2>
          <p className="mt-1 text-xs text-[var(--text-muted)]">
            {!latestWheel
              ? 'Форма відкривається в кабінеті. Якщо пройдеш колесо в Telegram або miniapp, цей блок оновиться автоматично.'
              : `Було ${lastWheelDate ? formatWheelDate(lastWheelDate) : '—'} · наступне ${nextWheelDate ? formatWheelDate(nextWheelDate) : '—'}`}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2 pr-2 sm:pr-4">
          {latestWheel && (
            <>
              <button
                type="button"
                onClick={() => void refetch()}
                className="inline-flex items-center gap-2 rounded-t-[14px] rounded-b-[18px] border-x border-b border-t-0 border-x-[rgba(var(--accent-rgb),0.12)] border-b-[rgba(255,255,255,0.10)] bg-[linear-gradient(180deg,rgba(255,255,255,0.08),rgba(255,255,255,0.025))] px-3 py-2 text-xs text-[var(--text-muted)] shadow-[inset_0_1px_0_rgba(255,255,255,0.10),0_10px_22px_rgba(0,0,0,0.14)] transition-all hover:text-[var(--text-primary)]"
              >
                <RefreshCcw className="h-3.5 w-3.5" />
                Оновити
              </button>
              <button
                type="button"
                onClick={handleDownloadPdf}
                className="inline-flex items-center gap-2 rounded-t-[14px] rounded-b-[18px] border-x border-b border-t-0 border-x-[rgba(var(--accent-rgb),0.18)] border-b-[rgba(255,255,255,0.12)] bg-[linear-gradient(180deg,rgba(var(--accent-rgb),0.88),rgba(var(--accent-rgb),0.72))] px-3 py-2 text-xs font-medium text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.16),0_12px_26px_rgba(0,0,0,0.16)] transition-all hover:brightness-110"
              >
                <Download className="h-3.5 w-3.5" />
                PDF звіт
              </button>
            </>
          )}
        </div>
      </div>

      <div className="p-5">
        {isLoading ? (
          <div className="p-8 text-center text-sm text-[var(--text-muted)]">
            Завантажуємо колесо балансу...
          </div>
        ) : latestWheel ? (
          <div className="grid gap-5 lg:grid-cols-[minmax(320px,1.1fr)_minmax(280px,0.9fr)]">
            <div className="p-2">
              <WheelChart scores={latestWheel.scores} size={340} />
            </div>

            <div className="space-y-4">
              <div className="border-b border-[rgba(255,255,255,0.06)] pb-4">
                <p className="text-[10px] font-semibold uppercase tracking-widest text-[var(--accent)]">
                  Короткий звіт
                </p>
                <p className="mt-2 text-sm leading-relaxed text-[var(--text-secondary)]">
                  {summaryText}
                </p>
              </div>

              <div className="space-y-3">
                <div className="border-b border-[rgba(16,185,129,0.18)] pb-3">
                  <p className="text-[10px] font-semibold uppercase tracking-widest text-[var(--color-success)]">
                    Сильна сфера
                  </p>
                  <p className="mt-2 flex items-center gap-2 text-sm font-medium text-[var(--text-primary)]">
                    <span>{strongestEmoji}</span>
                    <span>{strongestLabel}</span>
                  </p>
                </div>
                <div className="border-b border-[rgba(245,158,11,0.18)] pb-3">
                  <p className="text-[10px] font-semibold uppercase tracking-widest text-[var(--accent)]">
                    Сфера фокусу
                  </p>
                  <p className="mt-2 flex items-center gap-2 text-sm font-medium text-[var(--text-primary)]">
                    <span>{weakestEmoji}</span>
                    <span>{weakestLabel}</span>
                  </p>
                </div>
              </div>

              <div className="pt-1">
                <p className="mb-3 text-[10px] font-semibold uppercase tracking-widest text-[var(--accent)]">
                  Легенда
                </p>
                <div className="space-y-2">
                  {latestWheel.scores.map(score => {
                    const label = WHEEL_LABEL_MAP.get(score.categoryId) ?? score.categoryId
                    const emoji = WHEEL_EMOJI_MAP.get(score.categoryId) ?? '•'
                    return (
                      <div key={score.categoryId} className="flex items-center justify-between gap-3 border-b border-[rgba(255,255,255,0.06)] py-2 text-xs last:border-b-0">
                        <span className="inline-flex min-w-0 items-center gap-2 text-[var(--text-secondary)]">
                          <span>{emoji}</span>
                          <span className="truncate">{label}</span>
                        </span>
                        <span className="rounded-full bg-[var(--bg-tertiary)] px-2 py-1 font-medium text-[var(--text-primary)]">
                          {score.score}/10
                        </span>
                      </div>
                    )
                  })}
                </div>
              </div>
            </div>
          </div>
        ) : (
          <WheelForm
            userId={userId}
            onComplete={() => void refetch()}
            onCancel={onClose}
          />
        )}
      </div>

      <div className="dashboard-liquid-edge">
        <button
          type="button"
          onClick={onClose}
          className="btn-liquid-dashboard btn-liquid-dashboard--ice"
        >
          ↑ Згорнути вгору
        </button>
      </div>
    </div>
  )
}

// ─── DashboardPage ────────────────────────────────────────────────────────────

export default function AiMentorDashboardPage() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const { accessControl, subscription, getModuleAccess } = useSystemState()
  const dashboardUser = user as DashboardUser
  const userId = dashboardUser?.id
  const { data: trial } = useGetTrialStatusQuery()
  const { data: todayEntry, refetch: refetchTodayEntry } = useGetTodayEntryQuery(undefined, {
    skip: !dashboardUser?.id,
  })
  const { data: dailyHistory = [], refetch: refetchDailyHistory } = useGetDailyHistoryQuery(undefined, {
    skip: !dashboardUser?.id,
  })
  const currentDateKey = toDateKey(new Date())
  const yesterdayDateKey = useMemo(() => getRelativeDateKey(currentDateKey, -1), [currentDateKey])
  const rawRecoveryTarget = useMemo(
    () => getLatestRecoveryTarget(dailyHistory, currentDateKey),
    [dailyHistory, currentDateKey],
  )
  const { dayNumber: journeyDay, journeySteps } = useUserProgress()
  const {
    tasks: microTasks,
    isFetching: isFetchingMicroTasks,
    refresh: refetchMicroTasks,
    createManualTask,
    replaceManualTasks,
    completeTask,
    deleteTask,
    skipTask,
    updateProgress,
    updateStep,
  } = useMicroTasks()
  const [submitDailyCycle, { isLoading: isGeneratingMicroTasks }] = useSubmitDailyCycleMutation()
  const [skipPreviousDay, { isLoading: isSkippingPreviousDay }] = useSkipPreviousDayMutation()

  const userRole = useAppSelector(selectUserRole)
  const role = (userRole ?? 'USER').toUpperCase()
  const isSuperAdmin = role === 'SUPERADMIN'
  const isExpert = role === 'EXPERT' || role === 'SUPERADMIN'
  const name = dashboardUser?.firstName || dashboardUser?.name || 'Користувач'
  const [activeTab, setActiveTab] = useState<AiMentorDashboardTab>(
    () => getInitialTab(location.search, location.pathname),
  )
  const [showWheelFrame, setShowWheelFrame] = useState(false)
  const [showMorningSession, setShowMorningSession] = useState(false)
  const [showEveningSession, setShowEveningSession] = useState(false)
  const [cycleRecoveryDateKey, setCycleRecoveryDateKey] = useState<string | null>(null)
  const [showLevelUpCallout, setShowLevelUpCallout] = useState(false)
  const [isExpiredTrialModalOpen, setIsExpiredTrialModalOpen] = useState(false)
  const [manualTaskText, setManualTaskText] = useState('')
  const [manualMicroTask, setManualMicroTask] = useState<MicroTaskItem | null>(null)
  const [isRegeneratingMicroTasks, setIsRegeneratingMicroTasks] = useState(false)
  const [hasRegeneratedMicroTasks, setHasRegeneratedMicroTasks] = useState(false)
  const [microtaskPromptIntent, setMicrotaskPromptIntent] = useState<MicrotaskPromptIntent | null>(null)
  const [microtaskPromptStage, setMicrotaskPromptStage] = useState<MicrotaskPromptStage>('choice')
  const [, setMicrotaskNotice] = useState<string | null>(null)
  const [openDayNoticeKey, setOpenDayNoticeKey] = useState<string | null>(null)
  const [recoveryPromptDateKey, setRecoveryPromptDateKey] = useState<string | null>(null)
  const [recoveryBlockedIntent, setRecoveryBlockedIntent] = useState<RecoveryBlockedIntent | null>(null)
  const [resumeIntentAfterRecovery, setResumeIntentAfterRecovery] = useState<RecoveryBlockedIntent | null>(null)
  const [optimisticTaskState, setOptimisticTaskState] = useState<Record<string, Partial<MicroTaskItem>>>({})
  const regenerationTimerRef = useRef<number | null>(null)
  const regenerationTickerRef = useRef<number | null>(null)
  const microtaskNoticeTimerRef = useRef<number | null>(null)

  const mentorLifecycleState = getMentorLifecycleState({
    trial,
    accessControl,
    subscription,
    aiMentorModule: getModuleAccess('AI_MENTOR'),
  })
  const isPausedTrial = mentorLifecycleState === 'paused_trial_ended'
  const currentDay = journeyDay || Math.min(7, Math.max(1, trial?.currentDay ?? 1))
  const totalDays = 7
  const trialDaysLeft = trial?.isActive ? getTrialDaysLeft(currentDay) : 0
  const todayDateKey = toDateKey(new Date())
  const activeMicrotaskDateKey = useMemo(() => {
    const params = new URLSearchParams(location.search)
    const requestedDateKey = params.get('date')
    if (activeTab !== 'microtasks') return todayDateKey
    if (!requestedDateKey) return todayDateKey
    return requestedDateKey
  }, [activeTab, location.search, todayDateKey])
  const microtaskContextEntry = useMemo(() => {
    if (activeMicrotaskDateKey === todayDateKey) {
      return todayEntry ?? dailyHistory.find(entry => toDateKey(entry.date) === activeMicrotaskDateKey) ?? null
    }

    return dailyHistory.find(entry => toDateKey(entry.date) === activeMicrotaskDateKey) ?? null
  }, [activeMicrotaskDateKey, dailyHistory, todayDateKey, todayEntry])
  const microtaskContextEntryIds = useMemo(
    () => getEntrySourceIds(microtaskContextEntry),
    [microtaskContextEntry],
  )
  const morningAnswers = useMemo(() => {
    const content = microtaskContextEntry?.content
    if (!content || typeof content !== 'object' || Array.isArray(content)) return null
    const morning = (content as Record<string, unknown>).morning
    if (!morning || typeof morning !== 'object' || Array.isArray(morning)) return null
    return morning as Record<string, string>
  }, [microtaskContextEntry])
  const morningMeta = useMemo(
    () => getMorningMeta(microtaskContextEntry?.content),
    [microtaskContextEntry],
  )
  const applyOptimisticTask = (task: MicroTaskItem) => {
    const override = optimisticTaskState[task.id]
    if (!override) return task

    const mergedMeta = override.meta && typeof override.meta === 'object' && !Array.isArray(override.meta)
      ? {
          ...(task.meta && typeof task.meta === 'object' && !Array.isArray(task.meta) ? task.meta : {}),
          ...override.meta,
        }
      : task.meta

    return {
      ...task,
      ...override,
      meta: mergedMeta,
    }
  }
  const visibleMicroTasks = useMemo(() => {
    const dayTasks = microTasks.filter(task => {
      const createdDateKey = typeof task.createdAt === 'string' ? task.createdAt.slice(0, 10) : null
      if (createdDateKey === activeMicrotaskDateKey) return true
      if (task.generatedFromEntryId && microtaskContextEntryIds.includes(task.generatedFromEntryId)) return true
      return false
    })
    const hasSavedManualTasks = dayTasks.some(task => task.status === 'manual')
    const merged = hasSavedManualTasks
      ? [...dayTasks]
      : manualMicroTask
        ? [manualMicroTask, ...dayTasks]
        : [...dayTasks]
    const seen = new Set<string>()
    return merged.filter(task => {
      if (seen.has(task.id)) return false
      seen.add(task.id)
      return true
    }).map(applyOptimisticTask)
  }, [activeMicrotaskDateKey, manualMicroTask, microTasks, microtaskContextEntryIds, optimisticTaskState])
  const todayMicroTasks = useMemo(() => {
    const todayEntryIds = todayEntry?.id ? [todayEntry.id] : []

    return microTasks
      .filter((task) => {
        const createdDateKey = typeof task.createdAt === 'string' ? task.createdAt.slice(0, 10) : null
        if (createdDateKey === todayDateKey) return true
        if (task.generatedFromEntryId && todayEntryIds.includes(task.generatedFromEntryId)) return true
        return false
      })
      .map(applyOptimisticTask)
  }, [applyOptimisticTask, microTasks, todayDateKey, todayEntry?.id])
  const activeTodayMicroTasks = useMemo(
    () => todayMicroTasks.filter(task => (task.status ?? 'PENDING') === 'PENDING' || (task.status === 'manual' && (task.meta as Record<string, unknown> | undefined)?.uiStatus !== 'done' && (task.meta as Record<string, unknown> | undefined)?.uiStatus !== 'skipped')),
    [todayMicroTasks],
  )
  const completedTodayMicroTasks = useMemo(
    () => todayMicroTasks.filter(task => {
      const manualUiStatus = task.meta && typeof task.meta === 'object' && !Array.isArray(task.meta)
        ? (task.meta as Record<string, unknown>).uiStatus
        : null
      return task.status === 'COMPLETED' || (task.status === 'manual' && manualUiStatus === 'done')
    }),
    [todayMicroTasks],
  )
  const visibleMicroTaskProgress = useMemo(() => {
    const isDone = (task: MicroTaskItem) => {
      const manualUiStatus = task.meta && typeof task.meta === 'object' && !Array.isArray(task.meta)
        ? (task.meta as Record<string, unknown>).uiStatus
        : null
      return task.status === 'COMPLETED'
        || (task.status === 'manual' && manualUiStatus === 'done')
    }

    const isSkipped = (task: MicroTaskItem) => {
      const manualUiStatus = task.meta && typeof task.meta === 'object' && !Array.isArray(task.meta)
        ? (task.meta as Record<string, unknown>).uiStatus
        : null
      return task.status === 'skipped'
        || task.status === 'expired'
        || (task.status === 'manual' && manualUiStatus === 'skipped')
    }

    const activeCount = visibleMicroTasks.filter(task => !isDone(task) && !isSkipped(task)).length
    const completedCount = visibleMicroTasks.filter(task => isDone(task)).length

    return {
      activeCount,
      completedCount,
      message: null,
    }
  }, [visibleMicroTasks])
  const hasActiveMicroTasks = visibleMicroTaskProgress.activeCount > 0
  const hasTasksToday = visibleMicroTasks.length > 0
  const hasRegenEligibleTasks = visibleMicroTasks.some(task => task.taskKind !== 'manual')
  const hasMorningAnswers = Boolean(morningAnswers && Object.keys(morningAnswers).length > 0)
  const hasServerRegeneratedMicroTasks = typeof morningMeta?.microTasksRegeneratedAt === 'string'
  const canContinueToEvening = Boolean(hasMorningAnswers || visibleMicroTasks.length > 0)
  const canRegenerateTasks = hasRegenEligibleTasks && !hasRegeneratedMicroTasks && !hasServerRegeneratedMicroTasks && !isRegeneratingMicroTasks
  const taskDaySteps = useMemo(() => (
    journeySteps
      .filter(step => step.id !== 'wheel')
      .map(step => ({
        id: step.id === 'report' ? 'analysis' : step.id,
        label: step.id === 'report' ? 'Аналіз дня' : step.label,
        status: step.status,
      }))
  ), [journeySteps])
  const completedTaskDaySteps = taskDaySteps.filter(step => step.status === 'done').length
  const taskProgressPercent = Math.round((completedTaskDaySteps / 4) * 100)
  const taskRingRadius = 15
  const taskRingCircumference = 2 * Math.PI * taskRingRadius
  const taskRingOffset = taskRingCircumference * (1 - taskProgressPercent / 100)
  const taskXpToday = visibleMicroTasks.reduce((sum, task) => {
    const manualUiStatus = task.meta && typeof task.meta === 'object' && !Array.isArray(task.meta)
      ? (task.meta as Record<string, unknown>).uiStatus
      : null
    const isDone = task.status === 'COMPLETED' || (task.status === 'manual' && manualUiStatus === 'done')
    return isDone ? sum + (task.xpReward ?? 20) : sum
  }, 0)
  const allTasksResolved = visibleMicroTasks.length > 0 && visibleMicroTaskProgress.activeCount === 0
  const yesterdayEntry = useMemo(
    () => dailyHistory.find((entry) => toDateKey(entry.date) === yesterdayDateKey) ?? null,
    [dailyHistory, yesterdayDateKey],
  )
  const yesterdayProgress = useMemo(
    () => (yesterdayEntry ? getDailyHistoryProgress(yesterdayEntry, getEntryTaskStats(yesterdayEntry, microTasks)) : null),
    [microTasks, yesterdayEntry],
  )
  const recoveryTarget = useMemo(() => {
    const unfinishedYesterday = !yesterdayProgress
      || (
        !yesterdayProgress.completed
        && !yesterdayProgress.completedLate
        && !yesterdayProgress.skipped
        && !yesterdayProgress.finalizedAt
      )

    if (currentDay > 1 && unfinishedYesterday) {
      return {
        dateKey: yesterdayDateKey,
        session: (yesterdayProgress?.morningDone ? 'evening' : 'morning') as 'morning' | 'evening',
      }
    }

    return rawRecoveryTarget
  }, [currentDay, rawRecoveryTarget, yesterdayDateKey, yesterdayProgress])
  const hasPendingYesterdayGate = useMemo(
    () => (
      recoveryTarget?.dateKey === yesterdayDateKey
      || recoveryPromptDateKey === yesterdayDateKey
      || cycleRecoveryDateKey === yesterdayDateKey
    ),
    [cycleRecoveryDateKey, recoveryPromptDateKey, recoveryTarget?.dateKey, yesterdayDateKey],
  )
  const openDashboardTab = (
    tab: AiMentorDashboardTab,
    options?: {
      session?: 'morning' | 'evening'
      dateKey?: string | null
      replace?: boolean
    },
  ) => {
    const params = new URLSearchParams()
    let path = '/dashboard/ai-mentor'

    if (tab === 'cycle') {
      path = '/dashboard/cycle'
      if (options?.session) {
        params.set('session', options.session)
      }
      if (options?.dateKey && options.dateKey !== todayDateKey) {
        params.set('date', options.dateKey)
      }
    } else if (tab === 'microtasks') {
      path = '/dashboard/tasks'
      if (options?.dateKey && options.dateKey !== todayDateKey) {
        params.set('date', options.dateKey)
      }
    } else if (tab === 'reports') {
      path = '/dashboard/reports'
    } else if (tab === 'wheel') {
      path = '/dashboard/wheel'
    } else if (tab === 'journal') {
      path = '/dashboard/journal'
    }

    setActiveTab(tab)
    navigate(`${path}${params.toString() ? `?${params.toString()}` : ''}`, {
      replace: options?.replace ?? false,
    })
  }

  const openMicrotasksTab = (dateKey?: string | null) => {
    setShowMorningSession(false)
    setShowEveningSession(false)
    setOpenDayNoticeKey(null)
    setRecoveryPromptDateKey(null)
    openDashboardTab('microtasks', { dateKey })
  }

  const openReportsTab = () => {
    setShowMorningSession(false)
    setShowEveningSession(false)
    setOpenDayNoticeKey(null)
    setRecoveryPromptDateKey(null)
    openDashboardTab('reports')
  }

  const openTodayAfterRecoveryDecision = (intent: RecoveryBlockedIntent | null) => {
    switch (intent) {
      case 'active_day':
        setResumeIntentAfterRecovery('active_day')
        setShowMorningSession(false)
        setShowEveningSession(false)
        openDashboardTab('cycle', { replace: true })
        return
      case 'tasks':
        openMicrotasksTab()
        return
      case 'evening':
        setCycleRecoveryDateKey(null)
        setRecoveryPromptDateKey(null)
        setOpenDayNoticeKey(null)
        setShowMorningSession(false)
        setShowEveningSession(true)
        openDashboardTab('cycle', { session: 'evening' })
        return
      case 'morning':
      default:
        setCycleRecoveryDateKey(null)
        setRecoveryPromptDateKey(null)
        setOpenDayNoticeKey(null)
        setShowEveningSession(false)
        setShowMorningSession(true)
        openDashboardTab('cycle', { session: 'morning' })
    }
  }

  const openRecoveryPrompt = (dateKey: string, intent: RecoveryBlockedIntent = 'morning') => {
    setOpenDayNoticeKey(dateKey)
    setRecoveryPromptDateKey(dateKey)
    setRecoveryBlockedIntent(intent)
    setCycleRecoveryDateKey(dateKey)
    setShowMorningSession(false)
    setShowEveningSession(false)
    openDashboardTab('cycle', { replace: true })
  }

  const openRecoveryDay = (dateKey: string, session: 'morning' | 'evening') => {
    const recoveryEntry = dailyHistory.find(entry => toDateKey(entry.date) === dateKey)
    const recoveryContent = getEntryContent(recoveryEntry)
    const recoveryProgress = recoveryEntry ? getDailyHistoryProgress(recoveryEntry) : null
    const recoveryHasMorningAnswers = hasSessionAnswers(recoveryContent, 'morning')
    const recoveryEntryIds = getEntrySourceIds(recoveryEntry)
    const recoveryHasTasks = microTasks.some(task => (
      task.createdAt?.slice(0, 10) === dateKey
      || (task.generatedFromEntryId ? recoveryEntryIds.includes(task.generatedFromEntryId) : false)
    ))

    console.info('[AiMentorDashboard] openRecoveryDay', {
      dateKey,
      session,
      todayDateKey,
      currentDay,
      hasMorningAnswers,
      hasActiveMicroTasks,
      recoveryHasMorningAnswers,
      recoveryHasTasks,
      recoveryMorningDone: recoveryProgress?.morningDone ?? false,
      recoveryTargetDateKey: recoveryTarget?.dateKey ?? null,
      recoveryTargetSession: recoveryTarget?.session ?? null,
    })

    if (
      session === 'morning'
      && (recoveryProgress?.morningDone || recoveryHasMorningAnswers || recoveryHasTasks)
    ) {
      setOpenDayNoticeKey(null)
      setRecoveryPromptDateKey(null)
      setRecoveryBlockedIntent(null)
      setCycleRecoveryDateKey(dateKey)
      setShowMorningSession(false)
      setShowEveningSession(false)
      openMicrotasksTab(dateKey)
      return
    }

    setOpenDayNoticeKey(null)
    setRecoveryPromptDateKey(null)
    setRecoveryBlockedIntent(null)
    setCycleRecoveryDateKey(dateKey)
    setShowMorningSession(session === 'morning')
    setShowEveningSession(session === 'evening')
    openDashboardTab('cycle', { session, dateKey })
  }
  const handleSkipPreviousDay = async (dateKey: string) => {
    try {
      await skipPreviousDay({ date: `${dateKey}T12:00:00.000Z` }).unwrap()
      await refetchDailyHistory()
      const nextIntent = recoveryBlockedIntent
      setCycleRecoveryDateKey(null)
      setRecoveryPromptDateKey(null)
      setRecoveryBlockedIntent(null)
      setOpenDayNoticeKey(null)
      setShowMorningSession(false)
      setShowEveningSession(false)
      toast.success('Вчорашній день пропущено.')
      openTodayAfterRecoveryDecision(nextIntent)
    } catch (error) {
      console.error('[AiMentorDashboard] skipPreviousDay failed', { dateKey, error })
      toast.error('Не вдалося пропустити вчорашній день.')
    }
  }
  const handleCatchupFromTodayGuard = useCallback((yesterdayDay: DailyCycleEntry) => {
    const dayKey = toDateKey(yesterdayDay.date)
    const recoveryContent = getEntryContent(yesterdayDay)
    const hasMorningDone = hasSessionAnswers(recoveryContent, 'morning')
      || Boolean(
        recoveryContent?.morningMeta
        && typeof recoveryContent.morningMeta === 'object'
        && !Array.isArray(recoveryContent.morningMeta)
        && typeof (recoveryContent.morningMeta as Record<string, unknown>).completedAt === 'string',
      )

    openRecoveryDay(dayKey, hasMorningDone ? 'evening' : 'morning')
  }, [openRecoveryDay])

  const {
    blockState: todayGuardBlockState,
    tryOpenToday,
    handleCatchup: handleTodayGuardCatchup,
    handleSkipYesterday: handleTodayGuardSkip,
    handleDismiss: handleTodayGuardDismiss,
  } = useTodayGuard({
    days: dailyHistory,
    userId: userId ?? '',
    isEnabled: Boolean(userId) && !isExpert && !isSuperAdmin,
    hasTodayWork: Boolean(todayEntry) || todayMicroTasks.length > 0,
    onCatchupDay: handleCatchupFromTodayGuard,
  })
  const todayGuardYesterdayProgress = useMemo(() => {
    if (!todayGuardBlockState.yesterdayDay) return null

    return getDailyHistoryProgress(
      todayGuardBlockState.yesterdayDay,
      getEntryTaskStats(todayGuardBlockState.yesterdayDay, microTasks),
    )
  }, [microTasks, todayGuardBlockState.yesterdayDay])
  const todayGuardStepSummary = useMemo(() => {
    if (!todayGuardBlockState.yesterdayDay || !todayGuardYesterdayProgress) return []

    const content = getEntryContent(todayGuardBlockState.yesterdayDay)
    const hasAnalysis = Boolean(
      todayGuardBlockState.yesterdayDay.aiAnalysis?.trim()
      || (content && typeof content.analysisGeneratedAt === 'string'),
    )
    const tasksDone = todayGuardYesterdayProgress.incompleteMicroTaskCount === 0
      && todayGuardYesterdayProgress.hasProgress

    return [
      { id: 'morning', label: 'Ранок', done: todayGuardYesterdayProgress.morningDone },
      { id: 'tasks', label: 'Мікрозавдання', done: tasksDone },
      { id: 'evening', label: 'Вечір', done: todayGuardYesterdayProgress.eveningDone },
      { id: 'analysis', label: 'Аналіз', done: hasAnalysis },
    ]
  }, [todayGuardBlockState.yesterdayDay, todayGuardYesterdayProgress])

  const openEveningSession = () => {
    console.info('[AiMentorDashboard] openEveningSession', {
      recoveryTargetDateKey: recoveryTarget?.dateKey ?? null,
      recoveryTargetSession: recoveryTarget?.session ?? null,
      todayDateKey,
      currentDay,
      hasRecoveryTarget: Boolean(recoveryTarget),
    })
    if (recoveryTarget?.session === 'evening') {
      openRecoveryDay(recoveryTarget.dateKey, 'evening')
      return
    }

    setCycleRecoveryDateKey(null)
    setRecoveryPromptDateKey(null)
    setOpenDayNoticeKey(null)
    setShowMorningSession(false)
    setShowEveningSession(true)
    openDashboardTab('cycle', { session: 'evening' })
  }
  const microtaskPromptActive = Boolean(microtaskPromptIntent)
  const microtaskPromptTitle = 'Мікрозавдання на сьогодні'
  const microtaskPromptBody = microtaskPromptIntent === 'regenerate'
    ? 'Новий аналіз замінить старі авто-завдання цього дня. Ручні записи залишаться як є.'
    : 'Найчастіше це одне завдання на день, інколи два. Або можеш відредагувати список вручну.'

  const openMicrotaskPrompt = (intent: MicrotaskPromptIntent) => {
    setMicrotaskPromptIntent(intent)
    setMicrotaskPromptStage('choice')
  }

  const closeMicrotaskPrompt = () => {
    setMicrotaskPromptIntent(null)
    setMicrotaskPromptStage('choice')
  }

  const clearMicrotaskNotice = () => {
    if (microtaskNoticeTimerRef.current) {
      window.clearTimeout(microtaskNoticeTimerRef.current)
      microtaskNoticeTimerRef.current = null
    }
    setMicrotaskNotice(null)
  }

  const announceMicrotaskProgress = (message: string) => {
    clearMicrotaskNotice()
    setMicrotaskNotice(message)
    toast.success(message)
    microtaskNoticeTimerRef.current = window.setTimeout(() => {
      setMicrotaskNotice(null)
      microtaskNoticeTimerRef.current = null
    }, 8000)
  }

  const handleGenerateMicroTasks = async () => {
    if (!hasMorningAnswers || !morningAnswers) {
      openDashboardTab('cycle', {
        session: 'morning',
        dateKey: activeMicrotaskDateKey !== todayDateKey ? activeMicrotaskDateKey : null,
      })
      return
    }

    closeMicrotaskPrompt()

    await submitDailyCycle({
      session: 'morning',
      answers: morningAnswers,
      date: `${activeMicrotaskDateKey}T12:00:00.000Z`,
    }).unwrap()
  }

  const handleRegenerateMicroTasks = async () => {
    if (!hasMorningAnswers || !morningAnswers) {
      openDashboardTab('cycle', {
        session: 'morning',
        dateKey: activeMicrotaskDateKey !== todayDateKey ? activeMicrotaskDateKey : null,
      })
      return
    }

    if (hasRegeneratedMicroTasks || hasServerRegeneratedMicroTasks || isRegeneratingMicroTasks) {
      setHasRegeneratedMicroTasks(true)
      saveMicrotaskRegenerationFlag(dashboardUser?.id ?? 'guest', activeMicrotaskDateKey, true)
      return
    }

    setIsRegeneratingMicroTasks(true)
    closeMicrotaskPrompt()

    try {
      await submitDailyCycle({
        session: 'morning',
        answers: morningAnswers,
        date: `${activeMicrotaskDateKey}T12:00:00.000Z`,
        regenerateMicroTasks: true,
      }).unwrap()
      setHasRegeneratedMicroTasks(true)
      saveMicrotaskRegenerationFlag(dashboardUser?.id ?? 'guest', activeMicrotaskDateKey, true)
      await Promise.all([
        refetchMicroTasks(),
        refetchDailyHistory(),
        refetchTodayEntry(),
      ])
      setShowMorningSession(false)
      setShowEveningSession(false)
      announceMicrotaskProgress('Мікрозавдання оновлено. Працюй уже з новим списком.')
      openDashboardTab('microtasks', { dateKey: activeMicrotaskDateKey, replace: true })
    } catch (error) {
      const errorData =
        error && typeof error === 'object' && 'data' in error
          ? (error as { data?: { error?: string } }).data
          : null
      if (errorData?.error === 'microtasks_regeneration_limit_reached') {
        setHasRegeneratedMicroTasks(true)
        saveMicrotaskRegenerationFlag(dashboardUser?.id ?? 'guest', activeMicrotaskDateKey, true)
        toast.error('Перегенерацію вже використано сьогодні. Доступна лише одна спроба.')
      } else {
        console.error('[AiMentorDashboard] microtask regeneration failed', error)
        toast.error('Не вдалося оновити мікрозавдання.')
      }
    } finally {
      setIsRegeneratingMicroTasks(false)
      if (regenerationTimerRef.current) {
        window.clearTimeout(regenerationTimerRef.current)
        regenerationTimerRef.current = null
      }
      if (regenerationTickerRef.current) {
        window.clearInterval(regenerationTickerRef.current)
        regenerationTickerRef.current = null
      }
    }
  }

  const handleSaveManualTask = async () => {
    const lines = manualTaskText
      .split('\n')
      .map(line => line.trim())
      .filter(Boolean)
    if (!lines.length) return

    setMicrotaskPromptIntent(null)
    setMicrotaskPromptStage('choice')
    setManualTaskText('')

    try {
      if (lines.length === 1) {
        const task = buildManualMicroTask(dashboardUser?.id ?? 'guest', activeMicrotaskDateKey, lines[0] ?? '')
        await createManualTask({
          title: task.title,
          description: task.description,
          why: task.why,
          steps: task.steps,
          dueDate: task.dueAt,
          replaceExisting: true,
          date: activeMicrotaskDateKey,
        })
      } else {
        await replaceManualTasks({
          date: activeMicrotaskDateKey,
          tasks: lines,
        })
      }
      setManualMicroTask(null)
      saveManualMicroTask(dashboardUser?.id ?? 'guest', activeMicrotaskDateKey, null)
      await refetchMicroTasks()
      await refetchDailyHistory()
      setShowMorningSession(false)
      setShowEveningSession(false)
      announceMicrotaskProgress('Список мікрозавдань оновлено. Працюй уже з новою версією.')
      openDashboardTab('microtasks', { dateKey: activeMicrotaskDateKey, replace: true })
    } catch (error) {
      console.error('[AiMentorDashboard] failed to save manual microtask list', error)
      if (lines.length === 1) {
        const task = buildManualMicroTask(dashboardUser?.id ?? 'guest', activeMicrotaskDateKey, lines[0] ?? '')
        setManualMicroTask(task)
        saveManualMicroTask(dashboardUser?.id ?? 'guest', activeMicrotaskDateKey, task)
      }
      setManualTaskText(lines.join('\n'))
      setMicrotaskPromptIntent('generate')
      setMicrotaskPromptStage('edit')
    }
  }

  const openEditMicrotaskList = () => {
    setMicrotaskPromptIntent('generate')
    setManualTaskText(
      visibleMicroTasks.length > 0
        ? serializeMicroTaskList(visibleMicroTasks)
        : '',
    )
    setMicrotaskPromptStage('edit')
  }

  const handleCompleteMicroTask = async (taskId: string) => {
    const manualTask = visibleMicroTasks.find(task => task.id === taskId && task.status === 'manual')
    if (manualTask) {
      if (manualTask.persist === false) {
        const updated: MicroTaskItem = {
          ...manualTask,
          completedAt: new Date().toISOString(),
          meta: {
            ...(manualTask.meta ?? {}),
            uiStatus: 'done',
          },
        }
        setManualMicroTask(updated)
        saveManualMicroTask(dashboardUser?.id ?? 'guest', activeMicrotaskDateKey, updated)
        announceMicrotaskProgress(getMicrotaskProgressToast('done', visibleMicroTaskProgress.activeCount - 1))
        return
      }

      void completeTask(taskId)
      announceMicrotaskProgress(getMicrotaskProgressToast('done', visibleMicroTaskProgress.activeCount - 1))
      return
    }

    const previousTask = visibleMicroTasks.find(task => task.id === taskId)
    if (!previousTask) return

    const optimisticCompletedAt = new Date().toISOString()
    setOptimisticTaskState(prev => ({
      ...prev,
      [taskId]: {
        status: 'COMPLETED',
        completedAt: optimisticCompletedAt,
      },
    }))
    announceMicrotaskProgress(getMicrotaskProgressToast('done', visibleMicroTaskProgress.activeCount - 1))

    try {
      await completeTask(taskId).unwrap()
    } catch (error) {
      console.error('[AiMentorDashboard] complete microtask failed', error)
      setOptimisticTaskState(prev => {
        const next = { ...prev }
        delete next[taskId]
        return next
      })
      toast.error('Не вдалося позначити завдання виконаним.')
      return
    }

    setOptimisticTaskState(prev => {
      const next = { ...prev }
      delete next[taskId]
      return next
    })
  }

  const handleSkipMicroTask = async (taskId: string) => {
    const manualTask = visibleMicroTasks.find(task => task.id === taskId && task.status === 'manual')
    if (manualTask) {
      if (manualTask.persist === false) {
        const updated: MicroTaskItem = {
          ...manualTask,
          meta: {
            ...(manualTask.meta ?? {}),
            uiStatus: 'skipped',
          },
        }
        setManualMicroTask(updated)
        saveManualMicroTask(dashboardUser?.id ?? 'guest', activeMicrotaskDateKey, updated)
        window.setTimeout(() => {
          setManualMicroTask(null)
          saveManualMicroTask(dashboardUser?.id ?? 'guest', activeMicrotaskDateKey, null)
        }, 1500)
        announceMicrotaskProgress(getMicrotaskProgressToast('skipped', visibleMicroTaskProgress.activeCount - 1))
        return
      }

      void skipTask(taskId)
      announceMicrotaskProgress(getMicrotaskProgressToast('skipped', visibleMicroTaskProgress.activeCount - 1))
      return
    }

    const previousTask = visibleMicroTasks.find(task => task.id === taskId)
    if (!previousTask) return

    setOptimisticTaskState(prev => ({
      ...prev,
      [taskId]: {
        status: 'skipped',
      },
    }))
    announceMicrotaskProgress(getMicrotaskProgressToast('skipped', visibleMicroTaskProgress.activeCount - 1))

    try {
      await skipTask(taskId).unwrap()
    } catch (error) {
      console.error('[AiMentorDashboard] skip microtask failed', error)
      setOptimisticTaskState(prev => {
        const next = { ...prev }
        delete next[taskId]
        return next
      })
      toast.error('Не вдалося пропустити завдання.')
      return
    }

    setOptimisticTaskState(prev => {
      const next = { ...prev }
      delete next[taskId]
      return next
    })
  }

  useEffect(() => {
    setActiveTab(getInitialTab(location.search, location.pathname))
  }, [location.search, location.pathname])

  useEffect(() => {
    const loaded = loadManualMicroTask(dashboardUser?.id ?? '', activeMicrotaskDateKey)
    setManualMicroTask(loaded)
    setManualTaskText('')
  }, [activeMicrotaskDateKey, dashboardUser?.id])

  useEffect(() => {
    if (visibleMicroTasks.some(task => task.status === 'manual')) {
      setManualMicroTask(null)
      saveManualMicroTask(dashboardUser?.id ?? 'guest', activeMicrotaskDateKey, null)
    }
  }, [activeMicrotaskDateKey, dashboardUser?.id, visibleMicroTasks])

  useEffect(() => {
    if (visibleMicroTasks.some(task => task.status === 'manual')) {
      setManualMicroTask(null)
      saveManualMicroTask(dashboardUser?.id ?? 'guest', activeMicrotaskDateKey, null)
    }
  }, [activeMicrotaskDateKey, dashboardUser?.id, visibleMicroTasks])

  useEffect(() => {
    setHasRegeneratedMicroTasks(
      loadMicrotaskRegenerationFlag(dashboardUser?.id ?? '', activeMicrotaskDateKey)
      || hasServerRegeneratedMicroTasks,
    )
  }, [activeMicrotaskDateKey, dashboardUser?.id, hasServerRegeneratedMicroTasks])

  useEffect(() => {
    return () => {
      if (regenerationTimerRef.current) {
        window.clearTimeout(regenerationTimerRef.current)
      }
      if (regenerationTickerRef.current) {
        window.clearInterval(regenerationTickerRef.current)
      }
      if (microtaskNoticeTimerRef.current) {
        window.clearTimeout(microtaskNoticeTimerRef.current)
      }
    }
  }, [])

  useEffect(() => {
    if (activeTab !== 'cycle') {
      setShowMorningSession(false)
      setShowEveningSession(false)
    }
  }, [activeTab])

  useEffect(() => {
    if (activeTab !== 'microtasks') {
      setMicrotaskPromptIntent(null)
      setMicrotaskPromptStage('choice')
      return
    }

    if (hasTasksToday || isGeneratingMicroTasks || isRegeneratingMicroTasks) return
    setMicrotaskPromptIntent(current => current ?? 'generate')
    setMicrotaskPromptStage(current => current ?? 'choice')
  }, [activeTab, hasTasksToday, isGeneratingMicroTasks, isRegeneratingMicroTasks])

  useEffect(() => {
    const params = new URLSearchParams(location.search)
    if (params.get('modal') !== 'level_up') {
      setShowLevelUpCallout(false)
      return
    }

    const timer = window.setTimeout(() => setShowLevelUpCallout(true), 400)
    return () => window.clearTimeout(timer)
  }, [location.search])

  useEffect(() => {
    const params = new URLSearchParams(location.search)
    const requestedDateKey = params.get('date')
    const requestedSession = params.get('session')

    console.info('[AiMentorDashboard] recovery-route-check', {
      requestedDateKey,
      requestedSession,
      yesterdayDateKey,
      cycleRecoveryDateKey,
      showMorningSession,
      showEveningSession,
    })

    if (requestedSession !== 'evening' && requestedSession !== 'morning') return
    if (!requestedDateKey || requestedDateKey !== yesterdayDateKey) return
    if (cycleRecoveryDateKey === requestedDateKey && (showMorningSession || showEveningSession)) return

    openRecoveryDay(requestedDateKey, requestedSession === 'morning' ? 'morning' : 'evening')
  }, [
    cycleRecoveryDateKey,
    yesterdayDateKey,
    location.search,
    openRecoveryDay,
    showEveningSession,
    showMorningSession,
  ])

  useEffect(() => {
    const params = new URLSearchParams(location.search)
    const requestedSession = params.get('session')
    const isCycleSessionRoute = activeTab === 'cycle' && (requestedSession === 'morning' || requestedSession === 'evening')

    if (!isCycleSessionRoute) return
    if (!hasPendingYesterdayGate) return
    if (cycleRecoveryDateKey === yesterdayDateKey && recoveryPromptDateKey === yesterdayDateKey) return

    setShowMorningSession(false)
    setShowEveningSession(false)
    openRecoveryPrompt(yesterdayDateKey, requestedSession === 'evening' ? 'evening' : 'morning')
  }, [
    activeTab,
    cycleRecoveryDateKey,
    hasPendingYesterdayGate,
    location.search,
    openRecoveryPrompt,
    recoveryPromptDateKey,
    yesterdayDateKey,
  ])

  useEffect(() => {
    if (!hasPendingYesterdayGate) return
    if (!showMorningSession && !showEveningSession) return
    if (cycleRecoveryDateKey === yesterdayDateKey) return

    setShowMorningSession(false)
    setShowEveningSession(false)
    openRecoveryPrompt(yesterdayDateKey, showEveningSession ? 'evening' : 'morning')
  }, [
    cycleRecoveryDateKey,
    hasPendingYesterdayGate,
    openRecoveryPrompt,
    showEveningSession,
    showMorningSession,
    yesterdayDateKey,
  ])

  useEffect(() => {
    console.info('[AiMentorDashboard] recovery route context', {
      activeTab,
      currentDay,
      todayDateKey,
      yesterdayDateKey,
      cycleRecoveryDateKey,
      recoveryTargetDateKey: recoveryTarget?.dateKey ?? null,
      recoveryTargetSession: recoveryTarget?.session ?? null,
      showMorningSession,
      showEveningSession,
    })
  }, [
    activeTab,
    currentDay,
    cycleRecoveryDateKey,
    recoveryTarget?.dateKey,
    recoveryTarget?.session,
    showEveningSession,
    showMorningSession,
    todayDateKey,
    yesterdayDateKey,
  ])

  return (
    <div className="space-y-6 p-6">
      {showLevelUpCallout ? (
        <GlassCard className="border border-[rgba(var(--accent-rgb),0.22)] bg-[linear-gradient(180deg,rgba(var(--accent-rgb),0.14),rgba(255,255,255,0.03))] p-5">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-xs font-semibold uppercase tracking-widest text-[var(--accent)]">🌟 Новий рівень</p>
              <p className="mt-2 text-lg font-semibold text-[var(--text-primary)]">Нові можливості вже відкриті</p>
              <p className="mt-1 text-sm text-[var(--text-muted)]">
                Твій прогрес зафіксований. Переглянь сесію, прогрес і наступні кроки без зайвих переходів.
              </p>
            </div>
            <button
              type="button"
              onClick={() => setShowLevelUpCallout(false)}
              className="rounded-full border border-white/10 bg-white/5 p-2 text-[var(--text-secondary)] transition-colors hover:bg-white/10 hover:text-[var(--text-primary)]"
              aria-label="Закрити повідомлення про новий рівень"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </GlassCard>
      ) : null}

      <Greeting
        name={name}
        isExpert={isExpert}
        isSuperAdmin={isSuperAdmin}
        mode={activeTab === 'cycle' ? 'cycle' : 'default'}
      />

      {!isExpert && (
        <div className="space-y-5">
          {activeTab === 'session' && (
            <>
              <WheelStatusNotice onOpenInline={() => setShowWheelFrame(true)} />
              <WheelInlineFrame
                isOpen={showWheelFrame}
                onClose={() => setShowWheelFrame(false)}
              />
              <div className="h-px bg-[rgba(255,255,255,0.06)]" />
            </>
          )}
          {activeTab === 'session' && (
            <div className="space-y-5">
              <JourneySection
                onOpenWheelFrame={() => setShowWheelFrame(true)}
                onOpenCycle={() => {
                  openDashboardTab('cycle')
                }}
                onOpenMicroTasks={openMicrotasksTab}
                onLockedOpen={() => setIsExpiredTrialModalOpen(true)}
                onOpenRecoveryDay={openRecoveryDay}
              />
            </div>
          )}
          {activeTab === 'wheel' && (
            <div className="space-y-5">
              {isPausedTrial ? (
                <div className="dashboard-liquid-card--soft p-5">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-[rgb(var(--accent-soft-rgb))]">
                    Колесо балансу · Пауза
                  </p>
                  <p className="mt-3 text-base font-semibold text-[var(--text-primary)]">
                    Новий зріз поки недоступний без підписки
                  </p>
                  <p className="mt-2 text-sm leading-6 text-[var(--text-secondary)]">
                    Попередні звіти й підсумки залишилися доступними. Щоб пройти нове колесо й оновити аналіз, віднови доступ.
                  </p>
                  <div className="dashboard-card-actions mt-4">
                    <button
                      type="button"
                      className="btn-liquid-dashboard btn-liquid-dashboard--ice"
                      onClick={openReportsTab}
                    >
                      Відкрити звіти
                    </button>
                    <button
                      type="button"
                      className="btn-liquid-dashboard btn-liquid-dashboard--primary"
                      onClick={() => setIsExpiredTrialModalOpen(true)}
                    >
                      Обрати підписку
                    </button>
                  </div>
                </div>
              ) : (
                <>
                  <WheelMonthlyBoard
                    onOpenInline={() => setShowWheelFrame(true)}
                    onOpenReports={openReportsTab}
                  />
                  <WheelInlineFrame
                    isOpen={showWheelFrame}
                    onClose={() => setShowWheelFrame(false)}
                  />
                </>
              )}
            </div>
          )}
          {activeTab === 'cycle' && (
            <div className="space-y-5">
              <CycleSummaryCard
                onLockedOpen={() => setIsExpiredTrialModalOpen(true)}
                onOpenWheelFrame={() => setShowWheelFrame(true)}
                onStartMorningSession={() => tryOpenToday(() => {
                  setRecoveryPromptDateKey(null)
                  setOpenDayNoticeKey(null)
                  setCycleRecoveryDateKey(null)
                  setShowEveningSession(false)
                  setShowMorningSession(true)
                  openDashboardTab('cycle', { session: 'morning' })
                })}
                onStartEveningSession={() => tryOpenToday(() => {
                  openEveningSession()
                })}
                onOpenRecoveryDay={openRecoveryDay}
                onTryOpenToday={tryOpenToday}
                onShowTasks={() => tryOpenToday(() => {
                  openMicrotasksTab()
                })}
                onShowReports={openReportsTab}
                recoveryTargetDateKey={recoveryTarget?.dateKey ?? null}
                recoveryTargetSession={recoveryTarget?.session ?? null}
                onCloseMorningSession={() => {
                  setShowMorningSession(false)
                  setCycleRecoveryDateKey(null)
                }}
                onCloseEveningSession={() => {
                  setShowEveningSession(false)
                  setCycleRecoveryDateKey(null)
                }}
                onOpenMicroTasks={openMicrotasksTab}
                onOpenProgress={openReportsTab}
                onComplete={async () => {
                  const isRecoveryCompletion = Boolean(cycleRecoveryDateKey ?? recoveryTarget?.dateKey)
                  console.info('[AiMentorDashboard] cycle recovery completion', {
                    isRecoveryCompletion,
                    cycleRecoveryDateKey,
                    recoveryTargetDateKey: recoveryTarget?.dateKey ?? null,
                    recoveryTargetSession: recoveryTarget?.session ?? null,
                    showMorningSession,
                    showEveningSession,
                    todayDateKey,
                    yesterdayDateKey,
                  })
                  setShowEveningSession(false)
                  setCycleRecoveryDateKey(null)
                  setOpenDayNoticeKey(null)
                  try {
                    await Promise.all([
                      refetchTodayEntry(),
                      refetchDailyHistory(),
                    ])
                  } catch {
                    // keep the cycle summary moving even if refresh fails
                  }
                  if (isRecoveryCompletion) {
                    console.info('[AiMentorDashboard] opening today morning after recovery finish', {
                      todayDateKey,
                      hasMorningAnswers,
                      hasTasksToday,
                      hasActiveMicroTasks,
                    })
                    if (hasMorningAnswers) {
                      openMicrotasksTab()
                      return
                    }
                    setShowMorningSession(true)
                    setShowEveningSession(false)
                    openDashboardTab('cycle', { session: 'morning' })
                    return
                  }
                  openDashboardTab('cycle')
                }}
                onSkipPreviousDay={(dateKey) => {
                  void handleSkipPreviousDay(dateKey)
                }}
                openDayNoticeKey={openDayNoticeKey}
                setOpenDayNoticeKey={setOpenDayNoticeKey}
                recoveryPromptDateKey={recoveryPromptDateKey}
                recoveryDateKey={cycleRecoveryDateKey}
                yesterdayDateKey={yesterdayDateKey}
                showMorningSession={showMorningSession}
                showEveningSession={showEveningSession}
                hasMorningProgress={showMorningSession || hasMorningAnswers}
                hasMorningAnswers={hasMorningAnswers}
                hasActiveMicroTasks={hasActiveMicroTasks}
                hasTasksToday={hasTasksToday}
                todayMicroTaskCount={todayMicroTasks.length}
                activeTodayMicroTaskCount={activeTodayMicroTasks.length}
                completedTodayMicroTaskCount={completedTodayMicroTasks.length}
                resumeIntentAfterRecovery={resumeIntentAfterRecovery}
                onConsumeResumeIntent={() => setResumeIntentAfterRecovery(null)}
              />
            </div>
          )}
          {activeTab === 'journal' && (
            <div className="space-y-5">
              <JournalPage compact />
            </div>
          )}
          {activeTab === 'microtasks' && (
            <div className="relative space-y-4">
              {microtaskPromptActive ? (
                <div
                  className="absolute inset-0 z-20 flex items-start justify-center bg-[rgba(4,8,16,0.58)] px-4 py-6"
                  onClick={closeMicrotaskPrompt}
                >
                  <div
                    className="relative w-full max-w-xl rounded-[28px] border border-[rgba(255,255,255,0.1)] bg-[linear-gradient(180deg,rgba(14,18,28,0.98),rgba(8,11,18,0.98))] p-5 shadow-[0_24px_90px_rgba(0,0,0,0.35)]"
                    onClick={event => event.stopPropagation()}
                  >
                    <button
                      type="button"
                      aria-label="Закрити"
                      className="absolute right-3 top-3 z-30 inline-flex h-9 w-9 items-center justify-center rounded-full border border-[rgba(255,255,255,0.16)] bg-[rgba(255,255,255,0.08)] text-white shadow-[0_8px_24px_rgba(0,0,0,0.28)] transition-colors hover:bg-[rgba(255,255,255,0.14)] hover:text-white"
                      onClick={closeMicrotaskPrompt}
                    >
                      <X className="h-4 w-4" />
                    </button>
                    {microtaskPromptStage === 'choice' ? (
                      <>
                        <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-[rgb(var(--accent-soft-rgb))]">
                          МІКРОЗАВДАННЯ НА СЬОГОДНІ
                        </p>
                        <h3 className="mt-2 text-xl font-bold text-[var(--text-primary)]">
                          {microtaskPromptTitle}
                        </h3>
                        <p className="mt-2 text-sm leading-6 text-[var(--text-secondary)]">
                          {microtaskPromptBody}
                        </p>
                        {microtaskPromptIntent === 'regenerate' ? (
                          <div className="mt-2 rounded-xl border border-amber-300/20 bg-amber-400/10 px-3 py-2 text-xs text-amber-100">
                            <p className="font-semibold">
                              {hasRegeneratedMicroTasks || hasServerRegeneratedMicroTasks
                                ? 'Ліміт на перегенерацію вже використано сьогодні.'
                                : 'Перегенерацію можна використати лише один раз на день.'}
                            </p>
                            <p className="mt-1 text-amber-50/85">
                              {hasRegeneratedMicroTasks || hasServerRegeneratedMicroTasks
                                ? 'Новий аналіз на сьогодні більше недоступний. Можеш працювати з поточним списком або відредагувати його вручну.'
                                : 'Вона замінює тільки авто-завдання цього дня і після використання стане недоступною до завтра.'}
                            </p>
                          </div>
                        ) : (
                          <p className="mt-2 text-xs text-[var(--text-muted)]">
                            Якщо напишеш свої завдання, авто-завдання цього дня буде замінено новим списком.
                          </p>
                        )}
                        <div className="mt-4 flex flex-col gap-3 sm:flex-row">
                          <button
                            type="button"
                            className="btn-liquid-dashboard btn-liquid-dashboard--primary flex-1"
                            disabled={
                              microtaskPromptIntent === 'regenerate'
                                ? (isRegeneratingMicroTasks || hasRegeneratedMicroTasks || hasServerRegeneratedMicroTasks)
                                : isGeneratingMicroTasks
                            }
                            onClick={() => {
                              if (microtaskPromptIntent === 'regenerate') {
                                void handleRegenerateMicroTasks()
                                return
                              }
                              void handleGenerateMicroTasks()
                            }}
                          >
                            {microtaskPromptIntent === 'regenerate'
                              ? (hasRegeneratedMicroTasks || hasServerRegeneratedMicroTasks
                                ? 'Ліміт уже використано'
                                : isRegeneratingMicroTasks
                                  ? 'Оновлюємо список...'
                                  : 'Перегенерувати 1 раз')
                              : (isGeneratingMicroTasks ? 'Генеруємо...' : 'Згенерувати')}
                          </button>
                          <button
                            type="button"
                            className="btn-liquid-dashboard btn-liquid-dashboard--ice flex-1"
                            onClick={openEditMicrotaskList}
                          >
                            Редагувати список
                          </button>
                        </div>
                      </>
                      ) : (
                        <>
                          <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-[rgb(var(--accent-soft-rgb))]">
                          МІКРОЗАВДАННЯ НА СЬОГОДНІ
                        </p>
                        <h3 className="mt-2 text-xl font-bold text-[var(--text-primary)]">
                          Редагувати список завдань
                        </h3>
                        <p className="mt-2 text-sm leading-6 text-[var(--text-secondary)]">
                          Кожен рядок стане окремим завданням. Після збереження поточний список цього дня буде повністю замінено.
                        </p>
                        <textarea
                          value={manualTaskText}
                          onChange={event => setManualTaskText(event.target.value)}
                          placeholder={'1. Закрити одну ключову дію\n2. Дописати важливий лист\n3. Повернутись до вечірньої рефлексії'}
                          className="mt-4 min-h-28 w-full rounded-2xl border border-[rgba(255,255,255,0.1)] bg-[rgba(255,255,255,0.04)] px-4 py-3 text-sm text-[var(--text-primary)] outline-none transition-colors placeholder:text-[var(--text-muted)] focus:border-[rgba(var(--accent-rgb),0.3)]"
                        />
                        <p className="mt-2 text-xs text-[var(--text-muted)]">
                          Один рядок = одне завдання. Старий список цього дня буде замінено без дублювання.
                        </p>
                        <div className="mt-4 flex flex-col gap-2 sm:flex-row">
                          <button
                            type="button"
                            className="btn-liquid-dashboard btn-liquid-dashboard--primary flex-1"
                            onClick={handleSaveManualTask}
                            disabled={!manualTaskText.trim()}
                          >
                            Зберегти
                          </button>
                          <button
                            type="button"
                            className="btn-liquid-dashboard btn-liquid-dashboard--ice flex-1"
                            onClick={() => {
                              setManualTaskText(visibleMicroTasks.length > 0 ? serializeMicroTaskList(visibleMicroTasks) : '')
                              setMicrotaskPromptStage('choice')
                            }}
                          >
                            Назад
                          </button>
                        </div>
                      </>
                    )}
                  </div>
                </div>
              ) : null}

              {isPausedTrial ? (
                <div className="dashboard-liquid-card--soft p-5">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-[rgb(var(--accent-soft-rgb))]">
                    Мікрозавдання · Пауза
                  </p>
                  <p className="mt-3 text-base font-semibold text-[var(--text-primary)]">
                    Нові завдання зараз не формуються
                  </p>
                  <p className="mt-2 text-sm leading-6 text-[var(--text-secondary)]">
                    Trial уже завершився, тому новий денний цикл і мікрозавдання не запускаються. Твої звіти й минула історія при цьому лишаються доступними.
                  </p>
                  <div className="dashboard-card-actions mt-4">
                    <button
                      type="button"
                      className="btn-liquid-dashboard btn-liquid-dashboard--ice"
                      onClick={openReportsTab}
                    >
                      Перейти до звітів
                    </button>
                    <button
                      type="button"
                      className="btn-liquid-dashboard btn-liquid-dashboard--primary"
                      onClick={() => setIsExpiredTrialModalOpen(true)}
                    >
                      Відновити доступ
                    </button>
                  </div>
                </div>
              ) : (
                <>
                  <div
                    data-testid="day-progress"
                    className="grid gap-4 rounded-[24px] border border-[rgba(255,255,255,0.08)] bg-[rgba(255,255,255,0.035)] p-4 lg:grid-cols-[1fr_auto] lg:items-center"
                  >
                    <div className="flex flex-wrap items-center gap-3">
                      {taskDaySteps.map((step) => (
                        <div
                          key={step.id}
                          className={[
                            'inline-flex min-h-[48px] items-center gap-2 rounded-[16px] border px-4 py-2 text-sm font-semibold transition-colors',
                            step.status === 'done'
                              ? 'border-[rgba(29,158,117,0.3)] bg-[rgba(29,158,117,0.15)] text-[#1D9E75]'
                              : step.status === 'active'
                                ? 'border-[#378ADD] bg-[rgba(55,138,221,0.15)] text-[#378ADD]'
                                : 'border-[rgba(255,255,255,0.08)] bg-[rgba(255,255,255,0.04)] text-[rgba(255,255,255,0.3)]',
                          ].join(' ')}
                        >
                          <span>{step.status === 'done' ? '✓' : step.status === 'active' ? '▶' : '🔒'}</span>
                          {step.label}
                        </div>
                      ))}
                    </div>

                    <div className="flex items-center justify-between gap-5 lg:justify-end">
                      <div className="text-right">
                        <p className="text-[2rem] font-black leading-none text-[#F2B24B]">+{taskXpToday}</p>
                        <p className="mt-1 text-sm font-semibold text-[var(--text-muted)]">XP сьогодні</p>
                      </div>
                      <div className="relative flex h-12 w-12 items-center justify-center">
                        <svg viewBox="0 0 40 40" className="h-12 w-12 -rotate-90">
                          <circle cx="20" cy="20" r={taskRingRadius} fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth="4" />
                          <circle
                            cx="20"
                            cy="20"
                            r={taskRingRadius}
                            fill="none"
                            stroke="#378ADD"
                            strokeWidth="4"
                            strokeLinecap="round"
                            strokeDasharray={taskRingCircumference}
                            strokeDashoffset={taskRingOffset}
                          />
                        </svg>
                        <span className="absolute text-sm font-bold text-[var(--text-primary)]">{taskProgressPercent}%</span>
                      </div>
                    </div>
                  </div>

                  {!hasTasksToday ? (
                    <div className="dashboard-liquid-card--soft p-5">
                      <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-[rgb(var(--accent-soft-rgb))]">
                        Мікрозавдання на сьогодні
                      </p>
                      <p className="mt-3 text-base font-semibold text-[var(--text-primary)]">
                        Найчастіше це одне завдання на день
                      </p>
                      <p className="mt-2 text-sm leading-6 text-[var(--text-secondary)]">
                        Іноді система запропонує два. Також ти завжди можеш відредагувати список вручну.
                      </p>

                      <div className="mt-4 flex flex-col gap-3 sm:flex-row">
                        <button
                          type="button"
                          className="btn-liquid-dashboard btn-liquid-dashboard--primary"
                          onClick={() => openMicrotaskPrompt('generate')}
                          disabled={isGeneratingMicroTasks}
                        >
                          {isGeneratingMicroTasks ? 'Генеруємо...' : 'Згенерувати'}
                        </button>
                        <button
                          type="button"
                          className="btn-liquid-dashboard btn-liquid-dashboard--ice"
                          onClick={() => {
                            openEditMicrotaskList()
                          }}
                        >
                          Редагувати список
                        </button>
                      </div>
                    </div>
                  ) : (
                    <>
                      <div
                        data-testid="ai-banner"
                        className="grid gap-3 rounded-[24px] border border-[rgba(55,138,221,0.28)] bg-[rgba(21,40,72,0.35)] px-5 py-4 sm:grid-cols-[1fr_auto] sm:items-center"
                      >
                        <div className="flex min-w-0 items-start gap-4">
                          <span className="mt-1 inline-flex h-3 w-3 flex-shrink-0 rounded-full bg-[#378ADD] shadow-[0_0_0_6px_rgba(55,138,221,0.14)] animate-pulse" />
                          <p className="text-base font-medium leading-7 text-[var(--text-primary)]">
                            AI сформував <strong>{visibleMicroTasks.length} завдання</strong> на основі ранкової рефлексії
                          </p>
                        </div>
                        <button
                          type="button"
                          className="btn-liquid-dashboard btn-liquid-dashboard--ice w-full sm:w-auto"
                          onClick={() => openMicrotaskPrompt('regenerate')}
                          disabled={!canRegenerateTasks}
                        >
                          ↺ Перегенерувати
                        </button>
                      </div>
                      {isRegeneratingMicroTasks ? (
                        <div className="rounded-2xl border border-[rgba(var(--accent-rgb),0.22)] bg-[linear-gradient(180deg,rgba(var(--accent-rgb),0.11),rgba(255,255,255,0.03))] p-4">
                          <div className="flex items-center gap-3">
                            <RefreshCcw className="h-4 w-4 animate-spin text-[rgb(var(--accent-soft-rgb))]" />
                            <div>
                              <p className="text-sm font-semibold text-[var(--text-primary)]">
                                Мікрозавдання генеруються...
                              </p>
                              <p className="text-xs text-[var(--text-muted)]">
                                Оновлюємо існуючі задачі без дублювання і одразу відкриємо новий список.
                              </p>
                            </div>
                          </div>
                        </div>
                      ) : null}
                      {hasRegenEligibleTasks && !hasRegeneratedMicroTasks && !hasServerRegeneratedMicroTasks ? (
                        <div className="grid gap-3 rounded-2xl border border-[rgba(255,255,255,0.08)] bg-[rgba(255,255,255,0.03)] px-4 py-3 sm:grid-cols-[1fr_auto] sm:items-center">
                          <div className="min-w-0">
                            <p className="text-sm font-medium text-[var(--text-primary)]">
                              Перегенерація доступна один раз
                            </p>
                            <p className="mt-1 text-xs text-[var(--text-muted)]">
                              Оновимо наявні мікрозавдання без створення нових рядків у базі. Ручні лишаються на місці.
                            </p>
                          </div>
                          <button
                            type="button"
                            className="btn-liquid-dashboard btn-liquid-dashboard--ice w-full sm:w-auto"
                            onClick={() => openMicrotaskPrompt('regenerate')}
                            disabled={isRegeneratingMicroTasks}
                          >
                            {isRegeneratingMicroTasks ? 'Генеруємо...' : 'Перегенерувати 1 раз'}
                          </button>
                        </div>
                      ) : hasRegeneratedMicroTasks || hasServerRegeneratedMicroTasks ? (
                        <div className="grid gap-3 rounded-2xl border border-amber-300/20 bg-amber-400/10 px-4 py-3 text-sm text-amber-100 sm:grid-cols-[1fr_auto] sm:items-center">
                          <div>
                            <p className="font-medium text-amber-50">Перегенерацію вже використано</p>
                            <p className="mt-1 text-xs text-amber-50/85">
                              На сьогодні новий автоматичний список більше недоступний. Можеш працювати з цими завданнями або відредагувати список вручну.
                            </p>
                          </div>
                          <button
                            type="button"
                            className="btn-liquid-dashboard btn-liquid-dashboard--ice w-full sm:w-auto"
                            onClick={openEditMicrotaskList}
                          >
                            Редагувати список
                          </button>
                        </div>
                      ) : null}
                      <div className={isRegeneratingMicroTasks ? 'pointer-events-none opacity-60' : ''}>
                        <MicroTaskList
                          tasks={visibleMicroTasks}
                          isLoading={isFetchingMicroTasks}
                          activeEmptyText="Задачі ще формуються AI після ранкової сесії"
                          title="Активні та завершені задачі"
                          onComplete={handleCompleteMicroTask}
                          onDelete={taskId => {
                            void deleteTask(taskId)
                          }}
                          onSkip={handleSkipMicroTask}
                          onSetProgress={(taskId, progressPercent) => {
                            void updateProgress(taskId, progressPercent)
                          }}
                          onToggleStep={(taskId, stepIndex, done) => {
                            const manual = visibleMicroTasks.find(task => task.id === taskId && task.status === 'manual')
                            if (manual) {
                              const nextSteps = Array.isArray(manual.stepsCompleted) ? [...manual.stepsCompleted] : []
                              nextSteps[stepIndex] = done
                              const updated: MicroTaskItem = {
                                ...manual,
                                stepsCompleted: nextSteps,
                              }
                              setManualMicroTask(updated)
                              saveManualMicroTask(dashboardUser?.id ?? 'guest', activeMicrotaskDateKey, updated)
                              return
                            }
                            void updateStep(taskId, stepIndex, done)
                          }}
                        />
                      </div>
                      <button
                        type="button"
                        onClick={openEditMicrotaskList}
                        className="w-full rounded-[20px] border border-dashed border-[rgba(255,255,255,0.16)] bg-[rgba(255,255,255,0.02)] px-4 py-3 text-left text-sm font-medium text-[var(--text-secondary)] transition-colors hover:border-[rgba(255,255,255,0.24)] hover:text-[var(--text-primary)]"
                      >
                        + Написати власне завдання
                      </button>
                      {canContinueToEvening && !showEveningSession ? (
                        <div
                          data-testid="next-step-cta"
                          className={[
                            'grid gap-3 rounded-2xl px-4 py-3 sm:grid-cols-[1fr_auto] sm:items-center',
                            allTasksResolved
                              ? 'border border-[rgba(29,158,117,0.24)] bg-[rgba(29,158,117,0.10)]'
                              : 'border border-[rgba(255,255,255,0.08)] bg-[rgba(255,255,255,0.04)]',
                          ].join(' ')}
                        >
                          <div className="min-w-0">
                            <p className="text-sm font-medium text-[var(--text-primary)]">
                              {allTasksResolved
                                ? 'Мікрозавдання зібрані. Збережи ритм.'
                                : `Ще ${visibleMicroTaskProgress.activeCount} завдань чекають завершення.`}
                            </p>
                            <p className="mt-1 text-xs text-[var(--text-muted)]">
                              {allTasksResolved
                                ? 'Заверши день вечірньою сесією і отримай AI-аналіз.'
                                : 'Закрий або пропусти активні завдання, щоб перейти до вечірньої сесії.'}
                            </p>
                          </div>
                          <button
                            type="button"
                            className={[
                              'btn-liquid-dashboard w-full sm:w-auto',
                              allTasksResolved
                                ? 'btn-liquid-dashboard--primary'
                                : 'btn-liquid-dashboard--ice opacity-70',
                            ].join(' ')}
                            onClick={openEveningSession}
                            disabled={!allTasksResolved}
                          >
                            Перейти до вечора
                          </button>
                        </div>
                      ) : null}
                    </>
                  )}
                </>
              )}
            </div>
          )}
          {activeTab === 'reports' && (
            <ReportsTabContent />
          )}
          
        </div>
      )}

      {isExpert && (
        <div className="space-y-5">
          <div className="space-y-5 rounded-[22px] border border-[var(--border)] bg-[var(--bg-secondary)] p-5">
            <div className="mb-1">
              <p className="text-xs font-semibold uppercase tracking-widest text-[var(--accent)]">
                {isSuperAdmin ? 'Аналітика платформи' : 'Аналітика коуча'}
              </p>
              <p className="mt-1 text-sm text-[var(--text-muted)]">
                {isSuperAdmin ? 'Усі коучі · всі учні' : 'Starway by Nadya · поточний період'}
              </p>
            </div>
            <ExpertStatsSection isSuperAdmin={isSuperAdmin} />
          </div>
        </div>
      )}

      <BaseModal
        isOpen={todayGuardBlockState.isOpen}
        onClose={handleTodayGuardDismiss}
        overlayClassName="bg-[rgba(6,10,18,0.78)]"
        panelClassName="max-w-[34rem] rounded-[24px] border border-yellow-300/45 bg-[linear-gradient(180deg,rgba(250,204,21,0.14),rgba(18,24,36,0.98)_42%,rgba(10,14,24,0.98))] p-0 shadow-[0_30px_90px_rgba(0,0,0,0.38)]"
      >
        <div
          data-testid="yesterday-confirm-block"
          className="rounded-[24px] border border-yellow-300/25 bg-[rgba(250,204,21,0.05)] p-5"
        >
          <div className="flex items-start justify-between gap-4">
            <div className="min-w-0">
              <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-yellow-300">
                Вчорашній день не закрито
              </p>
              <p className="mt-1 text-lg font-semibold text-yellow-50">
                {todayGuardBlockState.yesterdayDay ? formatVerboseDate(todayGuardBlockState.yesterdayDay.date) : 'Учора'}
              </p>
              <p className="mt-2 text-sm leading-6 text-yellow-50/85">
                Спочатку заверши вчорашній день або свідомо пропусти його. Повернутися до нього після пропуску більше не вийде.
              </p>
            </div>
            <button
              type="button"
              data-testid="dismiss-btn"
              onClick={handleTodayGuardDismiss}
              className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-white/10 bg-white/5 text-[var(--text-muted)] transition-colors hover:bg-white/10 hover:text-[var(--text-primary)]"
              aria-label="Закрити"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          {todayGuardStepSummary.length > 0 ? (
            <div className="mt-4 flex flex-wrap gap-2">
              {todayGuardStepSummary.map((step) => (
                <span
                  key={step.id}
                  className={[
                    'inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-[12px] font-medium',
                    step.done
                      ? 'border-emerald-400/30 bg-emerald-400/10 text-emerald-300'
                      : 'border-white/10 bg-white/5 text-white/55',
                  ].join(' ')}
                >
                  {step.label} {step.done ? '✓' : '✗'}
                </span>
              ))}
            </div>
          ) : null}

          <div className="mt-4 rounded-2xl border border-yellow-300/18 bg-yellow-300/10 px-4 py-3 text-sm text-yellow-50/90">
            Якщо обереш пропуск, вчорашній день одразу стане історією без можливості відповісти пізніше.
          </div>

          <div className="mt-5 flex flex-col gap-2.5 sm:flex-row sm:justify-end">
            <button
              type="button"
              data-testid="catchup-confirm-btn"
              onClick={handleTodayGuardCatchup}
              className="inline-flex min-h-[42px] items-center justify-center gap-2 rounded-xl border border-yellow-300 bg-yellow-300/14 px-4 py-2 text-sm font-semibold text-yellow-300 transition-colors hover:bg-yellow-300/20"
            >
              🕐 Завершити вчора
            </button>
            <button
              type="button"
              data-testid="skip-yesterday-btn"
              onClick={() => {
                void handleTodayGuardSkip().catch(() => {
                  toast.error('Не вдалося пропустити вчорашній день.')
                })
              }}
              className="inline-flex min-h-[42px] items-center justify-center rounded-xl border border-white/12 bg-white/5 px-4 py-2 text-sm font-semibold text-white/55 transition-colors hover:border-white/18 hover:bg-white/8 hover:text-white/75"
            >
              Пропустити вчора
            </button>
          </div>
        </div>
      </BaseModal>

      <ExpiredTrialModal
        isOpen={isExpiredTrialModalOpen}
        onClose={() => setIsExpiredTrialModalOpen(false)}
        onOpenReports={() => {
          setIsExpiredTrialModalOpen(false)
          openReportsTab()
        }}
        onOpenSubscription={() => {
          setIsExpiredTrialModalOpen(false)
          navigate('/dashboard/subscription')
        }}
      />
    </div>
  )
}
