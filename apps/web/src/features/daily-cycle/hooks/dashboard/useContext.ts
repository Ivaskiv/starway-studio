import { useAppSelector } from '@/app/hooks'
import { useAppFlowStore } from '@/features/app/useAppFlowStore'
import { useAuth } from '@/features/auth/hooks/useAuth'
import { useSystemState } from '@/features/auth/hooks/useSystemState'
import { selectUserRole } from '@/features/auth/services/auth.slice'
import { usePaywallStore } from '@/features/paywall/store/usePaywallStore'
import {
  useGetDailyHistoryQuery,
  useGetTodayEntryQuery,
  useSkipPreviousDayMutation,
  useSubmitDailyCycleMutation,
} from '@/features/daily-cycle/services/daily.api'
import { useMicroTasks } from '@/features/microTask/hooks/useMicroTasks'
import type { MicroTask as MicroTaskItem } from '@/features/microTask/types/types'
import {
  useGetTrialStatusQuery,
  useStartTrialMutation,
} from '@/features/trial/services/trial.api'
import { getMentorLifecycleState } from '@/features/trial/utils/mentorLifecycle'
import { getTrialDaysLeft } from '@/features/trial/utils/trialProgress'
import { useUserProgress } from '@/features/user/hooks/useUserProgress'
import {
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react'
import {
  useLocation,
  useNavigate,
} from 'react-router-dom'
import type {
  AiMentorDashboardTab,
  DashboardUser,
  MicrotaskPromptIntent,
  MicrotaskPromptStage,
  RecoveryBlockedIntent,
} from '@/features/daily-cycle/utils/dashboard.types'
import {
  getInitialTab,
  getLatestRecoveryTarget,
  getRelativeDateKey,
  toDateKey,
} from '@/features/daily-cycle/utils/dashboard.utils'

export function useContext() {
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

  return {
    navigate,
    location,
    completeDay,
    openPaywall,
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
    setMicrotaskNotice,
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
    regenerationTimerRef,
    regenerationTickerRef,
    microtaskNoticeTimerRef,
    mentorLifecycleState,
    isPausedTrial,
    currentDay,
    totalDays,
    trialDaysLeft,
  }
}

export type DashboardContext = ReturnType<typeof useContext>
