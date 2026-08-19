import { useEffect } from 'react'

import {
  getInitialTab,
  loadManualMicroTask,
  loadMicrotaskRegenerationFlag,
  saveManualMicroTask,
} from '@/features/daily-cycle/utils/dashboard.utils'

import type { DashboardContext } from './useContext'
import type { DashboardDerived } from './useDerived'
import type { DashboardRecovery } from './useRecovery'
import type { DashboardMicrotasks } from './useMicrotasks'

export function useRouteSync(
  context: DashboardContext,
  derived: DashboardDerived,
  recovery: DashboardRecovery,
  microtasks: DashboardMicrotasks,
): void {
  const {
    location,
    dashboardUser,
    yesterdayDateKey,
    isGeneratingMicroTasks,
    activeTab,
    setActiveTab,
    showMorningSession,
    setShowMorningSession,
    showEveningSession,
    setShowEveningSession,
    cycleRecoveryDateKey,
    setCycleRecoveryDateKey,
    setShowLevelUpCallout,
    setManualTaskText,
    setManualMicroTask,
    isRegeneratingMicroTasks,
    setHasRegeneratedMicroTasks,
    setMicrotaskPromptIntent,
    setMicrotaskPromptStage,
    recoveryPromptDateKey,
    regenerationTimerRef,
    regenerationTickerRef,
    microtaskNoticeTimerRef,
    currentDay,
  } = context

  const {
    todayDateKey,
    activeMicrotaskDateKey,
    isRecoveryMicrotaskDate,
    visibleMicroTasks,
    hasTasksToday,
    hasServerRegeneratedMicroTasks,
    recoveryTarget,
    hasPendingYesterdayGate,
  } = derived

  const {
    openRecoveryPrompt,
    openRecoveryDay,
  } = recovery

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


}
