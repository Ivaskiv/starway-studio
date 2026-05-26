export const PLATFORM_TRIAL_DAYS = 7

export type PlatformAccessStatus =
  | 'TRIAL_ACTIVE'
  | 'TRIAL_EXPIRED'
  | 'PAID_ONBOARDING'
  | 'PAID_ACTIVE'
  | 'FOCUS_ONLY'
  | 'BLOCKED'

export type PlatformAccess = {
  status: PlatformAccessStatus
  trialDay: number | null
  daysLeft: number | null
  focusPaid: boolean
  aiUpgraded: boolean
  onboardingDone: boolean
  canAccessPlatform: boolean
  canAccessPaidModules: boolean
}

export type PlatformAccessUserSnapshot = {
  focusPaid?: boolean | null
  platformTrialStartedAt?: string | null
  onboardingDone?: boolean | null
  subscriptionStatus?: string | null
  access?: {
    isPaid?: boolean
    isTrial?: boolean
    trialEnd?: string | null
  } | null
}

export type PlatformMetricReport = {
  period: 'weekly' | 'monthly'
  metrics: {
    from: string
    to: string
    days: number
    dailyEntries: number
    microTasksDone: number
    microTasksTotal: number
    mentorSessions: number
    wheelEntries: number
    avgWheelScore: number | null
  }
  summary: string[]
}

export type PlatformWheelSummary = {
  latest: {
    id: string
    createdAt: string
    updatedAt: string
    scores: Array<{ categoryId: string; score: number }>
    notes: string | null
  } | null
  cooldown: {
    canFill: boolean
    regenCount: number
    regenLeft: number
    nextWheelAt: string | null
    lastWheelAt: string | null
  }
  analytics: {
    totalAssessments: number
    balanceIndex: number
    trend: 'improving' | 'declining' | 'stable'
  }
  history: Array<{
    id: string
    createdAt: string
    updatedAt: string
    scores: Array<{ categoryId: string; score: number }>
  }>
}

export type PlatformAccessDecisionReason =
  | 'loading'
  | 'guest'
  | 'allowed'
  | 'trial_expired'
  | 'premium_required'
  | 'no_access'

export type PlatformAccessDecision = {
  allowed: boolean
  reason: PlatformAccessDecisionReason
  remainingTrialDays: number
  focusPaid: boolean
  onboardingDone: boolean
}
