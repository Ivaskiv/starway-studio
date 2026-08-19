import { prisma } from '../../db/client.js'
import { getUserAccessState } from '../subscriptions/payments/focus-access.js'

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
  const [user, accessState] = await Promise.all([
    prisma.user.findUnique({
    where: { id: userId },
    select: {
      currentState: true,
      onboardingDone: true,
      trialEndsAt: true,
    },
    }),
    getUserAccessState(userId),
  ])

  if (!user) throw new Error('User not found')

  const now = new Date()
  const state = user.currentState

  const trialDayMatch = state.match(/^TRIAL_DAY_(\d+)$/)
  const trialDay = trialDayMatch ? Number(trialDayMatch[1]) : null
  const isCanonicalPaidAccess =
    accessState.state === 'FOCUS_ACTIVE' ||
    accessState.hasFocus === true
  const isCanonicalPlatformTrial =
    accessState.state === 'FREE_WEEK1' &&
    accessState.isActive === true
  const daysLeft = accessState.expiresAt
    ? Math.max(0, Math.ceil((accessState.expiresAt.getTime() - now.getTime()) / 86_400_000))
    : null
  const trialExpired =
    trialDay !== null &&
    user.trialEndsAt != null &&
    user.trialEndsAt <= now

  let status: PlatformAccessStatus
  if (isCanonicalPaidAccess) {
    status = state === 'PAID_ONBOARDING' ? 'PAID_ONBOARDING' : 'PAID_ACTIVE'
  } else if (isCanonicalPlatformTrial) {
    status = 'TRIAL_ACTIVE'
  } else if (trialExpired) {
    status = 'TRIAL_EXPIRED'
  } else {
    status = 'BLOCKED'
  }

  const canAccessPlatform =
    isCanonicalPlatformTrial ||
    isCanonicalPaidAccess

  const canAccessPaidModules = isCanonicalPaidAccess

  return {
    status,
    trialDay,
    daysLeft,
    focusPaid: isCanonicalPaidAccess,
    aiUpgraded: isCanonicalPaidAccess,
    onboardingDone: user.onboardingDone,
    canAccessPlatform,
    canAccessPaidModules,
  }
}
