import {
  useCallback,
  useMemo,
} from 'react'
import toast from 'react-hot-toast'

import { useTodayGuard } from '@/features/daily-cycle/hooks/useDailyCycle'
import type { DailyCycleEntry } from '@/features/daily-cycle/types/daily.types'
import type {
  AiMentorDashboardTab,
  CurrentFlow,
  DailyHistoryProgress,
  RecoveryBlockedIntent,
} from '@/features/daily-cycle/utils/dashboard.types'
import {
  getDailyHistoryProgress,
  getEntryContent,
  getEntrySourceIds,
  getEntryTaskStats,
  getFirstIncompleteStep,
  getTodayStep,
  hasSessionAnswers,
  toDateKey,
} from '@/features/daily-cycle/utils/dashboard.utils'

import type { DashboardContext } from './useContext'
import type { DashboardDerived } from './useDerived'

export function useRecovery(
  context: DashboardContext,
  derived: DashboardDerived,
) {
  const {
    navigate,
    userId,
    todayEntry,
    dailyHistory,
    refetchDailyHistory,
    yesterdayDateKey,
    microTasks,
    skipPreviousDay,
    isSuperAdmin,
    isExpert,
    setActiveTab,
    showMorningSession,
    setShowMorningSession,
    showEveningSession,
    setShowEveningSession,
    setCycleRecoveryDateKey,
    setOpenDayNoticeKey,
    setRecoveryPromptDateKey,
    recoveryBlockedIntent,
    setRecoveryBlockedIntent,
    currentDay,
  } = context

  const {
    todayDateKey,
    todayMicroTasks,
    hasActiveMicroTasks,
    hasTasksToday,
    hasMorningAnswers,
    recoveryTarget,
    hasPendingYesterdayGate,
  } = derived

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

  return {
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
  }
}

export type DashboardRecovery = ReturnType<typeof useRecovery>
