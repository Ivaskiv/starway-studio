// fix etap7: e2e-style vitest checks for STEP 7 automation flow
import { beforeAll, afterAll, describe, expect, it } from 'vitest'
import { PrismaClient } from '@starway/db/prisma-client'
import { checkTrialStatus, triggerPaidCTA, generateAIMiniCourseSuggestions, recordCTAInteraction } from '../modules/trial/trial.service.js'
import { logDailyCycle, recordMicroSupport, triggerAICheckIn } from '../modules/dailyCycle/dailyCycle.service.js'
import { scheduleReminder } from '../modules/notifications/reminder.service.js'

const prisma = new PrismaClient()

describe('fix etap7: Trial→Paid + AI CTAs end-to-end scenario', () => {
  let trialUserId: string

  beforeAll(async () => {
    await prisma.dailyCycleLog.deleteMany({})
    await prisma.microSupportItem.deleteMany({})
    await prisma.cycleStreakMetric.deleteMany({})
    await prisma.reminder.deleteMany({})
    await prisma.aiRecommendation.deleteMany({})
    await prisma.cTAInteraction.deleteMany({})
  })

  afterAll(async () => {
    await prisma.$disconnect()
  })

  it('fix etap7: creates trial user + schema check', async () => {
    const user = await prisma.user.create({
      data: {
        email: 'step7-trial@example.com',
        role: 'USER',
        subscriptions: {
          create: {
            status: 'TRIAL',
            planCode: 'TRIAL_AI',
            startsAt: new Date(Date.now() - 2 * 864e5),
            trialEndsAt: new Date(Date.now() + 10 * 864e5),
          },
        },
      },
      include: { subscriptions: true },
    })
    trialUserId = user.id
    expect(user.subscriptions[0]?.status).toBe('TRIAL')
  })

  it('fix etap7: runs trial progress + CTA reminders', async () => {
    await logDailyCycle(trialUserId, { state: 'SAD', choice: 'PENDING', drain: 'HIGH', dayFact: 'test' })
    await recordMicroSupport(trialUserId, 'check-in', { note: 'Step 7 support' })
    await triggerAICheckIn(trialUserId)
    const status = await checkTrialStatus(trialUserId)
    expect(status?.status).toBe('TRIAL')
    const cta = await triggerPaidCTA(trialUserId)
    expect(cta).not.toBeNull()
    const reminder = await prisma.reminder.findFirst({ where: { userId: trialUserId, type: 'FUNNEL' } })
    expect(reminder).not.toBeNull()
  })

  it('fix etap7: tracks AI mini-course suggestions', async () => {
    const suggestion = await generateAIMiniCourseSuggestions(trialUserId)
    expect(suggestion).toBeDefined()
    expect(suggestion.moduleType).toBe('MINI_COURSE')
  })

  it('fix etap7: records CTA interactions', async () => {
    await recordCTAInteraction(trialUserId, 'TELEGRAM', 'mini-course')
    await recordCTAInteraction(trialUserId, 'MINI_APP', 'funnel')
    const interactions = await prisma.cTAInteraction.findMany({ where: { userId: trialUserId } })
    expect(interactions.length).toBe(2)
  })

  it('fix etap7: reminder pipeline integration check', async () => {
    await scheduleReminder({ userId: trialUserId, type: 'AI_CHECKIN', nextReminderAt: new Date(), metadata: { channel: 'telegram' } })
    const reminder = await prisma.reminder.findFirst({ where: { userId: trialUserId, type: 'AI_CHECKIN' } })
    expect(reminder).not.toBeNull()
  })

  it('fix etap7: free/paid UI state safe for legacy', async () => {
    const paidUser = await prisma.user.create({
      data: {
        email: 'paid@example.com',
        role: 'USER',
        subscriptions: { create: { status: 'ACTIVE', planCode: 'PAID' } },
      },
      include: { subscriptions: true },
    })
    const freeUser = await prisma.user.create({ data: { email: 'free@example.com', role: 'USER' } })
    expect(freeUser.subscriptions.length).toBe(0)
    expect(paidUser.subscriptions[0]?.status).toBe('ACTIVE')
  })

  it('fix etap7: does not crash on legacy user without trial', async () => {
    const legacy = await prisma.user.create({ data: { email: 'legacy@example.com', role: 'USER' } })
    const status = await checkTrialStatus(legacy.id)
    expect(status).toBeNull()
  })
})
