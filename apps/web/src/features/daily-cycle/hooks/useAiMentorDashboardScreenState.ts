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
import { useAppFlowStore } from '@/features/app/useAppFlowStore'
import { useAuth } from '@/features/auth/hooks/useAuth'
import { useSystemState } from '@/features/auth/hooks/useSystemState'
import { selectUserRole } from '@/features/auth/services/auth.slice'
import { usePaywallStore } from '@/features/paywall/store/usePaywallStore'
// import CycleStepCards, { type CycleStepCardItem } from '@/features/daily-cycle/components/CycleStepCards'
import { useTodayGuard } from '@/features/daily-cycle/hooks/useDailyCycle'
import { useGetDailyHistoryQuery, useGetTodayEntryQuery, useSkipPreviousDayMutation, useSubmitDailyCycleMutation } from '@/features/daily-cycle/services/daily.api'
import type { DailyCycleEntry } from '@/features/daily-cycle/types/daily.types'
import { useMicroTasks } from '@/features/microTask/hooks/useMicroTasks'
import type { MicroTask as MicroTaskItem } from '@/features/microTask/types/types'
import { useGetTrialStatusQuery, useStartTrialMutation } from '@/features/trial/services/trial.api'
import { getMentorLifecycleState } from '@/features/trial/utils/mentorLifecycle'
import { getTrialDaysLeft } from '@/features/trial/utils/trialProgress'
import { useUserProgress } from '@/features/user/hooks/useUserProgress'
import { format } from 'date-fns'
// import { BookOpen, CheckCircle2, Crosshair, Plus, RefreshCcw, Target, X } from 'lucide-react'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import toast from 'react-hot-toast'
import { useLocation, useNavigate } from 'react-router-dom'
// import { DailyCycleFlow } from '../../pages/DailyCyclePage'
import type {
    AiMentorDashboardTab,
    CurrentFlow,
    DailyHistoryProgress,
    DashboardUser,
    MicrotaskPromptIntent,
    TaskDayStep,
    MicrotaskPromptStage,
    RecoveryBlockedIntent,
} from '@/features/daily-cycle/utils/dashboard.types'
import {
    buildManualMicroTask,
    formatVerboseDate,
    // formatVerboseDateKey,
    // getDailyDraftProgress,
    getDailyHistoryProgress,
    getEntryContent,
    getEntrySourceIds,
    getEntryTaskStats,
    getFirstIncompleteStep,
    getInitialTab,
    getLatestRecoveryTarget,
    getMicrotaskProgressToast,
    getMorningMeta,
    getRelativeDateKey,
    // getSessionAnswers,
    getTodayStep,
    hasSessionAnswers,
    loadManualMicroTask,
    loadMicrotaskRegenerationFlag,
    resolveCurrentFlow,
    saveManualMicroTask,
    saveMicrotaskRegenerationFlag,
    serializeMicroTaskList,
    toDateKey,
} from '@/features/daily-cycle/utils/dashboard.utils'

function FunnelConversionSection() { return null }

function AIProducerRecommendations() { return null }

// ─── DashboardPage ────────────────────────────────────────────────────────────

