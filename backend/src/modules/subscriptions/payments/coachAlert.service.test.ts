import { beforeEach, describe, expect, it, vi } from 'vitest'

const mockCheckoutSessionFindFirst = vi.fn()
const mockCheckoutSessionUpdate = vi.fn()
const mockSendOpsTelegramMessage = vi.fn()

vi.mock('../../../db/client.js', () => ({
  prisma: {
    checkoutSession: {
      findFirst: (...args: unknown[]) => mockCheckoutSessionFindFirst(...args),
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

  it('prefers an unresolved focus checkout session', async () => {
    mockCheckoutSessionFindFirst
      .mockResolvedValueOnce({
        token: 'open-token',
        orderReference: 'focus_open_order',
        amount: 1500,
      })

    const result = await findRelevantFocusCheckoutSession('user-1')

    expect(result).toEqual({
      token: 'open-token',
      orderReference: 'focus_open_order',
      amount: 1500,
    })
    expect(mockCheckoutSessionFindFirst).toHaveBeenCalledTimes(1)
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
})
