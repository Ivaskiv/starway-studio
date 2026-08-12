import type { Telegraf } from 'telegraf'

import { launchBot } from '../lib/telegram.js'
import { syncTelegramWebhookContract } from './telegramWebhookSync.js'

type RunningMode = 'webhook' | 'polling'

type StartupLogger = Pick<typeof console, 'log' | 'warn' | 'error'>

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

async function configureMainBotCommands(
  bot: Telegraf,
  logger: StartupLogger,
): Promise<void> {
  try {
    await bot.telegram
      .setChatMenuButton({
        menuButton: {
          type: 'default',
        },
      })
      .catch((error) => {
        logger.warn('⚠️ [Telegram] Failed to reset chat menu button:', error)
      })
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
  } catch (error) {
    logger.warn('⚠️ [Telegram] main bot setup warning:', error)
  }
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
  const me = await bot.telegram.getMe()
  if (expectedUsername && me.username !== expectedUsername) {
    throw new Error(
      `[TELEGRAM_BOT_MISMATCH] Expected @${expectedUsername} but got @${me.username}.`,
    )
  }

  resolvedLogger.log('[TELEGRAM_RUNTIME]', {
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
      deliveryMode,
      buildSha,
    })
    resolvedLogger.log(`🤖 Interactive Telegram ready @${telegramBotConfig.username} [webhook]`)
    return
  }

  await bot.telegram.deleteWebhook({ drop_pending_updates: false }).catch(() => undefined)
  await launchBotFn(bot, botName)
  setRunningMode('polling')
  resolvedLogger.log('[TELEGRAM_MAIN_READY]', {
    username: me.username || telegramBotConfig.username || 'unknown',
    deliveryMode,
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
  void logger
  if (!coachToken) {
    return
  }

  await launchBotFn(coachBot, botName, webhookUrl || undefined, {
    webhookSecret: webhookSecret || undefined,
  })
  setRunningMode(webhookUrl ? 'webhook' : 'polling')
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
