import { afterEach, describe, expect, it } from 'vitest'

import {
  describeLocalTelegramConsumerDisableReason,
  readExpectedTelegramBotUsername,
  readTelegramBotConfig,
  readTelegramVerificationTokens,
  requireTelegramBotConfig,
  resolveLocalTelegramConsumerState,
  resolveTelegramDeliveryMode,
} from './botConfig.js'

const originalTelegramBotToken = process.env.TELEGRAM_BOT_TOKEN
const originalTelegramBotUsername = process.env.TELEGRAM_BOT_USERNAME
const originalTestTelegramBotToken = process.env.TEST_TELEGRAM_BOT_TOKEN
const originalTestTelegramBotUsername = process.env.TEST_TELEGRAM_BOT_USERNAME
const originalLegacyTestBotToken = process.env.TEST_BOT_TOKEN
const originalNodeEnv = process.env.NODE_ENV
const originalTelegramWebhookUrl = process.env.TELEGRAM_WEBHOOK_URL
const originalTelegramDeliveryMode = process.env.TELEGRAM_DELIVERY_MODE

afterEach(() => {
  if (originalTelegramBotToken === undefined) delete process.env.TELEGRAM_BOT_TOKEN
  else process.env.TELEGRAM_BOT_TOKEN = originalTelegramBotToken

  if (originalTelegramBotUsername === undefined) delete process.env.TELEGRAM_BOT_USERNAME
  else process.env.TELEGRAM_BOT_USERNAME = originalTelegramBotUsername

  if (originalTestTelegramBotToken === undefined) delete process.env.TEST_TELEGRAM_BOT_TOKEN
  else process.env.TEST_TELEGRAM_BOT_TOKEN = originalTestTelegramBotToken

  if (originalTestTelegramBotUsername === undefined) delete process.env.TEST_TELEGRAM_BOT_USERNAME
  else process.env.TEST_TELEGRAM_BOT_USERNAME = originalTestTelegramBotUsername

  if (originalLegacyTestBotToken === undefined) delete process.env.TEST_BOT_TOKEN
  else process.env.TEST_BOT_TOKEN = originalLegacyTestBotToken

  if (originalNodeEnv === undefined) delete process.env.NODE_ENV
  else process.env.NODE_ENV = originalNodeEnv

  if (originalTelegramWebhookUrl === undefined) delete process.env.TELEGRAM_WEBHOOK_URL
  else process.env.TELEGRAM_WEBHOOK_URL = originalTelegramWebhookUrl

  if (originalTelegramDeliveryMode === undefined) delete process.env.TELEGRAM_DELIVERY_MODE
  else process.env.TELEGRAM_DELIVERY_MODE = originalTelegramDeliveryMode
})

