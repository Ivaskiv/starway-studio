export type LifecycleState =
  | 'guest'
  | 'lead_magnet'
  | 'onboarding'
  | 'trial'
  | 'paid'
  | 'expired'

export type LifecycleFlow =
  | 'lead-magnet'
  | 'onboarding'
  | 'mentor'
  | 'reengagement'
  | null

export type LifecycleSubscriptionStatus =
  | 'inactive'
  | 'trial'
  | 'active'
  | 'expired'

export interface UserLifecycleSnapshot {
  state: LifecycleState
  flow: LifecycleFlow
  subscriptionStatus: LifecycleSubscriptionStatus
  subscriptionActive: boolean
  currentStep: string
  leadStep: number
  hasLeadMagnetFlow: boolean
  hasCompletedLeadMagnet: boolean
  hasMentorAccess: boolean
  hasExpiredAccess: boolean
  hasWaitlistFlag: boolean
  priority: number
}

