import { useAuth } from '@/features/auth/hooks/useAuth'
import { useSystemState } from '@/features/auth/hooks/useSystemState'
import { useGetTodayEntryQuery, useGetDailyHistoryQuery } from '@/features/daily-cycle/services/daily.api'
import { useGetGoalsQuery } from '@/features/goals/services/goals.api'
import { useGetTrialStatusQuery } from '@/features/trial/services/trial.api'
import { useGetWebMapQuery } from '@/features/web-map/services/web-map.api'
import { useGetLatestWheelAssessmentQuery } from '@/features/wheel/services/wheel.api'
import { useGetUpcomingSessionQuery } from '@/features/zoom/services/zoom.api'
import { useMicroTasks } from '@/features/microTask/hooks/useMicroTasks'
import { getUserProgress } from '@/features/user/selectors/getUserProgress'
import { useMemo } from 'react'

type StepId = 'wheel' | 'morning' | 'tasks' | 'evening' | 'report'
type JourneyStepId = 'entry' | 'wheel' | 'web_map' | 'absystem' | 'daily_cycle'
type StepStatus = 'done' | 'active' | 'locked'
type OnboardingNextStep = 'wheel' | 'webMap' | 'abSystem' | 'dailyCycle' | 'completed'

const LABELS: Record<StepId, string> = {
  wheel: 'Колесо балансу',
  morning: 'Ранок',
  tasks: 'Мікрозавдання',
  evening: 'Вечір',
  report: 'Звіт',
}

const STEP_PATHS: Record<StepId, string> = {
  wheel: '/dashboard/wheel',
  morning: '/dashboard/cycle?session=morning',
  tasks: '/dashboard/microtasks',
  evening: '/dashboard/cycle?session=evening',
  report: '/dashboard/journal',
}

const JOURNEY_LABELS: Record<JourneyStepId, string> = {
  entry: 'Точка запуску',
  wheel: 'Колесо балансу',
  web_map: 'WEB-Карта',
  absystem: 'ABsystem',
  daily_cycle: 'Щоденний цикл',
}

const JOURNEY_PATHS: Record<JourneyStepId, string> = {
  entry: '/dashboard',
  wheel: '/dashboard/wheel',
  web_map: '/dashboard/vision',
  absystem: '/dashboard/ai-mentor',
  daily_cycle: '/dashboard/cycle',
}

const hasBlock = (value: unknown) => Boolean(value && typeof value === 'object' && !Array.isArray(value))
const toDate = (value?: string | null) => (value ? new Date(value) : undefined)
const pickDate = (...values: Array<string | undefined | null>) => values.map(toDate).find(Boolean)
const pickLatestDate = (...values: Array<string | undefined | null>) => {
  const dates = values
    .map(toDate)
    .filter((value): value is Date => Boolean(value) && !Number.isNaN(value?.getTime()))

  if (!dates.length) return undefined
  return new Date(Math.max(...dates.map((value) => value.getTime())))
}
const todayKey = () => new Date().toLocaleDateString('sv-SE')
const MS_PER_DAY = 24 * 60 * 60 * 1000

function clampDay(value?: number | null) {
  const day = Math.floor(Number(value ?? 0))
  if (!Number.isFinite(day) || day <= 0) return 0
  return day
}

function getPaidCycleDay(startAt?: string | null) {
  if (!startAt) return 1
  const started = new Date(startAt)
  if (Number.isNaN(started.getTime())) return 1
  const startOfDay = (value: Date) => {
    const next = new Date(value)
    next.setHours(0, 0, 0, 0)
    return next
  }
  return Math.max(
    1,
    Math.floor((startOfDay(new Date()).getTime() - startOfDay(started).getTime()) / MS_PER_DAY) + 1,
  )
}

