import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import {
  TELEGRAM_CANONICAL_ALLOWED_UPDATES,
  syncTelegramWebhookContract,
} from './interactive/telegramWebhookSync.js'
import { startInteractiveTelegramConsumers } from './interactive/telegramConsumerStartup.js'

const { mainHandleUpdate, coachHandleUpdate } = vi.hoisted(() => ({
  mainHandleUpdate: vi.fn(async () => undefined),
  coachHandleUpdate: vi.fn(async () => undefined),
}))
const originalStartTelegramBot = process.env.START_TELEGRAM_BOT
const originalNodeEnv = process.env.NODE_ENV

type ExpressRouteLayer = {
  route?: {
    path?: string
    methods?: Record<string, boolean>
    stack?: Array<{
      handle: (req: TestRequest, res: TestResponse) => unknown
    }>
  }
}

type ExpressWithRouter = {
  _router?: {
    stack?: ExpressRouteLayer[]
  }
}

type TestRequest = {
  body: unknown
  get: (name: string) => string | undefined
}

type TestResponse = {
  statusCode: number
  body: unknown
  status: ReturnType<typeof vi.fn>
  json: ReturnType<typeof vi.fn>
  send: ReturnType<typeof vi.fn>
}

async function loadTelegramWebhookHandler() {
  return loadRouteHandler('/api/telegram/webhook', 'post')
}

async function loadRouteHandler(
  path: string,
  method: 'get' | 'post',
) {
  const { createApp } = await import('./app.js')
  const app = createApp()

  const stack = (app as ExpressWithRouter)._router?.stack ?? []
  const routeLayer = stack.find(
    (layer) =>
      layer.route?.path === path
      && layer.route.methods?.[method],
  )
  const routeHandler = routeLayer?.route?.stack?.[0]?.handle
  if (!routeHandler) {
    throw new Error(`Route handler not found for ${method.toUpperCase()} ${path}`)
  }

  return routeHandler
}

function createTestResponse(): TestResponse {
  const response = {
    statusCode: 200,
    body: undefined as unknown,
    status: vi.fn(),
    json: vi.fn(),
    send: vi.fn(),
  } satisfies TestResponse

  response.status.mockImplementation((code: number) => {
    response.statusCode = code
    return response
  })
  response.json.mockImplementation((payload: unknown) => {
    response.body = payload
    return response
  })
  response.send.mockImplementation((payload: unknown) => {
    response.body = payload
    return response
  })

  return response
}

vi.mock('./lib/telegram.js', () => ({
  bot: { handleUpdate: mainHandleUpdate },
  coachBot: { handleUpdate: coachHandleUpdate },
  launchBot: vi.fn(async () => undefined),
  resolveTelegramWebhookSecretMap: () => ({
    main: 'main-secret',
    coach: 'coach-secret',
  }),
}))

afterEach(() => {
  if (originalStartTelegramBot === undefined) delete process.env.START_TELEGRAM_BOT
  else process.env.START_TELEGRAM_BOT = originalStartTelegramBot

  if (originalNodeEnv === undefined) delete process.env.NODE_ENV
  else process.env.NODE_ENV = originalNodeEnv
})

