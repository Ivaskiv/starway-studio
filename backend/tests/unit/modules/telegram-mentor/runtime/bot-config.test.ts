import { afterEach, describe, expect, it } from 'vitest'

import {
  assertTelegramBotIdentity,
  describeLocalTelegramConsumerDisableReason,
  readCoachBotToken,
  readCoachBotName,
  readExpectedTelegramBotUsername,
  readTelegramBotConfig,
  readTelegramVerificationTokens,
  requireTelegramBotConfig,
  resolveLocalTelegramConsumerState,
  resolveTelegramDeliveryMode,
} from '../../../../../src/modules/telegram-mentor/runtime/botConfig.ts'

const originalTelegramBotToken = process.env.TELEGRAM_BOT_TOKEN
const originalTelegramBotUsername = process.env.TELEGRAM_BOT_USERNAME
const originalTestTelegramBotToken = process.env.TEST_TELEGRAM_BOT_TOKEN
const originalTestTelegramBotUsername = process.env.TEST_TELEGRAM_BOT_USERNAME
const originalLegacyTestBotToken = process.env.TEST_BOT_TOKEN
const originalContentBotToken = process.env.CONTENT_BOT_TOKEN
const originalCoachBotToken = process.env.COACH_BOT_TOKEN
const originalTestCoachBotToken = process.env.TEST_COACH_BOT_TOKEN
const originalCoachBotName = process.env.COACH_BOT_NAME
const originalTestCoachBotName = process.env.TEST_COACH_BOT_NAME
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

  if (originalContentBotToken === undefined) delete process.env.CONTENT_BOT_TOKEN
  else process.env.CONTENT_BOT_TOKEN = originalContentBotToken

  if (originalCoachBotToken === undefined) delete process.env.COACH_BOT_TOKEN
  else process.env.COACH_BOT_TOKEN = originalCoachBotToken

  if (originalTestCoachBotToken === undefined) delete process.env.TEST_COACH_BOT_TOKEN
  else process.env.TEST_COACH_BOT_TOKEN = originalTestCoachBotToken

  if (originalCoachBotName === undefined) delete process.env.COACH_BOT_NAME
  else process.env.COACH_BOT_NAME = originalCoachBotName

  if (originalTestCoachBotName === undefined) delete process.env.TEST_COACH_BOT_NAME
  else process.env.TEST_COACH_BOT_NAME = originalTestCoachBotName

  if (originalNodeEnv === undefined) delete process.env.NODE_ENV
  else process.env.NODE_ENV = originalNodeEnv

  if (originalTelegramWebhookUrl === undefined) delete process.env.TELEGRAM_WEBHOOK_URL
  else process.env.TELEGRAM_WEBHOOK_URL = originalTelegramWebhookUrl

  if (originalTelegramDeliveryMode === undefined) delete process.env.TELEGRAM_DELIVERY_MODE
  else process.env.TELEGRAM_DELIVERY_MODE = originalTelegramDeliveryMode
})