export function useUserProgress() {
  const { user } = useAuth()
  const { hasCoreAccess, subscriptionActive, trialActive, subscription } = useSystemState()
  const userId = user?.id ?? ''
  const { data: trial } = useGetTrialStatusQuery(undefined, { skip: !userId })
  const canLoadJourney = Boolean(userId)
  const { data: wheelSnapshot } = useGetLatestWheelAssessmentQuery(userId, { skip: !canLoadJourney })
  const { data: webMap } = useGetWebMapQuery(undefined, { skip: !canLoadJourney })
  const { data: goalsSet } = useGetGoalsQuery(undefined, { skip: !canLoadJourney })
  const { data: todayEntry } = useGetTodayEntryQuery(undefined, { skip: !canLoadJourney })
  const { data: dailyHistory = [] } = useGetDailyHistoryQuery(undefined, { skip: !canLoadJourney })
  const { data: upcomingZoom } = useGetUpcomingSessionQuery(undefined, { skip: !canLoadJourney })
  const { tasks: microTasks = [] } = useMicroTasks({ skip: !canLoadJourney })

  return useMemo(() => {
    const coreProgress = getUserProgress({
      wheelSnapshot,
      goalsSet,
      webMap,
      dailyHistory,
      todayEntry,
    })
    const trialDay = clampDay(trial?.currentDay)
    const dayNumber = subscriptionActive
      ? getPaidCycleDay(subscription?.currentPeriodStart)
      : trialDay
    const nowHour = new Date().getHours()
    const content = todayEntry?.content as Record<string, unknown> | null | undefined
    const wheelDone = coreProgress.wheelDone
    const webMapDone = coreProgress.visionDone
    const abSystemDone = coreProgress.goalsDone
    const morningDone = hasBlock(content?.morning)
    const todayEntryId = todayEntry?.id
    const todayDateValue = todayEntry?.date ?? todayKey()
    const todayDateKey = typeof todayDateValue === 'string'
      ? todayDateValue.slice(0, 10)
      : todayKey()
    const todayTasks = microTasks.filter(task => (
      todayEntryId
        ? task.generatedFromEntryId === todayEntryId
        : task.createdAt?.slice(0, 10) === todayDateKey
    ))
    const hasTodayTasks = todayTasks.length > 0
    const pendingTasks = todayTasks.some(task => (task.status ?? 'PENDING') === 'PENDING')
    const completedTasks = todayTasks.some(task => (task.status ?? 'PENDING') === 'COMPLETED')
    const tasksDone = morningDone && hasTodayTasks && (!pendingTasks || completedTasks || nowHour >= 18)
    const eveningDone = hasBlock(content?.evening)
    const dailyCycleInitialized = Boolean(todayEntry || dailyHistory.length)
    const hasJourneyAccess = hasCoreAccess
    const hasCycleProgress = Boolean(
      morningDone
      || eveningDone
      || dailyHistory.some((entry) => {
        const entryContent = entry.content as Record<string, unknown> | null | undefined
        return hasBlock(entryContent?.morning) || hasBlock(entryContent?.evening)
      })
    )
    const currentStep: StepId = !wheelDone ? 'wheel'
      : !morningDone ? 'morning'
      : !tasksDone ? 'tasks'
      : !eveningDone ? 'evening'
      : 'report'
    const onboardingStartedAt = pickDate(
      wheelSnapshot?.createdAt,
      user?.createdAt,
      user?.lastLoginAt,
    )?.toISOString() ?? null
    const nextOnboardingStep: OnboardingNextStep = !wheelDone
      ? 'wheel'
      : !webMapDone
        ? 'webMap'
        : !abSystemDone
          ? 'abSystem'
          : !dailyCycleInitialized
            ? 'dailyCycle'
            : 'completed'
    const entryDone = Boolean(onboardingStartedAt)
    const isOnboardingComplete = wheelDone && webMapDone && abSystemDone && dailyCycleInitialized
    const isNewUser = !wheelDone && !webMapDone && !abSystemDone && !hasCycleProgress
    const cycleCompletedAt: Partial<Record<StepId, Date | undefined>> = {
      wheel: toDate(wheelSnapshot?.completedAt ?? wheelSnapshot?.createdAt),
      morning: pickDate(todayEntry?.updatedAt, todayEntry?.createdAt),
      tasks: pickDate(
        microTasks.find(task => (task.status ?? 'PENDING') === 'COMPLETED')?.completedAt,
        todayEntry?.updatedAt,
        todayEntry?.createdAt,
      ),
      evening: pickDate(todayEntry?.updatedAt, todayEntry?.createdAt),
      report: dayNumber >= 7 ? pickDate(todayEntry?.updatedAt, todayEntry?.createdAt) : undefined,
    }
    const completedAt: Partial<Record<JourneyStepId, Date | undefined>> = {
      entry: toDate(onboardingStartedAt),
      wheel: toDate(wheelSnapshot?.completedAt ?? wheelSnapshot?.createdAt),
      web_map: pickDate(webMap?.updatedAt, webMap?.createdAt),
      absystem: pickDate(
        webMap?.updatedAt,
        webMap?.createdAt,
        goalsSet?.createdAt,
      ),
      daily_cycle: pickDate(todayEntry?.updatedAt, todayEntry?.createdAt),
    }
    const journeyCurrentStep: JourneyStepId = !wheelDone
      ? 'wheel'
      : !webMapDone
        ? 'web_map'
        : !abSystemDone
          ? 'absystem'
          : 'daily_cycle'
    const activeIndex = ['wheel', 'morning', 'tasks', 'evening', 'report'].indexOf(currentStep)
    const journeySteps = (Object.keys(LABELS) as StepId[]).map((id, index) => ({
      id,
      label: LABELS[id],
      path: STEP_PATHS[id],
      status: (index < activeIndex ? 'done' : index === activeIndex ? 'active' : 'locked') as StepStatus,
      ...(cycleCompletedAt[id] ? { completedAt: cycleCompletedAt[id] } : {}),
    }))
    const journeyMilestones = (Object.keys(JOURNEY_LABELS) as JourneyStepId[]).map((id) => ({
      id,
      label: JOURNEY_LABELS[id],
      path: JOURNEY_PATHS[id],
      status: (
        id === 'entry'
          ? entryDone ? 'done' : 'active'
          : id === 'wheel'
            ? wheelDone ? 'done' : 'active'
            : id === 'web_map'
              ? !wheelDone ? 'locked' : webMapDone ? 'done' : 'active'
              : id === 'absystem'
                ? !webMapDone ? 'locked' : abSystemDone ? 'done' : 'active'
                : !abSystemDone
                  ? 'locked'
                  : dailyCycleInitialized
                    ? 'done'
                    : hasJourneyAccess
                      ? 'active'
                      : 'locked'
      ) as StepStatus,
      ...(completedAt[id] ? { completedAt: completedAt[id] } : {}),
    }))
    const lastDailyHistoryDate = dailyHistory.length
      ? [...dailyHistory]
        .sort((left, right) => new Date(right.updatedAt ?? right.createdAt ?? right.date ?? 0).getTime() - new Date(left.updatedAt ?? left.createdAt ?? left.date ?? 0).getTime())[0]
      : null
    const lastActiveDate = pickLatestDate(
      todayEntry?.updatedAt,
      todayEntry?.createdAt,
      lastDailyHistoryDate?.updatedAt,
      lastDailyHistoryDate?.createdAt,
      wheelSnapshot?.updatedAt,
      wheelSnapshot?.completedAt,
      wheelSnapshot?.createdAt,
      webMap?.updatedAt,
      webMap?.createdAt,
      goalsSet?.createdAt,
      user?.lastLoginAt,
    )
    const inactivityDays = lastActiveDate
      ? Math.max(0, Math.floor((Date.now() - lastActiveDate.getTime()) / MS_PER_DAY))
      : 0
    const riskLevel = inactivityDays >= 2
      ? 'high'
      : inactivityDays >= 1
        ? 'medium'
        : 'low'
    const baseMomentum = (
      (wheelDone ? 20 : 0)
      + (webMapDone ? 20 : 0)
      + (abSystemDone ? 20 : 0)
      + Math.min(coreProgress.cycleDays * 10, 40)
      - (riskLevel === 'high' ? 15 : riskLevel === 'medium' ? 5 : 0)
    )
    const momentumLevel = Math.max(0, Math.min(100, baseMomentum))

    return {
      journeySteps,
      journeyMilestones,
      journeyCurrentStep,
      currentStep,
      dayNumber,
      coreProgress,
      missedDays: Math.max(0, dayNumber - dailyHistory.length),
      weeklyReportAvailable: trialDay >= 7 || dayNumber >= 7,
      monthlyReportAvailable: dayNumber >= 30 || dailyHistory.length >= 30,
      userBehavior: {
        streakCount: 0,
        lastActionDate: lastActiveDate?.toISOString() ?? '',
        momentumLevel,
        riskLevel,
        inactivityDays,
      },
      onboardingState: {
        wheelCompleted: wheelDone,
        webMapCompleted: webMapDone,
        abSystemCompleted: abSystemDone,
        dailyCycleInitialized,
        onboardingStartedAt,
        isNewUser,
        isOnboardingComplete,
        nextStep: nextOnboardingStep,
      },
      hasUpcomingZoomToday: Boolean(
        upcomingZoom?.scheduledAt
        && upcomingZoom.status === 'SCHEDULED'
        && upcomingZoom.scheduledAt.slice(0, 10) === todayKey(),
      ),
    }
  }, [
    dailyHistory.length,
    dailyHistory,
    goalsSet,
    microTasks,
    hasCoreAccess,
    subscription?.currentPeriodStart,
    subscriptionActive,
    todayEntry?.createdAt,
    todayEntry?.date,
    todayEntry?.updatedAt,
    todayEntry?.content,
    trial?.currentDay,
    trialActive,
    user?.lastLoginAt,
    webMap,
    wheelSnapshot,
    upcomingZoom?.scheduledAt,
    upcomingZoom?.status,
  ])
}

export type UserProgress = ReturnType<typeof useUserProgress>
