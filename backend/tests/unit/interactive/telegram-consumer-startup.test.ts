import { describe, expect, it, vi } from 'vitest'

const { findMany } = vi.hoisted(() => ({
  findMany: vi.fn(),
}))

vi.mock('../../../src/lib/telegram.ts', () => ({
  launchBot: vi.fn(async () => undefined),
}))

vi.mock('../../../src/modules/telegram-mentor/runtime/botConfig.ts', () => ({
  assertTelegramBotIdentity: vi.fn(),
}))

vi.mock('../../../src/modules/zoom/urls.ts', () => ({
  buildZoomCalendarUrl: vi.fn(() => 'https://miniapp.example/miniapp/zoom-calendar'),
}))

vi.mock('../../../src/db/client.ts', () => ({
  prisma: { user: { findMany } },
}))

import { startInteractiveTelegramConsumers } from '../../../src/interactive/telegramConsumerStartup.ts'

describe('persistent Zoom Calendar bot menu', () => {
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

    expect(mainSetChatMenuButton).toHaveBeenCalledTimes(4)
    expect(coachSetChatMenuButton).toHaveBeenCalledTimes(4)
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
    expect(mainSetChatMenuButton).toHaveBeenCalledWith({ chatId: 123456, menuButton: { type: 'default' } })
    expect(coachSetChatMenuButton).toHaveBeenCalledWith({ chatId: 123456, menuButton: { type: 'default' } })
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
})
