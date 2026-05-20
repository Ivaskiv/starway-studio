import { prisma } from '../../db/client.js'
import { resolveUserLifecycle } from '../../modules/flow-control/service.js'
import { getAccessControlState, getUserProductAccesses } from '../../modules/access/service.js'
import type {
  AccessMode,
  BehavioralAccessResolution,
  BehavioralResource,
  ProductStage,
} from '../../modules/access/types.js'
import type { AuthenticatedRequest } from '../../types/globalTypes.js'
import type { NextFunction, Response } from 'express'

type TimestampSource = Date | string | null | undefined

type ContinuitySignals = {
  hasWheel: boolean
  hasDaily: boolean
  hasGoals: boolean
  hasWeeklyReport: boolean
  hasZoom: boolean
  hasMemory: boolean
  hasMicroTask: boolean
  hasMentorContext: boolean
  hasFocusParticipation: boolean
  lastActivityAt: Date | null
  inactivityDays: number | null
}

const CONTINUITY_READ_RESOURCES: ReadonlySet<BehavioralResource> = new Set([
  'wheel_history',
  'wheel_latest',
  'wheel_cooldown',
  'wheel_analytics',
  'daily_history',
  'daily_today',
  'goals',
  'goals_primary',
  'progress',
  'continuity_artifacts',
  'weekly_reports',
])

const PREMIUM_WRITE_RESOURCES: ReadonlySet<BehavioralResource> = new Set([
  'ai_chat',
  'ai_generation',
  'daily_write',
  'wheel_write',
  'goals_write',
  'progress_write',
  'mentor_chat',
])

function toTimeValue(value: TimestampSource): number | null {
  if (!value) return null
  const date = value instanceof Date ? value : new Date(value)
  const time = date.getTime()
  return Number.isFinite(time) ? time : null
}

function maxDate(...values: Array<TimestampSource>): Date | null {
  const timestamps = values
    .map(toTimeValue)
    .filter((value): value is number => typeof value === 'number')

  if (!timestamps.length) return null
  return new Date(Math.max(...timestamps))
}

function diffInDays(value: Date | null, now = new Date()) {
  if (!value) return null
  return Math.max(0, Math.floor((now.getTime() - value.getTime()) / 86_400_000))
}

async function gatherContinuitySignals(userId: string): Promise<ContinuitySignals> {
  const [
    wheel,
    daily,
    goals,
    weekly,
    zoom,
    memory,
    mentor,
    microTask,
  ] = await Promise.all([
    prisma.userBalanceEntry.findFirst({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      select: { createdAt: true },
    }),
    prisma.dailyEntry.findFirst({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      select: { createdAt: true },
    }),
    prisma.goalsSet.findFirst({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      select: { createdAt: true },
    }),
    prisma.weeklyReport.findFirst({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      select: { createdAt: true },
    }),
    prisma.zoomSessionAttendee.findFirst({
      where: { userId, attended: true },
      orderBy: { createdAt: 'desc' },
      select: {
        createdAt: true,
        session: {
          select: {
            topic: true,
            scheduledAt: true,
          },
        },
      },
    }),
    prisma.userMemory.findUnique({
      where: { userId },
      select: { createdAt: true, updatedAt: true },
    }),
    prisma.userAIMentor.findFirst({
      where: { userId },
      orderBy: { lastInteractionAt: 'desc' },
      select: {
        lastInteractionAt: true,
        updatedAt: true,
        stage: true,
        realGoal: true,
        recommendedFocus: true,
        insight: true,
      },
    }),
    prisma.microTask.findFirst({
      where: { userId },
      orderBy: { updatedAt: 'desc' },
      select: {
        createdAt: true,
        updatedAt: true,
        completedAt: true,
        isCompleted: true,
      },
    }),
  ])

  const hasWheel = Boolean(wheel)
  const hasDaily = Boolean(daily)
  const hasGoals = Boolean(goals)
  const hasWeeklyReport = Boolean(weekly)
  const hasZoom = Boolean(zoom)
  const hasMemory = Boolean(memory)
  const hasMicroTask = Boolean(microTask)
  const hasMentorContext = Boolean(mentor)
  const hasFocusParticipation = Boolean(zoom || goals || wheel || daily)
  const lastActivityAt = maxDate(
    wheel?.createdAt,
    daily?.createdAt,
    goals?.createdAt,
    weekly?.createdAt,
    zoom?.createdAt,
    memory?.updatedAt ?? memory?.createdAt,
    mentor?.lastInteractionAt ?? mentor?.updatedAt,
    microTask?.updatedAt ?? microTask?.createdAt ?? microTask?.completedAt,
  )

  return {
    hasWheel,
    hasDaily,
    hasGoals,
    hasWeeklyReport,
    hasZoom,
    hasMemory,
    hasMicroTask,
    hasMentorContext,
    hasFocusParticipation,
    lastActivityAt,
    inactivityDays: diffInDays(lastActivityAt),
  }
}

