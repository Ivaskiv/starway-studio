import { useState } from 'react'

import { useSessionOrchestrator } from '@/features/auth/context/SessionOrchestratorContext'
import { useAuth } from '@/features/auth/hooks/useAuth'
import { useSystemState } from '@/features/auth/hooks/useSystemState'
import { useGetTrialStatusQuery } from '@/features/trial/services/trial.api'
import { useUserProgress } from '@/features/user/hooks/useUserProgress'
import { VisionQuestionnaire } from '@/features/vision/components/VisionQuestionnaire'
import type { ActiveTab } from '@/features/vision/types/vision.types'
import { getCurrentMonth } from '@/features/vision/utils/webMap.utils'
import { useGetWebMapQuery } from '@/features/web-map/services/web-map.api'
import { useGetLatestWheelAssessmentQuery } from '@/features/wheel/services/wheel.api'

export function useVisionPage() {
  const { user } = useAuth()
  const { appState: sessionStatus } = useSessionOrchestrator()
  const shouldSkipProtectedQueries = sessionStatus !== 'authenticated'
  const { hasCoreAccess, subscriptionActive, trialActive } = useSystemState()
  const progress = useUserProgress()
  const { coreProgress } = progress
  const { data: trial } = useGetTrialStatusQuery(undefined, {
    skip: shouldSkipProtectedQueries || !user?.id,
  })
  const hardPaywallLocked = coreProgress.cycleDays >= 3 && !subscriptionActive
  const locked = hardPaywallLocked

  const { data: webMap, isLoading } = useGetWebMapQuery(undefined, {
    skip: shouldSkipProtectedQueries || locked,
  })
  const { data: latestWheel } = useGetLatestWheelAssessmentQuery(user?.id ?? '', {
    skip: shouldSkipProtectedQueries || !user?.id || locked,
  })

  const [activeTab, setActiveTab] = useState<ActiveTab>('goals')
  const isDraft = !webMap || webMap.status === 'draft'
  const mainGoal = webMap?.goals.find((goal) => goal.id === webMap.mainGoalId) ?? webMap?.goals.find((goal) => goal.isMain)
  const currentMonth = getCurrentMonth(webMap ?? null)

  return {
    locked,
    loading: isLoading,
    webMap,
    latestWheel,
    isDraft,
    trial,
    trialActive,
    subscriptionActive,
    hasAccess: !locked || hasCoreAccess,
    activeTab,
    setTab: setActiveTab,
    header: {
      year: webMap?.year,
      identity: webMap?.identityStatement,
      mainGoal,
    },
    goals: { goals: webMap?.goals ?? [] },
    months: { months: webMap?.months ?? [] },
    analysis: {
      months: webMap?.months ?? [],
      currentMonth,
    },
    coach: {
      initialMessages: [],
    },
    progress,
    Setup: VisionQuestionnaire,
  }
}
