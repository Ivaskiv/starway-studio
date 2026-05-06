// backend/src/modules/trial/service.ts

import { prisma }                                                    from '../../db/client.js'
import {
  CTAType,
  DailyState,
  ReminderType,
  StageType,
  User,
} from '@starway/db/prisma-client'
import { scheduleReminder }                                          from '../notifications/reminder.service.js'
import { syncLifecycleForUser }                                      from '../flow-control/service.js'
import { invalidateFunnelStage }                                     from '../../lib/funnel/getUserFunnelStage.js'
import type { TrialStatus }                                          from './types.js'

// ─────────────────────────────────────────────
// CONSTANTS
// ─────────────────────────────────────────────

const TRIAL_DAYS        = 4
const MS_PER_DAY        = 1000 * 60 * 60 * 24
const CTA_TRIGGER_PCT   = 80   // % прогресу тріалу для CTA
const CTA_DELAY_MS      = 60 * 60 * 1000   // 1 год до нагадування

function clampInt(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, Math.floor(value)))
}

function buildSafeTrialStatus(userId: string): TrialStatus {
  return {
    userId,
    isActive: true,
    isPaid: false,
    startedAt: null,
    endsAt: null,
    daysLeft: TRIAL_DAYS,
    currentDay: 1,
    daysUsed: 0,
    daysTotal: TRIAL_DAYS,
    onboardingCompleted: false,
    dailyCycleStarted: false,
    progress: 0,
    status: 'TRIAL',
    hasDay4Mirror: false,
    hasDay7Mirror: false,
  }
}

function isMissingUserColumn(error: unknown, columnName: string) {
  if (!error || typeof error !== 'object') return false
  const candidate = error as { code?: string; meta?: { column?: string } }
  return candidate.code === 'P2022' && String(candidate.meta?.column ?? '') === `User.${columnName}`
}

async function findUserCompat(userId: string): Promise<User | null> {
  try {
    return await prisma.user.findUnique({
      where: { id: userId },
    })
  } catch (error) {
    if (!isMissingUserColumn(error, 'onboardingDay')) throw error

    const rows = await prisma.$queryRawUnsafe<User[]>(
      'SELECT * FROM "User" WHERE "id" = $1 LIMIT 1',
      userId,
    )
    return rows[0] ?? null
  }
}

// ─────────────────────────────────────────────
// START TRIAL
// ─────────────────────────────────────────────

export async function startTrial(userId: string): Promise<User> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { email: true, trialStartsAt: true, trialEndsAt: true, role: true },
  })

  if (user?.email?.startsWith('telegram-guest-')) {
    throw Object.assign(new Error('EMAIL_REQUIRED'), { code: 'EMAIL_REQUIRED' })
  }

  if (user?.trialStartsAt && user?.role !== 'SUPERADMIN') {
    if (user.trialEndsAt && user.trialEndsAt > new Date()) {
      const activeTrialUser = await findUserCompat(userId)
      if (!activeTrialUser) {
        throw new Error('TRIAL_ALREADY_USED')
      }
      return activeTrialUser
    }

    throw new Error('TRIAL_ALREADY_USED')
  }

  const trialStartsAt = new Date()
  const trialEndsAt = new Date(Date.now() + TRIAL_DAYS * MS_PER_DAY)

  let updated: User | null = null
  try {
    updated = await prisma.user.update({
      where: { id: userId },
      data: {
        trialStartsAt,
        trialEndsAt,
      },
    })
  } catch (error) {
    if (!isMissingUserColumn(error, 'onboardingDay')) throw error

    await prisma.$executeRawUnsafe(
      'UPDATE "User" SET "trialStartsAt" = $1, "trialEndsAt" = $2 WHERE "id" = $3',
      trialStartsAt,
      trialEndsAt,
      userId,
    )

    updated = await findUserCompat(userId)
  }

  if (!updated) {
    throw new Error('TRIAL_START_FAILED')
  }
  await syncLifecycleForUser(userId)
  await invalidateFunnelStage(userId)
  return updated
}

// ─────────────────────────────────────────────
// GET TRIAL STATUS (повний)
// ─────────────────────────────────────────────

