import crypto from 'crypto'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'

import { verifyTelegramInitData } from '../../../../src/modules/auth/telegram.ts'

const ORIGINAL_ENV = {
  NODE_ENV: process.env.NODE_ENV,
  TELEGRAM_BOT_TOKEN: process.env.TELEGRAM_BOT_TOKEN,
  TEST_TELEGRAM_BOT_TOKEN: process.env.TEST_TELEGRAM_BOT_TOKEN,
  CONTENT_BOT_TOKEN: process.env.CONTENT_BOT_TOKEN,
  COACH_BOT_TOKEN: process.env.COACH_BOT_TOKEN,
  TEST_COACH_BOT_TOKEN: process.env.TEST_COACH_BOT_TOKEN,
  TEST_BOT_TOKEN: process.env.TEST_BOT_TOKEN,
}

function buildInitData(botToken: string, user: { id: number; first_name: string; username?: string }) {
  const authDate = Math.floor(Date.now() / 1000)
  const params = new URLSearchParams()
  params.set('auth_date', String(authDate))
  params.set('query_id', 'AAHdF6IQAAAAAN0XohDhrOrc')
  params.set('user', JSON.stringify(user))

  const dataCheckString = Array.from(params.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([key, value]) => `${key}=${value}`)
    .join('\n')

  const secret = crypto.createHmac('sha256', 'WebAppData').update(botToken).digest()
  const hash = crypto.createHmac('sha256', secret).update(dataCheckString).digest('hex')
  params.set('hash', hash)

  return params.toString()
}

beforeEach(() => {
  for (const key of Object.keys(ORIGINAL_ENV)) delete process.env[key]
})

afterEach(() => {
  for (const [key, value] of Object.entries(ORIGINAL_ENV)) {
    if (value === undefined) {
      delete process.env[key as keyof typeof ORIGINAL_ENV]
    } else {
      process.env[key as keyof typeof ORIGINAL_ENV] = value
    }
  }
})

