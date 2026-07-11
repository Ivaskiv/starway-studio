import { type Prisma } from '@starway/db/prisma-client'

import { prisma } from '../../db/client.js'
import { cacheDel } from '../../lib/cache/index.js'
import { NotificationEvent } from '../../services/notifications/NotificationEvent.js'
import { isNotificationRoleAllowed } from '../../services/notifications/domain/notificationRoleRules.js'
import type { UserLifecycleSnapshot } from './types.js'
import { mapLifecycleToFunnelStage } from '../../lib/funnel/stage.js'
import { stopLeadMagnet } from '../integrations/sendpulse/sendpulse.service.js'

type FlowDbClient = typeof prisma | Prisma.TransactionClient
const LEAD_MAGNET_TTL_MS = 48 * 60 * 60 * 1000

function isWaitlistFlag(value: string | null | undefined): boolean {
  const normalized = String(value ?? '').trim().toUpperCase()
  return normalized.includes('WAITLIST') || normalized.includes('EARLY_ACCESS')
}

function resolveOnboardingStage(
  currentStep: string | null | undefined,
): string | null {
  const normalizedCurrentStep = String(currentStep ?? '').trim()
  if (normalizedCurrentStep === 'lead_magnet') return 'lead_magnet'
  if (normalizedCurrentStep && !normalizedCurrentStep.startsWith('lead_step_')) return normalizedCurrentStep
  const normalizedOnboardingStage = String(currentStep ?? '').trim()
  return normalizedOnboardingStage || null
}

function deriveLeadStep(progress: unknown): number {
  if (!progress || typeof progress !== 'object' || Array.isArray(progress)) return 0
  const raw = progress as { completedLessons?: unknown; steps?: unknown }
  if (typeof raw.completedLessons === 'number' && Number.isFinite(raw.completedLessons)) {
    return raw.completedLessons
  }
  if (!Array.isArray(raw.steps)) return 0
  return raw.steps.filter((step) => {
    if (!step || typeof step !== 'object' || Array.isArray(step)) return false
    return (step as { completed?: unknown }).completed === true
  }).length
}

function resolveTrialDayLabel(startAt: Date | null | undefined) {
  if (!startAt) return 'TRIAL_DAY_1' as const
  const day = Math.max(1, Math.min(7, Math.floor((Date.now() - startAt.getTime()) / 86400000) + 1))
  switch (day) {
    case 7:
      return 'TRIAL_DAY_7' as const
    case 6:
      return 'TRIAL_DAY_6' as const
    case 5:
      return 'TRIAL_DAY_5' as const
    case 4:
      return 'TRIAL_DAY_4' as const
    case 3:
      return 'TRIAL_DAY_3' as const
    case 2:
      return 'TRIAL_DAY_2' as const
    default:
      return 'TRIAL_DAY_1' as const
  }
}

function buildLegacyPatch(snapshot: UserLifecycleSnapshot, trialStartsAt: Date | null) {
  switch (snapshot.state) {
    case 'trial':
      return { currentState: resolveTrialDayLabel(trialStartsAt), currentStep: 'START_FLOW' as const }
    case 'paid':
      return { currentState: 'ACTIVE' as const, currentStep: 'START_FLOW' as const }
    case 'expired':
      return { currentState: 'INACTIVE' as const, currentStep: 'PAYWALL' as const }
    default:
      return null
  }
}

function isFreshLeadMagnetDate(value: Date | null | undefined, now: Date) {
  return Boolean(value && now.getTime() - value.getTime() <= LEAD_MAGNET_TTL_MS)
}

