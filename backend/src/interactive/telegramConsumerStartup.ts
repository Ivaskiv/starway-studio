import type { Telegraf } from 'telegraf'

import { launchBot } from '../lib/telegram.js'
import { assertTelegramBotIdentity } from '../modules/telegram-mentor/runtime/botConfig.js'
import { buildZoomCalendarUrl } from '../modules/zoom/urls.js'
import { syncTelegramWebhookContract } from './telegramWebhookSync.js'

type RunningMode = 'webhook' | 'polling'

type StartupLogger = Pick<typeof console, 'log' | 'warn' | 'error'>

type ZoomRole = 'user' | 'coach'

type MainTelegramConsumerInput = {
  bot: Telegraf
  botName: string
  telegramBotConfig: {
    token: string
    username: string
  }
  expectedUsername: string
  deliveryMode: RunningMode
  buildSha: string
  webhookUrl: string
  webhookSecret: string
  setRunningMode: (mode: RunningMode) => void
  logger?: StartupLogger
  syncTelegramWebhookContractFn?: typeof syncTelegramWebhookContract
  launchBotFn?: typeof launchBot
}

type CoachTelegramConsumerInput = {
  coachToken: string
  coachBot: Telegraf
  botName: string
  webhookUrl: string
  webhookSecret: string
  setRunningMode: (mode: RunningMode) => void
  logger?: StartupLogger
  launchBotFn?: typeof launchBot
}

type InteractiveTelegramConsumersInput = {
  main: MainTelegramConsumerInput
  coach?: CoachTelegramConsumerInput | null
  logger?: StartupLogger
  setMainRunningMode: (mode: RunningMode | null) => void
}

function resolveLogger(logger?: StartupLogger): StartupLogger {
  return logger ?? console
}

export function safeStartupErrorMessage(error: unknown): string {
  if (error instanceof Error && error.message) {
    return error.message
  }

  return String(error)
}

function buildPersistentZoomCalendarMenu(zoomRole: ZoomRole) {
  const calendarUrl = new URL(buildZoomCalendarUrl())
  calendarUrl.searchParams.set('zoomRole', zoomRole)

  return {
    type: 'web_app' as const,
    text: 'ZOOM КАЛЕНДАР',
    web_app: {
      url: calendarUrl.toString(),
    },
  }
}

async function configurePersistentZoomCalendarMenu(
  bot: Telegraf,
  zoomRole: ZoomRole,
  logger: StartupLogger,
): Promise<void> {
  const expectedMenu = buildPersistentZoomCalendarMenu(zoomRole)

  try {
    /*
     * No chatId intentionally.
     *
     * This configures the bot-level default menu button.
     * It must not depend on /start, a particular chat, Focus state,
     * reply keyboards, or persisted application state.
     */
    await bot.telegram.setChatMenuButton({
      menuButton: expectedMenu,
    })

    /*
     * Do not treat a successful SET request as proof.
     * Read the state back from Telegram immediately.
     */
    const actualMenu = await bot.telegram.getChatMenuButton()

    const matchesExpectedMenu =
      actualMenu.type === 'web_app'
      && actualMenu.text === expectedMenu.text
      && actualMenu.web_app.url === expectedMenu.web_app.url

    if (!matchesExpectedMenu) {
      throw new Error(
        `Telegram did not persist the expected ${zoomRole} Zoom Calendar default menu button`,
      )
    }

    logger.log('[TELEGRAM_ZOOM_MENU_READY]', {
      role: zoomRole,
      type: actualMenu.type,
      text: actualMenu.text,
      url: actualMenu.web_app.url,
    })
  } catch (error) {
    logger.error('[TELEGRAM_ZOOM_MENU_CONFIGURATION_ERROR]', {
      role: zoomRole,
      error: safeStartupErrorMessage(error),
    })

    /*
     * This is part of the bot navigation contract.
     * Do not report the consumer as READY when Telegram rejected
     * or failed to persist the canonical Zoom Calendar menu.
     */
    throw error
  }
}

async function configureMainBotCommands(
  bot: Telegraf,
  logger: StartupLogger,
): Promise<void> {
  /*
   * Zoom Calendar is a required navigation contract.
   * Failure must propagate.
   */
  await configurePersistentZoomCalendarMenu(bot, 'user', logger)

  /*
   * Telegram slash commands are secondary setup.
   * Preserve the existing non-fatal behavior for these commands.
   */
  await bot.telegram
    .setMyCommands([
      {
        command: 'privacy',
        description: 'Політика конфіденційності чат-бота',
      },
    ])
    .catch((error) => {
      logger.warn('⚠️ [Telegram] Failed to set global commands:', error)
    })

  await bot.telegram
    .setMyCommands(
      [
        {
          command: 'privacy',
          description: 'Політика конфіденційності чат-бота',
        },
      ],
      {
        scope: { type: 'all_private_chats' },
      },
    )
    .catch((error) => {
      logger.warn('⚠️ [Telegram] Failed to set private chat commands:', error)
    })

  await bot.telegram
    .setMyCommands(
      [
        {
          command: 'privacy',
          description: 'Політика конфіденційності чат-бота',
        },
      ],
      {
        scope: { type: 'all_group_chats' },
      },
    )
    .catch((error) => {
      logger.warn('⚠️ [Telegram] Failed to set group chat commands:', error)
    })

  await bot.telegram
    .setMyCommands(
      [
        {
          command: 'privacy',
          description: 'Політика конфіденційності чат-бота',
        },
      ],
      {
        scope: { type: 'all_chat_administrators' },
      },
    )
    .catch((error) => {
      logger.warn('⚠️ [Telegram] Failed to set admin chat commands:', error)
    })
}

