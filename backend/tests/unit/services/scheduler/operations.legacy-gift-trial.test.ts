import { beforeEach, describe, expect, it, vi } from 'vitest'

const sentTemplateKeys = new Set<string>()

const mockState = vi.hoisted(() => {
  let now = new Date('2026-08-10T17:00:00.000Z')
  const users: any[] = []
  const subscriptions: any[] = []

  return {
    users,
    subscriptions,
    lifecycleCalls: [] as Array<{ event: string; templateKey: string; userId: string; payload: Record<string, unknown> }>,
    emitCalls: [] as Array<{ event: string; userId: string; payload: Record<string, unknown> }>,
    mentorAccessUsers: new Set<string>(),
    reset() {
      users.length = 0
      subscriptions.length = 0
      this.lifecycleCalls.length = 0
      this.emitCalls.length = 0
      this.mentorAccessUsers.clear()
      sentTemplateKeys.clear()
      now = new Date('2026-08-10T17:00:00.000Z')
      vi.setSystemTime(now)
    },
    setNow(value: string) {
      now = new Date(value)
      vi.setSystemTime(now)
    },
  }
})

function seedTrialUser(input: {
  id: string
  trialExpiresAt: string
  grantSource?: 'post_zoom' | 'manual'
  weeklySummary?: string | null
  focusExpiresAt?: string | null
  legacyGift?: boolean
  paidAbsystem?: boolean
  telegramEnabled?: boolean
  weeklySummaryEnabled?: boolean
  subscriptionEnabled?: boolean
}) {
  mockState.users.push({
    id: input.id,
    deletedAt: null,
    email: `${input.id}@example.com`,
    absystemTrialExpiresAt: new Date(input.trialExpiresAt),
    absystemGrantSource: input.grantSource ?? 'post_zoom',
    notificationPreference: {
      telegramEnabled: input.telegramEnabled ?? true,
      weeklySummaryEnabled: input.weeklySummaryEnabled ?? true,
      subscriptionEnabled: input.subscriptionEnabled ?? true,
      timezone: 'UTC',
    },
    weeklyReports: input.weeklySummary === undefined
      ? [{ summaryText: 'Ти стала чіткіше тримати фокус і швидше повертатися до дії.' }]
      : [{ summaryText: input.weeklySummary }],
    productSubscriptions: [
      ...(input.focusExpiresAt ? [{
        status: 'active',
        expiresAt: new Date(input.focusExpiresAt),
        manuallyGrantedBy: input.legacyGift ? 'admin_manual' : null,
        manualGrantNote: input.legacyGift ? 'Legacy Gift Focus until 20.07.2027' : null,
        product: { code: 'focus' },
      }] : []),
      ...(input.paidAbsystem ? [{
        status: 'active',
        expiresAt: new Date('2026-12-01T00:00:00.000Z'),
        manuallyGrantedBy: null,
        manualGrantNote: null,
        product: { code: 'absystem_ai' },
      }] : []),
    ],
  })
  mockState.mentorAccessUsers.add(input.id)
}

vi.mock('../../../db/client.ts', () => ({
  prisma: {
    user: {
      findMany: vi.fn(async ({ where }: any) => {
        return mockState.users.filter((user) => {
          if (where?.id?.in && !where.id.in.includes(user.id)) return false
          if (where?.absystemGrantSource && user.absystemGrantSource !== where.absystemGrantSource) return false
          if (where?.absystemTrialExpiresAt?.not === null && user.absystemTrialExpiresAt == null) return false
          if (where?.absystemTrialExpiresAt?.lte && !(user.absystemTrialExpiresAt <= where.absystemTrialExpiresAt.lte)) return false
          return true
        })
      }),
    },
    notificationPreference: {
      findMany: vi.fn(async () => (
        mockState.users.map((user) => ({
          userId: user.id,
          telegramEnabled: user.notificationPreference.telegramEnabled,
          subscriptionEnabled: user.notificationPreference.subscriptionEnabled,
          weeklySummaryEnabled: user.notificationPreference.weeklySummaryEnabled,
          timezone: user.notificationPreference.timezone,
        }))
      )),
    },
    subscription: {
      findMany: vi.fn(async () => mockState.subscriptions),
    },
  },
}))

