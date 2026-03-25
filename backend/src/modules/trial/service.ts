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
import type { TrialStatus }                                          from './types.js'

// ─────────────────────────────────────────────
// CONSTANTS
// ─────────────────────────────────────────────

const TRIAL_DAYS        = 7
const MS_PER_DAY        = 1000 * 60 * 60 * 24
const CTA_TRIGGER_PCT   = 80   // % прогресу тріалу для CTA
const CTA_DELAY_MS      = 60 * 60 * 1000   // 1 год до нагадування

// ─────────────────────────────────────────────
// START TRIAL
// ─────────────────────────────────────────────

export async function startTrial(userId: string): Promise<User> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { email: true, trialStartsAt: true, role: true },
  })

  if (user?.email?.startsWith('telegram-guest-')) {
    throw Object.assign(new Error('EMAIL_REQUIRED'), { code: 'EMAIL_REQUIRED' })
  }

  if (user?.trialStartsAt && user?.role !== 'SUPERADMIN') {
    throw new Error('TRIAL_ALREADY_USED')
  }

  return prisma.user.update({
    where: { id: userId },
    data: {
      trialStartsAt: new Date(),
      trialEndsAt:   new Date(Date.now() + TRIAL_DAYS * MS_PER_DAY),
    },
  })
}

// ─────────────────────────────────────────────
// GET TRIAL STATUS (повний)
// ─────────────────────────────────────────────

export async function getTrialStatus(userId: string): Promise<TrialStatus> {
  const [user, activeSub, mirrors] = await Promise.all([
    prisma.user.findUnique({
      where:  { id: userId },
      select: { trialStartsAt: true, trialEndsAt: true },
    }),
    prisma.subscription.findFirst({
      where:   { userId, status: { in: ['TRIAL', 'ACTIVE'] } },
      orderBy: { createdAt: 'desc' },
    }),
    prisma.trialMirror.findMany({
      where: { userId },
      select: { day: true },
    }),
  ])

  const trialStart = user?.trialStartsAt
  const trialEnd   = activeSub?.trialEndsAt ?? user?.trialEndsAt
  const now        = new Date()

  if (!trialStart) {
    return {
      userId,
      isActive:      false,
      isPaid:        activeSub?.status === 'ACTIVE',
      startedAt:     null,
      endsAt:        null,
      daysLeft:      0,
      currentDay:    0,
      progress:      0,
      status:        activeSub?.status ?? null,
      hasDay4Mirror: false,
      hasDay7Mirror: false,
    }
  }

  const isActive  = trialEnd ? trialEnd > now : false
  const currentDay = Math.min(TRIAL_DAYS, Math.max(1, Math.floor((now.getTime() - trialStart.getTime()) / MS_PER_DAY) + 1))
  const daysLeft  = isActive ? Math.max(0, TRIAL_DAYS - currentDay) : 0
  const progress  = trialEnd
    ? Math.min(100, Math.max(0, Math.round(
        ((now.getTime() - trialStart.getTime()) / (trialEnd.getTime() - trialStart.getTime())) * 100
      )))
    : 0

  return {
    userId,
    isActive,
    isPaid:        activeSub?.status === 'ACTIVE',
    startedAt:     trialStart,
    endsAt:        trialEnd ?? null,
    daysLeft,
    currentDay,
    progress,
    status:        activeSub?.status ?? null,
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