export async function resolveUserLifecycle(userId: string, db: FlowDbClient = prisma): Promise<UserLifecycleSnapshot> {
  const now = new Date()
  const user = await db.user.findUnique({
    where: { id: userId },
    select: {
      focusPaid: true,
      onboardingStartedAt: true,
      currentStep: true,
      trialStartsAt: true,
      trialEndsAt: true,
      fivePointsEnrollment: {
        orderBy: { createdAt: 'desc' },
        take: 1,
        select: {
          createdAt: true,
          progress: true,
          completedAt: true,
        },
      },
      subscriptions: {
        orderBy: { createdAt: 'desc' },
        take: 1,
        select: {
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
          status: true,
          updatedAt: true,
        },
      },
    },
  })

  if (!user) {
    throw new Error('USER_NOT_FOUND')
  }

  const subscription = user.subscriptions[0] ?? null
  const leadEnrollment = user.fivePointsEnrollment[0] ?? null
  const latestLead = user.funnelLeads[0] ?? null
  const currentStep = resolveOnboardingStage(user.currentStep)
  const hasFreshLeadRecord = latestLead?.status === 'LEAD' && isFreshLeadMagnetDate(latestLead.updatedAt, now)
  const hasFreshLeadEnrollment = Boolean(
    leadEnrollment
    && !leadEnrollment.completedAt
    && isFreshLeadMagnetDate(leadEnrollment.createdAt, now),
  )
  const hasWaitlistFlag = isWaitlistFlag(currentStep) || isWaitlistFlag(user.currentStep)
  const isPaidActive =
    user.focusPaid === true || (
      subscription?.status === 'ACTIVE' &&
      (!subscription.currentPeriodEnd || subscription.currentPeriodEnd > now)
    )
  const isTrialActive =
    (!isPaidActive && subscription?.status === 'TRIAL' && !!subscription.trialEndsAt && subscription.trialEndsAt > now)
    || (!!user.trialStartsAt && !!user.trialEndsAt && user.trialEndsAt > now)
  const hadMentorAccess = Boolean(
    user.trialStartsAt ||
    user.trialEndsAt ||
    subscription?.trialEndsAt ||
    subscription?.currentPeriodEnd ||
    subscription?.status === 'ACTIVE' ||
    subscription?.status === 'TRIAL',
  )
  const hasExpiredAccess = !isPaidActive && !isTrialActive && hadMentorAccess
  const leadStep = deriveLeadStep(leadEnrollment?.progress)
  const hasCompletedLeadMagnet = Boolean(
    leadEnrollment?.completedAt ||
    ((leadEnrollment?.progress as { completed?: unknown } | null | undefined)?.completed === true),
  )
  const hasLeadMagnetFlow = hasFreshLeadRecord
    || hasFreshLeadEnrollment
    || (currentStep === 'lead_magnet' && (hasFreshLeadRecord || hasFreshLeadEnrollment))

  if (isPaidActive) {
    return {
      state: 'paid',
      flow: 'mentor',
      subscriptionStatus: 'active',
      subscriptionActive: true,
      currentStep: user.currentStep ?? 'START_FLOW',
      leadStep,
      hasLeadMagnetFlow,
      hasCompletedLeadMagnet,
      hasMentorAccess: true,
      hasExpiredAccess,
      hasWaitlistFlag,
      priority: 5,
    }
  }

  if (isTrialActive) {
    return {
      state: 'trial',
      flow: 'mentor',
      subscriptionStatus: 'trial',
      subscriptionActive: true,
      currentStep: user.currentStep ?? 'START_FLOW',
      leadStep,
      hasLeadMagnetFlow,
      hasCompletedLeadMagnet,
      hasMentorAccess: true,
      hasExpiredAccess,
      hasWaitlistFlag,
      priority: 4,
    }
  }

  if (hasExpiredAccess) {
    return {
      state: 'expired',
      flow: 'reengagement',
      subscriptionStatus: 'expired',
      subscriptionActive: false,
      currentStep: 'PAYWALL',
      leadStep,
      hasLeadMagnetFlow,
      hasCompletedLeadMagnet,
      hasMentorAccess: false,
      hasExpiredAccess: true,
      hasWaitlistFlag,
      priority: 3,
    }
  }

  if (hasCompletedLeadMagnet) {
    return {
      state: 'onboarding',
      flow: 'onboarding',
      subscriptionStatus: 'inactive',
      subscriptionActive: false,
      currentStep: user.currentStep ?? 'TRIAL_OFFER',
      leadStep,
      hasLeadMagnetFlow,
      hasCompletedLeadMagnet: true,
      hasMentorAccess: false,
      hasExpiredAccess: false,
      hasWaitlistFlag,
      priority: 2,
    }
  }

  if (user.onboardingStartedAt || (currentStep && currentStep !== 'lead_magnet' && !hasWaitlistFlag)) {
    return {
      state: 'onboarding',
      flow: 'onboarding',
      subscriptionStatus: 'inactive',
      subscriptionActive: false,
      currentStep: currentStep ?? 'ENTRY',
      leadStep,
      hasLeadMagnetFlow,
      hasCompletedLeadMagnet,
      hasMentorAccess: false,
      hasExpiredAccess: false,
      hasWaitlistFlag,
      priority: 2,
    }
  }

  if (hasLeadMagnetFlow) {
    return {
      state: 'lead_magnet',
      flow: 'lead-magnet',
      subscriptionStatus: 'inactive',
      subscriptionActive: false,
      currentStep: leadStep > 0 ? `lead_step_${leadStep}` : 'lead_step_0',
      leadStep,
      hasLeadMagnetFlow: true,
      hasCompletedLeadMagnet,
      hasMentorAccess: false,
      hasExpiredAccess: false,
      hasWaitlistFlag,
      priority: 1,
    }
  }

  return {
    state: 'guest',
    flow: null,
    subscriptionStatus: 'inactive',
    subscriptionActive: false,
    currentStep: user.currentStep ?? 'LINK_TELEGRAM',
    leadStep,
    hasLeadMagnetFlow,
    hasCompletedLeadMagnet,
    hasMentorAccess: false,
    hasExpiredAccess: false,
    hasWaitlistFlag,
    priority: 0,
  }
}