describe('telegram webhook contract', () => {
  beforeEach(() => {
    vi.resetModules()
    mainHandleUpdate.mockReset()
    coachHandleUpdate.mockReset()
  })

  it('routes main secret to the main bot', async () => {
    const { resolveTelegramWebhookTarget } = await import('./app.js')

    const target = resolveTelegramWebhookTarget('main-secret')

    expect(target?.id).toBe('main')
  })

  it('routes coach secret to the coach bot', async () => {
    const { resolveTelegramWebhookTarget } = await import('./app.js')

    const target = resolveTelegramWebhookTarget('coach-secret')

    expect(target?.id).toBe('coach')
  })

  it('rejects an empty secret', async () => {
    const { resolveTelegramWebhookTarget } = await import('./app.js')

    const target = resolveTelegramWebhookTarget('')

    expect(target).toBeNull()
  })

  it('rejects an invalid secret', async () => {
    const { resolveTelegramWebhookTarget } = await import('./app.js')

    const target = resolveTelegramWebhookTarget('wrong-secret')

    expect(target).toBeNull()
  })

  it('always re-syncs webhook contract even when url is unchanged', async () => {
    const setWebhook = vi.fn(async () => true)
    const getWebhookInfo = vi
      .fn()
      .mockResolvedValueOnce({
        url: 'https://example.com/api/telegram/webhook',
        pending_update_count: 3,
      })

    await syncTelegramWebhookContract({
      bot: {
        telegram: {
          setWebhook,
          getWebhookInfo,
        },
      } as never,
      botName: 'main',
      webhookUrl: 'https://example.com/api/telegram/webhook',
      webhookSecret: 'secret-1',
    })

    expect(setWebhook).toHaveBeenCalledTimes(1)
    expect(setWebhook).toHaveBeenCalledWith(
      'https://example.com/api/telegram/webhook',
      {
        drop_pending_updates: false,
        allowed_updates: [...TELEGRAM_CANONICAL_ALLOWED_UPDATES],
        secret_token: 'secret-1',
      },
    )
  })

  it('throws when telegram returns a mismatched webhook url after sync', async () => {
    const setWebhook = vi.fn(async () => true)
    const getWebhookInfo = vi.fn(async () => ({
      url: 'https://wrong.example.com/api/telegram/webhook',
      pending_update_count: 0,
    }))

    await expect(
      syncTelegramWebhookContract({
        bot: {
          telegram: {
            setWebhook,
            getWebhookInfo,
          },
        } as never,
        botName: 'main',
        webhookUrl: 'https://example.com/api/telegram/webhook',
        webhookSecret: 'secret-1',
      }),
    ).rejects.toThrow('[TELEGRAM_WEBHOOK_SYNC_MISMATCH]')
  })

  it('returns 401 for missing webhook secret', async () => {
    process.env.START_TELEGRAM_BOT = 'true'
    process.env.NODE_ENV = 'production'

    const handler = await loadTelegramWebhookHandler()
    const response = createTestResponse()

    await handler(
      {
        body: { update_id: 1 },
        get: () => undefined,
      },
      response,
    )

    expect(response.statusCode).toBe(401)
    expect(response.body).toEqual({
      ok: false,
      message: 'missing telegram webhook secret',
    })
    expect(mainHandleUpdate).not.toHaveBeenCalled()
  })

  it('returns 401 for invalid webhook secret', async () => {
    process.env.START_TELEGRAM_BOT = 'true'
    process.env.NODE_ENV = 'production'

    const handler = await loadTelegramWebhookHandler()
    const response = createTestResponse()

    await handler(
      {
        body: { update_id: 2 },
        get: (name: string) =>
          name.toLowerCase() === 'x-telegram-bot-api-secret-token'
            ? 'wrong-secret'
            : undefined,
      },
      response,
    )

    expect(response.statusCode).toBe(401)
    expect(response.body).toEqual({
      ok: false,
      message: 'invalid telegram webhook secret',
    })
    expect(mainHandleUpdate).not.toHaveBeenCalled()
  })

  it('passes valid secret to the main bot update handler', async () => {
    process.env.START_TELEGRAM_BOT = 'true'
    process.env.NODE_ENV = 'production'

    const handler = await loadTelegramWebhookHandler()
    const response = createTestResponse()
    const payload = { update_id: 3, message: { text: '/start' } }

    await handler(
      {
        body: payload,
        get: (name: string) =>
          name.toLowerCase() === 'x-telegram-bot-api-secret-token'
            ? 'main-secret'
            : undefined,
      },
      response,
    )

    expect(response.statusCode).toBe(200)
    expect(response.body).toBe('OK')

    await new Promise((resolve) => setTimeout(resolve, 0))

    expect(mainHandleUpdate).toHaveBeenCalledWith(payload)
  })

  it('rejects main startup when webhook sync fails and does not log MAIN_READY', async () => {
    const logger = {
      log: vi.fn(),
      warn: vi.fn(),
      error: vi.fn(),
    }
    const setMainRunningMode = vi.fn()
    const mainBot = {
      telegram: {
        getMe: vi.fn(async () => ({ username: 'Test_ABsystem_bot' })),
        setChatMenuButton: vi.fn(async () => undefined),
        setMyCommands: vi.fn(async () => undefined),
        deleteWebhook: vi.fn(async () => undefined),
      },
    } as never

    await expect(
      startInteractiveTelegramConsumers({
        main: {
          bot: mainBot,
          botName: 'Starway Main',
          telegramBotConfig: {
            token: 'prod-token',
            username: 'Test_ABsystem_bot',
          },
          expectedUsername: 'Test_ABsystem_bot',
          deliveryMode: 'webhook',
          buildSha: 'build-1',
          webhookUrl: 'https://example.com/api/telegram/webhook',
          webhookSecret: 'secret-1',
          setRunningMode: vi.fn(),
          syncTelegramWebhookContractFn: vi.fn(async () => {
            throw new Error('sync failed')
          }),
          logger,
        },
        setMainRunningMode,
        logger,
      }),
    ).rejects.toThrow('sync failed')

    expect(setMainRunningMode).toHaveBeenCalledWith(null)
    expect(logger.error).toHaveBeenCalledWith('[TELEGRAM_MAIN_STARTUP_FATAL]', {
      error: 'sync failed',
    })
    expect(
      logger.log.mock.calls.some((call) => call[0] === '[TELEGRAM_MAIN_READY]'),
    ).toBe(false)
  })

  it('logs MAIN_READY when main startup succeeds', async () => {
    const logger = {
      log: vi.fn(),
      warn: vi.fn(),
      error: vi.fn(),
    }

    await startInteractiveTelegramConsumers({
      main: {
        bot: {
          telegram: {
            getMe: vi.fn(async () => ({ username: 'Test_ABsystem_bot' })),
            setChatMenuButton: vi.fn(async () => undefined),
            setMyCommands: vi.fn(async () => undefined),
            deleteWebhook: vi.fn(async () => undefined),
          },
        } as never,
        botName: 'Starway Main',
        telegramBotConfig: {
          token: 'prod-token',
          username: 'Test_ABsystem_bot',
        },
        expectedUsername: 'Test_ABsystem_bot',
        deliveryMode: 'webhook',
        buildSha: 'build-2',
        webhookUrl: 'https://example.com/api/telegram/webhook',
        webhookSecret: 'secret-1',
        setRunningMode: vi.fn(),
        syncTelegramWebhookContractFn: vi.fn(async () => ({
          url: 'https://example.com/api/telegram/webhook',
          pending_update_count: 0,
          last_error_date: undefined,
          last_error_message: undefined,
        })),
        logger,
      },
      setMainRunningMode: vi.fn(),
      logger,
    })

    expect(logger.log).toHaveBeenCalledWith('[TELEGRAM_MAIN_READY]', {
      username: 'Test_ABsystem_bot',
      deliveryMode: 'webhook',
      buildSha: 'build-2',
    })
  })

  it('keeps main runtime ready when optional coach startup fails', async () => {
    const logger = {
      log: vi.fn(),
      warn: vi.fn(),
      error: vi.fn(),
    }

    await startInteractiveTelegramConsumers({
      main: {
        bot: {
          telegram: {
            getMe: vi.fn(async () => ({ username: 'Test_ABsystem_bot' })),
            setChatMenuButton: vi.fn(async () => undefined),
            setMyCommands: vi.fn(async () => undefined),
            deleteWebhook: vi.fn(async () => undefined),
          },
        } as never,
        botName: 'Starway Main',
        telegramBotConfig: {
          token: 'prod-token',
          username: 'Test_ABsystem_bot',
        },
        expectedUsername: 'Test_ABsystem_bot',
        deliveryMode: 'webhook',
        buildSha: 'build-3',
        webhookUrl: 'https://example.com/api/telegram/webhook',
        webhookSecret: 'secret-1',
        setRunningMode: vi.fn(),
        syncTelegramWebhookContractFn: vi.fn(async () => ({
          url: 'https://example.com/api/telegram/webhook',
          pending_update_count: 0,
          last_error_date: undefined,
          last_error_message: undefined,
        })),
        logger,
      },
      coach: {
        coachToken: 'coach-token',
        coachBot: {} as never,
        botName: 'Coach',
        webhookUrl: 'https://example.com/api/telegram/webhook',
        webhookSecret: 'coach-secret',
        setRunningMode: vi.fn(),
        launchBotFn: vi.fn(async () => {
          throw new Error('coach failed')
        }),
        logger,
      },
      setMainRunningMode: vi.fn(),
      logger,
    })

    expect(logger.log).toHaveBeenCalledWith('[TELEGRAM_MAIN_READY]', {
      username: 'Test_ABsystem_bot',
      deliveryMode: 'webhook',
      buildSha: 'build-3',
    })
    expect(logger.error).toHaveBeenCalledWith('[TELEGRAM_COACH_STARTUP_ERROR]', {
      error: 'coach failed',
    })
  })
})
