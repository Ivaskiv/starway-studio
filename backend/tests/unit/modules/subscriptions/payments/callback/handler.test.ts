import { beforeEach, describe, expect, it, vi } from 'vitest'

const mockProductSubscriptionUpdate = vi.fn()
const mockSendTelegramMessage = vi.fn()

vi.mock('../../../../db/client.ts', () => ({
  prisma: {
    productSubscription: {
      update: (...args: unknown[]) => mockProductSubscriptionUpdate(...args),
    },
  },
}))

vi.mock('/Users/viravira/Documents/starway-studio/backend/src/db/client.js', () => ({
  prisma: {
    productSubscription: {
      update: (...args: unknown[]) => mockProductSubscriptionUpdate(...args),
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

describe('callback.handler — Focus onboarding idempotency', () => {
  const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => undefined)

  beforeEach(() => {
    vi.clearAllMocks()
    mockProductSubscriptionUpdate.mockResolvedValue(undefined)
    mockSendTelegramMessage.mockResolvedValue(true)
    process.env.PUBLIC_FRONTEND_URL = 'https://app.starway.test'
  })

  it('sends the access onboarding once and marks focusWelcomedAt on first activation', async () => {
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
    expect(mockSendTelegramMessage).toHaveBeenCalledTimes(2)
    expect(String(mockSendTelegramMessage.mock.calls[0][2])).toContain('Доступ до ФОКУС активовано ✅')
    expect(String(mockSendTelegramMessage.mock.calls[0][2])).toContain('Тариф: 1 місяць')
    expect(String(mockSendTelegramMessage.mock.calls[0][2])).toContain('Доступ активний до')
    expect(String(mockSendTelegramMessage.mock.calls[0][2])).toContain('Що тобі вже доступно')
    expect(mockProductSubscriptionUpdate).toHaveBeenCalledWith({
      where: { id: 'sub-1' },
      data: expect.objectContaining({
        focusWelcomedAt: expect.any(Date),
      }),
    })
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
    expect(mockProductSubscriptionUpdate).not.toHaveBeenCalled()
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
    expect(mockProductSubscriptionUpdate).not.toHaveBeenCalled()
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
})
