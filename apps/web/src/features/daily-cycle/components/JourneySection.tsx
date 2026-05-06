import { useAuth } from '@/features/auth/hooks/useAuth'
import { useSystemState } from '@/features/auth/hooks/useSystemState'
import {
  useGetTelegramLinkUrlQuery,
  useGetTelegramStatusQuery,
} from '@/features/auth/services/auth.api'
import { useGenerateDeepLinkMutation } from '@/features/auth/services/deeplinks.api'
import { useGetDailyHistoryQuery, useGetTodayEntryQuery, useSkipPreviousDayMutation } from '@/features/daily-cycle/services/daily.api'
import type { DailyHistoryProgress, DashboardUser } from '@/features/daily-cycle/utils/dashboard.types'
import {
  TRIAL_PROGRESS_CLASS,
  buildJournalDayUrl,
  formatRemainingDaysLabel,
  getDailyDraftProgress,
  getDailyHistoryProgress,
  getEntryContent,
  getEntrySourceIds,
  getEntryTaskStats,
  getLatestRecoveryTarget,
  getRelativeDateKey,
  getTimelineCardClass,
  getTimelineDayPresentation,
  getTimelineLabelClass,
  hasSessionAnswers,
  toDateKey,
} from '@/features/daily-cycle/utils/dashboard.utils'
import { useSendSessionHandoffMutation } from '@/features/notifications/services/notifications.api'
import { useGetTrialStatusQuery } from '@/features/trial/services/trial.api'
import { getMentorLifecycleState } from '@/features/trial/utils/mentorLifecycle'
import { getTrialDaysLeft } from '@/features/trial/utils/trialProgress'
import { useUserProgress } from '@/features/user/hooks/useUserProgress'
import { useGetLatestWheelAssessmentQuery } from '@/features/wheel/services/wheel.api'
import { useGetUpcomingSessionQuery } from '@/features/zoom/services/zoom.api'
import { format, subDays } from 'date-fns'
import { useEffect, useMemo, useRef } from 'react'
import toast from 'react-hot-toast'
import { useNavigate } from 'react-router-dom'
import { useMicroTasks } from '@/features/microTask/hooks/useMicroTasks'
import type { DailyCycleEntry } from '@/features/daily-cycle/types/daily.types'

function formatShortDate(value: Date) {
  return value.toLocaleDateString('uk-UA', { day: 'numeric', month: 'short' })
}

type TaskItem = {
  icon: string
  title: string
  sub: string
  detail?: string | null
  status: 'done' | 'pending' | 'locked' | 'time-locked'
  path: string
}

export default function JourneySection({
  onOpenWheelFrame,
  onOpenCycle,
  onOpenMicroTasks,
  onLockedOpen,
  onOpenRecoveryDay,
  onOpenFirstIncompleteRecoveryStep,
}: {
  onOpenWheelFrame: () => void
  onOpenCycle: (session: 'morning' | 'evening') => void
  onOpenMicroTasks: () => void
  onLockedOpen: () => void
  onOpenRecoveryDay: (dateKey: string, session: 'morning' | 'evening') => void
  onOpenFirstIncompleteRecoveryStep: (dateKey: string, progress?: DailyHistoryProgress | null) => void
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
    || accessControl?.hasSubscription,
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

  if (isLoading) {
    return (
      <div className="rounded-xl border border-[var(--border)] bg-[var(--bg-secondary)] p-6 text-center">
        <p className="text-sm text-[var(--text-muted)]">Завантажуємо твій шлях...</p>
      </div>
    )
  }

  if (hasNoTrial) {
    return (
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
  }

  const tasks: TaskItem[] = [
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

  const openTask = (task: TaskItem) => {
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
      {isJustStarted ? (
        <div className="rounded-xl border border-[var(--accent)] bg-[var(--accent-bg,var(--bg-secondary))] p-4 text-center">
          <p className="text-sm font-medium text-[var(--accent)]">
            🎉 Вітаємо! Твій 7-денний шлях розпочато
          </p>
          <p className="mt-1 text-xs text-[var(--text-muted)]">
            Щодня о 09:00 — ранкові питання · о 21:00 — вечірня рефлексія
          </p>
        </div>
      ) : null}
      {isTrialExpired && !isPaid ? (
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
      ) : null}
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
                            ].join(' '),
                          dayDateKey <= todayDateKey ? 'cursor-pointer hover:border-amber-300/50' : '',
                        ].join(' ')}
                        onClick={() => {
                          if (dayDateKey > todayDateKey || isLocked) return
                          if (
                            dayDateKey < todayDateKey
                            && dayProgress
                            && [dayProgress.morningDone, dayProgress.tasksDone, dayProgress.eveningDone].filter(Boolean).length < 3
                          ) {
                            onOpenFirstIncompleteRecoveryStep(dayDateKey, dayProgress)
                            return
                          }
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
                                    className={['h-1.5 w-1.5 flex-shrink-0 rounded-full', dot.toneClass].join(' ')}
                                    aria-label={`${dot.label}: ${dot.tooltip}`}
                                  />
                                  <span className="pointer-events-none absolute left-1/2 top-full z-20 mt-2 hidden w-32 -translate-x-1/2 rounded-xl border border-[rgba(255,255,255,0.08)] bg-[rgba(11,16,30,0.96)] px-2 py-1.5 text-[10px] text-[var(--text-secondary)] shadow-[0_12px_24px_rgba(0,0,0,0.22)] group-hover/dot:block">
                                    <strong className="block text-[var(--text-primary)]">{dot.label}</strong>
                                    {dot.tooltip}
                                  </span>
                                </span>
                              ))}
                            </div>
                            <div className="mt-1 min-h-[14px]" />
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
                  'bg-[var(--bg-tertiary)] text-[var(--text-muted)]',
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
                            : <span className="flex items-center gap-1"><span>⏳</span><span>Далі</span></span>}
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
