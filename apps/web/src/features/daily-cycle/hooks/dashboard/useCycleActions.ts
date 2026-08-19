import type { MicroTask as MicroTaskItem } from '@/features/microTask/types/types'
import {
  getTodayStep,
  saveManualMicroTask,
  serializeMicroTaskList,
} from '@/features/daily-cycle/utils/dashboard.utils'

import type { DashboardContext } from './useContext'
import type { DashboardDerived } from './useDerived'
import type { DashboardRecovery } from './useRecovery'
import type { DashboardMicrotasks } from './useMicrotasks'

export function useCycleActions(
  context: DashboardContext,
  derived: DashboardDerived,
  recovery: DashboardRecovery,
  microtasks: DashboardMicrotasks,
) {
  const {
    navigate,
    completeDay,
    openPaywall,
    subscription,
    dashboardUser,
    refetchTodayEntry,
    refetchDailyHistory,
    yesterdayDateKey,
    showMorningSession,
    setShowMorningSession,
    showEveningSession,
    setShowEveningSession,
    cycleRecoveryDateKey,
    setCycleRecoveryDateKey,
    setOpenDayNoticeKey,
    setRecoveryPromptDateKey,
  } = context

  const {
    todayDateKey,
    activeMicrotaskDateKey,
    visibleMicroTasks,
    hasActiveMicroTasks,
    hasTasksToday,
    hasMorningAnswers,
    recoveryTarget,
    currentFlow,
  } = derived

  const {
    openDashboardTab,
    openMicrotasksTab,
    openResolvedFlow,
    tryOpenToday,
    openEveningSession,
  } = recovery

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
    serializeVisibleMicroTaskList,
    saveVisibleManualTask,
    startMorningFromCycle,
    startEveningFromCycle,
    showTasksFromCycle,
    handleCycleComplete,
  }
}

export type DashboardCycleActions = ReturnType<typeof useCycleActions>