vi.mock('../../../modules/subscriptions/payments/business/service.ts', () => ({
  buildEcosystemPaymentCheckoutUrl: vi.fn(async (_product: string, _plan: string, userId: string) => `https://example.com/checkout/${userId}?product=absystem_ai&plan=1month_upgrade`),
}))

vi.mock('../../../modules/access/service.ts', () => ({
  resolveLegacyGiftFocus: vi.fn(async ({ userId }: { userId: string }) => {
    const user = mockState.users.find((candidate) => candidate.id === userId) ?? null
    const focusSubscription = user?.productSubscriptions.find((subscription: any) => subscription.product?.code === 'focus') ?? null
    return {
      isLegacyGift: focusSubscription?.manuallyGrantedBy === 'admin_manual'
        && focusSubscription?.manualGrantNote === 'Legacy Gift Focus until 20.07.2027'
        && !!focusSubscription?.expiresAt,
      focusExpiresAt: focusSubscription?.expiresAt ?? null,
    }
  }),
}))

vi.mock('../../../modules/flow-control/service.ts', () => ({
  syncLifecycleForUser: vi.fn(async () => undefined),
}))

vi.mock('../common.ts', () => ({
  ensureNotificationPreferenceTableAvailability: vi.fn(async () => true),
  getEndOfUtcDay: vi.fn(),
  getMinutesInTimezone: vi.fn(() => 10 * 60),
  getStartOfUtcDay: vi.fn(),
  hasMentorNotificationAccess: vi.fn(async (userId: string) => mockState.mentorAccessUsers.has(userId)),
  isWithinScheduledMinute: vi.fn(() => true),
}))

vi.mock('../../notifications/NotificationService.ts', () => ({
  notificationService: {
    emit: vi.fn(async (event: string, userId: string, payload: Record<string, unknown>) => {
      mockState.emitCalls.push({ event, userId, payload })
    }),
    sendLifecycleTelegramNotification: vi.fn(async (input: {
      event: string
      userId: string
      templateKey: string
      payload: Record<string, unknown>
    }) => {
      if (sentTemplateKeys.has(input.templateKey)) return false
      sentTemplateKeys.add(input.templateKey)
      mockState.lifecycleCalls.push({
        event: input.event,
        templateKey: input.templateKey,
        userId: input.userId,
        payload: input.payload,
      })
      return true
    }),
  },
}))

vi.mock('../../../lib/cache/index.ts', () => ({ cacheDel: vi.fn() }))
vi.mock('../../../lib/db/dailyCache.ts', () => ({ invalidateDailyHistoryCache: vi.fn(), invalidateDayCache: vi.fn() }))
vi.mock('../../../lib/telegram.ts', () => ({ sendDedupedTelegramMessage: vi.fn() }))
vi.mock('../../../lib/notifications/templates.ts', () => ({ buildNotificationContent: vi.fn() }))
vi.mock('../../../modules/telegram-mentor/services/engagement/nudge.ts', () => ({ processScheduledNudges: vi.fn() }))
vi.mock('../../../modules/ai-mentor/weekly-analysis/service.ts', () => ({
  runWeeklyAnalysis: vi.fn(async () => ({
    userReport: { streakDays: 3 },
    metrics: { wheels: 1, sessions: 1 },
  })),
}))
vi.mock('../../../modules/web-map/web-map.service.ts', () => ({ runMonthlyAnalysis: vi.fn() }))
vi.mock('../../../modules/users/runtime/resolveUserLifecycle.ts', () => ({ resolveDisplayName: vi.fn(() => 'Vira') }))
vi.mock('../../notifications/mentorLifecycle.ts', () => ({ resolvePausedMentorContext: vi.fn() }))
vi.mock('../../notifications/services/NotificationRecordService.ts', () => ({ notificationRecordService: { create: vi.fn() } }))

import { subscriptionExpiredCron, subscriptionExpiringCron } from '../operations.ts'

