import { beforeEach, describe, expect, it, vi } from 'vitest'

const mockProductSubscriptionUpdate = vi.fn()
const mockSendMessage = vi.fn()

vi.mock('../../../../db/client.ts', () => ({
  prisma: {
    productSubscription: {
      update: (...args: unknown[]) => mockProductSubscriptionUpdate(...args),
    },
  },
}))

vi.mock('../../../../lib/telegram.ts', () => ({
  bot: {
    telegram: {
      sendMessage: (...args: unknown[]) => mockSendMessage(...args),
    },
  },
  coachBot: {},
  sendOpsTelegramMessage: vi.fn(),
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

import { sendFocusPaymentOnboardingIfNeeded } from '../callback/handler.ts'
import { wayForPayCallback } from '../callback/handler.ts'
import { processPaymentWebhook } from '../callback/processing.ts'
import { verifySignature } from '../wayforpay/signature.ts'

describe('callback.handler — Focus onboarding idempotency', () => {
  const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => undefined)

  beforeEach(() => {
    vi.clearAllMocks()
    mockProductSubscriptionUpdate.mockResolvedValue(undefined)
    mockSendMessage.mockResolvedValue({ message_id: 1 })
    process.env.PUBLIC_FRONTEND_URL = 'https://app.starway.test'
  })

  function createRes() {
    const res = {
      status: vi.fn().mockReturnThis(),
      send: vi.fn().mockReturnThis(),
      json: vi.fn().mockReturnThis(),
    }

    return res as any
  }

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

  it('rejects invalid WayForPay signature before payment processing', async () => {
    vi.mocked(verifySignature).mockReturnValue(false)
    const req = {
      body: {
        order_reference: 'trial_zoom_single_11111111-1111-4111-8111-111111111111_123',
        amount: 1,
        currency: 'UAH',
        transaction_status: 'Approved',
        merchant_signature: 'bad-signature',
      },
      method: 'POST',
      path: '/api/subscriptions/payments/wayforpay/callback',
      ip: '127.0.0.1',
      headers: {},
    } as any
    const res = createRes()

    await wayForPayCallback(req, res)

    expect(res.status).toHaveBeenCalledWith(400)
    expect(res.send).toHaveBeenCalledWith('FAIL')
    expect(vi.mocked(processPaymentWebhook)).not.toHaveBeenCalled()
  })

  it('does not mark payment as paid for non-approved trial callback', async () => {
    vi.mocked(verifySignature).mockReturnValue(true)
    const req = {
      body: {
        order_reference: 'trial_zoom_single_11111111-1111-4111-8111-111111111111_123',
        amount: 1,
        currency: 'UAH',
        transaction_status: 'Declined',
        clientAccountId: '11111111-1111-4111-8111-111111111111',
        merchant_signature: '0123456789abcdef0123456789abcdef',
      },
      method: 'POST',
      path: '/api/subscriptions/payments/wayforpay/callback',
      ip: '127.0.0.1',
      headers: {},
    } as any
    const res = createRes()

    await wayForPayCallback(req, res)

    expect(res.status).toHaveBeenCalledWith(200)
    expect(res.send).toHaveBeenCalledWith('OK')
    expect(vi.mocked(processPaymentWebhook)).not.toHaveBeenCalled()
  })
})
