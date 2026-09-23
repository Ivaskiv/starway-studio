import { beforeEach, describe, expect, it, vi } from 'vitest'

const mockUserFindUnique = vi.fn()
const mockProductSubscriptionFindFirst = vi.fn()
const mockSubscriptionFindFirst = vi.fn()
const mockGetUpcomingGroupSessions = vi.fn()
const mockSendFocusPaymentSuccessTelegramMessageByOrder = vi.fn()
const mockNotifyCoachAboutSuccessfulPayment = vi.fn()
const mockSendFocusPaymentOnboardingIfNeeded = vi.fn()
const mockLoadAbTestProgress = vi.fn()
const mockScheduleFollowups = vi.fn()
const mockSendOpsTelegramMessage = vi.fn()
const mockSimulateFocusActivation = vi.fn()
const mockResolveFocusChannelInviteLink = vi.fn()
const mockCancelPendingAbTestSalesFollowups = vi.fn()

vi.mock('@/db/client.js', () => ({
  prisma: {
    user: {
      findUnique: (...args: unknown[]) => mockUserFindUnique(...args),
    },
    productSubscription: {
      findFirst: (...args: unknown[]) => mockProductSubscriptionFindFirst(...args),
    },
    subscription: {
      findFirst: (...args: unknown[]) => mockSubscriptionFindFirst(...args),
    },
  },
}))

vi.mock('@/lib/telegram.js', () => ({
  coachBot: { id: 'coach-bot' },
  sendOpsTelegramMessage: (...args: unknown[]) => mockSendOpsTelegramMessage(...args),
}))

vi.mock('@/products/ab-system/telegram/progress.js', () => ({
  loadAbTestProgress: (...args: unknown[]) => mockLoadAbTestProgress(...args),
}))

vi.mock('@/products/ab-system/telegram/scheduler.js', () => ({
  cancelPendingAbTestSalesFollowups: (...args: unknown[]) => mockCancelPendingAbTestSalesFollowups(...args),
  scheduleFollowups: (...args: unknown[]) => mockScheduleFollowups(...args),
}))

vi.mock('@/modules/admin/notifications/coach.service.js', () => ({
  notifyCoachAboutSuccessfulPayment: (...args: unknown[]) => mockNotifyCoachAboutSuccessfulPayment(...args),
}))

vi.mock('@/modules/zoom/service.js', () => ({
  getUpcomingGroupSessions: (...args: unknown[]) => mockGetUpcomingGroupSessions(...args),
}))

vi.mock('@/modules/subscriptions/payments/callback/focus-onboarding.js', () => ({
  getSafeName: (value: string | null | undefined) => String(value ?? '').trim(),
  sendFocusPaymentOnboardingIfNeeded: (...args: unknown[]) => mockSendFocusPaymentOnboardingIfNeeded(...args),
}))

vi.mock('@/modules/subscriptions/payments/callback/notifications.js', () => ({
  sendFocusPaymentSuccessTelegramMessageByOrder: (...args: unknown[]) =>
    mockSendFocusPaymentSuccessTelegramMessageByOrder(...args),
}))

vi.mock('@/modules/subscriptions/payments/business/service.js', () => ({
  resolveFocusChannelInviteLink: (...args: unknown[]) => mockResolveFocusChannelInviteLink(...args),
  simulateFocusActivation: (...args: unknown[]) => mockSimulateFocusActivation(...args),
}))

vi.mock('@/services/notifications/NotificationService.js', () => ({
  notificationService: {
    schedule: vi.fn(),
  },
}))

vi.mock('@/services/notifications/NotificationEvent.js', () => ({
  NotificationEvent: {
    AB_TEST_FOLLOWUP: 'AB_TEST_FOLLOWUP',
  },
}))

import { handleFocusPaymentSuccess } from '@/modules/subscriptions/payments/callback/focus.ts'

describe('handleFocusPaymentSuccess — payment fan-out', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    process.env.COACH_TELEGRAM_ID = 'coach-chat-id'
    mockUserFindUnique.mockResolvedValue({
      id: 'user-1',
      firstName: 'Віра',
      email: 'vira@example.com',
      telegramChatId: 'user-chat-id',
      telegramLinks: [],
    })
    mockProductSubscriptionFindFirst.mockResolvedValue({
      id: 'sub-1',
      focusWelcomedAt: null,
      expiresAt: new Date('2026-09-15T17:03:28.621Z'),
    })
    mockSubscriptionFindFirst.mockResolvedValue({
      currentPeriodEnd: new Date('2026-09-21T17:03:28.621Z'),
    })
    mockGetUpcomingGroupSessions.mockResolvedValue([])
    mockSendFocusPaymentSuccessTelegramMessageByOrder.mockResolvedValue(true)
    mockNotifyCoachAboutSuccessfulPayment.mockResolvedValue(true)
    mockSendFocusPaymentOnboardingIfNeeded.mockResolvedValue(true)
    mockLoadAbTestProgress.mockResolvedValue({})
    mockScheduleFollowups.mockResolvedValue(undefined)
    mockResolveFocusChannelInviteLink.mockReturnValue('https://t.me/focus')
    mockSimulateFocusActivation.mockReturnValue({
      preZoomScheduled: false,
      preZoomReminders: [],
      lifecycleState: 'focus_active',
    })
    mockCancelPendingAbTestSalesFollowups.mockResolvedValue(undefined)
  })

  it('fans out one successful FOCUS payment to user confirmation, coach notification, and onboarding', async () => {
    const orderReference = 'focus_1month_11111111-1111-4111-8111-111111111111_456'
    const finalExpiresAt = new Date('2026-09-21T17:03:28.621Z')

    await handleFocusPaymentSuccess({
      userId: 'user-1',
      data: {
        order_reference: orderReference,
        currency: 'UAH',
      } as any,
      webhookResult: { planId: '1month' },
      payRef: orderReference,
      amount: 780,
    })

    expect(mockSendFocusPaymentSuccessTelegramMessageByOrder).toHaveBeenCalledTimes(1)
    expect(mockSendFocusPaymentSuccessTelegramMessageByOrder).toHaveBeenCalledWith({
      userId: 'user-1',
      orderReference,
    })
    expect(mockNotifyCoachAboutSuccessfulPayment).toHaveBeenCalledTimes(1)
    expect(mockNotifyCoachAboutSuccessfulPayment).toHaveBeenCalledWith(
      expect.objectContaining({
        coachChatId: 'coach-chat-id',
        userId: 'user-1',
        userLabel: 'Віра · vira@example.com',
        productLabel: 'ФОКУС',
        planLabel: '1 місяць',
        amount: 780,
        currency: 'UAH',
        orderReference,
        finalExpiresAt,
      }),
    )
    expect(mockSendFocusPaymentOnboardingIfNeeded).toHaveBeenCalledTimes(1)
    expect(mockSendFocusPaymentOnboardingIfNeeded).toHaveBeenCalledWith(
      expect.objectContaining({
        userId: 'user-1',
        orderReference,
        planLabel: '1 місяць',
        paidUser: expect.objectContaining({
          id: 'user-1',
        }),
        focusSubscription: expect.objectContaining({
          expiresAt: new Date('2026-09-15T17:03:28.621Z'),
        }),
        canonicalSubscription: expect.objectContaining({
          currentPeriodEnd: finalExpiresAt,
        }),
      }),
    )
    expect(mockSendOpsTelegramMessage).not.toHaveBeenCalled()
  })
})