export function useAiMentorDashboardScreenState() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const completeDay = useAppFlowStore((s) => s.completeDay)
  const openPaywall = usePaywallStore((s) => s.open)
  const { accessControl, subscription, getModuleAccess } = useSystemState()
  const dashboardUser = user as DashboardUser
  const userId = dashboardUser?.id
  const { data: trial } = useGetTrialStatusQuery()
  const [startTrial, startTrialState] = useStartTrialMutation()
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

  useEffect(() => {
    const shouldStartTrial = Boolean(
      userId
      && location.pathname === '/dashboard/cycle'
      && !subscription?.isActive
      && !accessControl?.hasSubscription
      && !trial?.startedAt
    )

    if (!shouldStartTrial || startTrialState.isLoading) return
    startTrial().catch(() => undefined)
  }, [
    accessControl?.hasSubscription,
    location.pathname,
    startTrial,
    startTrialState.isLoading,
    subscription?.isActive,
    trial?.startedAt,
    userId,
  ])
  const todayDateKey = toDateKey(new Date())
  const activeMicrotaskDateKey = useMemo(() => {
    const params = new URLSearchParams(location.search)
    const requestedDateKey = params.get('date')
    if (activeTab !== 'microtasks') return todayDateKey
    if (!requestedDateKey) return todayDateKey
    return requestedDateKey
  }, [activeTab, location.search, todayDateKey])
  const activeMicrotaskDateLabel = useMemo(() => {
    const [year, month, day] = activeMicrotaskDateKey.split('-').map(Number)
    if (!year || !month || !day) return activeMicrotaskDateKey
    return formatVerboseDate(new Date(year, month - 1, day))
  }, [activeMicrotaskDateKey])
  const isRecoveryMicrotaskDate = activeMicrotaskDateKey !== todayDateKey
  const microtaskContextEntry = useMemo(() => {
    if (activeMicrotaskDateKey === todayDateKey) {
      return todayEntry ?? dailyHistory.find(entry => toDateKey(entry.date) === activeMicrotaskDateKey) ?? null
    }

    return dailyHistory.find(entry => toDateKey(entry.date) === activeMicrotaskDateKey) ?? null
  }, [activeMicrotaskDateKey, dailyHistory, todayDateKey, todayEntry])
  const microtaskContextProgress = useMemo(
    () => (microtaskContextEntry
      ? getDailyHistoryProgress(microtaskContextEntry, getEntryTaskStats(microtaskContextEntry, microTasks))
      : null),
    [microTasks, microtaskContextEntry],
  )
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
  const taskDaySteps = useMemo<TaskDayStep[]>(() => {
    const morningDone = Boolean(microtaskContextProgress?.morningDone)
    const tasksDone = Boolean(microtaskContextProgress?.tasksDone)
    const eveningDone = Boolean(microtaskContextProgress?.eveningDone)
    const analysisDone = Boolean(microtaskContextProgress?.analysisDone)

    return [
      {
        id: 'morning',
        label: 'Ранок',
        status: morningDone ? 'done' : 'active',
      },
      {
        id: 'tasks',
        label: 'Мікрозавдання',
        status: tasksDone ? 'done' : morningDone ? 'active' : 'locked',
      },
      {
        id: 'evening',
        label: 'Вечір',
        status: eveningDone ? 'done' : morningDone ? 'active' : 'locked',
      },
      {
        id: 'analysis',
        label: 'Аналіз дня',
        status: analysisDone ? 'done' : morningDone ? 'active' : 'locked',
      },
    ]
  }, [microtaskContextProgress])
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
  const dailyProgressByDate = useMemo(() => {
    return dailyHistory.reduce<Record<string, DailyHistoryProgress>>((acc, entry) => {
      acc[toDateKey(entry.date)] = getDailyHistoryProgress(entry, getEntryTaskStats(entry, microTasks))
      return acc
    }, {})
  }, [dailyHistory, microTasks])
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
  const activeRecoveryProgress = useMemo(
    () => (cycleRecoveryDateKey ? dailyProgressByDate[cycleRecoveryDateKey] ?? null : null),
    [cycleRecoveryDateKey, dailyProgressByDate],
  )
  const currentFlow = useMemo(() => resolveCurrentFlow({
    todayDateKey,
    yesterdayDateKey,
    reportDayKey: null,
    cycleRecoveryDateKey,
    recoveryPromptDateKey,
    recoveryTargetDateKey: recoveryTarget?.dateKey ?? null,
    showMorningSession,
    showEveningSession,
    hasMorningAnswers,
    hasTasksToday,
    hasActiveMicroTasks,
    yesterdayProgress,
    activeRecoveryProgress,
  }), [
    activeRecoveryProgress,
    cycleRecoveryDateKey,
    hasActiveMicroTasks,
    hasMorningAnswers,
    hasTasksToday,
    recoveryPromptDateKey,
    recoveryTarget?.dateKey,
    showEveningSession,
    showMorningSession,
    todayDateKey,
    yesterdayDateKey,
    yesterdayProgress,
  ])
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

  const openFlowStep = useCallback((flow: Extract<CurrentFlow, { mode: 'today' | 'recovery' }>) => {
    const isRecoveryFlow = flow.mode === 'recovery' && flow.dateKey !== todayDateKey
    setOpenDayNoticeKey(null)
    setRecoveryPromptDateKey(null)
    setRecoveryBlockedIntent(null)
    setCycleRecoveryDateKey(isRecoveryFlow ? flow.dateKey : null)

    if (flow.step === 'tasks') {
      setShowMorningSession(false)
      setShowEveningSession(false)
      openDashboardTab('microtasks', { dateKey: isRecoveryFlow ? flow.dateKey : null })
      return
    }

    if (flow.step === 'analysis') {
      setShowMorningSession(false)
      setShowEveningSession(false)
      openDashboardTab('reports')
      return
    }

    setShowMorningSession(flow.step === 'morning')
    setShowEveningSession(flow.step === 'evening')
    openDashboardTab('cycle', {
      session: flow.step === 'morning' ? 'morning' : 'evening',
      dateKey: isRecoveryFlow ? flow.dateKey : null,
    })
  }, [openDashboardTab, todayDateKey])

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
        openResolvedFlow({
          mode: 'today',
          dateKey: todayDateKey,
          step: getTodayStep({
            showMorningSession: false,
            showEveningSession: false,
            hasMorningAnswers,
            hasTasksToday,
            hasActiveMicroTasks,
          }),
        })
        return
      case 'tasks':
        openResolvedFlow({ mode: 'today', dateKey: todayDateKey, step: 'tasks' })
        return
      case 'evening':
        openResolvedFlow({ mode: 'today', dateKey: todayDateKey, step: 'evening' })
        return
      case 'morning':
      default:
        openResolvedFlow({ mode: 'today', dateKey: todayDateKey, step: 'morning' })
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

  const openResolvedFlow = useCallback((flow: CurrentFlow) => {
    if (flow.mode === 'blocked') {
      openRecoveryPrompt(flow.dateKey, flow.step === 'evening' ? 'evening' : 'morning')
      return
    }

    if (flow.mode === 'history') {
      openDashboardTab('reports')
      return
    }

    openFlowStep(flow)
  }, [openDashboardTab, openFlowStep, openRecoveryPrompt])

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
      openResolvedFlow({ mode: 'recovery', dateKey, step: 'tasks' })
      return
    }

    openResolvedFlow({ mode: 'recovery', dateKey, step: session })
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
    const progress = getDailyHistoryProgress(yesterdayDay, getEntryTaskStats(yesterdayDay, microTasks))
    openResolvedFlow({
      mode: 'recovery',
      dateKey: dayKey,
      step: getFirstIncompleteStep(progress),
    })
  }, [microTasks, openResolvedFlow])

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
    tasks: microTasks,
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
    const aiAnalysisText =
      typeof todayGuardBlockState.yesterdayDay.aiAnalysis === 'string'
        ? todayGuardBlockState.yesterdayDay.aiAnalysis
        : ''
    const hasAnalysis = Boolean(
      aiAnalysisText.trim()
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
  const openFirstIncompleteRecoveryStep = useCallback((dateKey: string, progress?: DailyHistoryProgress | null) => {
    if (dateKey === yesterdayDateKey && hasPendingYesterdayGate) {
      tryOpenToday(() => {})
      return
    }

    openResolvedFlow({
      mode: 'recovery',
      dateKey,
      step: getFirstIncompleteStep(progress),
    })
  }, [hasPendingYesterdayGate, openResolvedFlow, tryOpenToday, yesterdayDateKey])
  const handleFinishYesterday = useCallback(() => {
    handleTodayGuardCatchup()
  }, [handleTodayGuardCatchup])

  const openEveningSession = () => {
    console.info('[AiMentorDashboard] openEveningSession', {
      recoveryTargetDateKey: recoveryTarget?.dateKey ?? null,
      recoveryTargetSession: recoveryTarget?.session ?? null,
      todayDateKey,
      currentDay,
      hasRecoveryTarget: Boolean(recoveryTarget),
    })
    if (recoveryTarget?.session === 'evening') {
      openResolvedFlow({ mode: 'recovery', dateKey: recoveryTarget.dateKey, step: 'evening' })
      return
    }

    openResolvedFlow({ mode: 'today', dateKey: todayDateKey, step: 'evening' })
  }
  const microtaskPromptActive = Boolean(microtaskPromptIntent)
  const microtaskPromptTitle = isRecoveryMicrotaskDate
    ? `Мікродія за ${activeMicrotaskDateLabel}`
    : 'Мікрозавдання на сьогодні'
  const microtaskPromptBody = microtaskPromptIntent === 'regenerate'
    ? 'Новий аналіз замінить старі авто-завдання цього дня. Ручні записи залишаться як є.'
    : isRecoveryMicrotaskDate
      ? 'Для дозавершення вчорашнього дня авто-мікрозавдання не генеруються. Зафіксуй свою мікродію або свідомо переходь до вечірньої сесії.'
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

  const openManualTaskComposer = () => {
    setMicrotaskPromptIntent('generate')
    setManualTaskText('')
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

    if (isRecoveryMicrotaskDate) return
    if (hasTasksToday || isGeneratingMicroTasks || isRegeneratingMicroTasks) return
    setMicrotaskPromptIntent(current => current ?? 'generate')
    setMicrotaskPromptStage(current => current ?? 'choice')
  }, [activeTab, hasTasksToday, isGeneratingMicroTasks, isRecoveryMicrotaskDate, isRegeneratingMicroTasks])

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
    if (showMorningSession || showEveningSession) {
      if (cycleRecoveryDateKey !== requestedDateKey) {
        console.info('[AiMentorDashboard] recovery-route-check preserving recovery state', {
          requestedDateKey,
          requestedSession,
          cycleRecoveryDateKey,
          showMorningSession,
          showEveningSession,
        })
        setCycleRecoveryDateKey(requestedDateKey)
      }
      return
    }

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
    const requestedDateKey = params.get('date')
    const requestedSession = params.get('session')
    const isCycleSessionRoute = activeTab === 'cycle' && (requestedSession === 'morning' || requestedSession === 'evening')

    if (!isCycleSessionRoute) return
    if (!hasPendingYesterdayGate) return
    if (requestedDateKey === yesterdayDateKey && (showMorningSession || showEveningSession)) return
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
    showEveningSession,
    showMorningSession,
    yesterdayDateKey,
  ])

  useEffect(() => {
    const params = new URLSearchParams(location.search)
    const requestedDateKey = params.get('date')
    if (!hasPendingYesterdayGate) return
    if (!showMorningSession && !showEveningSession) return
    if (requestedDateKey === yesterdayDateKey) {
      if (cycleRecoveryDateKey !== yesterdayDateKey) {
        console.info('[AiMentorDashboard] recovery session visible, restoring recovery key', {
          requestedDateKey,
          cycleRecoveryDateKey,
          showMorningSession,
          showEveningSession,
        })
        setCycleRecoveryDateKey(yesterdayDateKey)
      }
      return
    }
    if (cycleRecoveryDateKey === yesterdayDateKey) return

    setShowMorningSession(false)
    setShowEveningSession(false)
    openRecoveryPrompt(yesterdayDateKey, showEveningSession ? 'evening' : 'morning')
  }, [
    cycleRecoveryDateKey,
    hasPendingYesterdayGate,
    location.search,
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

  const serializeVisibleMicroTaskList = () => serializeMicroTaskList(visibleMicroTasks)

  const saveVisibleManualTask = (task: MicroTaskItem | null) => {
    saveManualMicroTask(dashboardUser?.id ?? 'guest', activeMicrotaskDateKey, task)
  }

  const startMorningFromCycle = () => {
    const recoveryDate = cycleRecoveryDateKey ?? recoveryTarget?.dateKey ?? null
    console.info('[AiMentorDashboard] start-morning clicked', {
      currentFlow,
      recoveryDateKey: recoveryDate,
      cycleRecoveryDateKey,
      recoveryTargetDateKey: recoveryTarget?.dateKey ?? null,
      showMorningSession,
      showEveningSession,
    })
    if (recoveryDate && recoveryDate === yesterdayDateKey) {
      openResolvedFlow({ mode: 'recovery', dateKey: recoveryDate, step: 'morning' })
      return
    }

    tryOpenToday(() => {
      setRecoveryPromptDateKey(null)
      setOpenDayNoticeKey(null)
      setCycleRecoveryDateKey(null)
      setShowEveningSession(false)
      setShowMorningSession(true)
      openDashboardTab('cycle', { session: 'morning' })
    })
  }

  const startEveningFromCycle = () => {
    const recoveryDate = cycleRecoveryDateKey ?? recoveryTarget?.dateKey ?? null
    if (recoveryDate && recoveryDate === yesterdayDateKey) {
      openResolvedFlow({ mode: 'recovery', dateKey: recoveryDate, step: 'evening' })
      return
    }

    tryOpenToday(() => {
      openEveningSession()
    })
  }

  const showTasksFromCycle = () => {
    const recoveryDate = cycleRecoveryDateKey ?? recoveryTarget?.dateKey ?? null
    if (recoveryDate && recoveryDate === yesterdayDateKey) {
      openResolvedFlow({ mode: 'recovery', dateKey: recoveryDate, step: 'tasks' })
      return
    }

    tryOpenToday(() => {
      openMicrotasksTab()
    })
  }

  const handleCycleComplete = async () => {
    const isRecoveryCompletion = currentFlow.mode === 'recovery'
    console.info('[AiMentorDashboard] cycle recovery completion', {
      isRecoveryCompletion,
      currentFlow,
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
    if (!isRecoveryCompletion) {
      completeDay()
      if (!subscription?.isActive && useAppFlowStore.getState().currentStep === 'paywall') {
        openPaywall('manual')
        if (!usePaywallStore.getState().isOpen) {
          navigate('/dashboard/subscription')
          return
        }
        openDashboardTab('cycle')
        return
      }
    }
    if (isRecoveryCompletion) {
      const nextTodayStep = getTodayStep({
        showMorningSession: false,
        showEveningSession: false,
        hasMorningAnswers,
        hasTasksToday,
        hasActiveMicroTasks,
      })
      console.info('[AiMentorDashboard] opening today flow after recovery finish', {
        todayDateKey,
        nextTodayStep,
        hasMorningAnswers,
        hasTasksToday,
        hasActiveMicroTasks,
      })
      openResolvedFlow({ mode: 'today', dateKey: todayDateKey, step: nextTodayStep })
      return
    }
    openDashboardTab('cycle')
  }

  return {
    navigate,
    location,
    accessControl,
    subscription,
    getModuleAccess,
    dashboardUser,
    userId,
    trial,
    todayEntry,
    refetchTodayEntry,
    dailyHistory,
    refetchDailyHistory,
    currentDateKey,
    yesterdayDateKey,
    rawRecoveryTarget,
    journeyDay,
    journeySteps,
    microTasks,
    isFetchingMicroTasks,
    refetchMicroTasks,
    createManualTask,
    replaceManualTasks,
    completeTask,
    deleteTask,
    skipTask,
    updateProgress,
    updateStep,
    submitDailyCycle,
    isGeneratingMicroTasks,
    skipPreviousDay,
    isSkippingPreviousDay,
    userRole,
    role,
    isSuperAdmin,
    isExpert,
    name,
    activeTab,
    setActiveTab,
    showWheelFrame,
    setShowWheelFrame,
    showMorningSession,
    setShowMorningSession,
    showEveningSession,
    setShowEveningSession,
    cycleRecoveryDateKey,
    setCycleRecoveryDateKey,
    showLevelUpCallout,
    setShowLevelUpCallout,
    isExpiredTrialModalOpen,
    setIsExpiredTrialModalOpen,
    manualTaskText,
    setManualTaskText,
    manualMicroTask,
    setManualMicroTask,
    isRegeneratingMicroTasks,
    setIsRegeneratingMicroTasks,
    hasRegeneratedMicroTasks,
    setHasRegeneratedMicroTasks,
    microtaskPromptIntent,
    setMicrotaskPromptIntent,
    microtaskPromptStage,
    setMicrotaskPromptStage,
    openDayNoticeKey,
    setOpenDayNoticeKey,
    recoveryPromptDateKey,
    setRecoveryPromptDateKey,
    recoveryBlockedIntent,
    setRecoveryBlockedIntent,
    resumeIntentAfterRecovery,
    setResumeIntentAfterRecovery,
    optimisticTaskState,
    setOptimisticTaskState,
    mentorLifecycleState,
    isPausedTrial,
    currentDay,
    totalDays,
    trialDaysLeft,
    todayDateKey,
    activeMicrotaskDateKey,
    activeMicrotaskDateLabel,
    isRecoveryMicrotaskDate,
    microtaskContextEntry,
    microtaskContextProgress,
    microtaskContextEntryIds,
    morningAnswers,
    morningMeta,
    visibleMicroTasks,
    todayMicroTasks,
    activeTodayMicroTasks,
    completedTodayMicroTasks,
    visibleMicroTaskProgress,
    hasActiveMicroTasks,
    hasTasksToday,
    hasRegenEligibleTasks,
    hasMorningAnswers,
    hasServerRegeneratedMicroTasks,
    canContinueToEvening,
    canRegenerateTasks,
    taskDaySteps,
    completedTaskDaySteps,
    taskProgressPercent,
    taskRingRadius,
    taskRingCircumference,
    taskRingOffset,
    taskXpToday,
    allTasksResolved,
    dailyProgressByDate,
    yesterdayEntry,
    yesterdayProgress,
    recoveryTarget,
    hasPendingYesterdayGate,
    activeRecoveryProgress,
    currentFlow,
    openDashboardTab,
    openFlowStep,
    openMicrotasksTab,
    openReportsTab,
    openTodayAfterRecoveryDecision,
    openRecoveryPrompt,
    openResolvedFlow,
    openRecoveryDay,
    handleSkipPreviousDay,
    handleCatchupFromTodayGuard,
    todayGuardBlockState,
    tryOpenToday,
    handleTodayGuardCatchup,
    handleTodayGuardSkip,
    handleTodayGuardDismiss,
    todayGuardYesterdayProgress,
    todayGuardStepSummary,
    openFirstIncompleteRecoveryStep,
    handleFinishYesterday,
    openEveningSession,
    microtaskPromptActive,
    microtaskPromptTitle,
    microtaskPromptBody,
    openMicrotaskPrompt,
    closeMicrotaskPrompt,
    clearMicrotaskNotice,
    announceMicrotaskProgress,
    handleGenerateMicroTasks,
    handleRegenerateMicroTasks,
    handleSaveManualTask,
    openEditMicrotaskList,
    openManualTaskComposer,
    handleCompleteMicroTask,
    handleSkipMicroTask,
    serializeVisibleMicroTaskList,
    saveVisibleManualTask,
    startMorningFromCycle,
    startEveningFromCycle,
    showTasksFromCycle,
    handleCycleComplete,
  }
}

export type AiMentorDashboardScreenState = ReturnType<typeof useAiMentorDashboardScreenState>
