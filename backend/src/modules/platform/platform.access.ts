import { prisma } from '../../db/client.js'

export type PlatformAccessStatus =
  | 'TRIAL_ACTIVE'
  | 'TRIAL_EXPIRED'
  | 'PAID_ONBOARDING'
  | 'PAID_ACTIVE'
  | 'FOCUS_ONLY'
  | 'BLOCKED'

export interface PlatformAccess {
  status: PlatformAccessStatus
  trialDay: number | null
  daysLeft: number | null
  focusPaid: boolean
  aiUpgraded: boolean
  onboardingDone: boolean
  canAccessPlatform: boolean
  canAccessPaidModules: boolean
}

export async function getPlatformAccess(userId: string): Promise<PlatformAccess> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      currentState: true,
      focusPaid: true,
      onboardingDone: true,
      trialStartsAt: true,
      trialEndsAt: true,
    },
  })

  if (!user) throw new Error('User not found')

  const now = new Date()
  const state = user.currentState

  const isPaidOnboarding = state === 'PAID_ONBOARDING'
  const isActive = state === 'ACTIVE'
  const aiUpgraded = isPaidOnboarding || isActive

  const trialDayMatch = state.match(/^TRIAL_DAY_(\d+)$/)
  const trialDay = trialDayMatch ? Number(trialDayMatch[1]) : null
  const isTrialState = trialDay !== null

  const daysLeft =
    isTrialState && user.trialEndsAt
      ? Math.max(0, Math.ceil((user.trialEndsAt.getTime() - now.getTime()) / 86_400_000))
      : null

  const trialExpired =
    isTrialState && user.trialEndsAt != null && user.trialEndsAt <= now

  let status: PlatformAccessStatus
  if (isActive) {
    status = 'PAID_ACTIVE'
  } else if (isPaidOnboarding) {
    status = 'PAID_ONBOARDING'
  } else if (isTrialState && !trialExpired) {
    status = 'TRIAL_ACTIVE'
  } else if (trialExpired) {
    status = user.focusPaid ? 'FOCUS_ONLY' : 'TRIAL_EXPIRED'
  } else if (user.focusPaid) {
    status = 'FOCUS_ONLY'
  } else {
    status = 'BLOCKED'
  }

  const canAccessPlatform =
    status === 'TRIAL_ACTIVE' ||
    status === 'PAID_ONBOARDING' ||
    status === 'PAID_ACTIVE'

  const canAccessPaidModules = status === 'PAID_ONBOARDING' || status === 'PAID_ACTIVE'

  return {
    status,
    trialDay,
    daysLeft,
    focusPaid: user.focusPaid,
    aiUpgraded,
    onboardingDone: user.onboardingDone,
    canAccessPlatform,
    canAccessPaidModules,
  }
}
