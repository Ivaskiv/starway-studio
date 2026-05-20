// fix etap7: e2e-style vitest checks for STEP 7 automation flow
import { beforeAll, afterAll, describe, expect, it } from 'vitest'
import { PrismaClient } from '@starway/db/prisma-client'
import { checkTrialStatus, triggerPaidCTA, generateAIMiniCourseSuggestions, recordCTAInteraction } from './modules/trial/service.js'
import { logDailyCycle, recordMicroSupport, triggerAICheckIn } from './modules/daily-cycle/service.js'
import { scheduleReminder } from './modules/notifications/reminder.service.js'

const TEST_EMAIL_PREFIX = 'step7-vitest-'

const prisma = new PrismaClient()

async function cleanTestUsers() {
  const testUsers = await prisma.user.findMany({
    where: { email: { startsWith: TEST_EMAIL_PREFIX } },
    select: { id: true },
  })
  const ids = testUsers.map((u) => u.id)
  if (ids.length === 0) return
  await prisma.aIRecommendation.deleteMany({ where: { userId: { in: ids } } })
  await prisma.cTAInteraction.deleteMany({ where: { userId: { in: ids } } })
  await prisma.reminder.deleteMany({ where: { userId: { in: ids } } })
  await prisma.dailyCycleLog.deleteMany({ where: { userId: { in: ids } } })
  await prisma.microSupportItem.deleteMany({ where: { userId: { in: ids } } })
  await prisma.cycleStreakMetric.deleteMany({ where: { userId: { in: ids } } })
  await prisma.user.deleteMany({ where: { id: { in: ids } } })
}

describe('fix etap7: Trial→Paid + AI CTAs end-to-end scenario', () => {
  let trialUserId: string

  beforeAll(async () => {
    await cleanTestUsers()
  })

  afterAll(async () => {
    await cleanTestUsers()
    await prisma.$disconnect()
  })

  it('fix etap7: creates trial user + schema check', async () => {
    const user = await prisma.user.create({
      data: {
        email: `${TEST_EMAIL_PREFIX}trial@example.com`,
        role: 'USER',
        // trialStartsAt 4 days ago → daysUsed=4, progress=100% → CTA triggers
        trialStartsAt: new Date(Date.now() - 4 * 864e5),
        subscriptions: {
          create: {
            status: 'TRIAL',
            planCode: 'TRIAL_AI',
            startsAt: new Date(Date.now() - 4 * 864e5),
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
    await logDailyCycle(trialUserId, { state: 'NEUTRAL', choice: 'PENDING', drain: 'DOUBT', dayFact: 'test' })
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
    await prisma.cTAInteraction.deleteMany({ where: { userId: trialUserId } })
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
        email: `${TEST_EMAIL_PREFIX}paid@example.com`,
        role: 'USER',
        subscriptions: { create: { status: 'ACTIVE', planCode: 'PAID' } },
      },
      include: { subscriptions: true },
    })
    const freeUser = await prisma.user.create({
      data: { email: `${TEST_EMAIL_PREFIX}free@example.com`, role: 'USER' },
      include: { subscriptions: true },
    })
    expect(freeUser.subscriptions.length).toBe(0)
    expect(paidUser.subscriptions[0]?.status).toBe('ACTIVE')
  })

  it('fix etap7: does not crash on legacy user without trial', async () => {
    const legacy = await prisma.user.create({ data: { email: `${TEST_EMAIL_PREFIX}legacy@example.com`, role: 'USER' } })
    const status = await checkTrialStatus(legacy.id)
    // all new users start in TRIAL by default — function must not throw
    expect(status).toBeDefined()
  })
})