describe('verifyTelegramInitData', () => {
  it('accepts initData signed by TEST_TELEGRAM_BOT_TOKEN in development', () => {
    process.env.NODE_ENV = 'development'
    process.env.TEST_TELEGRAM_BOT_TOKEN = 'dev-main-token'
    process.env.TELEGRAM_BOT_TOKEN = 'prod-main-token'
    delete process.env.COACH_BOT_TOKEN
    delete process.env.TEST_BOT_TOKEN

    const initData = buildInitData('dev-main-token', {
      id: 123456,
      first_name: 'Vira',
      username: 'vira',
    })

    expect(verifyTelegramInitData(initData)).toEqual({
      botContext: 'USER',
      id: '123456',
      firstName: 'Vira',
      username: 'vira',
    })
  })

  it('accepts initData signed by TELEGRAM_BOT_TOKEN even when runtime token differs', () => {
    process.env.NODE_ENV = 'development'
    process.env.TEST_TELEGRAM_BOT_TOKEN = 'dev-main-token'
    process.env.TELEGRAM_BOT_TOKEN = 'prod-main-token'
    delete process.env.COACH_BOT_TOKEN
    delete process.env.TEST_BOT_TOKEN

    const initData = buildInitData('prod-main-token', {
      id: 987654,
      first_name: 'Anna',
      username: 'anna',
    })

    expect(verifyTelegramInitData(initData)).toEqual({
      botContext: 'USER',
      id: '987654',
      firstName: 'Anna',
      username: 'anna',
    })
  })

  it('accepts initData signed by TEST_BOT_TOKEN for shared Mini App auth', () => {
    process.env.NODE_ENV = 'development'
    process.env.TEST_TELEGRAM_BOT_TOKEN = 'dev-main-token'
    process.env.TELEGRAM_BOT_TOKEN = 'prod-main-token'
    process.env.TEST_BOT_TOKEN = 'separate-test-bot-token'
    delete process.env.COACH_BOT_TOKEN

    const initData = buildInitData('separate-test-bot-token', {
      id: 555777,
      first_name: 'Nadia',
    })

    expect(verifyTelegramInitData(initData)).toEqual({
      botContext: 'USER',
      id: '555777',
      firstName: 'Nadia',
      username: null,
    })
  })

  it('accepts initData signed by CONTENT_BOT_TOKEN for Mini App auth', () => {
    process.env.NODE_ENV = 'development'
    process.env.TEST_TELEGRAM_BOT_TOKEN = 'dev-main-token'
    process.env.TELEGRAM_BOT_TOKEN = 'prod-main-token'
    process.env.CONTENT_BOT_TOKEN = 'key-bot-token'
    delete process.env.COACH_BOT_TOKEN
    delete process.env.TEST_BOT_TOKEN

    const initData = buildInitData('key-bot-token', {
      id: 424242,
      first_name: 'Key',
      username: 'key_bot_user',
    })

    expect(verifyTelegramInitData(initData)).toEqual({
      botContext: 'USER',
      id: '424242',
      firstName: 'Key',
      username: 'key_bot_user',
    })
  })

  it('accepts initData signed by TEST_COACH_BOT_TOKEN in development without falling back to COACH_BOT_TOKEN', () => {
    process.env.NODE_ENV = 'development'
    process.env.TEST_TELEGRAM_BOT_TOKEN = 'dev-main-token'
    process.env.TELEGRAM_BOT_TOKEN = 'prod-main-token'
    process.env.TEST_COACH_BOT_TOKEN = 'dev-coach-token'
    process.env.COACH_BOT_TOKEN = 'prod-coach-token'
    delete process.env.TEST_BOT_TOKEN

    const initData = buildInitData('dev-coach-token', {
      id: 303030,
      first_name: 'Coach',
      username: 'coach_test',
    })

    expect(verifyTelegramInitData(initData)).toEqual({
      botContext: 'COACH',
      id: '303030',
      firstName: 'Coach',
      username: 'coach_test',
    })
  })

  it.each(['development', 'production'])('preserves the same identity across bot contexts in %s', (runtime) => {
    process.env.NODE_ENV = runtime
    process.env.TEST_TELEGRAM_BOT_TOKEN = 'local-user-token'
    process.env.TELEGRAM_BOT_TOKEN = 'production-user-token'
    process.env.TEST_COACH_BOT_TOKEN = 'local-coach-token'
    process.env.COACH_BOT_TOKEN = 'production-coach-token'
    const userToken = runtime === 'production' ? 'production-user-token' : 'local-user-token'
    const coachToken = runtime === 'production' ? 'production-coach-token' : 'local-coach-token'
    const user = { id: 123456, first_name: 'Vira', username: 'vira' }
    const expectedIdentity = { id: '123456', firstName: 'Vira', username: 'vira' }

    expect(verifyTelegramInitData(buildInitData(userToken, user))).toEqual({
      ...expectedIdentity,
      botContext: 'USER',
    })
    expect(verifyTelegramInitData(buildInitData(coachToken, user))).toEqual({
      ...expectedIdentity,
      botContext: 'COACH',
    })
  })

  it.each([
    ['TEST_TELEGRAM_BOT_TOKEN', 'USER'],
    ['TELEGRAM_BOT_TOKEN', 'COACH'],
  ])('retains config priority when coach token collides with %s', (source, expectedContext) => {
    process.env.NODE_ENV = 'development'
    process.env.TEST_TELEGRAM_BOT_TOKEN = 'runtime-user-token'
    process.env.TEST_COACH_BOT_TOKEN = 'shared-token'
    process.env[source] = 'shared-token'
    const initData = buildInitData('shared-token', { id: 123456, first_name: 'Vira' })

    expect(verifyTelegramInitData(initData).botContext).toBe(expectedContext)
    expect(verifyTelegramInitData(initData, 'shared-token').botContext).toBe(expectedContext)
  })

  it('resolves configured overrides without assigning context to unknown overrides', () => {
    process.env.NODE_ENV = 'development'
    process.env.TEST_COACH_BOT_TOKEN = 'coach-token'
    const user = { id: 123456, first_name: 'Vira' }

    expect(verifyTelegramInitData(buildInitData('coach-token', user), 'coach-token').botContext).toBe('COACH')
    expect(verifyTelegramInitData(buildInitData('explicit-token', user), 'explicit-token')).toEqual({
      id: '123456', firstName: 'Vira', username: null, botContext: null,
    })
    expect(() => verifyTelegramInitData(buildInitData('coach-token', user), 'explicit-token'))
      .toThrow('invalid_telegram_signature')
  })

  it('rejects tampered initData with an invalid signature', () => {
    process.env.NODE_ENV = 'development'
    process.env.TEST_TELEGRAM_BOT_TOKEN = 'dev-main-token'
    process.env.TELEGRAM_BOT_TOKEN = 'prod-main-token'
    delete process.env.COACH_BOT_TOKEN
    delete process.env.TEST_BOT_TOKEN

    const validInitData = buildInitData('dev-main-token', {
      id: 123456,
      first_name: 'Vira',
      username: 'vira',
    })
    const tamperedInitData = validInitData.replace('username%22%3A%22vira%22', 'username%22%3A%22attacker%22')

    expect(() => verifyTelegramInitData(tamperedInitData)).toThrow('invalid_telegram_signature')
  })
})
