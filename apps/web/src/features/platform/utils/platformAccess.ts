import type {
  PlatformAccess,
  PlatformAccessDecision,
  PlatformAccessUserSnapshot,
} from '../types/platformAccess.types'
import { PLATFORM_TRIAL_DAYS } from '../types/platformAccess.types'

function clampDay(value: number) {
  return Math.max(0, Math.min(PLATFORM_TRIAL_DAYS, value))
}

export function getRemainingTrialDays(input: {
  access?: PlatformAccess | null
  user?: PlatformAccessUserSnapshot | null
  now?: Date
}) {
  const daysLeft = input.access?.daysLeft
  if (typeof daysLeft === 'number') return clampDay(daysLeft)

  const trialEnd = input.user?.access?.trialEnd
  if (trialEnd) {
    const remainingMs = new Date(trialEnd).getTime() - (input.now ?? new Date()).getTime()
    return clampDay(Math.ceil(remainingMs / 86_400_000))
  }

  const startedAt = input.user?.platformTrialStartedAt
  if (!startedAt) return 0

  const elapsedMs = (input.now ?? new Date()).getTime() - new Date(startedAt).getTime()
  const elapsedDays = Math.max(0, Math.floor(elapsedMs / 86_400_000))
  return clampDay(PLATFORM_TRIAL_DAYS - elapsedDays)
}

export function isTrialActive(input: {
  access?: PlatformAccess | null
  user?: PlatformAccessUserSnapshot | null
  now?: Date
}) {
  if (input.access?.status === 'TRIAL_ACTIVE') return getRemainingTrialDays(input) > 0
  if (input.user?.access?.isTrial) return getRemainingTrialDays(input) > 0
  return Boolean(input.user?.platformTrialStartedAt && getRemainingTrialDays(input) > 0)
}

export function hasPlatformAccess(input: {
  isAuthenticated: boolean
  access?: PlatformAccess | null
  user?: PlatformAccessUserSnapshot | null
  requirePaidModules?: boolean
  now?: Date
}): PlatformAccessDecision {
  const focusPaid = Boolean(input.access?.focusPaid ?? input.user?.focusPaid)
  const onboardingDone = Boolean(input.access?.onboardingDone ?? input.user?.onboardingDone)
  const remainingTrialDays = getRemainingTrialDays(input)
  const paid =
    input.access?.status === 'PAID_ACTIVE' ||
    input.access?.status === 'PAID_ONBOARDING' ||
    input.user?.access?.isPaid === true ||
    input.user?.subscriptionStatus === 'active'
  const trial = isTrialActive(input)

  if (!input.isAuthenticated) {
    return { allowed: false, reason: 'guest', remainingTrialDays, focusPaid, onboardingDone }
  }

  if (input.access?.status === 'TRIAL_EXPIRED' || (input.access?.status === 'TRIAL_ACTIVE' && remainingTrialDays <= 0)) {
    return { allowed: false, reason: 'trial_expired', remainingTrialDays, focusPaid, onboardingDone }
  }

  if (input.requirePaidModules && !Boolean(input.access?.canAccessPaidModules || paid)) {
    return { allowed: false, reason: 'premium_required', remainingTrialDays, focusPaid, onboardingDone }
  }

  if (input.access?.canAccessPlatform || paid || trial) {
    return { allowed: true, reason: 'allowed', remainingTrialDays, focusPaid, onboardingDone }
  }

  return { allowed: false, reason: 'no_access', remainingTrialDays, focusPaid, onboardingDone }
}