function hasActiveAccess(accessControl: Awaited<ReturnType<typeof getAccessControlState>> | null, lifecycleState: string) {
  return Boolean(
    accessControl?.hasSubscription
    || lifecycleState === 'trial'
    || lifecycleState === 'paid',
  )
}

function isAdvancedContinuity(signal: ContinuitySignals) {
  return signal.hasWeeklyReport || signal.hasZoom || signal.hasMentorContext
}

function isCoreContinuity(signal: ContinuitySignals) {
  return signal.hasWheel || signal.hasDaily || signal.hasGoals || signal.hasMicroTask || signal.hasMemory || signal.hasWeeklyReport || signal.hasZoom || signal.hasMentorContext
}

function determineStage(input: {
  lifecycleState: string
  accessControlHasSubscription: boolean
  continuity: ContinuitySignals
  hasPersonalProgramAccess: boolean
  hasMentorship: boolean
}): ProductStage {
  const { lifecycleState, accessControlHasSubscription, continuity, hasPersonalProgramAccess, hasMentorship } = input

  if (hasPersonalProgramAccess || hasMentorship) {
    return 'personal_program'
  }

  if (isAdvancedContinuity(continuity) && accessControlHasSubscription) {
    return 'strategic'
  }

  if (accessControlHasSubscription && isCoreContinuity(continuity)) {
    return 'absystem_ai'
  }

  if (lifecycleState === 'trial' || lifecycleState === 'paid') {
    return accessControlHasSubscription ? 'absystem_ai' : 'focus'
  }

  if (lifecycleState === 'expired') {
    return continuity.inactivityDays != null && continuity.inactivityDays >= 14 ? 'returning' : 'paused'
  }

  if (lifecycleState === 'onboarding' || lifecycleState === 'lead_magnet') {
    return continuity.hasFocusParticipation ? 'focus' : 'test'
  }

  if (isCoreContinuity(continuity)) {
    return continuity.inactivityDays != null && continuity.inactivityDays >= 7 ? 'returning' : 'focus'
  }

  if (lifecycleState === 'guest') {
    return continuity.hasFocusParticipation ? 'test' : 'unknown'
  }

  return 'unknown'
}

function resolveMode(resource: BehavioralResource, accessHasSubscription: boolean, hasContinuityArtifacts: boolean): AccessMode {
  if (PREMIUM_WRITE_RESOURCES.has(resource)) {
    return accessHasSubscription ? 'ACTIVE' : 'LOCKED'
  }

  if (accessHasSubscription) {
    return 'ACTIVE'
  }

  if (CONTINUITY_READ_RESOURCES.has(resource) && hasContinuityArtifacts) {
    return 'CONTINUITY'
  }

  return 'LOCKED'
}

