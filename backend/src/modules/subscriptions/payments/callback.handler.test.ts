import { beforeEach, describe, expect, it, vi } from 'vitest'

const mockProductSubscriptionUpdate = vi.fn()
const mockSendMessage = vi.fn()

vi.mock('../../../db/client.js', () => ({
  prisma: {
    productSubscription: {
      update: (...args: unknown[]) => mockProductSubscriptionUpdate(...args),
    },
  },
}))

vi.mock('../../../lib/telegram.js', () => ({
  bot: {
    telegram: {
      sendMessage: (...args: unknown[]) => mockSendMessage(...args),
    },
  },
  coachBot: {},
  sendOpsTelegramMessage: vi.fn(),
}))

vi.mock('../../../services/notifications/NotificationService.js', () => ({
  notificationService: {
    schedule: vi.fn(),
  },
}))

vi.mock('../../events/service.js', () => ({
  trackEvent: vi.fn(),
}))

vi.mock('../../telegram-mentor/handlers/billing.js', () => ({
  sendBillingSuccessTelegramMessage: vi.fn(),
}))

vi.mock('../../telegram-mentor/handlers/start.js', () => ({
  resolveUserState: vi.fn(),
}))

vi.mock('../../zoom/service.js', () => ({
  getUpcomingGroupSessions: vi.fn(),
  scheduleReminders: vi.fn(),
}))

vi.mock('../business.js', () => ({
  buildEcosystemPaymentCheckoutUrl: vi.fn(),
  resolveFocusChannelInviteLink: vi.fn(),
  simulateFocusActivation: vi.fn(() => ({
    preZoomScheduled: false,
    preZoomReminders: [],
    lifecycleState: 'focus_active',
  })),
}))

vi.mock('./callback.notifications.js', () => ({
  sendAbsystemPaymentSuccessTelegramMessage: vi.fn(),
  sendPaymentFailedTelegramMessage: vi.fn(),
}))

vi.mock('./coachAlert.service.js', () => ({
  alertCoachAboutPaymentIssue: vi.fn(),
}))

vi.mock('./paymentActivation.service.js', () => ({
  activateProductSubscription: vi.fn(),
}))

vi.mock('./callback.processing.js', () => ({
  processPaymentWebhook: vi.fn(),
}))

vi.mock('./callback.targets.js', () => ({
  resolveWebhookPaymentTarget: vi.fn(),
}))

vi.mock('./crypto.js', () => ({
  verifySignature: vi.fn(() => true),
}))

vi.mock('./wayforpay.checkout.js', () => ({
  markCheckoutSessionCompleted: vi.fn(),
  markCheckoutSessionProcessing: vi.fn(),
}))

vi.mock('../../../core/runtime/runtimeIdempotency.js', () => ({
  buildRuntimeTelemetry: vi.fn(() => ({ runtime_stage: 'payment' })),
  withRuntimeAdvisoryLock: vi.fn(),
}))

vi.mock('../../../core/state-machine/securityFoundation.js', () => ({
  buildRequestFingerprint: vi.fn(() => 'fingerprint'),
}))

vi.mock('../../events/contentAttribution.service.js', () => ({
  getContentAttributionEventPayload: vi.fn(),
}))

vi.mock('../../ai-mentor/weekly-analysis/service.js', () => ({
  runWeeklyAnalysis: vi.fn(),
}))

vi.mock('../../../services/notifications/NotificationEvent.js', () => ({
  NotificationEvent: {
    AB_TEST_FOLLOWUP: 'AB_TEST_FOLLOWUP',
  },
}))

import { sendFocusPaymentOnboardingIfNeeded } from './callback.handler.js'

describe('callback.handler — Focus onboarding idempotency', () => {
  const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => undefined)

  beforeEach(() => {
    vi.clearAllMocks()
    mockProductSubscriptionUpdate.mockResolvedValue(undefined)
    mockSendMessage.mockResolvedValue({ message_id: 1 })
    process.env.PUBLIC_FRONTEND_URL = 'https://app.starway.test'
  })

  it('duplicate callback does not resend onboarding when focusWelcomedAt already exists', async () => {
    const sent = await sendFocusPaymentOnboardingIfNeeded({
      userId: 'user-1',
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
      upcomingLines: 'пн, 27.07 19:00 — Zoom',
    })

    expect(sent).toBe(false)
    expect(mockSendMessage).not.toHaveBeenCalled()
    expect(mockProductSubscriptionUpdate).not.toHaveBeenCalled()
  })

  it('skips Telegram onboarding and logs a warning when paid user has no chatId', async () => {
    const sent = await sendFocusPaymentOnboardingIfNeeded({
      userId: 'user-2',
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
    expect(mockSendMessage).not.toHaveBeenCalled()
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
