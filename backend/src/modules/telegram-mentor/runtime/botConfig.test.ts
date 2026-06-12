import { afterEach, describe, expect, it } from 'vitest'

import { readTelegramBotConfig, requireTelegramBotConfig } from './botConfig.js'

const originalTelegramBotToken = process.env.TELEGRAM_BOT_TOKEN
const originalTelegramBotUsername = process.env.TELEGRAM_BOT_USERNAME

afterEach(() => {
  if (originalTelegramBotToken === undefined) delete process.env.TELEGRAM_BOT_TOKEN
  else process.env.TELEGRAM_BOT_TOKEN = originalTelegramBotToken

  if (originalTelegramBotUsername === undefined) delete process.env.TELEGRAM_BOT_USERNAME
  else process.env.TELEGRAM_BOT_USERNAME = originalTelegramBotUsername
})

describe('telegram bot config', () => {
  it('allows missing username while keeping the token required', () => {
    process.env.TELEGRAM_BOT_TOKEN = 'token'
    delete process.env.TELEGRAM_BOT_USERNAME

    expect(readTelegramBotConfig()).toEqual({
      token: 'token',
      username: '',
      botLink: '',
    })
    expect(requireTelegramBotConfig('test')).toEqual({
      token: 'token',
      username: '',
      botLink: '',
    })
  })

  it('still requires the telegram token', () => {
    delete process.env.TELEGRAM_BOT_TOKEN
    delete process.env.TELEGRAM_BOT_USERNAME

    expect(() => requireTelegramBotConfig('test')).toThrow(
      '[Telegram] Missing required env var during test: TELEGRAM_BOT_TOKEN',
    )
  })
})