function lockMessage(resource: BehavioralResource, stage: ProductStage, hasContinuityArtifacts: boolean) {
  if (hasContinuityArtifacts) {
    if (PREMIUM_WRITE_RESOURCES.has(resource)) {
      return 'Ми зберегли твій попередній рух. Щоб продовжити тут, потрібно відновити доступ.'
    }

    return 'Ми зберегли твої попередні точки руху. Показую лише читання історії без активних дій.'
  }

  if (stage === 'unknown') {
    return 'Щоб відкрити цю частину, спочатку потрібно повернутись у відомий контекст.'
  }

  return 'Щоб відкрити цю частину, потрібно відновити доступ.'
}

export async function resolveUserProductStage(userId: string): Promise<ProductStage> {
  const lifecycle = await resolveUserLifecycle(userId).catch(() => null)
  if (!lifecycle) return 'unknown'

  const accessControl = await getAccessControlState(userId).catch(() => null)
  const continuity = await gatherContinuitySignals(userId)
  const productAccesses = await getUserProductAccesses(userId).catch(() => [])
  const hasPersonalProgramAccess = productAccesses.some((item) => item.product === 'AI_MENTOR' && item.role === 'ADMIN')
    || productAccesses.some((item) => item.product === 'AI_ASSISTANT' && item.role === 'ADMIN')
  const hasMentorship = lifecycle.state === 'paid' && accessControl?.hasSubscription === true && continuity.hasMentorContext

  return determineStage({
    lifecycleState: lifecycle.state,
    accessControlHasSubscription: Boolean(accessControl?.hasSubscription),
    continuity,
    hasPersonalProgramAccess,
    hasMentorship,
  })
}

export async function resolveBehavioralAccess(
  userId: string,
  resource: BehavioralResource,
): Promise<BehavioralAccessResolution> {
  const lifecycle = await resolveUserLifecycle(userId).catch(() => null)
  const accessControl = await getAccessControlState(userId).catch(() => null)
  const continuity = await gatherContinuitySignals(userId)
  const productAccesses = await getUserProductAccesses(userId).catch(() => [])

  const hasPersonalProgramAccess = productAccesses.some((item) => item.product === 'AI_MENTOR' && item.role === 'ADMIN')
    || productAccesses.some((item) => item.product === 'AI_ASSISTANT' && item.role === 'ADMIN')
  const hasMentorship = lifecycle?.state === 'paid' && accessControl?.hasSubscription === true && continuity.hasMentorContext
  const stage = determineStage({
    lifecycleState: lifecycle?.state ?? 'guest',
    accessControlHasSubscription: Boolean(accessControl?.hasSubscription),
    continuity,
    hasPersonalProgramAccess,
    hasMentorship,
  })
  const hasActiveAccess = Boolean(accessControl?.hasSubscription || lifecycle?.state === 'trial' || lifecycle?.state === 'paid')
  const hasContinuityArtifacts = isCoreContinuity(continuity)
  const mode = resolveMode(resource, hasActiveAccess, hasContinuityArtifacts)

  return {
    mode,
    stage,
    resource,
    hasContinuityArtifacts,
    hasActiveAccess,
    reason: mode === 'ACTIVE'
      ? 'active_access'
      : mode === 'CONTINUITY'
        ? 'continuity_access'
        : 'locked',
  }
}

export function continuityAccessPolicy(resource: BehavioralResource) {
  return {
    resource,
    readOnly: CONTINUITY_READ_RESOURCES.has(resource),
    premiumOnly: PREMIUM_WRITE_RESOURCES.has(resource),
  }
}

export function requireBehavioralReadAccess(resource: BehavioralResource) {
  return async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    if (!req.user?.id) {
      return res.status(401).json({ error: 'unauthorized' })
    }

    const access = await resolveBehavioralAccess(req.user.id, resource)
    if (access.mode === 'ACTIVE' || access.mode === 'CONTINUITY') {
      return next()
    }

    return res.status(403).json({
      error: 'forbidden',
      reason: 'SUBSCRIPTION_REQUIRED',
      message: lockMessage(resource, access.stage, access.hasContinuityArtifacts),
      accessMode: access.mode,
      productStage: access.stage,
      resource,
    })
  }
}
