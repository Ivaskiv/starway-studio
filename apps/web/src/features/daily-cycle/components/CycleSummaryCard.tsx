import { useEffect, useMemo, useRef, useState, type Dispatch, type SetStateAction } from 'react'

import { ArrowUp, LayoutGrid, MoonStar, SunMedium } from 'lucide-react'

import { useAuth } from '@/features/auth/hooks/useAuth'
import { useSystemState } from '@/features/auth/hooks/useSystemState'
import CycleDayReportModal from '@/features/daily-cycle/components/CycleDayReportModal'
import CycleStepCards, { type CycleStepCardItem } from '@/features/daily-cycle/components/CycleStepCards'
import CycleSummaryTimeline from '@/features/daily-cycle/components/CycleSummaryTimeline'
import { DailyCycleFlow } from '@/features/daily-cycle/pages/DailyCyclePage'
import { useGetDailyHistoryQuery } from '@/features/daily-cycle/services/daily.api'
import type { DailyCycleEntry } from '@/features/daily-cycle/types/daily.types'
import { useMicroTasks } from '@/features/microTask/hooks/useMicroTasks'
import { useGetTrialStatusQuery } from '@/features/trial/services/trial.api'
import { getMentorLifecycleState } from '@/features/trial/utils/mentorLifecycle'
import { useUserProgress } from '@/features/user/hooks/useUserProgress'
import { useGetLatestWheelAssessmentQuery } from '@/features/wheel/services/wheel.api'

import type { DailyHistoryProgress, DashboardUser, RecoveryBlockedIntent } from '../utils/dashboard.types'
import {
  formatVerboseDateKey,
  getCycleProgressRingMetrics,
  getDailyHistoryProgress,
  getEntryContent,
  getEntrySourceIds,
  getEntryTaskStats,
  getLatestRecoveryTarget,
  getSessionAnswers,
  isWheelDue,
  toDateKey
} from '../utils/dashboard.utils'

type Props = {
  onLockedOpen: () => void
  onOpenWheelFrame: () => void
  onStartMorningSession: () => void
  onStartEveningSession: () => void
  onOpenRecoveryDay: (dateKey: string, session: 'morning' | 'evening') => void
  onOpenFirstIncompleteRecoveryStep: (dateKey: string, progress?: DailyHistoryProgress | null) => void
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
  recoveryProgress: DailyHistoryProgress | null
  hasActiveMicroTasks: boolean
  hasTasksToday: boolean
  todayMicroTaskCount: number
  activeTodayMicroTaskCount: number
  completedTodayMicroTaskCount: number
  resumeIntentAfterRecovery: RecoveryBlockedIntent | null
  onConsumeResumeIntent: () => void
}

