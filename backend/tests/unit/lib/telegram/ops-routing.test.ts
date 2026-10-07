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
})
