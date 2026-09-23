import { beforeEach, describe, expect, it, vi } from 'vitest'
import {
  AB_TEST_BOOK_ZOOM_CTA_TEXT,
  AB_TEST_TRIAL_ZOOM_SUCCESS_CTA_TEXT,
} from '@/products/ab-system/content/abTest.shared.js'

const mockProductSubscriptionFindFirst = vi.fn()
const mockProductSubscriptionUpdate = vi.fn()
const mockSubscriptionFindFirst = vi.fn()
const mockCheckoutSessionFindFirst = vi.fn()
const mockCheckoutSessionUpdate = vi.fn()
const mockPaymentLogFindUnique = vi.fn()
const mockPaymentLogFindMany = vi.fn()
const mockUserFindUnique = vi.fn()
const mockUserFindFirst = vi.fn()
const mockRenderOutbound = vi.fn()
const mockSendMessage = vi.fn()
const mockGetOrCreateFocusInviteLink = vi.fn()

vi.mock('@/db/client.js', () => ({
  prisma: {
    productSubscription: {
      findFirst: (...args: unknown[]) => mockProductSubscriptionFindFirst(...args),
      update: (...args: unknown[]) => mockProductSubscriptionUpdate(...args),
    },
    subscription: {
      findFirst: (...args: unknown[]) => mockSubscriptionFindFirst(...args),
    },
    checkoutSession: {
      findFirst: (...args: unknown[]) => mockCheckoutSessionFindFirst(...args),
      update: (...args: unknown[]) => mockCheckoutSessionUpdate(...args),
    },
    paymentLog: {
      findUnique: (...args: unknown[]) => mockPaymentLogFindUnique(...args),
      findMany: (...args: unknown[]) => mockPaymentLogFindMany(...args),
    },
    user: {
      findUnique: (...args: unknown[]) => mockUserFindUnique(...args),
      findFirst: (...args: unknown[]) => mockUserFindFirst(...args),
    },
    telegramLink: {
      findFirst: vi.fn(async () => null),
    },
  },
}))

vi.mock('@/products/focus/payments/inviteLink.js', () => ({
  getOrCreateFocusInviteLink: (...args: unknown[]) => mockGetOrCreateFocusInviteLink(...args),
}))

vi.mock('@/modules/telegram-mentor/conversation/renderers/telegramConversationRenderer.js', () => ({
  TelegramConversationRenderer: class {
    renderOutbound(...args: unknown[]) {
      return mockRenderOutbound(...args)
    }
  },
}))

vi.mock('@/lib/telegram.js', () => ({
  bot: {
    telegram: {
      sendMessage: (...args: unknown[]) => mockSendMessage(...args),
    },
  },
}))

vi.mock('@/config/webapp.js', () => ({
  resolveTelegramWebappBaseUrl: () => 'https://app.starway.test',
}))

import {
  notifyUserFocusPaymentIssueDenied,
  sendAbTestBlock12PostJoin,
  resendFocusAccessTelegramMessage,
  sendAbTestBlock12Welcome,
  sendFocusPaymentSuccessTelegramMessageByOrder,
  sendTrialZoomPaymentSuccessTelegramMessage,
} from '@/modules/subscriptions/payments/callback/notifications.ts'

