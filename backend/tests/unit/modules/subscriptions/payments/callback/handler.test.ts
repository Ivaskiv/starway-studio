import { beforeEach, describe, expect, it, vi } from 'vitest'

const mockProductSubscriptionUpdate = vi.fn()
const mockProductSubscriptionUpdateMany = vi.fn()
const mockProductSubscriptionFindUnique = vi.fn()
const mockSendTelegramMessage = vi.fn()
const mockEnqueueOnce = vi.fn()

vi.mock('../../../../db/client.ts', () => ({
  prisma: {
    productSubscription: {
      update: (...args: unknown[]) => mockProductSubscriptionUpdate(...args),
      updateMany: (...args: unknown[]) => mockProductSubscriptionUpdateMany(...args),
      findUnique: (...args: unknown[]) => mockProductSubscriptionFindUnique(...args),
    },
  },
}))

vi.mock('/Users/viravira/Documents/starway-studio/backend/src/db/client.js', () => ({
  prisma: {
    productSubscription: {
      update: (...args: unknown[]) => mockProductSubscriptionUpdate(...args),
      updateMany: (...args: unknown[]) => mockProductSubscriptionUpdateMany(...args),
      findUnique: (...args: unknown[]) => mockProductSubscriptionFindUnique(...args),
    },
  },
}))

vi.mock('../../../../lib/telegram.js', () => ({
  bot: {
    telegram: {
      sendMessage: (...args: unknown[]) => mockSendTelegramMessage(...args),
    },
  },
  coachBot: {},
  sendOpsTelegramMessage: vi.fn(),
}))

vi.mock('/Users/viravira/Documents/starway-studio/backend/src/lib/telegram/messageFormatter.js', () => ({
  sendTelegramMessage: (...args: unknown[]) => mockSendTelegramMessage(...args),
}))

vi.mock('/Users/viravira/Documents/starway-studio/backend/src/services/notifications/services/NotificationJobService.js', () => ({
  notificationJobService: {
    enqueueOnce: (...args: unknown[]) => mockEnqueueOnce(...args),
  },
}))

vi.mock('../../../../services/notifications/NotificationService.ts', () => ({
  notificationService: {
    schedule: vi.fn(),
  },
}))

vi.mock('../../../events/service.ts', () => ({
  trackEvent: vi.fn(),
}))

vi.mock('../../../telegram-mentor/handlers/billing.ts', () => ({
  sendBillingSuccessTelegramMessage: vi.fn(),
}))

vi.mock('../../../telegram-mentor/handlers/start.ts', () => ({
  resolveUserState: vi.fn(),
}))

vi.mock('../../../zoom/service.ts', () => ({
  getUpcomingGroupSessions: vi.fn(),
  scheduleReminders: vi.fn(),
}))

vi.mock('../business/service.js', () => ({
  buildEcosystemPaymentCheckoutUrl: vi.fn(),
  resolveFocusChannelInviteLink: vi.fn(),
  simulateFocusActivation: vi.fn(() => ({
    preZoomScheduled: false,
    preZoomReminders: [],
    lifecycleState: 'focus_active',
  })),
}))

vi.mock('../callback/notifications.ts', () => ({
  sendAbsystemPaymentSuccessTelegramMessage: vi.fn(),
  sendPaymentFailedTelegramMessage: vi.fn(),
  sendFocusPaymentSuccessTelegramMessageByOrder: vi.fn(),
  sendTrialZoomPaymentSuccessTelegramMessage: vi.fn(),
}))

vi.mock('/Users/viravira/Documents/starway-studio/backend/src/modules/subscriptions/payments/callback/notifications.js', () => ({
  sendAbsystemPaymentSuccessTelegramMessage: vi.fn(),
  sendPaymentFailedTelegramMessage: vi.fn(),
  sendFocusPaymentSuccessTelegramMessageByOrder: vi.fn(),
  sendTrialZoomPaymentSuccessTelegramMessage: vi.fn(),
}))

vi.mock('../coach-alert.ts', () => ({
  alertCoachAboutPaymentIssue: vi.fn(),
}))

vi.mock('../activation.ts', () => ({
  activateProductSubscription: vi.fn(),
}))

vi.mock('../callback/processing.ts', () => ({
  processPaymentWebhook: vi.fn(),
}))

vi.mock('../callback/targets.ts', () => ({
  resolveWebhookPaymentTarget: vi.fn(),
}))

vi.mock('../wayforpay/signature.ts', () => ({
  verifySignature: vi.fn(() => true),
}))

vi.mock('../wayforpay/checkout.ts', () => ({
  markCheckoutSessionCompleted: vi.fn(),
  markCheckoutSessionProcessing: vi.fn(async () => undefined),
}))

vi.mock('../../../../core/runtime/idempotency.ts', () => ({
  buildRuntimeTelemetry: vi.fn(() => ({ runtime_stage: 'payment' })),
  withRuntimeAdvisoryLock: vi.fn(),
}))

