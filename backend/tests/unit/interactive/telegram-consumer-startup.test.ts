import { readFileSync } from 'node:fs'

import { describe, expect, it, vi } from 'vitest'

const { findMany, buildZoomCalendarUrl } = vi.hoisted(() => ({
  findMany: vi.fn(),
  buildZoomCalendarUrl: vi.fn(() => 'https://miniapp.example/miniapp/zoom-calendar'),
}))

vi.mock('../../../src/lib/telegram.ts', () => ({
  launchBot: vi.fn(async () => undefined),
}))

vi.mock('../../../src/modules/telegram-mentor/runtime/botConfig.ts', () => ({
  assertTelegramBotIdentity: vi.fn(),
}))

vi.mock('../../../src/modules/zoom/urls.ts', () => ({
  buildZoomCalendarUrl,
}))

vi.mock('../../../src/db/client.ts', () => ({
  prisma: { user: { findMany } },
}))

import {
  registerZoomMenuAfterHandlerEnforcement,
  startInteractiveTelegramConsumers,
  verifyPersistentZoomCalendarMenu,
} from '../../../src/interactive/telegramConsumerStartup.ts'

describe('persistent Zoom Calendar bot menu', () => {
  it('rewrites a stale default menu to the current host before accepting its readback', async () => {
    const expectedMenu = {
      type: 'web_app' as const,
      text: 'ZOOM КАЛЕНДАР' as const,
      web_app: { url: 'https://current.trycloudflare.com/miniapp/zoom-calendar?zoomRole=user' },
    }
    const getChatMenuButton = vi.fn()
      .mockResolvedValueOnce({
        ...expectedMenu,
        web_app: { url: 'https://stale.trycloudflare.com/miniapp/zoom-calendar?zoomRole=user' },
      })
      .mockResolvedValueOnce(expectedMenu)
    const setChatMenuButton = vi.fn(async () => undefined)

    await expect(verifyPersistentZoomCalendarMenu(
      { telegram: { getChatMenuButton, setChatMenuButton } } as never,
      expectedMenu,
      { retryDelayMs: 0 },
    )).resolves.toBeUndefined()

    expect(getChatMenuButton).toHaveBeenCalledTimes(2)
    expect(setChatMenuButton).toHaveBeenCalledWith({ menuButton: expectedMenu })
  })

  it('refreshes the frozen USER Zoom Calendar menu on /start, then avoids Telegram API spam for later private actions', async () => {
    const use = vi.fn()
    const order: string[] = []
    const setChatMenuButton = vi.fn(async () => {
      order.push('refresh')
    })
    const getChatMenuButton = vi.fn(async () => ({
      type: 'web_app',
      text: 'ZOOM КАЛЕНДАР',
      web_app: { url: 'https://miniapp.example/miniapp/zoom-calendar?zoomRole=user' },
    }))
    const logger = { log: vi.fn(), warn: vi.fn(), error: vi.fn() }
    const bot = { use, telegram: { setChatMenuButton, getChatMenuButton } } as never

    registerZoomMenuAfterHandlerEnforcement(bot, { zoomRole: 'user' }, logger)
    const middleware = use.mock.calls[0][0]
    await middleware({
      chat: { id: 123456, type: 'private' },
      message: { text: '/start' },
    }, async () => {
      order.push('handler')
    })

    await middleware({
      chat: { id: 123456, type: 'private' },
      callbackQuery: {
        data: 'ab_test:focus_payment_problem',
        message: { chat: { id: 123456, type: 'private' } },
      },
    }, async () => {
      order.push('payment-handler')
    })

    expect(order).toEqual(['refresh', 'handler', 'payment-handler'])
    expect(setChatMenuButton).toHaveBeenCalledTimes(1)
    expect(setChatMenuButton).toHaveBeenCalledWith({
      chatId: 123456,
      menuButton: {
        type: 'web_app',
        text: 'ZOOM КАЛЕНДАР',
        web_app: { url: 'https://miniapp.example/miniapp/zoom-calendar?zoomRole=user' },
      },
    })
    expect(getChatMenuButton).toHaveBeenCalledWith({ chatId: 123456 })
    expect(logger.log).toHaveBeenCalledWith('[ZOOM_MENU_VERIFY]', {
      type: 'web_app',
      text: 'ZOOM КАЛЕНДАР',
      urlHost: 'miniapp.example',
      matchesExpectedMenu: true,
    })
  })

  it('forces the canonical USER menu to be re-ensured for every /start command', async () => {
    const use = vi.fn()
    const setChatMenuButton = vi.fn(async () => undefined)
    const getChatMenuButton = vi.fn(async () => ({
      type: 'web_app',
      text: 'ZOOM КАЛЕНДАР',
      web_app: { url: 'https://miniapp.example/miniapp/zoom-calendar?zoomRole=user' },
    }))
    const bot = { use, telegram: { setChatMenuButton, getChatMenuButton } } as never

    registerZoomMenuAfterHandlerEnforcement(bot, { zoomRole: 'user' })
    const middleware = use.mock.calls[0][0]
    const startContext = {
      chat: { id: 123456, type: 'private' },
      message: { text: '/start campaign' },
    }

    await middleware(startContext, async () => undefined)
    await middleware(startContext, async () => undefined)

    expect(setChatMenuButton).toHaveBeenCalledTimes(2)
    expect(setChatMenuButton).toHaveBeenLastCalledWith({
      chatId: 123456,
      menuButton: {
        type: 'web_app',
        text: 'ZOOM КАЛЕНДАР',
        web_app: { url: 'https://miniapp.example/miniapp/zoom-calendar?zoomRole=user' },
      },
    })
  })

  it('verifies the USER menu readback on /start in production too', async () => {
    vi.stubEnv('NODE_ENV', 'production')
    const use = vi.fn()
    const expectedMenu = {
      type: 'web_app',
      text: 'ZOOM КАЛЕНДАР',
      web_app: { url: 'https://miniapp.example/miniapp/zoom-calendar?zoomRole=user' },
    }
    const setChatMenuButton = vi.fn(async () => undefined)
    const getChatMenuButton = vi.fn(async () => expectedMenu)
    const bot = { use, telegram: { setChatMenuButton, getChatMenuButton } } as never

    try {
      registerZoomMenuAfterHandlerEnforcement(bot, { zoomRole: 'user' })
      const middleware = use.mock.calls[0][0]
      await middleware({
        chat: { id: 123456, type: 'private' },
        message: { text: '/start' },
      }, async () => undefined)

      expect(setChatMenuButton).toHaveBeenCalledWith({ chatId: 123456, menuButton: expectedMenu })
      expect(getChatMenuButton).toHaveBeenCalledWith({ chatId: 123456 })
    } finally {
      vi.unstubAllEnvs()
    }
  })

  it.each([
    ['user', 'user'],
    ['coach', 'coach'],
  ] as const)('self-heals a stale %s per-chat menu without crossing role boundaries', async (role, expectedRole) => {
    buildZoomCalendarUrl.mockReturnValueOnce('https://current.trycloudflare.com/miniapp/zoom-calendar')
    const expectedMenu = {
      type: 'web_app',
      text: 'ZOOM КАЛЕНДАР',
      web_app: { url: `https://current.trycloudflare.com/miniapp/zoom-calendar?zoomRole=${expectedRole}` },
    }
    const staleMenu = {
      ...expectedMenu,
      web_app: { url: `https://stale.trycloudflare.com/miniapp/zoom-calendar?zoomRole=${role === 'user' ? 'coach' : 'user'}` },
    }
    const use = vi.fn()
    const setChatMenuButton = vi.fn(async () => undefined)
    const getChatMenuButton = vi.fn()
      .mockResolvedValueOnce(staleMenu)
      .mockResolvedValueOnce(expectedMenu)
    const logger = { log: vi.fn(), warn: vi.fn(), error: vi.fn() }
    const bot = { use, telegram: { setChatMenuButton, getChatMenuButton } } as never

    registerZoomMenuAfterHandlerEnforcement(bot, { zoomRole: role }, logger)
    const middleware = use.mock.calls[0][0]
    await middleware({ chat: { id: 123456, type: 'private' } }, async () => undefined)

    expect(setChatMenuButton).toHaveBeenNthCalledWith(1, {
      chatId: 123456,
      menuButton: expectedMenu,
    })
    expect(setChatMenuButton).toHaveBeenNthCalledWith(2, {
      chatId: 123456,
      menuButton: expectedMenu,
    })
    expect(getChatMenuButton).toHaveBeenCalledTimes(2)
    expect(logger.log).toHaveBeenCalledWith('[ZOOM_MENU_VERIFY]', {
      type: 'web_app',
      text: 'ZOOM КАЛЕНДАР',
      urlHost: 'current.trycloudflare.com',
      matchesExpectedMenu: true,
    })
  })

  it('sets the canonical default WebApp menu for both bots on every initialization', async () => {
    findMany.mockResolvedValue([{ telegramChatId: '123456' }])
    const logger = { log: vi.fn(), warn: vi.fn(), error: vi.fn() }
    const mainSetChatMenuButton = vi.fn(async () => undefined)
    const coachSetChatMenuButton = vi.fn(async () => undefined)
    const mainGetChatMenuButton = vi.fn(async () => ({
      type: 'web_app',
      text: 'ZOOM КАЛЕНДАР',
      web_app: { url: 'https://miniapp.example/miniapp/zoom-calendar?zoomRole=user' },
    }))
    const coachGetChatMenuButton = vi.fn(async () => ({
      type: 'web_app',
      text: 'ZOOM КАЛЕНДАР',
      web_app: { url: 'https://miniapp.example/miniapp/zoom-calendar?zoomRole=coach' },
    }))
    const input = {
      main: {
        bot: {
          telegram: {
            getMe: vi.fn(async () => ({ username: 'Test_ABsystem_bot' })),
            setChatMenuButton: mainSetChatMenuButton,
            getChatMenuButton: mainGetChatMenuButton,
            setMyCommands: vi.fn(async () => undefined),
            deleteWebhook: vi.fn(async () => undefined),
          },
        } as never,
        botName: 'Starway Main',
        telegramBotConfig: { token: 'prod-token', username: 'Test_ABsystem_bot' },
        expectedUsername: 'Test_ABsystem_bot',
        deliveryMode: 'webhook' as const,
        buildSha: 'build-menu',
        webhookUrl: 'https://miniapp.example/api/telegram/webhook',
        webhookSecret: 'main-secret',
        setRunningMode: vi.fn(),
        syncTelegramWebhookContractFn: vi.fn(async () => ({
          url: 'https://miniapp.example/api/telegram/webhook',
          pending_update_count: 0,
        })),
        logger,
      },
      coach: {
        coachToken: 'coach-token',
        coachBot: {
          telegram: {
            getMe: vi.fn(async () => ({ username: 'Test_Coach_bot' })),
            setChatMenuButton: coachSetChatMenuButton,
            getChatMenuButton: coachGetChatMenuButton,
          },
        } as never,
        botName: 'Coach',
        webhookUrl: 'https://miniapp.example/api/telegram/webhook',
        webhookSecret: 'coach-secret',
        setRunningMode: vi.fn(),
        launchBotFn: vi.fn(async () => undefined),
        logger,
      },
      setMainRunningMode: vi.fn(),
      logger,
    }

    await startInteractiveTelegramConsumers(input)
    await startInteractiveTelegramConsumers(input)

    expect(mainSetChatMenuButton).toHaveBeenCalledTimes(2)
    expect(coachSetChatMenuButton).toHaveBeenCalledTimes(2)
    expect(mainSetChatMenuButton).toHaveBeenCalledWith({
      menuButton: {
        type: 'web_app',
        text: 'ZOOM КАЛЕНДАР',
        web_app: { url: 'https://miniapp.example/miniapp/zoom-calendar?zoomRole=user' },
      },
    })
    expect(coachSetChatMenuButton).toHaveBeenCalledWith({
      menuButton: {
        type: 'web_app',
        text: 'ZOOM КАЛЕНДАР',
        web_app: { url: 'https://miniapp.example/miniapp/zoom-calendar?zoomRole=coach' },
      },
    })
    expect(mainSetChatMenuButton.mock.calls).toEqual(expect.arrayContaining([
      [{ menuButton: expect.objectContaining({ type: 'web_app', web_app: expect.any(Object) }) }],
    ]))
    expect(coachSetChatMenuButton.mock.calls).toEqual(expect.arrayContaining([
      [{ menuButton: expect.objectContaining({ type: 'web_app', web_app: expect.any(Object) }) }],
    ]))
    expect(mainGetChatMenuButton).toHaveBeenCalledTimes(2)
    expect(coachGetChatMenuButton).toHaveBeenCalledTimes(2)
  })

  it('surfaces a rejected default menu configuration', async () => {
    findMany.mockResolvedValue([])
    const logger = { log: vi.fn(), warn: vi.fn(), error: vi.fn() }
    const error = new Error('Telegram API rejected menu')

    await expect(startInteractiveTelegramConsumers({
      main: {
        bot: {
          telegram: {
            getMe: vi.fn(async () => ({ username: 'Test_ABsystem_bot' })),
            setChatMenuButton: vi.fn(async () => { throw error }),
          },
        } as never,
        botName: 'Starway Main',
        telegramBotConfig: { token: 'prod-token', username: 'Test_ABsystem_bot' },
        expectedUsername: 'Test_ABsystem_bot',
        deliveryMode: 'webhook',
        buildSha: 'build-menu',
        webhookUrl: 'https://miniapp.example/api/telegram/webhook',
        webhookSecret: 'main-secret',
        setRunningMode: vi.fn(),
        logger,
      },
      setMainRunningMode: vi.fn(),
      logger,
    })).rejects.toThrow('Telegram API rejected menu')

    expect(logger.error).toHaveBeenCalledWith('[TELEGRAM_ZOOM_MENU_CONFIGURATION_ERROR]', {
      role: 'user',
      error: 'Telegram API rejected menu',
    })
  })

  it('continues development startup when Telegram still reads back an old Cloudflare host', async () => {
    vi.stubEnv('NODE_ENV', 'development')
    vi.useFakeTimers()
    buildZoomCalendarUrl.mockReturnValue('https://current.trycloudflare.com/miniapp/zoom-calendar')
    const logger = { log: vi.fn(), warn: vi.fn(), error: vi.fn() }
    const getChatMenuButton = vi.fn(async () => ({
      type: 'web_app',
      text: 'ZOOM КАЛЕНДАР',
      web_app: { url: 'https://stale.trycloudflare.com/miniapp/zoom-calendar?zoomRole=user' },
    }))

    try {
      const startup = startInteractiveTelegramConsumers({
        main: {
          bot: {
            telegram: {
              getMe: vi.fn(async () => ({ username: 'Test_ABsystem_bot' })),
              setChatMenuButton: vi.fn(async () => undefined),
              getChatMenuButton,
              setMyCommands: vi.fn(async () => undefined),
              deleteWebhook: vi.fn(async () => undefined),
            },
          } as never,
          botName: 'Starway Main',
          telegramBotConfig: { token: 'dev-token', username: 'Test_ABsystem_bot' },
          expectedUsername: 'Test_ABsystem_bot',
          deliveryMode: 'polling',
          buildSha: 'dev-menu',
          webhookUrl: '',
          webhookSecret: '',
          setRunningMode: vi.fn(),
          launchBotFn: vi.fn(async () => undefined),
          logger,
        },
        coach: {
          coachToken: 'coach-token',
          coachBot: {
            telegram: {
              getMe: vi.fn(async () => ({ username: 'Test_Coach_bot' })),
              setChatMenuButton: vi.fn(async () => undefined),
              getChatMenuButton: vi.fn(async () => ({
                type: 'web_app',
                text: 'ZOOM КАЛЕНДАР',
                web_app: { url: 'https://stale.trycloudflare.com/miniapp/zoom-calendar?zoomRole=coach' },
              })),
            },
          } as never,
          botName: 'Starway Coach',
          webhookUrl: '',
          webhookSecret: '',
          setRunningMode: vi.fn(),
          launchBotFn: vi.fn(async () => undefined),
          logger,
        },
        setMainRunningMode: vi.fn(),
        logger,
      })

      await vi.runAllTimersAsync()
      await expect(startup).resolves.toBeUndefined()

      expect(logger.warn).toHaveBeenCalledWith('[TELEGRAM_ZOOM_MENU_CONFIGURATION_WARNING]', {
        role: 'user',
        environment: 'development',
        expectedUrl: 'https://current.trycloudflare.com/miniapp/zoom-calendar?zoomRole=user',
        observedMenu: expect.stringContaining('stale.trycloudflare.com'),
      })
      expect(logger.log).toHaveBeenCalledWith('[TELEGRAM_MAIN_READY]', expect.objectContaining({
        deliveryMode: 'polling',
      }))
      expect(logger.log).toHaveBeenCalledWith('[TELEGRAM_COACH_READY]', expect.objectContaining({
        deliveryMode: 'polling',
      }))
    } finally {
      vi.useRealTimers()
      vi.unstubAllEnvs()
    }
  })

  it('continues development startup when the menu readback is missing or malformed', async () => {
    vi.stubEnv('NODE_ENV', 'development')
    vi.useFakeTimers()
    const logger = { log: vi.fn(), warn: vi.fn(), error: vi.fn() }

    try {
      const startup = startInteractiveTelegramConsumers({
        main: {
          bot: {
            telegram: {
              getMe: vi.fn(async () => ({ username: 'Test_ABsystem_bot' })),
              setChatMenuButton: vi.fn(async () => undefined),
              getChatMenuButton: vi.fn(async () => ({ type: 'commands' })),
              setMyCommands: vi.fn(async () => undefined),
              deleteWebhook: vi.fn(async () => undefined),
            },
          } as never,
          botName: 'Starway Main',
          telegramBotConfig: { token: 'dev-token', username: 'Test_ABsystem_bot' },
          expectedUsername: 'Test_ABsystem_bot',
          deliveryMode: 'polling',
          buildSha: 'dev-menu',
          webhookUrl: '',
          webhookSecret: '',
          setRunningMode: vi.fn(),
          launchBotFn: vi.fn(async () => undefined),
          logger,
        },
        setMainRunningMode: vi.fn(),
        logger,
      })

      await vi.runAllTimersAsync()
      await expect(startup).resolves.toBeUndefined()

      expect(logger.warn).toHaveBeenCalledWith('[TELEGRAM_ZOOM_MENU_CONFIGURATION_WARNING]', expect.objectContaining({
        role: 'user',
        environment: 'development',
        observedMenu: expect.stringContaining('commands'),
      }))
      expect(logger.log).toHaveBeenCalledWith('[TELEGRAM_MAIN_READY]', expect.any(Object))
    } finally {
      vi.useRealTimers()
      vi.unstubAllEnvs()
    }
  })

  it('keeps production startup strict when Telegram reads back a stale menu', async () => {
    vi.stubEnv('NODE_ENV', 'production')
    vi.useFakeTimers()
    const logger = { log: vi.fn(), warn: vi.fn(), error: vi.fn() }

    try {
      const startup = startInteractiveTelegramConsumers({
        main: {
          bot: {
            telegram: {
              getMe: vi.fn(async () => ({ username: 'Test_ABsystem_bot' })),
              setChatMenuButton: vi.fn(async () => undefined),
              getChatMenuButton: vi.fn(async () => ({
                type: 'web_app',
                text: 'ZOOM КАЛЕНДАР',
                web_app: { url: 'https://stale.example/miniapp/zoom-calendar?zoomRole=user' },
              })),
              setMyCommands: vi.fn(async () => undefined),
              deleteWebhook: vi.fn(async () => undefined),
            },
          } as never,
          botName: 'Starway Main',
          telegramBotConfig: { token: 'prod-token', username: 'Test_ABsystem_bot' },
          expectedUsername: 'Test_ABsystem_bot',
          deliveryMode: 'polling',
          buildSha: 'prod-menu',
          webhookUrl: '',
          webhookSecret: '',
          setRunningMode: vi.fn(),
          launchBotFn: vi.fn(async () => undefined),
          logger,
        },
        setMainRunningMode: vi.fn(),
        logger,
      })

      const expectedFailure = expect(startup).rejects.toThrow(
        'Telegram did not persist the expected Zoom Calendar default menu',
      )
      await vi.runAllTimersAsync()
      await expectedFailure
      expect(logger.error).toHaveBeenCalledWith('[TELEGRAM_MAIN_STARTUP_FATAL]', expect.any(Object))
    } finally {
      vi.useRealTimers()
      vi.unstubAllEnvs()
    }
  })

  it('uses the canonical URL builder rather than a direct stale tunnel or frontend env bypass', () => {
    const source = readFileSync(
      new URL('../../../src/interactive/telegramConsumerStartup.ts', import.meta.url),
      'utf8',
    )

    expect(source).toContain("import { buildZoomCalendarUrl } from '../modules/zoom/urls.js'")
    expect(source).not.toMatch(/trycloudflare|ngrok|PUBLIC_FRONTEND_URL/)
  })
})