export async function getTrialStatus(userId: string): Promise<TrialStatus> {
  const [user, activeSub, mirrors, latestDailyCycleLog] = await Promise.all([
    prisma.user.findUnique({
      where:  { id: userId },
      select: {
        createdAt: true,
        onboardingStartedAt: true,
        onboardingStage: true,
        trialStartsAt: true,
        trialEndsAt: true,
      },
    }),
    prisma.subscription.findFirst({
      where:   { userId, status: { in: ['TRIAL', 'ACTIVE'] } },
      orderBy: { createdAt: 'desc' },
    }),
    prisma.trialMirror.findMany({
      where: { userId },
      select: { day: true },
    }),
    prisma.dailyCycleLog.findFirst({
      where: { userId },
      orderBy: { date: 'asc' },
      select: { id: true, date: true },
    }),
  ])

  if (!user) {
    return buildSafeTrialStatus(userId)
  }

  const now = new Date()
  const daysTotal = Math.max(1, TRIAL_DAYS)
  const startedAt = user.trialStartsAt ?? user.onboardingStartedAt ?? user.createdAt
  const rawDaysUsed = startedAt
    ? Math.max(0, Math.floor((now.getTime() - startedAt.getTime()) / MS_PER_DAY))
    : 0
  const daysUsed = clampInt(rawDaysUsed, 0, daysTotal)
  const currentDay = clampInt(daysUsed + 1, 1, daysTotal)
  const onboardingCompleted = user.onboardingStage === 'COMPLETED'
  const dailyCycleStarted = Boolean(latestDailyCycleLog)
  const canExpireByBusinessRule = onboardingCompleted && dailyCycleStarted
  const isPaid = activeSub?.status === 'ACTIVE'
  const trialExpiredByDays = rawDaysUsed >= daysTotal
  const isActive = !isPaid && (!canExpireByBusinessRule || !trialExpiredByDays)
  const daysLeft = isActive
    ? Math.max(1, daysTotal - daysUsed)
    : Math.max(0, daysTotal - daysUsed)
  const progress = Math.min(100, Math.max(0, Math.round((daysUsed / daysTotal) * 100)))
  const endsAt = canExpireByBusinessRule && startedAt
    ? new Date(startedAt.getTime() + daysTotal * MS_PER_DAY)
    : null
  const status = isPaid
    ? 'ACTIVE'
    : isActive
      ? 'TRIAL'
      : 'EXPIRED'

  return {
    userId,
    isActive,
    isPaid,
    startedAt,
    endsAt,
    daysLeft,
    currentDay,
    daysUsed,
    daysTotal,
    onboardingCompleted,
    dailyCycleStarted,
    progress,
    status,
    hasDay4Mirror: mirrors.some(m => m.day === 4),
    hasDay7Mirror: mirrors.some(m => m.day === 7),
  }
}

// ─────────────────────────────────────────────
// CHECK TRIAL STATUS (lightweight для CTA)
// ─────────────────────────────────────────────

export async function checkTrialStatus(userId: string) {
  const status = await getTrialStatus(userId)
  if (!status.isActive && status.status !== 'TRIAL') return null
  return {
    status:        status.status,
    remainingDays: status.daysLeft,
    progress:      status.progress,
  }
}

// ─────────────────────────────────────────────
// GENERATE TRIAL MIRROR (day 4 / day 7)
// ─────────────────────────────────────────────

export async function generateTrialMirror(userId: string, day: number) {
  const since = new Date(Date.now() - (day <= 4 ? 3 : 6) * MS_PER_DAY)

  const entries = await prisma.dailyEntry.findMany({
    where: { userId, date: { gte: since } },
    orderBy: { date: 'asc' },
  })

  // TODO: замінити на реальний AI-виклик через openai
  const analysis = `AI mirror for day ${day}: ${entries.length} entries analyzed`
  return analysis
}

// ─────────────────────────────────────────────
// TRIGGER PAID CTA (конверсія тріал → платна)
// ─────────────────────────────────────────────

export async function triggerPaidCTA(userId: string) {
  const trial = await checkTrialStatus(userId)
  if (!trial || trial.status !== 'TRIAL' || trial.progress < CTA_TRIGGER_PCT) return null

  await Promise.all([
    recordCTAInteraction(userId, CTAType.TELEGRAM, 'trial_conversion'),
    scheduleReminder({
      userId,
      type:            ReminderType.FUNNEL,
      nextReminderAt:  new Date(Date.now() + CTA_DELAY_MS),
      metadata:        { reason: 'trial_conversion', progress: trial.progress },
    }),
  ])

  return trial
}

// ─────────────────────────────────────────────
// AI MINI-COURSE SUGGESTIONS
// ─────────────────────────────────────────────

export async function generateAIMiniCourseSuggestions(userId: string) {
  const [supports, lastCycle] = await Promise.all([
    prisma.microSupportItem.findMany({
      where:   { userId },
      orderBy: { createdAt: 'desc' },
      take:    5,
    }),
    prisma.dailyCycleLog.findFirst({
      where:   { userId },
      orderBy: { date: 'desc' },
    }),
  ])

  const state          = (lastCycle?.state ?? DailyState.NEUTRAL) as DailyState
  const suggestedCourse = state === DailyState.FEAR ? 'resilience' : 'clarity'

  return prisma.aIRecommendation.create({
    data: {
      userId,
      moduleId:   suggestedCourse,
      moduleType: StageType.MINI_COURSE,
      reason:     `state:${state}, microSupport:${supports.length}`,
    },
  })
}

// ─────────────────────────────────────────────
// RECORD CTA INTERACTION
// ─────────────────────────────────────────────

export async function recordCTAInteraction(
  userId:   string,
  type:     CTAType,
  moduleId?: string,
) {
  return prisma.cTAInteraction.create({
    data: { userId, type, moduleId },
  })
}
