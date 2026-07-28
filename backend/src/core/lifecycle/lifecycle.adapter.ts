import { prisma } from '../../db/client.js'
import { resolveUserLifecycle } from '../../modules/flow-control/service.js'
import { hasActiveFocusSubscription } from '../../modules/subscriptions/payments/focus.access.js'

export type CanonicalLifecycleState =
  | 'anonymous'
  | 'lead'
  | 'activated'
  | 'trial_active'
  | 'paid_active'
  | 'paused'
  | 'expired'
  | 'churned'

export interface CanonicalLifecycleSnapshot {
  state: CanonicalLifecycleState
  step: string | null
  currentStep: string | null
  subscriptionStatus: string | null
  funnelStatus: string | null
  timestamps: {
    userCreatedAt: Date | null
    userUpdatedAt: Date | null
    lastLoginAt: Date | null
    onboardingStartedAt: Date | null
    trialStartsAt: Date | null
    trialEndsAt: Date | null
    subscriptionStartsAt: Date | null
    subscriptionEndsAt: Date | null
    leadCreatedAt: Date | null
    leadUpdatedAt: Date | null
    leadConvertedAt: Date | null
    lastActivityAt: Date | null
    sessionStartedAt: Date | null
    sessionUpdatedAt: Date | null
  }
  flags: {
    hasLeadMagnetFlow: boolean
    hasCompletedLeadMagnet: boolean
    hasProgress: boolean
    isReturning: boolean
    hasActiveSession: boolean
    hasPaidAccess: boolean
    hasTrialAccess: boolean
    canStartTrial: boolean
    needsBinding: boolean
  }
  hasLeadMagnetFlow: boolean
  hasCompletedLeadMagnet: boolean
  trialEndsAt: Date | null
  subscriptionEndsAt: Date | null
  daysToTrialEnd: number | null
}

const CHURNED_AFTER_DAYS = 30

function diffDays(from: Date, to: Date) {
  return Math.ceil((to.getTime() - from.getTime()) / 86400000)
}

function isPausedSubscription(status: string | null | undefined) {
  return status === 'CANCELED' || status === 'PAST_DUE'
}

