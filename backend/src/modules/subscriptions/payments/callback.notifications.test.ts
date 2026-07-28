import { beforeEach, describe, expect, it, vi } from 'vitest'

const mockProductSubscriptionFindFirst = vi.fn()
const mockProductSubscriptionUpdate = vi.fn()
const mockUserFindUnique = vi.fn()
const mockUserFindFirst = vi.fn()
const mockRenderOutbound = vi.fn()
const mockSendMessage = vi.fn()
const mockGetOrCreateFocusInviteLink = vi.fn()

vi.mock('../../../db/client.js', () => ({
  prisma: {
    productSubscription: {
      findFirst: (...args: unknown[]) => mockProductSubscriptionFindFirst(...args),
      update: (...args: unknown[]) => mockProductSubscriptionUpdate(...args),
    },
    user: {
      findUnique: (...args: unknown[]) => mockUserFindUnique(...args),
      findFirst: (...args: unknown[]) => mockUserFindFirst(...args),
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
  sendAbTestBlock12PostJoin,
  resendFocusAccessTelegramMessage,
  sendAbTestBlock12Welcome,
} from './callback.notifications.js'

describe('callback.notifications — canonical Focus URL', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockGetOrCreateFocusInviteLink.mockResolvedValue('https://t.me/+focus-canonical')
    mockProductSubscriptionUpdate.mockResolvedValue(undefined)
    mockRenderOutbound.mockResolvedValue(true)
    mockSendMessage.mockResolvedValue({ message_id: 1 })
  })

  it('renders active onboarding as a single channel CTA without raw URL text', async () => {
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
    expect(serialized).not.toContain('Записатись на Zoom')
    expect(serialized).not.toContain('🔗')
    expect(serialized).toContain('"buttons":[{"kind":"url","label":"ПЕРЕЙТИ В КАНАЛ","value":"https://t.me/+focus-canonical"}]')
  })

  it('renders post-join state as a single zoom CTA', async () => {
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
    expect(serialized).toContain('ОБРАТИ ZOOM')
    expect(serialized).not.toContain('ПЕРЕЙТИ В КАНАЛ')
    expect(serialized).not.toContain('Меню')
    expect(serialized).not.toContain('/miniapp/zoom-calendar?intent=booking')
    expect(serialized).toContain('/miniapp/zoom-calendar')
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
})
