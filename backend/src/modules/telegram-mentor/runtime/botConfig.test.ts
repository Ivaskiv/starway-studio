import { afterEach, describe, expect, it } from 'vitest'

import {
  readTelegramBotConfig,
  requireTelegramBotConfig,
  resolveTelegramDeliveryMode,
} from './botConfig.js'

const originalTelegramBotToken = process.env.TELEGRAM_BOT_TOKEN
const originalTelegramBotUsername = process.env.TELEGRAM_BOT_USERNAME
const originalTelegramLocalBotToken = process.env.TELEGRAM_LOCAL_BOT_TOKEN
const originalTelegramLocalBotUsername = process.env.TELEGRAM_LOCAL_BOT_USERNAME
const originalNodeEnv = process.env.NODE_ENV
const originalTelegramWebhookUrl = process.env.TELEGRAM_WEBHOOK_URL
const originalTelegramDeliveryMode = process.env.TELEGRAM_DELIVERY_MODE

afterEach(() => {
  if (originalTelegramBotToken === undefined) delete process.env.TELEGRAM_BOT_TOKEN
  else process.env.TELEGRAM_BOT_TOKEN = originalTelegramBotToken

  if (originalTelegramBotUsername === undefined) delete process.env.TELEGRAM_BOT_USERNAME
  else process.env.TELEGRAM_BOT_USERNAME = originalTelegramBotUsername

  if (originalTelegramLocalBotToken === undefined) delete process.env.TELEGRAM_LOCAL_BOT_TOKEN
  else process.env.TELEGRAM_LOCAL_BOT_TOKEN = originalTelegramLocalBotToken

  if (originalTelegramLocalBotUsername === undefined) delete process.env.TELEGRAM_LOCAL_BOT_USERNAME
  else process.env.TELEGRAM_LOCAL_BOT_USERNAME = originalTelegramLocalBotUsername

  if (originalNodeEnv === undefined) delete process.env.NODE_ENV
  else process.env.NODE_ENV = originalNodeEnv

  if (originalTelegramWebhookUrl === undefined) delete process.env.TELEGRAM_WEBHOOK_URL
  else process.env.TELEGRAM_WEBHOOK_URL = originalTelegramWebhookUrl

  if (originalTelegramDeliveryMode === undefined) delete process.env.TELEGRAM_DELIVERY_MODE
  else process.env.TELEGRAM_DELIVERY_MODE = originalTelegramDeliveryMode
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

  it('prefers the local bot token in development', () => {
    process.env.NODE_ENV = 'development'
    process.env.TELEGRAM_BOT_TOKEN = 'prod-token'
    process.env.TELEGRAM_BOT_USERNAME = 'prod_bot'
    process.env.TELEGRAM_LOCAL_BOT_TOKEN = 'local-token'
    process.env.TELEGRAM_LOCAL_BOT_USERNAME = 'local_bot'

    expect(readTelegramBotConfig()).toEqual({
      token: 'local-token',
      username: 'local_bot',
      botLink: 'https://t.me/local_bot',
    })
  })

  it('resolves webhook mode only in production when a webhook url exists', () => {
    process.env.NODE_ENV = 'production'
    process.env.TELEGRAM_WEBHOOK_URL = 'https://example.com'
    delete process.env.TELEGRAM_DELIVERY_MODE

    expect(resolveTelegramDeliveryMode()).toBe('webhook')
  })
})