export async function resolveCanonicalLifecycle(userId: string | null): Promise<CanonicalLifecycleSnapshot> {
  if (!userId) {
    return {
      state: 'anonymous',
      step: null,
      currentStep: null,
      subscriptionStatus: null,
      funnelStatus: null,
      timestamps: {
        userCreatedAt: null,
        userUpdatedAt: null,
        lastLoginAt: null,
        onboardingStartedAt: null,
        trialStartsAt: null,
        trialEndsAt: null,
        subscriptionStartsAt: null,
        subscriptionEndsAt: null,
        leadCreatedAt: null,
        leadUpdatedAt: null,
        leadConvertedAt: null,
        lastActivityAt: null,
        sessionStartedAt: null,
        sessionUpdatedAt: null,
      },
      flags: {
        hasLeadMagnetFlow: false,
        hasCompletedLeadMagnet: false,
        hasProgress: false,
        isReturning: false,
        hasActiveSession: false,
        hasPaidAccess: false,
        hasTrialAccess: false,
        canStartTrial: false,
        needsBinding: true,
      },
      hasLeadMagnetFlow: false,
      hasCompletedLeadMagnet: false,
      trialEndsAt: null,
      subscriptionEndsAt: null,
      daysToTrialEnd: null,
    }
  }

  const [snapshot, details] = await Promise.all([
    resolveUserLifecycle(userId),
    prisma.user.findUnique({
      where: { id: userId },
      select: {
        createdAt: true,
        updatedAt: true,
        lastLoginAt: true,
        onboardingStartedAt: true,
        trialStartsAt: true,
        currentStep: true,
        telegramUserId: true,
        telegramChatId: true,
        subscriptions: {
          orderBy: { createdAt: 'desc' },
          take: 1,
          select: {
            startsAt: true,
            status: true,
            trialEndsAt: true,
            currentPeriodEnd: true,
            createdAt: true,
          },
        },
        funnelLeads: {
          orderBy: { updatedAt: 'desc' },
          take: 1,
          select: {
            createdAt: true,
            status: true,
            updatedAt: true,
            convertedAt: true,
          },
        },
        dailyEntries: {
          orderBy: { updatedAt: 'desc' },
          take: 1,
          select: {
            createdAt: true,
            updatedAt: true,
          },
        },
        mentorSession: {
          select: {
            state: true,
            step: true,
            createdAt: true,
            updatedAt: true,
            endedAt: true,
          },
        },
        _count: {
          select: {
            dailyEntries: true,
          },
        },
      },
    }),
  ])
  const isFocusActive = await hasActiveFocusSubscription(userId).catch(() => false)

  const latestSubscription = details?.subscriptions[0] ?? null
  const latestFunnelLead = details?.funnelLeads[0] ?? null
  const latestDailyEntry = details?.dailyEntries[0] ?? null
  const mentorSession = details?.mentorSession ?? null
  const now = new Date()
  const trialEndsAt = latestSubscription?.trialEndsAt ?? null
  const subscriptionEndsAt = latestSubscription?.currentPeriodEnd ?? null
  const expiredAt = subscriptionEndsAt ?? trialEndsAt
  const daysSinceExpired = expiredAt ? diffDays(expiredAt, now) : null
  let state: CanonicalLifecycleState
  const hasActiveSession = Boolean(mentorSession && mentorSession.endedAt === null && mentorSession.state !== 'idle')
  const lastActivityAt = [latestDailyEntry?.updatedAt, mentorSession?.updatedAt, details?.lastLoginAt]
    .filter((value): value is Date => value instanceof Date)
    .sort((left, right) => right.getTime() - left.getTime())[0] ?? null
  const hasProgress = (details?._count.dailyEntries ?? 0) > 0 || (mentorSession?.step ?? 0) > 0
  const isReturning = Boolean(
    details?.lastLoginAt
    || (details?._count.dailyEntries ?? 0) > 1
    || (lastActivityAt && details?.createdAt && lastActivityAt.getTime() - details.createdAt.getTime() > 24 * 60 * 60 * 1000),
  )
  const step = hasActiveSession
    ? `${mentorSession?.state ?? 'session'}:${mentorSession?.step ?? 0}`
    : snapshot.currentStep ?? details?.currentStep ?? null

  switch (snapshot.state) {
    case 'guest':
      state = 'anonymous'
      break
    case 'lead_magnet':
      state = snapshot.hasCompletedLeadMagnet ? 'activated' : 'lead'
      break
    case 'onboarding':
      state = 'activated'
      break
    case 'trial':
      state = 'trial_active'
      break
    case 'paid':
      state = isPausedSubscription(latestSubscription?.status) ? 'paused' : 'paid_active'
      break
    case 'expired':
      state = daysSinceExpired !== null && daysSinceExpired > CHURNED_AFTER_DAYS ? 'churned' : 'expired'
      break
    default:
      state = 'anonymous'
      break
  }

  if (isFocusActive) {
    state = 'paid_active'
  }

  const hasPaidAccess = state === 'paid_active' || state === 'paused'
  const hasTrialAccess = state === 'trial_active'

  return {
    state,
    step,
    currentStep: snapshot.currentStep ?? details?.currentStep ?? null,
    subscriptionStatus: latestSubscription?.status ?? snapshot.subscriptionStatus ?? null,
    funnelStatus: latestFunnelLead?.status ?? null,
    timestamps: {
      userCreatedAt: details?.createdAt ?? null,
      userUpdatedAt: details?.updatedAt ?? null,
      lastLoginAt: details?.lastLoginAt ?? null,
      onboardingStartedAt: details?.onboardingStartedAt ?? null,
      trialStartsAt: details?.trialStartsAt ?? null,
      trialEndsAt,
      subscriptionStartsAt: latestSubscription?.startsAt ?? latestSubscription?.createdAt ?? null,
      subscriptionEndsAt,
      leadCreatedAt: latestFunnelLead?.createdAt ?? null,
      leadUpdatedAt: latestFunnelLead?.updatedAt ?? null,
      leadConvertedAt: latestFunnelLead?.convertedAt ?? null,
      lastActivityAt,
      sessionStartedAt: mentorSession?.createdAt ?? null,
      sessionUpdatedAt: mentorSession?.updatedAt ?? null,
    },
    flags: {
      hasLeadMagnetFlow: snapshot.hasLeadMagnetFlow,
      hasCompletedLeadMagnet: snapshot.hasCompletedLeadMagnet,
      hasProgress,
      isReturning,
      hasActiveSession,
      hasPaidAccess,
      hasTrialAccess,
      canStartTrial: state === 'activated',
      needsBinding: !details?.telegramUserId && !details?.telegramChatId,
    },
    hasLeadMagnetFlow: snapshot.hasLeadMagnetFlow,
    hasCompletedLeadMagnet: snapshot.hasCompletedLeadMagnet,
    trialEndsAt,
    subscriptionEndsAt,
    daysToTrialEnd: trialEndsAt ? Math.max(0, diffDays(now, trialEndsAt)) : null,
  }
}