describe('callback.notifications — canonical Focus URL', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockGetOrCreateFocusInviteLink.mockResolvedValue('https://t.me/+focus-canonical')
    mockProductSubscriptionUpdate.mockResolvedValue(undefined)
    mockCheckoutSessionUpdate.mockResolvedValue(undefined)
    mockSubscriptionFindFirst.mockResolvedValue(null)
    mockPaymentLogFindUnique.mockResolvedValue(null)
    mockPaymentLogFindMany.mockResolvedValue([])
    mockRenderOutbound.mockResolvedValue(true)
    mockSendMessage.mockResolvedValue({ message_id: 1 })
  })

  it('renders active onboarding with zoom, optional channel, and focus menu actions without raw URL text', async () => {
    mockProductSubscriptionFindFirst
      .mockResolvedValueOnce({
        id: 'sub-1',
        focusWelcomedAt: null,
        focusChannelInviteLink: null,
        channelJoinedAt: null,
      })
    mockUserFindUnique
      .mockResolvedValueOnce({
        telegramChatId: 'chat-1',
        telegramLinks: [],
      })

    const welcomeSent = await sendAbTestBlock12Welcome('user-1')

    expect(welcomeSent).toBe(true)
    expect(mockRenderOutbound).toHaveBeenCalledTimes(1)
    expect(mockGetOrCreateFocusInviteLink).toHaveBeenCalledTimes(1)

    const [, response] = mockRenderOutbound.mock.calls[0]
    const serialized = JSON.stringify(response)
    const messageText = String(response.cards?.[0]?.text ?? '')
    expect(serialized).toContain('ПЕРЕЙТИ В КАНАЛ')
    expect(serialized).not.toContain('Відновити доступ')
    expect(serialized).not.toContain('Моя підписка')
    expect(serialized).not.toContain('Меню')
    expect(serialized).not.toContain('Оплатити')
    expect(messageText).not.toContain('https://t.me/+focus-canonical')
    expect(serialized).toContain('"label":"ЗАПИСАТИСЯ НА ZOOM"')
    expect(serialized).toContain('"value":"focus:next_zoom"')
    expect(serialized).toContain('"label":"ПЕРЕЙТИ В КАНАЛ"')
    expect(serialized).toContain('"label":"МЕНЮ ФОКУС"')
    expect(serialized).toContain('"value":"ab_test:menu"')
    expect(serialized).not.toContain('🔗')
  })

  it('renders post-join state as zoom plus focus menu actions', async () => {
    mockProductSubscriptionFindFirst.mockResolvedValueOnce({ id: 'sub-1' })
    mockUserFindUnique.mockResolvedValueOnce({
      telegramChatId: 'chat-1',
      telegramLinks: [],
    })

    const postJoinSent = await sendAbTestBlock12PostJoin('user-1')

    expect(postJoinSent).toBe(true)
    expect(mockRenderOutbound).toHaveBeenCalledTimes(1)

    const [, response] = mockRenderOutbound.mock.calls[0]
    const serialized = JSON.stringify(response)
    expect(serialized).toContain('ЗАПИСАТИСЯ НА ZOOM')
    expect(serialized).toContain('"value":"focus:next_zoom"')
    expect(serialized).not.toContain('ПЕРЕЙТИ В КАНАЛ')
    expect(serialized).toContain('"label":"МЕНЮ ФОКУС"')
    expect(serialized).toContain('"value":"ab_test:menu"')
  })

  it('old resend action returns the current active state instead of skipping', async () => {
    mockProductSubscriptionFindFirst.mockResolvedValue({
      id: 'sub-1',
      focusWelcomedAt: new Date('2026-07-27T08:00:00.000Z'),
      channelJoinedAt: null,
      focusChannelInviteLink: null,
    })
    mockUserFindUnique.mockResolvedValue({
      telegramChatId: 'chat-1',
      telegramLinks: [],
    })

    const resent = await resendFocusAccessTelegramMessage('user-1')

    expect(resent).toBe(true)
    expect(mockRenderOutbound).toHaveBeenCalledTimes(1)
    expect(JSON.stringify(mockRenderOutbound.mock.calls[0][1])).toContain('ПЕРЕЙТИ В КАНАЛ')
  })

  it('notifies the user when OPS denied the payment issue', async () => {
    mockUserFindUnique.mockResolvedValueOnce({
      telegramChatId: 'chat-ops',
      telegramLinks: [],
    })

    const sent = await notifyUserFocusPaymentIssueDenied('user-ops')

    expect(sent).toBe(true)
    expect(mockRenderOutbound).toHaveBeenCalledTimes(1)
    expect(JSON.stringify(mockRenderOutbound.mock.calls[0][1])).toContain('оплата поки не пройшла')
    expect(JSON.stringify(mockRenderOutbound.mock.calls[0][1])).toContain('"kind":"callback","label":"Спробувати ще раз","value":"open_focus_payment"')
  })

  it('does nothing when payment denial cannot resolve a chat id', async () => {
    mockUserFindUnique.mockResolvedValueOnce({
      telegramChatId: null,
      telegramLinks: [],
    })

    const sent = await notifyUserFocusPaymentIssueDenied('user-no-chat')

    expect(sent).toBe(false)
    expect(mockRenderOutbound).not.toHaveBeenCalled()
  })

  it('sends the canonical trial zoom success message with the zoom button', async () => {
    mockCheckoutSessionFindFirst.mockResolvedValueOnce({
      id: 'checkout-trial',
      payload: {},
      orderReference: 'trial_zoom_order_1',
      productCode: 'trial_zoom',
    })
    mockUserFindUnique.mockResolvedValueOnce({
      telegramChatId: 'chat-trial',
      telegramLinks: [],
    })

    const sent = await sendTrialZoomPaymentSuccessTelegramMessage({
      userId: 'user-trial',
      orderReference: 'trial_zoom_order_1',
    })

    expect(sent).toBe(true)
    expect(mockRenderOutbound).toHaveBeenCalledTimes(1)
    const serialized = JSON.stringify(mockRenderOutbound.mock.calls[0][1])
    expect(serialized).toContain('Тобі доступний один пробний Zoom за 1 грн.')
    expect(serialized).toContain('Обери найближчу Zoom-практику та запишись.')
    expect(serialized).toContain(`"label":"${AB_TEST_TRIAL_ZOOM_SUCCESS_CTA_TEXT}"`)
    expect(serialized).toContain('"kind":"web_app"')
    expect(serialized).toContain('"value":"https://app.starway.test/miniapp/zoom-calendar?intent=booking"')
    expect(serialized).not.toContain('Доступ до ФОКУСУ активовано')
    expect(serialized).not.toContain('Перейди в закритий канал')
    expect(serialized).not.toContain('ПЕРЕЙТИ В КАНАЛ')
  })

  it('renders focus payment success with zoom, channel, and focus menu actions', async () => {
    mockCheckoutSessionFindFirst.mockResolvedValue({
      id: 'checkout-focus',
      amount: 780,
      completedAt: new Date('2026-08-22T17:05:00.000Z'),
      createdAt: new Date('2026-08-22T17:03:28.621Z'),
      currency: 'UAH',
      payload: {},
      orderReference: 'focus_1month_11111111-1111-4111-8111-111111111111_456',
      productCode: 'focus',
    })
    mockPaymentLogFindUnique.mockResolvedValueOnce({
      amountCents: 78000,
      currency: 'UAH',
      processedAt: new Date('2026-08-22T17:05:00.000Z'),
      status: 'SUCCESS',
    })
    mockProductSubscriptionFindFirst.mockResolvedValueOnce({
      expiresAt: new Date('2026-09-15T17:03:28.621Z'),
    })
    mockSubscriptionFindFirst.mockResolvedValueOnce({
      currentPeriodEnd: new Date('2026-09-21T17:03:28.621Z'),
    })
    mockPaymentLogFindMany.mockResolvedValueOnce([
      { id: 'pay-1' },
      { id: 'pay-2' },
    ])
    mockUserFindUnique.mockResolvedValueOnce({
      telegramChatId: 'chat-focus',
      telegramLinks: [],
    })

    const sent = await sendFocusPaymentSuccessTelegramMessageByOrder({
      userId: 'user-focus',
      orderReference: 'focus_order_1',
    })

    expect(sent).toBe(true)
    expect(mockSendMessage).toHaveBeenCalledTimes(1)
    const [chatId, messageText, options] = mockSendMessage.mock.calls[0]
    expect(chatId).toBe('chat-focus')
    expect(String(messageText)).toContain('✅ Оплату підтверджено')
    expect(String(messageText)).toContain('Доступ ФОКУС активний ✅')
    expect(String(messageText)).toContain('Продукт: ФОКУС')
    expect(String(messageText)).toContain('Тариф: 1 місяць')
    expect(String(messageText)).toContain('Сплачено: 780 UAH')
    expect(String(messageText)).toContain('Платіж: focus_1month_11111111-1111-4111-8111-111111111111_456')
    expect(String(messageText)).toContain('Доступ активний до: 21.09.2026')
    expect(String(messageText)).toContain('Наступна дія: відкрий календар Zoom.')
    expect(String(messageText)).toContain('Підтверджених оплат: 2')
    expect(String(messageText)).toContain('Попередній оплачений час збережено.')
    expect(JSON.stringify(options)).toContain('ВІДКРИТИ КАЛЕНДАР ZOOM')
    expect(JSON.stringify(options)).toContain('ПЕРЕЙТИ ДО ФОКУСУ')
    expect(JSON.stringify(options)).toContain('ГОЛОВНЕ МЕНЮ')
    expect(JSON.stringify(options)).toContain('open_focus_info')
    expect(JSON.stringify(options)).toContain('return_main_menu')
    expect(mockRenderOutbound).not.toHaveBeenCalled()
  })

  it('dedupes repeated success sends for the same trial orderReference', async () => {
    mockCheckoutSessionFindFirst
      .mockResolvedValueOnce({
        id: 'checkout-trial',
        payload: {},
        orderReference: 'trial_zoom_order_1',
        productCode: 'trial_zoom',
      })
      .mockResolvedValueOnce({
        id: 'checkout-trial',
        payload: {
          telegramPaymentSuccess: {
            deliveredAt: '2026-08-03T18:36:00.000Z',
            productCode: 'trial_zoom',
          },
        },
        orderReference: 'trial_zoom_order_1',
        productCode: 'trial_zoom',
      })
    mockUserFindUnique.mockResolvedValue({
      telegramChatId: 'chat-trial',
      telegramLinks: [],
    })

    const first = await sendTrialZoomPaymentSuccessTelegramMessage({
      userId: 'user-trial',
      orderReference: 'trial_zoom_order_1',
    })
    const second = await sendTrialZoomPaymentSuccessTelegramMessage({
      userId: 'user-trial',
      orderReference: 'trial_zoom_order_1',
    })

    expect(first).toBe(true)
    expect(second).toBe(false)
    expect(mockRenderOutbound).toHaveBeenCalledTimes(1)
    expect(mockCheckoutSessionUpdate).toHaveBeenCalledTimes(1)
  })

  it('dedupes repeated success sends for the same focus orderReference', async () => {
    mockCheckoutSessionFindFirst.mockResolvedValue({
      id: 'checkout-focus',
      amount: 780,
      completedAt: new Date('2026-08-22T17:05:00.000Z'),
      createdAt: new Date('2026-08-22T17:03:28.621Z'),
      currency: 'UAH',
      payload: {
        telegramPaymentSuccess: {
          deliveredAt: '2026-08-22T17:05:00.000Z',
          productCode: 'focus',
        },
      },
      orderReference: 'focus_1month_11111111-1111-4111-8111-111111111111_456',
      productCode: 'focus',
    })
    mockUserFindUnique.mockResolvedValue({
      telegramChatId: 'chat-focus',
      telegramLinks: [],
    })

    const sent = await sendFocusPaymentSuccessTelegramMessageByOrder({
      userId: 'user-focus',
      orderReference: 'focus_1month_11111111-1111-4111-8111-111111111111_456',
    })

    expect(sent).toBe(false)
    expect(mockSendMessage).not.toHaveBeenCalled()
    expect(mockCheckoutSessionUpdate).not.toHaveBeenCalled()
  })
})