describe('telegram bot config', () => {
  it('still requires the telegram token', () => {
    process.env.NODE_ENV = 'test'
    process.env.TELEGRAM_BOT_TOKEN = 'prod-token-that-must-not-be-used'
    delete process.env.TEST_TELEGRAM_BOT_TOKEN
    delete process.env.TEST_TELEGRAM_BOT_USERNAME

    expect(() => requireTelegramBotConfig('test')).toThrow(
      '[Telegram] Missing required env var during test: TEST_TELEGRAM_BOT_TOKEN',
    )
  })

  it('rejects production runtime when the production token is missing even if the test token exists', () => {
    process.env.NODE_ENV = 'production'
    process.env.TEST_TELEGRAM_BOT_TOKEN = 'test-token-that-must-not-be-used'
    process.env.TEST_TELEGRAM_BOT_USERNAME = 'test_starway_bot'
    delete process.env.TELEGRAM_BOT_TOKEN
    process.env.TELEGRAM_BOT_USERNAME = 'Test_ABsystem_bot'

    expect(() => requireTelegramBotConfig('production test')).toThrow(
      '[Telegram] Missing required env var during production test: TELEGRAM_BOT_TOKEN',
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

  it('reads the dedicated coach token by runtime and keeps local coach empty when TEST_COACH_BOT_TOKEN is missing', () => {
    process.env.NODE_ENV = 'development'
    process.env.COACH_BOT_TOKEN = 'prod-coach-token'
    delete process.env.TEST_COACH_BOT_TOKEN

    expect(readCoachBotToken()).toBe('')

    process.env.TEST_COACH_BOT_TOKEN = 'local-coach-token'
    expect(readCoachBotToken()).toBe('local-coach-token')

    process.env.NODE_ENV = 'production'
    expect(readCoachBotToken()).toBe('prod-coach-token')
  })

  it('reads the dedicated coach name by runtime without falling back to prod identity in development', () => {
    process.env.NODE_ENV = 'development'
    process.env.COACH_BOT_NAME = 'StarwayDNACoach'
    delete process.env.TEST_COACH_BOT_NAME

    expect(readCoachBotName()).toBe('StarwayDNACoachTest_bot')

    process.env.TEST_COACH_BOT_NAME = 'StarwayDNACoachTest'
    expect(readCoachBotName()).toBe('StarwayDNACoachTest')

    process.env.NODE_ENV = 'production'
    expect(readCoachBotName()).toBe('StarwayDNACoach')
  })

  it('uses the configured production username as the expected bot identity', () => {
    process.env.NODE_ENV = 'production'
    process.env.TELEGRAM_BOT_TOKEN = 'prod-token'
    process.env.TELEGRAM_BOT_USERNAME = 'Test_ABsystem_bot'

    expect(readExpectedTelegramBotUsername()).toBe('Test_ABsystem_bot')
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
    if (env === 'production') {
      expect(readTelegramVerificationTokens()).toContain('prod-token')
    }
  })

  it('uses TEST_COACH_BOT_TOKEN in development verification tokens and never injects COACH_BOT_TOKEN there', () => {
    process.env.NODE_ENV = 'development'
    process.env.TEST_TELEGRAM_BOT_TOKEN = 'test-main-token'
    process.env.TELEGRAM_BOT_TOKEN = 'prod-main-token'
    process.env.TEST_COACH_BOT_TOKEN = 'dev-coach-token'
    process.env.COACH_BOT_TOKEN = 'prod-coach-token'

    const tokens = readTelegramVerificationTokens()

    expect(tokens).toContain('dev-coach-token')
    expect(tokens).not.toContain('prod-coach-token')
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

  it('disables the local telegram consumer when test and content tokens match', () => {
    process.env.NODE_ENV = 'development'
    process.env.TEST_TELEGRAM_BOT_TOKEN = 'shared-token'
    process.env.CONTENT_BOT_TOKEN = 'shared-token'

    expect(resolveLocalTelegramConsumerState()).toEqual({
      enabled: false,
      reason: 'same_as_content_token',
    })
    expect(
      describeLocalTelegramConsumerDisableReason('same_as_content_token'),
    ).toBe('TEST_TELEGRAM_BOT_TOKEN matches CONTENT_BOT_TOKEN')
    expect(() => requireTelegramBotConfig('test')).toThrow(
      '[Telegram] Invalid local test bot config during test: TEST_TELEGRAM_BOT_TOKEN matches CONTENT_BOT_TOKEN',
    )
  })

  it('disables the local telegram consumer when test and coach tokens match', () => {
    process.env.NODE_ENV = 'development'
    process.env.TEST_TELEGRAM_BOT_TOKEN = 'shared-token'
    process.env.COACH_BOT_TOKEN = 'shared-token'

    expect(resolveLocalTelegramConsumerState()).toEqual({
      enabled: false,
      reason: 'same_as_coach_token',
    })
    expect(
      describeLocalTelegramConsumerDisableReason('same_as_coach_token'),
    ).toBe('TEST_TELEGRAM_BOT_TOKEN matches COACH_BOT_TOKEN')
    expect(() => requireTelegramBotConfig('test')).toThrow(
      '[Telegram] Invalid local test bot config during test: TEST_TELEGRAM_BOT_TOKEN matches COACH_BOT_TOKEN',
    )
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

  it('keeps local runtime on polling even when a webhook url exists', () => {
    process.env.NODE_ENV = 'development'
    process.env.TELEGRAM_WEBHOOK_URL = 'https://example.com'
    delete process.env.TELEGRAM_DELIVERY_MODE

    expect(resolveTelegramDeliveryMode()).toBe('polling')
  })

  it('ignores local webhook override and stays on polling', () => {
    process.env.NODE_ENV = 'development'
    process.env.TELEGRAM_WEBHOOK_URL = 'https://example.com'
    process.env.TELEGRAM_DELIVERY_MODE = 'webhook'

    expect(resolveTelegramDeliveryMode()).toBe('polling')
  })

  it('keeps local expected identity anchored to test_starway_bot', () => {
    process.env.NODE_ENV = 'development'
    process.env.TEST_TELEGRAM_BOT_TOKEN = 'local-token'
    delete process.env.TEST_TELEGRAM_BOT_USERNAME

    expect(readTelegramBotConfig()).toEqual({
      token: 'local-token',
      username: 'test_starway_bot',
      botLink: 'https://t.me/test_starway_bot',
    })
    expect(readExpectedTelegramBotUsername()).toBe('test_starway_bot')
  })

  it('rejects bot username mismatch without exposing the token', () => {
    process.env.NODE_ENV = 'development'
    process.env.TEST_TELEGRAM_BOT_TOKEN = 'local-secret-token'
    process.env.TEST_TELEGRAM_BOT_USERNAME = 'test_starway_bot'

    expect(() =>
      assertTelegramBotIdentity('wrong_bot', undefined, 'identity test'),
    ).toThrow(
      '[TELEGRAM_BOT_MISMATCH] Expected @test_starway_bot from TEST_TELEGRAM_BOT_USERNAME but got @wrong_bot.',
    )

    try {
      assertTelegramBotIdentity('wrong_bot', undefined, 'identity test')
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error)
      expect(message).not.toContain('local-secret-token')
    }
  })

  it('rejects production bot username mismatch without exposing the token', () => {
    process.env.NODE_ENV = 'production'
    process.env.TELEGRAM_BOT_TOKEN = 'prod-secret-token'
    process.env.TELEGRAM_BOT_USERNAME = 'Test_ABsystem_bot'

    expect(() =>
      assertTelegramBotIdentity('wrong_prod_bot', undefined, 'production identity test'),
    ).toThrow(
      '[TELEGRAM_BOT_MISMATCH] Expected @Test_ABsystem_bot from TELEGRAM_BOT_USERNAME but got @wrong_prod_bot.',
    )

    try {
      assertTelegramBotIdentity('wrong_prod_bot', undefined, 'production identity test')
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error)
      expect(message).not.toContain('prod-secret-token')
    }
  })

  it('accepts the correct local identity for test_starway_bot', () => {
    process.env.NODE_ENV = 'development'
    process.env.TEST_TELEGRAM_BOT_TOKEN = 'local-token'
    process.env.TEST_TELEGRAM_BOT_USERNAME = 'test_starway_bot'

    expect(
      assertTelegramBotIdentity('test_starway_bot', undefined, 'local success test'),
    ).toBe('test_starway_bot')
  })

  it('accepts the correct production identity for Test_ABsystem_bot', () => {
    process.env.NODE_ENV = 'production'
    process.env.TELEGRAM_BOT_TOKEN = 'prod-token'
    process.env.TELEGRAM_BOT_USERNAME = 'Test_ABsystem_bot'

    expect(
      assertTelegramBotIdentity('Test_ABsystem_bot', undefined, 'production success test'),
    ).toBe('Test_ABsystem_bot')
  })
})
