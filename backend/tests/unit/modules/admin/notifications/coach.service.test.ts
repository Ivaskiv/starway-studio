import { beforeEach, describe, expect, it, vi } from 'vitest'

const mockSendTelegramMessage = vi.fn()
const coachBot = { id: 'coach-bot' } as const

vi.mock('@/lib/telegram/messageFormatter.js', () => ({
  sendTelegramMessage: (...args: unknown[]) => mockSendTelegramMessage(...args),
}))

import { notifyCoachAboutSuccessfulPayment } from '@/modules/admin/notifications/coach.service.js'

describe('notifyCoachAboutSuccessfulPayment', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockSendTelegramMessage.mockResolvedValue(true)
  })

  it('sends canonical focus payment success through the formatter owner with canonical expiry', async () => {
    const sent = await notifyCoachAboutSuccessfulPayment({
      coachBot,
      coachChatId: 'coach-chat-id',
      userId: 'user-1',
      userLabel: 'Віра · vira@example.com',
      productLabel: 'ФОКУС',
      planLabel: '1 місяць',
      amount: 780,
      currency: 'UAH',
      orderReference: 'focus_1month_11111111-1111-4111-8111-111111111111_456',
      finalExpiresAt: new Date('2026-09-21T17:03:28.621Z'),
    })

    expect(sent).toBe(true)
    expect(mockSendTelegramMessage).toHaveBeenCalledTimes(1)
    const [passedBot, chatId, payload] = mockSendTelegramMessage.mock.calls[0]
    expect(passedBot).toBe(coachBot)
    expect(chatId).toBe('coach-chat-id')
    expect(payload).toEqual(
      expect.objectContaining({
        parseMode: 'HTML',
      }),
    )
    expect(String(payload.text)).toContain('✅ Оплату підтверджено')
    expect(String(payload.text)).toContain('userId: <code>user-1</code>')
    expect(String(payload.text)).toContain('Віра · vira@example.com')
    expect(String(payload.text)).toContain('Продукт: ФОКУС')
    expect(String(payload.text)).toContain('Тариф: 1 місяць')
    expect(String(payload.text)).toContain('Сума: 780 UAH')
    expect(String(payload.text)).toContain('Платіж: <code>focus_1month_11111111-1111-4111-8111-111111111111_456</code>')
    expect(String(payload.text)).toContain('Доступ активний до: 21.09.2026')
  })
})
