import { describe, expect, it, vi } from 'vitest'

const sendByToken = vi.hoisted(() => new Map<string, ReturnType<typeof vi.fn>>())

vi.mock('telegraf', () => ({
  Telegraf: class {
    telegram: Record<string, ReturnType<typeof vi.fn>>

    constructor(token: string) {
      const sendMessage = vi.fn().mockResolvedValue({ message_id: 1 })
      sendByToken.set(token, sendMessage)
      this.telegram = {
        sendMessage,
        sendPhoto: vi.fn(),
        sendVoice: vi.fn(),
        sendVideo: vi.fn(),
        sendDocument: vi.fn(),
        sendAudio: vi.fn(),
        editMessageText: vi.fn(),
        editMessageCaption: vi.fn(),
      }
    }
  },
}))

import { sendOpsTelegramMessage } from '@/lib/telegram.ts'

describe('sendOpsTelegramMessage', () => {
  it('uses the canonical main OPS sender first without probing the coach bot', async () => {
    process.env.TEST_TELEGRAM_BOT_TOKEN = 'main-ops-token'
    process.env.TEST_COACH_BOT_TOKEN = 'coach-token'
    process.env.STARWAY_OPS_CHAT_ID = '-1003829747010'

    await expect(sendOpsTelegramMessage('OPS routing regression')).resolves.toBe(true)

    expect(sendByToken.get('main-ops-token')).toHaveBeenCalledTimes(1)
    expect(sendByToken.get('main-ops-token')).toHaveBeenCalledWith(
      '-1003829747010',
      'OPS routing regression',
      { parse_mode: 'HTML' },
    )
    expect(sendByToken.get('coach-token')).toBeUndefined()
  })

  it('exposes the Telegram message receipt to the existing sender callback', async () => {
    process.env.TEST_TELEGRAM_BOT_TOKEN = 'main-ops-token'
    process.env.STARWAY_OPS_CHAT_ID = '-1003829747010'
    const receipt = vi.fn()

    await expect(sendOpsTelegramMessage('OPS receipt regression', undefined, undefined, receipt)).resolves.toBe(true)

    expect(receipt).toHaveBeenCalledWith({ messageId: '1' })
  })

  it('does not fall back to the coach bot when a manual operational send forbids it', async () => {
    process.env.TEST_TELEGRAM_BOT_TOKEN = 'main-ops-token'
    process.env.TEST_COACH_BOT_TOKEN = 'coach-token'
    process.env.STARWAY_OPS_CHAT_ID = '-1003829747010'

    const mainSend = sendByToken.get('main-ops-token')
    const callsBefore = mainSend?.mock.calls.length ?? 0
    mainSend?.mockRejectedValueOnce(new Error('main bot unavailable'))

    await expect(sendOpsTelegramMessage('manual resend', undefined, { allowCoachFallback: false })).resolves.toBe(false)

    expect(mainSend).toHaveBeenCalledTimes(callsBefore + 1)
    expect(sendByToken.get('coach-token')).toBeUndefined()
  })
})