describe('operations.jobs legacy gift ABSystem trial lifecycle', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    mockState.reset()
  })

  it('regular trial user gets report and paid offer on day 8', async () => {
    seedTrialUser({
      id: 'regular-day8',
      trialExpiresAt: '2026-09-02T17:00:00.000Z',
      focusExpiresAt: '2026-09-20T00:00:00.000Z',
      legacyGift: false,
    })

    await subscriptionExpiringCron()

    expect(mockState.lifecycleCalls[0]?.payload.trial_lifecycle_mode).toBe('regular_day8')
    expect(String(mockState.lifecycleCalls[0]?.payload.renewal_url)).toContain('plan=1month_upgrade')
  })

  it('Legacy Gift gets report without payment CTA payload on day 8', async () => {
    seedTrialUser({
      id: 'gift-day8',
      trialExpiresAt: '2026-09-02T17:00:00.000Z',
      focusExpiresAt: '2027-07-20T23:59:59.000Z',
      legacyGift: true,
    })

    await subscriptionExpiringCron()

    expect(mockState.lifecycleCalls[0]?.payload.trial_lifecycle_mode).toBe('legacy_gift_day8')
    expect(mockState.lifecycleCalls[0]?.payload.renewal_url).toBeNull()
  })

  it('daysRemaining is computed from expiresAt', async () => {
    seedTrialUser({
      id: 'gift-days',
      trialExpiresAt: '2026-09-03T17:00:00.000Z',
      focusExpiresAt: '2027-07-20T23:59:59.000Z',
      legacyGift: true,
    })
    mockState.setNow('2026-08-11T17:00:00.000Z')

    await subscriptionExpiringCron()

    expect(mockState.lifecycleCalls[0]?.payload.days_remaining).toBe(23)
  })

  it('repeated day 8 scan does not duplicate message', async () => {
    seedTrialUser({
      id: 'gift-repeat',
      trialExpiresAt: '2026-09-02T17:00:00.000Z',
      focusExpiresAt: '2027-07-20T23:59:59.000Z',
      legacyGift: true,
    })

    await subscriptionExpiringCron()
    await subscriptionExpiringCron()

    expect(mockState.lifecycleCalls).toHaveLength(1)
  })

  it('user without weekly data gets fallback payload without fake report', async () => {
    seedTrialUser({
      id: 'gift-no-report',
      trialExpiresAt: '2026-09-02T17:00:00.000Z',
      focusExpiresAt: '2027-07-20T23:59:59.000Z',
      legacyGift: true,
      weeklySummary: null,
    })

    await subscriptionExpiringCron()

    expect(mockState.lifecycleCalls[0]?.payload.weekly_report_summary).toBeNull()
  })

  it('Legacy Gift at 5 days gets only ABSystem offer', async () => {
    seedTrialUser({
      id: 'gift-5d',
      trialExpiresAt: '2026-08-15T17:00:00.000Z',
      focusExpiresAt: '2027-07-20T23:59:59.000Z',
      legacyGift: true,
    })

    await subscriptionExpiringCron()

    const preExpiry = mockState.lifecycleCalls.find((call) => call.payload.trial_lifecycle_mode === 'legacy_gift_pre_expiry')
    expect(preExpiry?.payload.renewal_url).toBeTruthy()
  })

  it('Focus expiresAt stays unchanged in pre-expiry payload', async () => {
    seedTrialUser({
      id: 'gift-focus-stable',
      trialExpiresAt: '2026-08-15T17:00:00.000Z',
      focusExpiresAt: '2027-07-20T23:59:59.000Z',
      legacyGift: true,
    })

    await subscriptionExpiringCron()

    const preExpiry = mockState.lifecycleCalls.find((call) => call.payload.trial_lifecycle_mode === 'legacy_gift_pre_expiry')
    expect(preExpiry?.payload.focus_expires_at).toBe('2027-07-20T23:59:59.000Z')
  })

  it('paid ABSystem user does not get trial renewal offer', async () => {
    seedTrialUser({
      id: 'gift-paid',
      trialExpiresAt: '2026-08-15T17:00:00.000Z',
      focusExpiresAt: '2027-07-20T23:59:59.000Z',
      legacyGift: true,
      paidAbsystem: true,
    })

    await subscriptionExpiringCron()

    expect(mockState.lifecycleCalls).toHaveLength(0)
  })

  it('repeated pre-expiry scan does not duplicate notification', async () => {
    seedTrialUser({
      id: 'gift-pre-repeat',
      trialExpiresAt: '2026-08-15T17:00:00.000Z',
      focusExpiresAt: '2027-07-20T23:59:59.000Z',
      legacyGift: true,
    })

    await subscriptionExpiringCron()
    await subscriptionExpiringCron()

    expect(mockState.lifecycleCalls.filter((call) => call.payload.trial_lifecycle_mode === 'legacy_gift_pre_expiry')).toHaveLength(1)
  })

  it('expired trial sends expiry flow', async () => {
    seedTrialUser({
      id: 'gift-expired',
      trialExpiresAt: '2026-08-01T17:00:00.000Z',
      focusExpiresAt: '2027-07-20T23:59:59.000Z',
      legacyGift: true,
    })
    mockState.setNow('2026-08-02T08:00:00.000Z')

    await subscriptionExpiredCron()

    expect(mockState.lifecycleCalls[0]?.payload.trial_lifecycle_mode).toBe('trial_expired')
  })

  it('Focus stays active in expiry payload', async () => {
    seedTrialUser({
      id: 'gift-focus-active',
      trialExpiresAt: '2026-08-01T17:00:00.000Z',
      focusExpiresAt: '2027-07-20T23:59:59.000Z',
      legacyGift: true,
    })
    mockState.setNow('2026-08-02T08:00:00.000Z')

    await subscriptionExpiredCron()

    expect(mockState.lifecycleCalls[0]?.payload.focus_expires_at).toBe('2027-07-20T23:59:59.000Z')
  })

  it('paid ABSystem is not deactivated by expiry flow', async () => {
    seedTrialUser({
      id: 'gift-paid-expired',
      trialExpiresAt: '2026-08-01T17:00:00.000Z',
      focusExpiresAt: '2027-07-20T23:59:59.000Z',
      legacyGift: true,
      paidAbsystem: true,
    })
    mockState.setNow('2026-08-02T08:00:00.000Z')

    await subscriptionExpiredCron()

    expect(mockState.lifecycleCalls).toHaveLength(0)
  })

  it('user data and reports are not deleted on expiry', async () => {
    seedTrialUser({
      id: 'gift-data',
      trialExpiresAt: '2026-08-01T17:00:00.000Z',
      focusExpiresAt: '2027-07-20T23:59:59.000Z',
      legacyGift: true,
    })
    mockState.setNow('2026-08-02T08:00:00.000Z')

    await subscriptionExpiredCron()

    expect(mockState.users.find((user) => user.id === 'gift-data')?.weeklyReports[0]?.summaryText).toBeTruthy()
  })

  it('repeated expiry handling is idempotent', async () => {
    seedTrialUser({
      id: 'gift-expiry-repeat',
      trialExpiresAt: '2026-08-01T17:00:00.000Z',
      focusExpiresAt: '2027-07-20T23:59:59.000Z',
      legacyGift: true,
    })
    mockState.setNow('2026-08-02T08:00:00.000Z')

    await subscriptionExpiredCron()
    await subscriptionExpiredCron()

    expect(mockState.lifecycleCalls).toHaveLength(1)
  })

  it('Telegram delivery failure does not create sent marker in scheduler layer', async () => {
    seedTrialUser({
      id: 'gift-failure',
      trialExpiresAt: '2026-08-01T17:00:00.000Z',
      focusExpiresAt: '2027-07-20T23:59:59.000Z',
      legacyGift: true,
    })
    mockState.setNow('2026-08-02T08:00:00.000Z')

    sentTemplateKeys.add('AB_TRIAL_EXPIRED:gift-failure:2026-08-01T17:00:00.000Z')

    await subscriptionExpiredCron()

    expect(mockState.lifecycleCalls).toHaveLength(0)
  })
})