describe('telegram bot config', () => {
  it('allows missing username while keeping the token required', () => {
    process.env.NODE_ENV = 'test'
    process.env.TEST_TELEGRAM_BOT_TOKEN = 'token'
    delete process.env.TEST_TELEGRAM_BOT_USERNAME

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
    process.env.NODE_ENV = 'test'
    delete process.env.TEST_TELEGRAM_BOT_TOKEN
    delete process.env.TEST_TELEGRAM_BOT_USERNAME

    expect(() => requireTelegramBotConfig('test')).toThrow(
      '[Telegram] Missing required env var during test: TEST_TELEGRAM_BOT_TOKEN',
    )
  })

  it('reads the dedicated test bot token in development', () => {
    process.env.NODE_ENV = 'development'
    process.env.TELEGRAM_BOT_TOKEN = 'prod-token'
    process.env.TELEGRAM_BOT_USERNAME = 'prod_bot'
    process.env.TEST_TELEGRAM_BOT_TOKEN = 'local-token'
    process.env.TEST_TELEGRAM_BOT_USERNAME = 'local_bot'

    expect(readTelegramBotConfig()).toEqual({
      token: 'local-token',
      username: 'local_bot',
      botLink: 'https://t.me/local_bot',
    })
    expect(resolveLocalTelegramConsumerState()).toEqual({
      enabled: true,
      reason: null,
    })
    expect(readExpectedTelegramBotUsername()).toBe('local_bot')
  })

  it('uses the configured production username as the expected bot identity', () => {
    process.env.NODE_ENV = 'production'
    process.env.TELEGRAM_BOT_TOKEN = 'prod-token'
    process.env.TELEGRAM_BOT_USERNAME = 'prod_bot'

    expect(readExpectedTelegramBotUsername()).toBe('prod_bot')
  })

  it.each([
    {
      env: 'development',
      productionToken: 'prod-token',
      productionUsername: 'Test_ABsystem_bot',
      runtimeToken: 'test-token',
      runtimeUsername: 'test_starway_bot',
    },
    {
      env: 'production',
      productionToken: 'prod-token',
      productionUsername: 'Test_ABsystem_bot',
      runtimeToken: 'prod-token',
      runtimeUsername: 'Test_ABsystem_bot',
    },
  ])('keeps one main runtime config for %s without token fallback crossover', ({
    env,
    productionToken,
    productionUsername,
    runtimeToken,
    runtimeUsername,
  }) => {
    process.env.NODE_ENV = env
    process.env.TELEGRAM_BOT_TOKEN = productionToken
    process.env.TELEGRAM_BOT_USERNAME = productionUsername
    process.env.TEST_TELEGRAM_BOT_TOKEN = 'test-token'
    process.env.TEST_TELEGRAM_BOT_USERNAME = 'test_starway_bot'
    process.env.TEST_BOT_TOKEN = 'legacy-test-bot-token'

    expect(readTelegramBotConfig()).toEqual({
      token: runtimeToken,
      username: runtimeUsername,
      botLink: `https://t.me/${runtimeUsername}`,
    })

    expect(readTelegramVerificationTokens()).toContain(runtimeToken)
    expect(readTelegramVerificationTokens()).toContain('legacy-test-bot-token')
    expect(readTelegramVerificationTokens()[0]).toBe(runtimeToken)
  })

  it('disables the local telegram consumer when the test token is missing', () => {
    process.env.NODE_ENV = 'development'
    process.env.TELEGRAM_BOT_TOKEN = 'prod-token'
    delete process.env.TEST_TELEGRAM_BOT_TOKEN

    expect(resolveLocalTelegramConsumerState()).toEqual({
      enabled: false,
      reason: 'missing_test_token',
    })
    expect(
      describeLocalTelegramConsumerDisableReason('missing_test_token'),
    ).toBe('TEST_TELEGRAM_BOT_TOKEN is missing')
  })

  it('disables the local telegram consumer when test and production tokens match', () => {
    process.env.NODE_ENV = 'development'
    process.env.TELEGRAM_BOT_TOKEN = 'shared-token'
    process.env.TEST_TELEGRAM_BOT_TOKEN = 'shared-token'

    expect(resolveLocalTelegramConsumerState()).toEqual({
      enabled: false,
      reason: 'same_as_production_token',
    })
    expect(
      describeLocalTelegramConsumerDisableReason('same_as_production_token'),
    ).toBe('TEST_TELEGRAM_BOT_TOKEN matches TELEGRAM_BOT_TOKEN')
  })

  it('keeps production runtime enabled without local token checks', () => {
    process.env.NODE_ENV = 'production'
    process.env.TELEGRAM_BOT_TOKEN = 'prod-token'
    delete process.env.TEST_TELEGRAM_BOT_TOKEN

    expect(resolveLocalTelegramConsumerState()).toEqual({
      enabled: true,
      reason: null,
    })
  })

  it('resolves webhook mode when a webhook url exists', () => {
    process.env.NODE_ENV = 'development'
    process.env.TELEGRAM_WEBHOOK_URL = 'https://example.com'
    delete process.env.TELEGRAM_DELIVERY_MODE

    expect(resolveTelegramDeliveryMode()).toBe('polling')
  })

  it('keeps explicit polling override even when webhook url exists', () => {
    process.env.NODE_ENV = 'development'
    process.env.TELEGRAM_WEBHOOK_URL = 'https://example.com'
    process.env.TELEGRAM_DELIVERY_MODE = 'polling'

    expect(resolveTelegramDeliveryMode()).toBe('polling')
  })
})
