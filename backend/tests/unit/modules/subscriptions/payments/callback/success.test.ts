import { describe, expect, it, vi } from 'vitest'

const transactionMock = vi.fn()
const markAbTestPaymentSuccessMock = vi.fn()
const markCheckoutSessionCompletedMock = vi.fn()
const activateProductSubscriptionMock = vi.fn()
const trackEventMock = vi.fn()
const handleFocusPaymentSuccessMock = vi.fn()

vi.mock('@/db/client.js', () => ({
  prisma: { $transaction: (...args: unknown[]) => transactionMock(...args) },
}))
vi.mock('@/products/ab-system/telegram/service.js', () => ({
  markAbTestPaymentSuccess: (...args: unknown[]) => markAbTestPaymentSuccessMock(...args),
}))
vi.mock('@/modules/subscriptions/payments/wayforpay/checkout.js', () => ({
  markCheckoutSessionCompleted: (...args: unknown[]) => markCheckoutSessionCompletedMock(...args),
}))
vi.mock('@/modules/subscriptions/payments/activation.js', () => ({
  activateProductSubscription: (...args: unknown[]) => activateProductSubscriptionMock(...args),
}))
vi.mock('@/modules/events/service.js', () => ({
  trackEvent: (...args: unknown[]) => trackEventMock(...args),
}))
vi.mock('@/modules/subscriptions/payments/callback/focus.js', () => ({
  handleFocusPaymentSuccess: (...args: unknown[]) => handleFocusPaymentSuccessMock(...args),
}))
vi.mock('@/modules/telegram-mentor/handlers/billing.js', () => ({ sendBillingSuccessTelegramMessage: vi.fn() }))
vi.mock('@/modules/subscriptions/payments/callback/notifications.js', () => ({
  sendAbsystemPaymentSuccessTelegramMessage: vi.fn(),
  sendTrialZoomPaymentSuccessTelegramMessage: vi.fn(),
}))
vi.mock('@/modules/zoom/private/zoom.private-booking.service.js', () => ({ notifyPrivateSessionPayment: vi.fn() }))

import { handleApprovedPayment } from '@/modules/subscriptions/payments/callback/success.ts'

describe('handleApprovedPayment', () => {
  it('commits payment writes before the Focus AB marker and preserves payment success when that marker fails', async () => {
    let committed = false
    const tx = { user: { update: vi.fn() } }
    transactionMock.mockImplementation(async (callback: (client: typeof tx) => Promise<void>) => {
      await callback(tx)
      committed = true
    })
    markCheckoutSessionCompletedMock.mockResolvedValue(undefined)
    activateProductSubscriptionMock.mockResolvedValue(undefined)
    markAbTestPaymentSuccessMock.mockImplementation(async () => {
      expect(committed).toBe(true)
      throw new Error('marker unavailable')
    })
    trackEventMock.mockResolvedValue(undefined)
    handleFocusPaymentSuccessMock.mockResolvedValue(undefined)

    await expect(handleApprovedPayment({
      userId: 'user-1',
      data: { order_reference: 'focus_1month_user-1_1', amount: 1, currency: 'UAH' },
      webhookResult: { scope: 'ecosystem', productId: 'focus', planId: '1month', ecosystemPlanId: '1month' },
      state: null,
      productId: 'focus',
      payRef: 'focus_1month_user-1_1',
      amount: 1,
      requestFingerprint: 'fingerprint',
    })).resolves.toBeUndefined()

    expect(markCheckoutSessionCompletedMock).toHaveBeenCalledWith('focus_1month_user-1_1', tx)
    expect(markAbTestPaymentSuccessMock).toHaveBeenCalledWith('user-1')
    expect(markAbTestPaymentSuccessMock).not.toHaveBeenCalledWith('user-1', tx)
  })
})