export default function CycleSummaryCard(props: Props) {
  const {
    onLockedOpen,
    onOpenWheelFrame,
    onStartMorningSession,
    onStartEveningSession,
    onOpenFirstIncompleteRecoveryStep,
    onTryOpenToday,
    onShowTasks,
    onShowReports,
    onCloseMorningSession,
    onCloseEveningSession,
    onOpenMicroTasks,
    onOpenProgress,
    onComplete,
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
    recoveryProgress,
    hasActiveMicroTasks,
    hasTasksToday,
    todayMicroTaskCount,
    activeTodayMicroTaskCount,
    completedTodayMicroTaskCount,
    resumeIntentAfterRecovery,
    onConsumeResumeIntent,
  } = props

  const { user } = useAuth()
  const { dayNumber: journeyDay } = useUserProgress()
  const { data: trial, isLoading } = useGetTrialStatusQuery()
  const { accessControl, subscription, getModuleAccess } = useSystemState()
  const dashboardUser = user as DashboardUser
  const userId = dashboardUser?.id
  const now = new Date()
  const [reportDayKey, setReportDayKey] = useState<string | null>(null)

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
  const todayDateKey = toDateKey(now)
  const timelineAnchorDate = useMemo(() => new Date(), [])
  const timelineStartDate = useMemo(() => {
    const start = new Date(timelineAnchorDate)
    start.setDate(start.getDate() - Math.max(0, currentDay - 1))
    return start
  }, [currentDay, timelineAnchorDate])

  const { data: dailyHistory = [] } = useGetDailyHistoryQuery(undefined, { skip: !userId })
  const { data: latestWheel } = useGetLatestWheelAssessmentQuery(userId ?? '', { skip: !userId })
  const { tasks: cycleMicroTasks } = useMicroTasks()
  const embeddedFlowRef = useRef<HTMLDivElement | null>(null)

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
  const activeCycleDateKey = recoveryDateKey ?? recoveryTargetDateKey ?? todayDateKey
  const activeCycleDateLabel = useMemo(
    () => formatVerboseDateKey(activeCycleDateKey),
    [activeCycleDateKey],
  )
  const isRecoveryYesterdayFlow = activeCycleDateKey === yesterdayDateKey
  const activeDayProgress = historyByDate[activeCycleDateKey] ?? (isRecoveryYesterdayFlow ? recoveryProgress : null)
  const morningStepDone = Boolean(activeDayProgress?.morningDone)
  const tasksStepDone = Boolean(activeDayProgress?.tasksDone)
  const eveningStepDone = Boolean(activeDayProgress?.eveningDone)
  const analysisStepDone = Boolean(activeDayProgress?.analysisDone && eveningStepDone)
  const hasTaskAccess = morningStepDone || hasMorningAnswers || hasMorningProgress
  const hasEveningAccess = morningStepDone
  const hasAnalysisAccess = eveningStepDone || analysisStepDone
  const totalTaskCountForCard = Math.max(
    activeDayProgress?.totalMicroTaskCount ?? 0,
    todayMicroTaskCount,
    activeTodayMicroTaskCount,
    hasTasksToday ? 1 : 0,
  )
  const completedTaskCountForCard = Math.max(
    0,
    totalTaskCountForCard - (activeDayProgress?.incompleteMicroTaskCount ?? Math.max(totalTaskCountForCard - completedTodayMicroTaskCount, 0)),
  )
  const hasCompletedTasksToday = completedTaskCountForCard > 0

  const lastWheelDate = latestWheel ? new Date(latestWheel.completedAt ?? latestWheel.createdAt) : null
  const wheelDue = isWheelDue(lastWheelDate, now)
  const cycleFlowSteps = useMemo(() => {
    const activeId: 'morning' | 'tasks' | 'evening' | 'report' = showMorningSession
      ? 'morning'
      : showEveningSession
        ? 'evening'
        : !morningStepDone
          ? 'morning'
          : !tasksStepDone
            ? 'tasks'
            : !eveningStepDone
              ? 'evening'
              : !analysisStepDone
                ? 'report'
                : 'report'

    return [
      { id: 'morning', label: 'Ранок', done: morningStepDone, unlocked: true },
      { id: 'tasks', label: 'Мікрозавдання', done: tasksStepDone, unlocked: hasTaskAccess },
      { id: 'evening', label: 'Вечір', done: eveningStepDone, unlocked: hasEveningAccess },
      { id: 'report', label: 'Аналіз дня', done: analysisStepDone, unlocked: hasAnalysisAccess },
    ].map((item, index) => ({
      ...item,
      number: index + 1,
      status: item.done
        ? 'done'
        : item.id === activeId
          ? 'active'
          : item.unlocked
            ? 'waiting'
            : 'locked',
    }))
  }, [
    analysisStepDone,
    eveningStepDone,
    hasAnalysisAccess,
    hasEveningAccess,
    hasTaskAccess,
    morningStepDone,
    showEveningSession,
    showMorningSession,
    tasksStepDone,
  ])
  const taskCardBadge = activeTodayMicroTaskCount > 0 ? `${activeTodayMicroTaskCount} завдання` : undefined
  const isTaskStepActive = cycleFlowSteps[1]?.status === 'active'
  const isEveningStepActive = cycleFlowSteps[2]?.status === 'active'
  const analysisReady = cycleFlowSteps[3]?.status === 'active' || cycleFlowSteps[3]?.status === 'done'
  const recoveryChecklist = [
    { label: 'Ранок', done: morningStepDone },
    { label: 'Мікрозавдання', done: tasksStepDone },
    { label: 'Вечір', done: eveningStepDone },
    { label: 'Аналіз', done: analysisStepDone },
  ]
  const stepCards: CycleStepCardItem[] = [
    {
      number: 1,
      icon: <SunMedium className="h-6 w-6" />,
      title: 'Ранок',
      subtitle: 'Сесія дня',
      topRightText: activeCycleDateLabel,
      checks: ['Ранкова рефлексія', 'Колесо балансу', 'Налаштування фокусу'],
      status: cycleFlowSteps[0]?.status === 'done' ? 'completed' : cycleFlowSteps[0]?.status === 'active' ? 'active' : 'waiting',
      ctaLabel: cycleFlowSteps[0]?.status === 'done' ? 'Відкрити' : 'Почати ▶',
      statusText: hasMorningProgress ? 'Є прогрес у сесії' : 'Займе 2 хв',
      showArrow: true,
      iconToneClass: 'border-[rgba(55,138,221,0.18)] bg-[rgba(55,138,221,0.14)] text-[#8DC4FF]',
      recoveryTone: isRecoveryYesterdayFlow,
      onClick: () => (isLocked ? onLockedOpen() : onStartMorningSession()),
    },
    {
      number: 2,
      icon: <ArrowUp className="h-6 w-6" />,
      title: 'Мікрозавдання',
      subtitle: hasTaskAccess
        ? totalTaskCountForCard > 0
          ? `${totalTaskCountForCard} завдання`
          : hasTasksToday
            ? 'Є задачі на день'
            : 'Доступні зараз'
        : 'Після ранку',
      topRightText: activeCycleDateLabel,
      checks: ['Персональні задачі', 'Трекер прогресу', 'Швидке завершення'],
      status: cycleFlowSteps[1]?.status === 'done' ? 'completed' : isTaskStepActive ? 'active' : hasTaskAccess ? 'waiting' : 'locked',
      ctaLabel: hasTaskAccess ? 'Відкрити' : 'Почни з ранку',
      statusText: hasTaskAccess
        ? totalTaskCountForCard > 0
          ? `${completedTaskCountForCard} / ${totalTaskCountForCard}`
          : 'Можна додати або виконати дію вже зараз'
        : 'Спершу закрий ранок',
      badge: taskCardBadge,
      iconToneClass: 'border-[rgba(239,159,39,0.18)] bg-[rgba(239,159,39,0.14)] text-[#F2B24B]',
      badgeToneClass: 'border-[rgba(55,138,221,0.24)] bg-[rgba(55,138,221,0.12)] text-[#78B9FF]',
      recoveryTone: isRecoveryYesterdayFlow,
      showArrow: true,
      onClick: () => (isLocked ? onLockedOpen() : onShowTasks()),
    },
    {
      number: 3,
      icon: <MoonStar className="h-6 w-6" />,
      title: 'Вечір',
      subtitle: hasEveningAccess ? 'Доступний уже зараз' : 'Після ранку',
      topRightText: activeCycleDateLabel,
      checks: ['Вечірня рефлексія', 'Підсумки дня', 'План на завтра'],
      status: cycleFlowSteps[2]?.status === 'done' ? 'completed' : isEveningStepActive ? 'active' : hasEveningAccess ? 'waiting' : 'locked',
      ctaLabel: hasEveningAccess ? 'Відкрити' : 'Почни з ранку',
      statusText: hasEveningAccess
        ? hasCompletedTasksToday || hasActiveMicroTasks
          ? 'Можна перейти у вечір без блокування задачами'
          : 'Відкривається одразу після ранку'
        : 'Спершу закрий ранок',
      iconToneClass: 'border-[rgba(129,105,255,0.18)] bg-[rgba(129,105,255,0.12)] text-[#A48BFF]',
      recoveryTone: isRecoveryYesterdayFlow,
      showArrow: true,
      onClick: () => (isLocked ? onLockedOpen() : onStartEveningSession()),
    },
    {
      number: 4,
      icon: <LayoutGrid className="h-6 w-6" />,
      title: 'Аналіз дня',
      subtitle: analysisReady ? 'Готовий після вечірньої сесії' : 'Після вечора',
      topRightText: activeCycleDateLabel,
      checks: ['Колесо балансу', 'Статистика дня', 'Інсайти'],
      status: cycleFlowSteps[3]?.status === 'done' ? 'completed' : cycleFlowSteps[3]?.status === 'active' ? 'active' : hasAnalysisAccess ? 'waiting' : 'locked',
      ctaLabel: hasAnalysisAccess ? 'Відкрити аналіз' : 'Спершу заверши вечір',
      statusText: hasAnalysisAccess ? 'Генерується тільки після завершення вечора' : 'Спершу заверши вечірню сесію',
      iconToneClass: 'border-[rgba(74,163,104,0.18)] bg-[rgba(74,163,104,0.12)] text-[#71C58A]',
      recoveryTone: isRecoveryYesterdayFlow,
      onClick: () => (isLocked ? onLockedOpen() : onShowReports()),
    },
  ]
  const completedCycleStepsCount = stepCards.filter((step) => step.status === 'completed').length
  const visualCycleStepIndex = stepCards.find((step) => step.status === 'active')?.number
    ?? stepCards.find((step) => step.status === 'waiting')?.number
    ?? stepCards[stepCards.length - 1]?.number
    ?? 1
  const xpToday = completedCycleStepsCount * 30
  const progressPercent = Math.round((completedCycleStepsCount / Math.max(stepCards.length, 1)) * 100)
  const progressRing = getCycleProgressRingMetrics(progressPercent)
  const reportEntry = useMemo(
    () => dailyHistory.find((entry) => reportDayKey && toDateKey(entry.date) === reportDayKey) ?? null,
    [dailyHistory, reportDayKey],
  )
  const reportContent = useMemo(() => getEntryContent(reportEntry as DailyCycleEntry | null), [reportEntry])
  const reportEntryIds = useMemo(() => getEntrySourceIds(reportEntry as DailyCycleEntry | null), [reportEntry])
  const reportTasks = useMemo(() => {
    if (!reportDayKey) return []

    return cycleMicroTasks.filter((task) => {
      const createdDateKey = task.createdAt?.slice(0, 10) ?? null
      const completedDateKey = task.completedAt?.slice(0, 10) ?? null
      const dueDateKey = task.dueAt?.slice(0, 10) ?? task.expiresAt?.slice(0, 10) ?? null
      const belongsToEntry = task.generatedFromEntryId ? reportEntryIds.includes(task.generatedFromEntryId) : false

      return createdDateKey === reportDayKey || completedDateKey === reportDayKey || dueDateKey === reportDayKey || belongsToEntry
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

  useEffect(() => {
    if (!showMorningSession && !showEveningSession) return

    const scrollToFlow = () => {
      const flowNode = embeddedFlowRef.current
      if (!flowNode) return

      flowNode.scrollIntoView({
        behavior: 'smooth',
        block: 'start',
      })
      window.setTimeout(() => {
        flowNode.focus({ preventScroll: true })
      }, 180)
    }

    const frameId = window.requestAnimationFrame(scrollToFlow)
    return () => {
      window.cancelAnimationFrame(frameId)
    }
  }, [showEveningSession, showMorningSession])

  if (isLoading) return null

  return (
    <div className="dashboard-liquid-card--soft !overflow-visible">
      <div className="bg-[linear-gradient(180deg,rgba(var(--accent-rgb),0.16),rgba(255,255,255,0.02)_58%,rgba(255,255,255,0.01))] p-4">
        <div className="mb-3 border-b border-[rgba(255,255,255,0.06)] pb-4">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
            <div className="min-w-0 flex-1">
              <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-[rgb(var(--accent-soft-rgb))]">ABsystem</p>
              <h2 className="mt-3 text-[1.85rem] font-black leading-[0.96] tracking-[-0.03em] text-[var(--text-primary)] sm:text-[2.15rem] lg:text-[2.35rem] xl:text-[2.55rem]">
                Продовжуй роботу
              </h2>
              <p className="mt-2.5 max-w-[42rem] text-[0.92rem] leading-5 text-[var(--text-secondary)] sm:text-[0.96rem] sm:leading-6">
                Відкрий потрібний блок і зроби наступну дію без зайвих переходів.
              </p>
              <div className="mt-4 grid max-w-4xl grid-cols-1 gap-3 md:grid-cols-2">
                <div className="inline-flex min-h-[88px] min-w-0 items-center gap-3 rounded-[18px] border border-[rgba(255,255,255,0.08)] bg-[rgba(10,16,28,0.64)] px-4">
                  <span className="text-[1.3rem] sm:text-[1.45rem]">🔥</span>
                  <div>
                    <p className="mt-0.5 text-[0.88rem] font-semibold text-[var(--text-primary)] sm:text-[1.5rem]">День {currentDay} з {totalDays}</p>
                    <p className="mt-1 text-sm text-[var(--text-secondary)]">{activeCycleDateLabel}</p>
                  </div>
                </div>
              </div>
            </div>

            <div className="flex justify-start lg:min-w-[156px] lg:justify-end xl:min-w-[196px]">
              <div className="relative flex h-[132px] w-[132px] items-center justify-center sm:h-[148px] sm:w-[148px] xl:h-[176px] xl:w-[176px]">
                <svg viewBox="0 0 180 180" className="h-full w-full">
                  <circle cx="90" cy="90" r={progressRing.radius} fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth="9" />
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

        <CycleSummaryTimeline
          totalDays={totalDays}
          currentDay={currentDay}
          timelineStartDate={timelineStartDate}
          todayDateKey={todayDateKey}
          yesterdayDateKey={yesterdayDateKey}
          recoveryDateKey={recoveryDateKey}
          recoveryTargetDateKey={recoveryTargetDateKey}
          recoveryTargetSession={recoveryTargetSession}
          showEveningSession={showEveningSession}
          historyByDate={historyByDate}
          isLocked={isLocked}
          openDayNoticeKey={openDayNoticeKey}
          setOpenDayNoticeKey={setOpenDayNoticeKey}
          onOpenActiveDay={() => {
            onTryOpenToday(() => {
              if (!hasMorningAnswers && !hasMorningProgress) {
                onStartMorningSession()
                return
              }

              if (hasActiveMicroTasks || hasTasksToday) {
                onShowTasks()
                return
              }

              onStartEveningSession()
            })
          }}
          onOpenFirstIncompleteRecoveryStep={onOpenFirstIncompleteRecoveryStep}
          onOpenReportDay={(dayDateKey) => {
            if (dayDateKey === todayDateKey) {
              onTryOpenToday(() => setReportDayKey(dayDateKey))
              return
            }
            setReportDayKey(dayDateKey)
          }}
        />

        <div className="mb-3 flex items-center justify-between gap-4 border-t border-[rgba(255,255,255,0.06)] pt-3.5">
          <div>
            {isRecoveryYesterdayFlow ? (
              <div className="mb-2 space-y-2">
                <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[#F2B24B]">
                  Дозавершення вчорашнього дня
                </p>
                <div className="inline-flex flex-wrap gap-2 rounded-[16px] border border-[rgba(242,178,75,0.18)] bg-[rgba(242,178,75,0.07)] px-3 py-2">
                  {recoveryChecklist.map((item) => (
                    <span
                      key={item.label}
                      className={[
                        'inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-medium',
                        item.done
                          ? 'bg-[rgba(29,158,117,0.16)] text-[#8AE7C4]'
                          : 'bg-[rgba(255,255,255,0.06)] text-[var(--text-secondary)]',
                      ].join(' ')}
                    >
                      <span className={[
                        'inline-flex h-4 w-4 items-center justify-center rounded-full text-[10px] font-bold',
                        item.done
                          ? 'bg-[rgba(29,158,117,0.24)] text-[#8AE7C4]'
                          : 'bg-[rgba(255,255,255,0.08)] text-[var(--text-muted)]',
                      ].join(' ')}>
                        {item.done ? '✓' : '•'}
                      </span>
                      {item.label}
                    </span>
                  ))}
                </div>
              </div>
            ) : null}
            <p className="text-[0.98rem] font-semibold text-[var(--text-primary)]">
              Крок {visualCycleStepIndex} з 4 · {cycleFlowSteps[visualCycleStepIndex - 1]?.label ?? 'Ранок'}
            </p>
          </div>
          <div className="flex min-w-[160px] items-center gap-3">
            <div className="h-1.5 flex-1 rounded-full bg-[rgba(255,255,255,0.08)]">
              <div
                data-progress={progressRing.percent}
                className="dc-progress-fill dc-progress-fill--blue h-full rounded-full transition-all"
              />
            </div>
            <span className="text-[0.86rem] font-semibold text-[rgb(var(--accent-soft-rgb))]">{progressRing.percent}%</span>
          </div>
        </div>

        <div className="mb-3">
          <CycleStepCards items={stepCards} />
        </div>

        {(showMorningSession || showEveningSession) ? (
          <div
            ref={embeddedFlowRef}
            tabIndex={-1}
            className="mb-3 rounded-[24px] border border-[rgba(var(--accent-soft-rgb),0.14)] bg-[rgba(0,0,0,0.12)] p-2 sm:p-3"
          >
            <DailyCycleFlow
              embedded
              initialSession={showEveningSession ? 'evening' : 'morning'}
              initialDateKey={recoveryDateKey ?? undefined}
              onComplete={onComplete}
              onClose={showEveningSession ? onCloseEveningSession : onCloseMorningSession}
              onOpenMicroTasks={onOpenMicroTasks}
              onOpenProgress={onOpenProgress}
            />
          </div>
        ) : null}

        {wheelDue ? (
          <div className="mb-3 rounded-[22px] border border-[rgba(255,255,255,0.08)] bg-[rgba(255,255,255,0.04)] px-4 py-3.5">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
              <div className="flex items-center gap-4">
                <svg width="40" height="40" viewBox="0 0 44 44" className="flex-shrink-0">
                  <circle cx="22" cy="22" r="16" fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth="4" />
                  <circle cx="22" cy="22" r="16" fill="none" stroke="#378ADD" strokeWidth="4" strokeLinecap="round" strokeDasharray="34 100" transform="rotate(-90 22 22)" />
                  <circle cx="22" cy="22" r="16" fill="none" stroke="#7CDB8B" strokeWidth="4" strokeLinecap="round" strokeDasharray="22 100" transform="rotate(12 22 22)" />
                </svg>
                <div>
                  <p className="text-[1rem] font-semibold text-[var(--text-primary)]">Оновити колесо балансу</p>
                  <p className="mt-1 text-[0.85rem] text-[var(--text-secondary)]">Відкрий баланс сфер і зроби 1 крок до гармонії.</p>
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
        ) : null}

        {reportDayKey ? (
          <CycleDayReportModal
            dateKey={reportDayKey}
            entry={reportEntry as DailyCycleEntry | null}
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
