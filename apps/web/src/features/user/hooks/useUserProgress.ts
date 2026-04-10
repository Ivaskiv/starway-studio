import { useAuth } from '@/features/auth/hooks/useAuth'
import { useSystemState } from '@/features/auth/hooks/useSystemState'
import { useGetTodayEntryQuery, useGetDailyHistoryQuery } from '@/features/daily-cycle/services/daily.api'
import { useGetTrialStatusQuery } from '@/features/trial/services/trial.api'
import { useGetLatestWheelAssessmentQuery } from '@/features/wheel/services/wheel.api'
import { useGetUpcomingSessionQuery } from '@/features/zoom/services/zoom.api'
import { useMicroTasks } from '@/features/microTask/hooks/useMicroTasks'
import { useMemo } from 'react'

type StepId = 'wheel' | 'morning' | 'tasks' | 'evening' | 'report'
type StepStatus = 'done' | 'active' | 'locked'

const LABELS: Record<StepId, string> = {
  wheel: 'Колесо балансу',
  morning: 'Ранок',
  tasks: 'Мікрозавдання',
  evening: 'Вечір',
  report: 'Звіт',
}

const hasBlock = (value: unknown) => Boolean(value && typeof value === 'object' && !Array.isArray(value))
const toDate = (value?: string | null) => (value ? new Date(value) : undefined)
const pickDate = (...values: Array<string | undefined | null>) => values.map(toDate).find(Boolean)
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
  const { accessControl, subscription } = useSystemState()
  const userId = user?.id ?? ''
  const { data: trial } = useGetTrialStatusQuery(undefined, { skip: !userId })
  const canLoadJourney = Boolean(userId)
  const { data: wheelSnapshot } = useGetLatestWheelAssessmentQuery(userId, { skip: !canLoadJourney })
  const { data: todayEntry } = useGetTodayEntryQuery(undefined, { skip: !canLoadJourney })
  const { data: dailyHistory = [] } = useGetDailyHistoryQuery(undefined, { skip: !canLoadJourney })
  const { data: upcomingZoom } = useGetUpcomingSessionQuery(undefined, { skip: !canLoadJourney })
  const { tasks: microTasks = [] } = useMicroTasks({ skip: !canLoadJourney })

  return useMemo(() => {
    const trialDay = clampDay(trial?.currentDay)
    const isPaidCycle = Boolean(subscription?.isActive || accessControl?.hasSubscription || trial?.isPaid)
    const dayNumber = isPaidCycle
      ? getPaidCycleDay(subscription?.currentPeriodStart)
      : trialDay
    const nowHour = new Date().getHours()
    const content = todayEntry?.content as Record<string, unknown> | null | undefined
    const wheelDone = Boolean(wheelSnapshot)
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
    const currentStep: StepId = !wheelDone ? 'wheel'
      : !morningDone ? 'morning'
      : !tasksDone ? 'tasks'
      : !eveningDone ? 'evening'
      : 'report'
    const completedAt: Partial<Record<StepId, Date | undefined>> = {
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
    const activeIndex = ['wheel', 'morning', 'tasks', 'evening', 'report'].indexOf(currentStep)
    const journeySteps = (Object.keys(LABELS) as StepId[]).map((id, index) => ({
      id,
      label: LABELS[id],
      status: (index < activeIndex ? 'done' : index === activeIndex ? 'active' : 'locked') as StepStatus,
      ...(completedAt[id] ? { completedAt: completedAt[id] } : {}),
    }))

    return {
      journeySteps,
      currentStep,
      dayNumber,
      missedDays: Math.max(0, dayNumber - dailyHistory.length),
      weeklyReportAvailable: trialDay >= 7 || dayNumber >= 7,
      monthlyReportAvailable: dayNumber >= 30 || dailyHistory.length >= 30,
      hasUpcomingZoomToday: Boolean(
        upcomingZoom?.scheduledAt
        && upcomingZoom.status === 'SCHEDULED'
        && upcomingZoom.scheduledAt.slice(0, 10) === todayKey(),
      ),
    }
  }, [
    accessControl?.hasSubscription,
    dailyHistory.length,
    microTasks,
    subscription?.currentPeriodStart,
    subscription?.isActive,
    todayEntry?.createdAt,
    todayEntry?.updatedAt,
    todayEntry?.content,
    trial?.currentDay,
    trial?.isPaid,
    wheelSnapshot,
    upcomingZoom?.scheduledAt,
    upcomingZoom?.status,
  ])
}

export type UserProgress = ReturnType<typeof useUserProgress>
