import { beforeEach, describe, expect, it, vi } from 'vitest'

const mockCheckoutSessionFindFirst = vi.fn()
const mockCheckoutSessionFindMany = vi.fn()
const mockCheckoutSessionUpdate = vi.fn()
const mockSendOpsTelegramMessage = vi.fn()

vi.mock('../../../db/client.js', () => ({
  prisma: {
    checkoutSession: {
      findFirst: (...args: unknown[]) => mockCheckoutSessionFindFirst(...args),
      findMany: (...args: unknown[]) => mockCheckoutSessionFindMany(...args),
      update: (...args: unknown[]) => mockCheckoutSessionUpdate(...args),
    },
  },
}))

vi.mock('../../../lib/telegram.js', () => ({
  sendOpsTelegramMessage: (...args: unknown[]) => mockSendOpsTelegramMessage(...args),
}))

import {
  alertCoachAboutPaymentIssue,
  findRelevantFocusCheckoutSession,
} from './coachAlert.service.js'

describe('coachAlert.service', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('prefers the currently opened checkout session even when it is a trial zoom', async () => {
    mockCheckoutSessionFindMany.mockResolvedValueOnce([
      {
        token: 'open-token',
        orderReference: 'trial_zoom_order',
        amount: 1,
        currency: 'UAH',
        productCode: 'trial_zoom',
        status: 'OPENED',
        lastOpenedAt: new Date('2026-08-03T16:08:00.000Z'),
        openedAt: new Date('2026-08-03T16:08:00.000Z'),
      },
      {
        token: 'focus-token',
        orderReference: 'focus_open_order',
        amount: 1,
        currency: 'UAH',
        productCode: 'focus',
        status: 'CREATED',
        lastOpenedAt: null,
        openedAt: null,
      },
    ])

    const result = await findRelevantFocusCheckoutSession('user-1')

    expect(result).toEqual({
      token: 'open-token',
      orderReference: 'trial_zoom_order',
      amount: 1,
      currency: 'UAH',
      productCode: 'trial_zoom',
    })
    expect(mockCheckoutSessionFindMany).toHaveBeenCalledTimes(1)
  })

  it('sends payment issue alerts through the canonical ops transport', async () => {
    mockCheckoutSessionUpdate.mockResolvedValue(undefined)
    mockSendOpsTelegramMessage.mockResolvedValue(true)

    await alertCoachAboutPaymentIssue({
      bot: {} as never,
      coachChatId: '3829747010',
      userId: 'user-1',
      checkoutToken: 'checkout-token',
      orderReference: 'focus_order_1',
      amount: 1500,
      currency: 'UAH',
      productCode: 'focus',
      reason: 'manual review requested',
      scenario: 'E',
    })

    expect(mockCheckoutSessionUpdate).toHaveBeenCalledWith({
      where: { token: 'checkout-token' },
      data: { paymentIssueReportedAt: expect.any(Date) },
    })
    expect(mockSendOpsTelegramMessage).toHaveBeenCalledWith(
      expect.stringContaining('focus_order_1'),
      expect.objectContaining({
        parse_mode: 'HTML',
        reply_markup: {
          inline_keyboard: [[
            expect.objectContaining({
              callback_data: 'admin:grant_focus:checkout-token',
            }),
            expect.objectContaining({
              callback_data: 'admin:deny_focus:checkout-token',
            }),
          ]],
        },
      }),
      {
        messageType: 'focus_payment_issue',
        source: 'alertCoachAboutPaymentIssue',
      },
    )
  })

  it('renders trial-specific coach actions for a trial zoom payment issue', async () => {
    mockCheckoutSessionUpdate.mockResolvedValue(undefined)
    mockSendOpsTelegramMessage.mockResolvedValue(true)

    await alertCoachAboutPaymentIssue({
      bot: {} as never,
      coachChatId: '3829747010',
      userId: 'user-1',
      checkoutToken: 'trial-token',
      orderReference: 'trial_zoom_order_1',
      amount: 1,
      currency: 'UAH',
      productCode: 'trial_zoom',
      reason: 'manual review requested',
      scenario: 'E',
    })

    expect(mockSendOpsTelegramMessage).toHaveBeenCalledWith(
      expect.stringContaining('Пробний Zoom — 1 грн'),
      expect.objectContaining({
        reply_markup: {
          inline_keyboard: [[
            expect.objectContaining({
              text: '✅ ПІДТВЕРДИТИ ПРОБНИЙ ZOOM',
              callback_data: 'admin:grant_trial_zoom:trial-token',
            }),
            expect.objectContaining({
              text: '💬 ЗАПИТАТИ ДЕТАЛІ',
              callback_data: 'admin:ask_payment_details:trial-token',
            }),
          ]],
        },
      }),
      expect.any(Object),
    )
  })
})