vi.mock('../../../../core/state-machine/securityFoundation.ts', () => ({
  buildRequestFingerprint: vi.fn(() => 'fingerprint'),
}))

vi.mock('../../../events/contentAttribution.service.ts', () => ({
  getContentAttributionEventPayload: vi.fn(),
}))

vi.mock('../../../ai-mentor/weekly-analysis/service.ts', () => ({
  runWeeklyAnalysis: vi.fn(),
}))

vi.mock('../../../../services/notifications/NotificationEvent.ts', () => ({
  NotificationEvent: {
    AB_TEST_FOLLOWUP: 'AB_TEST_FOLLOWUP',
  },
}))

import { sendFocusPaymentOnboardingIfNeeded } from '@/modules/subscriptions/payments/callback/handler.ts'
import {
  deliverFocusPaymentOnboardingJob,
  FOCUS_PAYMENT_ONBOARDING_JOB_KIND,
  isFocusPaymentOnboardingJobPayload,
} from '@/modules/subscriptions/payments/callback/focus-onboarding.ts'

describe('callback.handler — Focus onboarding idempotency', () => {
  const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => undefined)

  beforeEach(() => {
    vi.clearAllMocks()
    mockProductSubscriptionUpdate.mockResolvedValue(undefined)
    mockProductSubscriptionUpdateMany.mockResolvedValue({ count: 1 })
    mockProductSubscriptionFindUnique.mockResolvedValue({ focusWelcomedAt: null })
    mockSendTelegramMessage.mockResolvedValue(true)
    mockEnqueueOnce.mockResolvedValue({ id: 'focus-welcome-job' })
    process.env.PUBLIC_FRONTEND_URL = 'https://app.starway.test'
  })

  it('creates one durable onboarding delivery instead of dispatching Telegram in the callback', async () => {
    const first = await sendFocusPaymentOnboardingIfNeeded({
      userId: 'user-1',
      orderReference: 'focus_order_1',
      paidUser: {
        id: 'user-1',
        firstName: 'Віра',
        telegramChatId: 'chat-1',
        telegramLinks: [],
      },
      focusSubscription: {
        id: 'sub-1',
        focusWelcomedAt: null,
        expiresAt: new Date('2026-08-27T08:00:00.000Z'),
      },
      canonicalSubscription: {
        currentPeriodEnd: new Date('2026-08-27T08:00:00.000Z'),
      },
      planLabel: '1 місяць',
      upcomingLines: 'пн, 27.08 19:00 — Zoom',
    })

    expect(first).toBe(true)
    expect(mockSendTelegramMessage).not.toHaveBeenCalled()
    expect(mockProductSubscriptionUpdateMany).not.toHaveBeenCalled()
    expect(mockEnqueueOnce).toHaveBeenCalledWith(
      'SUBSCRIPTION',
      expect.objectContaining({
        event: 'FOCUS_PAYMENT_ONBOARDING',
        userId: 'user-1',
        payload: expect.objectContaining({
          kind: FOCUS_PAYMENT_ONBOARDING_JOB_KIND,
          subscriptionId: 'sub-1',
          idempotencyKey: 'focus-payment-onboarding:sub-1',
        }),
      }),
      expect.any(Date),
      'focus-payment-onboarding:sub-1',
    )
  })

  it('keeps a nameless payer on the Focus onboarding worker path', () => {
    expect(isFocusPaymentOnboardingJobPayload({
      kind: FOCUS_PAYMENT_ONBOARDING_JOB_KIND,
      subscriptionId: 'sub-1',
      chatId: 'chat-1',
      firstName: null,
      planLabel: '1 місяць',
      accessUntil: null,
      upcomingLines: '',
      idempotencyKey: 'focus-payment-onboarding:sub-1',
    })).toBe(true)
  })

  it('distinct focus payment orderReferences do not repeat onboarding after focusWelcomedAt is set', async () => {
    const second = await sendFocusPaymentOnboardingIfNeeded({
      userId: 'user-1',
      orderReference: 'focus_order_2',
      paidUser: {
        id: 'user-1',
        firstName: 'Віра',
        telegramChatId: 'chat-1',
        telegramLinks: [],
      },
      focusSubscription: {
        id: 'sub-1',
        focusWelcomedAt: new Date('2026-07-27T08:00:00.000Z'),
        expiresAt: new Date('2026-08-27T08:00:00.000Z'),
      },
      canonicalSubscription: {
        currentPeriodEnd: new Date('2026-08-27T08:00:00.000Z'),
      },
      planLabel: '1 місяць',
      upcomingLines: '',
    })

    expect(second).toBe(true)
    expect(mockSendTelegramMessage).not.toHaveBeenCalled()
    expect(mockEnqueueOnce).not.toHaveBeenCalled()
  })

  it('skips Telegram onboarding and logs a warning when paid user has no chatId', async () => {
    const sent = await sendFocusPaymentOnboardingIfNeeded({
      userId: 'user-2',
      orderReference: 'focus_order_3',
      paidUser: {
        id: 'user-2',
        firstName: 'Оля',
        telegramChatId: null,
        telegramLinks: [{ chatId: null }],
      },
      focusSubscription: {
        id: 'sub-2',
        focusWelcomedAt: null,
        expiresAt: new Date('2026-08-27T08:00:00.000Z'),
      },
      canonicalSubscription: {
        currentPeriodEnd: new Date('2026-08-27T08:00:00.000Z'),
      },
      planLabel: '1 місяць',
      upcomingLines: 'вт, 28.07 19:00 — Zoom',
    })

    expect(sent).toBe(false)
    expect(mockSendTelegramMessage).not.toHaveBeenCalled()
    expect(mockEnqueueOnce).not.toHaveBeenCalled()
    expect(warnSpy).toHaveBeenCalledWith(
      '[PAYMENT_LIFECYCLE] telegram_notification_skipped',
      expect.objectContaining({
        userId: 'user-2',
        operation: 'focus_payment_onboarding',
        reason: 'missing_chat_id',
        telegramChatId: null,
        telegramLinksCount: 1,
      }),
    )
  })

  it('uses the subscription business identity for concurrent callback delivery intents', async () => {
    const input = {
      userId: 'user-1',
      paidUser: {
        id: 'user-1',
        firstName: 'Віра',
        telegramChatId: 'chat-1',
        telegramLinks: [],
      },
      focusSubscription: {
        id: 'sub-1',
        focusWelcomedAt: null,
        expiresAt: new Date('2026-08-27T08:00:00.000Z'),
      },
      canonicalSubscription: {
        currentPeriodEnd: new Date('2026-08-27T08:00:00.000Z'),
      },
      planLabel: '1 місяць',
      upcomingLines: 'пн, 27.08 19:00 — Zoom',
    }

    await Promise.all([
      sendFocusPaymentOnboardingIfNeeded({ ...input, orderReference: 'focus_order_1' }),
      sendFocusPaymentOnboardingIfNeeded({ ...input, orderReference: 'focus_order_2' }),
    ])

    expect(mockSendTelegramMessage).not.toHaveBeenCalled()
    expect(mockEnqueueOnce).toHaveBeenCalledTimes(2)
    expect(mockEnqueueOnce.mock.calls.map((call) => call[3])).toEqual([
      'focus-payment-onboarding:sub-1',
      'focus-payment-onboarding:sub-1',
    ])
  })

  it('acknowledges only a successful Telegram delivery and lets the worker retry a failed send', async () => {
    const payload = {
      kind: FOCUS_PAYMENT_ONBOARDING_JOB_KIND,
      subscriptionId: 'sub-1',
      chatId: 'chat-1',
      firstName: 'Віра',
      planLabel: '1 місяць',
      accessUntil: '2026-08-27T08:00:00.000Z',
      upcomingLines: 'пн, 27.08 19:00 — Zoom',
      idempotencyKey: 'focus-payment-onboarding:sub-1',
    }
    mockSendTelegramMessage
      .mockRejectedValueOnce(new Error('telegram unavailable'))
      .mockRejectedValueOnce(new Error('telegram unavailable'))
      .mockResolvedValue(true)

    await expect(deliverFocusPaymentOnboardingJob(payload)).rejects
      .toThrow('focus_payment_onboarding_delivery_failed')
    expect(mockProductSubscriptionUpdateMany).not.toHaveBeenCalled()

    await expect(deliverFocusPaymentOnboardingJob(payload)).resolves.toBeUndefined()
    expect(mockSendTelegramMessage).toHaveBeenCalledTimes(4)
    expect(String(mockSendTelegramMessage.mock.calls[2][2])).toContain('Доступ до ФОКУС активовано ✅')
    expect(mockProductSubscriptionUpdateMany).toHaveBeenCalledWith({
      where: { id: 'sub-1', focusWelcomedAt: null },
      data: { focusWelcomedAt: expect.any(Date) },
    })
  })

  it('does not dispatch again when a crashed worker is reclaimed after the durable acknowledgment', async () => {
    mockProductSubscriptionFindUnique.mockResolvedValue({
      focusWelcomedAt: new Date('2026-08-01T08:00:00.000Z'),
    })

    await expect(deliverFocusPaymentOnboardingJob({
      kind: FOCUS_PAYMENT_ONBOARDING_JOB_KIND,
      subscriptionId: 'sub-1',
      chatId: 'chat-1',
      firstName: 'Віра',
      planLabel: '1 місяць',
      accessUntil: null,
      upcomingLines: '',
      idempotencyKey: 'focus-payment-onboarding:sub-1',
    })).resolves.toBeUndefined()

    expect(mockSendTelegramMessage).not.toHaveBeenCalled()
    expect(mockProductSubscriptionUpdateMany).not.toHaveBeenCalled()
  })

})