export async function startMainTelegramConsumer({
  bot,
  botName,
  telegramBotConfig,
  expectedUsername,
  deliveryMode,
  buildSha,
  webhookUrl,
  webhookSecret,
  setRunningMode,
  logger,
  syncTelegramWebhookContractFn = syncTelegramWebhookContract,
  launchBotFn = launchBot,
}: MainTelegramConsumerInput): Promise<void> {
  const resolvedLogger = resolveLogger(logger)

  /*
   * Verify that menu configuration is being applied to the expected
   * USER bot, not merely to some valid Telegram client.
   */
  const me = await bot.telegram.getMe()

  assertTelegramBotIdentity(
    me.username,
    expectedUsername,
    'telegram startup identity verification',
  )

  resolvedLogger.log('[TELEGRAM_RUNTIME]', {
    role: 'user',
    env: process.env.NODE_ENV || 'development',
    username: me.username || telegramBotConfig.username || 'unknown',
    deliveryMode,
    buildSha,
  })

  await configureMainBotCommands(bot, resolvedLogger)

  if (webhookUrl) {
    await syncTelegramWebhookContractFn({
      bot,
      botName: 'main',
      webhookUrl,
      webhookSecret,
    })

    setRunningMode('webhook')

    resolvedLogger.log('[TELEGRAM_MAIN_READY]', {
      username: me.username || telegramBotConfig.username || 'unknown',
      deliveryMode: 'webhook',
      buildSha,
    })

    resolvedLogger.log(
      `🤖 Interactive Telegram ready @${telegramBotConfig.username} [webhook]`,
    )

    return
  }

  await bot.telegram
    .deleteWebhook({ drop_pending_updates: false })
    .catch(() => undefined)

  await launchBotFn(bot, botName)

  setRunningMode('polling')

  resolvedLogger.log('[TELEGRAM_MAIN_READY]', {
    username: me.username || telegramBotConfig.username || 'unknown',
    deliveryMode: 'polling',
    buildSha,
  })
}

export async function startCoachTelegramConsumer({
  coachToken,
  coachBot,
  botName,
  webhookUrl,
  webhookSecret,
  setRunningMode,
  logger,
  launchBotFn = launchBot,
}: CoachTelegramConsumerInput): Promise<void> {
  if (!coachToken) {
    return
  }

  const resolvedLogger = resolveLogger(logger)

  /*
   * Resolve the real Telegram identity before configuring navigation.
   * Do not log the token.
   */
  const me = await coachBot.telegram.getMe()

  resolvedLogger.log('[TELEGRAM_COACH_RUNTIME]', {
    role: 'coach',
    username: me.username || 'unknown',
    deliveryMode: webhookUrl ? 'webhook' : 'polling',
  })

  /*
   * Configure and verify the canonical bot-level menu before reporting
   * the Coach consumer as running.
   */
  await configurePersistentZoomCalendarMenu(
    coachBot,
    'coach',
    resolvedLogger,
  )

  await launchBotFn(
    coachBot,
    botName,
    webhookUrl || undefined,
    {
      webhookSecret: webhookSecret || undefined,
    },
  )

  setRunningMode(webhookUrl ? 'webhook' : 'polling')

  resolvedLogger.log('[TELEGRAM_COACH_READY]', {
    username: me.username || 'unknown',
    deliveryMode: webhookUrl ? 'webhook' : 'polling',
  })
}

export async function startInteractiveTelegramConsumers({
  main,
  coach,
  logger,
  setMainRunningMode,
}: InteractiveTelegramConsumersInput): Promise<void> {
  const resolvedLogger = resolveLogger(logger)

  try {
    await startMainTelegramConsumer({
      ...main,
      logger: main.logger ?? resolvedLogger,
    })
  } catch (error) {
    setMainRunningMode(null)

    resolvedLogger.error('[TELEGRAM_MAIN_STARTUP_FATAL]', {
      error: safeStartupErrorMessage(error),
    })

    throw error
  }

  if (!coach?.coachToken) {
    return
  }

  await startCoachTelegramConsumer({
    ...coach,
    logger: coach.logger ?? resolvedLogger,
  }).catch((error) => {
    resolvedLogger.error('[TELEGRAM_COACH_STARTUP_ERROR]', {
      error: safeStartupErrorMessage(error),
    })
  })
}