export async function canRunLeadMagnetFlow(userId: string, db: FlowDbClient = prisma) {
  const snapshot = await resolveUserLifecycle(userId, db)
  return snapshot.state === 'guest' || snapshot.state === 'lead_magnet'
}

export async function syncLifecycleForUser(userId: string, db: FlowDbClient = prisma) {
  const staleLeadCutoff = new Date(Date.now() - LEAD_MAGNET_TTL_MS)
  await db.funnelLead.updateMany({
    where: {
      userId,
      status: 'LEAD',
      updatedAt: { lt: staleLeadCutoff },
    },
    data: {
      status: 'CHURNED',
      notes: 'archived_after_lead_magnet_ttl',
    },
  })

  const snapshot = await resolveUserLifecycle(userId, db)
  const now = new Date()
  let archivedLeadCount = 0
  if (snapshot.state === 'trial') {
    const archived = await db.funnelLead.updateMany({
      where: { userId, status: 'LEAD' },
      data: { status: 'TRIAL', convertedAt: now, notes: 'archived_after_trial_start' },
    })
    archivedLeadCount = archived.count
  } else if (snapshot.state === 'paid') {
    const archived = await db.funnelLead.updateMany({
      where: { userId, status: { in: ['LEAD', 'TRIAL'] } },
      data: { status: 'CONVERTED', convertedAt: now, notes: 'archived_after_paid_activation' },
    })
    archivedLeadCount = archived.count
  }

  const user = await db.user.findUnique({
    where: { id: userId },
    select: {
      trialStartsAt: true,
      telegramChatId: true,
      telegramLinks: {
        where: { isActive: true, chatId: { not: null } },
        orderBy: { updatedAt: 'desc' },
        take: 1,
        select: { chatId: true },
      },
    },
  })
  const legacyPatch = buildLegacyPatch(snapshot, user?.trialStartsAt ?? null)
  const nowStage = mapLifecycleToFunnelStage(snapshot.state)
  await db.user.update({
    where: { id: userId },
    data: {
      ...(legacyPatch ?? {}),
      funnelStage: nowStage,
      funnelUpdatedAt: now,
    },
  })
  if (db === prisma) {
    await cacheDel(`funnel:${userId}`)
  }

  const leadChatId = user?.telegramLinks[0]?.chatId ?? user?.telegramChatId ?? null
  if (
    archivedLeadCount > 0
    && leadChatId
    && (snapshot.state === 'trial' || snapshot.state === 'paid')
  ) {
    await stopLeadMagnet(String(leadChatId)).catch(() => null)
  }

  return snapshot
}

export async function isNotificationAllowedForUser(event: NotificationEvent, userId: string, db: FlowDbClient = prisma) {
  const snapshot = await resolveUserLifecycle(userId, db)
  const user = await db.user.findUnique({
    where: { id: userId },
    select: { role: true, activeRole: true },
  })

  if (!isNotificationRoleAllowed(event, user?.role, user?.activeRole)) {
    return false
  }

  const isActiveMentorState = snapshot.state === 'trial' || snapshot.state === 'paid'
  const isMentorKnownState = isActiveMentorState || snapshot.state === 'expired'

  switch (event) {
    case NotificationEvent.DAILY_MORNING_DUE:
    case NotificationEvent.DAILY_EVENING_DUE:
    case NotificationEvent.AI_INACTIVE:
    case NotificationEvent.STREAK_RISK:
    case NotificationEvent.STREAK_MILESTONE:
    case NotificationEvent.LEVEL_UP:
    case NotificationEvent.NEAR_LEVEL_UP:
    case NotificationEvent.WEEKLY_SUMMARY:
      return isActiveMentorState
    case NotificationEvent.SUBSCRIPTION_EXPIRING:
      return isActiveMentorState
    case NotificationEvent.SUBSCRIPTION_EXPIRED:
    case NotificationEvent.POST_TRIAL_REPORTS:
      return snapshot.state === 'expired'
    case NotificationEvent.STREAK_BROKEN:
      return isMentorKnownState
    default:
      return true
  }
}
