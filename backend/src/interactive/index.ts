import type { Express } from 'express'
import type { Server } from 'node:http'

import { createApp } from '../app.js'
import {
  bot,
  coachBot,
  destroyTelegramClientTransports,
  launchBot,
  normalizeTelegramWebhookUrl,
  readTestBotToken,
  resolveTelegramWebhookSecret,
  seedBotInfo,
  testBot,
} from '../lib/telegram.js'
import { registerDailyTelegramCommands } from '../modules/daily-cycle/telegram.js'
import {
  EXPECTED_BOT_LOCAL,
  EXPECTED_BOT_PRODUCTION,
  isProductionRuntime,
  readCoachBotToken,
  readTelegramBotNames,
  resolveTelegramDeliveryMode,
} from '../modules/telegram-mentor/runtime/botConfig.js'
import { resolveRuntimeBotRegistry } from '../platform/index.js'
import { registerCoachBotHandlers } from '../bot/handlers/coach/coachStart.handler.js'
import { registerCoachContentHandlers } from '../bot/handlers/coachContent.handler.js'
import { registerStankeyBot } from '../products/stankey/index.js'
import {
  connectDatabaseWithRetry,
  createConnectionTracker,
  describeDatabaseTarget,
  loadRuntimeEnv,
  registerRuntimeProcessHandlers,
  runShutdownStep,
  safePrismaDisconnect,
  startHttpServer,
  startRuntimeEventLoopMonitor,
} from '../runtime/runtimeBootstrap.js'

loadRuntimeEnv()

const PORT = Number(process.env.PORT) || 3001
const isProduction = process.env.NODE_ENV === 'production'
const TELEGRAM_WEBHOOK_URL = process.env.TELEGRAM_WEBHOOK_URL?.trim() || ''
const START_TELEGRAM_BOT = process.env.START_TELEGRAM_BOT === 'true'
const telegramDeliveryMode = resolveTelegramDeliveryMode()
const telegramBotNames = readTelegramBotNames()
const botRegistry = resolveRuntimeBotRegistry('interactive runtime startup')
const telegramBotConfig = botRegistry.main

{
  const expectedUsername = isProductionRuntime() ? EXPECTED_BOT_PRODUCTION : EXPECTED_BOT_LOCAL
  if (!telegramBotConfig.token) {
    const envVar = isProductionRuntime() ? 'TELEGRAM_BOT_TOKEN' : 'TEST_TELEGRAM_BOT_TOKEN'
    throw new Error(`[TELEGRAM_RUNTIME_CHECK] FATAL: ${envVar} is not set for @${expectedUsername}`)
  }
}

const stopEventLoopMonitor = startRuntimeEventLoopMonitor()
const app: Express = createApp()
const connectionTracker = createConnectionTracker()
let server: Server | null = null
let telegramRunningMode: 'webhook' | 'polling' | null = null
let coachTelegramRunningMode: 'webhook' | 'polling' | null = null
let testTelegramRunningMode: 'webhook' | 'polling' | null = null
let telegramStartupPromise: Promise<void> | null = null
let isShuttingDown = false

function describeInteractiveRuntime() {
  return {
    runtime: 'interactive',
    port: PORT,
    env: process.env.NODE_ENV || 'development',
    telegramDeliveryMode,
  }
}

async function startTelegramBot() {
  if (telegramRunningMode || telegramStartupPromise) {
    console.log(`🔁 [runtime] interactive telegram startup skipped (mode=${telegramRunningMode ?? 'starting'})`)
    return telegramStartupPromise ?? Promise.resolve()
  }

  telegramStartupPromise = (async () => {
    if (!START_TELEGRAM_BOT) {
      console.log('🤖 [runtime] interactive telegram disabled (START_TELEGRAM_BOT=false)')
      return
    }

    try {
      seedBotInfo(bot, {
        id: 0,
        firstName: telegramBotNames.main,
        username: telegramBotConfig.username,
      })

      try {
        registerDailyTelegramCommands()
      } catch (error) {
        console.warn('⚠️ [Telegram] registerDailyTelegramCommands failed:', error)
      }

      await registerStankeyBot().catch((error) => {
        console.warn('⚠️ [Telegram] registerStankeyBot failed:', error)
      })

      const coachToken = readCoachBotToken()
      if (coachToken) {
        registerCoachBotHandlers(coachBot)
        registerCoachContentHandlers(coachBot)
      } else {
        console.log('🤖 [CoachBot] skipped: COACH_BOT_TOKEN is not set')
      }

      const testBotToken = readTestBotToken()
      const mainWebhookUrl =
        telegramDeliveryMode === 'webhook'
          ? normalizeTelegramWebhookUrl(TELEGRAM_WEBHOOK_URL)
          : ''
      const coachWebhookUrl =
        telegramDeliveryMode === 'webhook'
          ? normalizeTelegramWebhookUrl(
              process.env.COACH_BOT_WEBHOOK_URL?.trim()
              || TELEGRAM_WEBHOOK_URL
            )
          : ''
      const testWebhookUrl =
        telegramDeliveryMode === 'webhook'
          ? normalizeTelegramWebhookUrl(process.env.TEST_BOT_WEBHOOK_URL?.trim() || '')
          : ''
      const mainWebhookSecret = resolveTelegramWebhookSecret({
        botId: 'main',
        token: telegramBotConfig.token,
      })
      const coachWebhookSecret = coachToken
        ? resolveTelegramWebhookSecret({ botId: 'coach', token: coachToken })
        : ''
      const testWebhookSecret = testBotToken
        ? resolveTelegramWebhookSecret({ botId: 'test', token: testBotToken })
        : ''

      await Promise.allSettled([
        (async () => {
          if (!telegramBotConfig.token) return

          try {
            const me = await bot.telegram.getMe()
            const expectedUsername = isProductionRuntime() ? EXPECTED_BOT_PRODUCTION : EXPECTED_BOT_LOCAL
            if (me.username !== expectedUsername) {
              throw new Error(
                `[TELEGRAM_BOT_MISMATCH] Expected @${expectedUsername} but got @${me.username}.`,
              )
            }
            await bot.telegram
              .setChatMenuButton({
                menuButton: {
                  type: 'default',
                },
              })
              .catch((error) => {
                console.warn('⚠️ [Telegram] Failed to reset chat menu button:', error)
              })
            await bot.telegram
              .setMyCommands([
                {
                  command: 'privacy',
                  description: 'Політика конфіденційності чат-бота',
                },
              ])
              .catch((error) => {
                console.warn('⚠️ [Telegram] Failed to set global commands:', error)
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
                console.warn('⚠️ [Telegram] Failed to set private chat commands:', error)
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
                console.warn('⚠️ [Telegram] Failed to set group chat commands:', error)
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
                console.warn('⚠️ [Telegram] Failed to set admin chat commands:', error)
              })
          } catch (error) {
            console.warn('⚠️ [Telegram] main bot identity/setup failed:', error)
          }

          if (mainWebhookUrl) {
            const webhookInfoBefore = await bot.telegram.getWebhookInfo()
            if (webhookInfoBefore.url !== mainWebhookUrl) {
              await bot.telegram.setWebhook(mainWebhookUrl, {
                drop_pending_updates: false,
                allowed_updates: ['message', 'callback_query', 'channel_post', 'edited_channel_post', 'chat_member', 'my_chat_member'],
                ...(mainWebhookSecret ? { secret_token: mainWebhookSecret } : {}),
              })
            }
            telegramRunningMode = 'webhook'
            console.log(`🤖 Interactive Telegram ready @${telegramBotConfig.username} [webhook]`)
            return
          }

          await bot.telegram.deleteWebhook({ drop_pending_updates: false }).catch(() => undefined)
          await launchBot(bot, telegramBotNames.main)
          telegramRunningMode = 'polling'
        })(),
        (async () => {
          if (!coachToken) return
          await launchBot(coachBot, telegramBotNames.coach, coachWebhookUrl || undefined, {
            webhookSecret: coachWebhookSecret || undefined,
          })
          coachTelegramRunningMode = coachWebhookUrl ? 'webhook' : 'polling'
        })(),
        (async () => {
          if (!testBotToken) return
          await launchBot(testBot, telegramBotNames.test, testWebhookUrl || undefined, {
            webhookSecret: testWebhookSecret || undefined,
          })
          testTelegramRunningMode = testWebhookUrl ? 'webhook' : 'polling'
        })(),
      ])
    } catch (error) {
      telegramRunningMode = null
      console.error('⚠️ Interactive telegram setup failed:', error)
    } finally {
      telegramStartupPromise = null
    }
  })()

  return telegramStartupPromise
}

async function bootstrap() {
  console.log('🚀 [runtime] interactive bootstrap starting', describeInteractiveRuntime())

  server = await startHttpServer({
    app,
    port: PORT,
    isProduction,
    onStarted(startedServer) {
      connectionTracker.attach(startedServer)
      console.log(`🚀 Interactive server running on port ${PORT} (${process.env.NODE_ENV || 'development'})`)
    },
  })

  void (async () => {
    try {
      const databaseTarget = describeDatabaseTarget(process.env.DATABASE_URL?.trim())
      await connectDatabaseWithRetry()
      console.log('✅ Interactive runtime ready', {
        ...describeInteractiveRuntime(),
        dbHost: databaseTarget.host,
        bot: telegramBotConfig.username || 'unknown',
      })
    } catch (err: unknown) {
      console.warn('⚠️ [BOOT] Interactive DB unavailable, API continues in degraded mode', {
        target: describeDatabaseTarget(process.env.DATABASE_URL?.trim()),
        error: err instanceof Error ? err.message : err,
      })
    }

    void startTelegramBot().catch((err: unknown) => {
      console.error('⚠️ Interactive telegram async error:', err)
    })
  })()
}

async function shutdown(signal: string) {
  if (isShuttingDown) {
    console.log(`[shutdown] ${signal} received again, interactive shutdown already in progress`)
    return
  }

  isShuttingDown = true
  console.log(`[shutdown] interactive ${signal}`)

  const forceKill = setTimeout(() => {
    console.error('⚠️ Forced interactive shutdown after timeout')
    process.exit(1)
  }, 5000).unref()

  try {
    await runShutdownStep('stop telegram', async () => {
      const stopBotSafely = (name: string, stop: () => void) => {
        try {
          stop()
        } catch (error) {
          const message = error instanceof Error ? error.message : String(error)
          if (message.includes('Bot is not running')) {
            console.warn(`[shutdown] ${name} already stopped`)
            return
          }
          throw error
        }
      }

      if (START_TELEGRAM_BOT) {
        stopBotSafely('main bot', () => { bot.stop(signal) })
        if (coachTelegramRunningMode) {
          stopBotSafely('coach bot', () => { coachBot.stop(signal) })
        }
        if (testTelegramRunningMode) {
          stopBotSafely('test bot', () => { testBot.stop(signal) })
        }
      }
      destroyTelegramClientTransports()
    })

    await runShutdownStep('stop sockets', async () => {
      connectionTracker.destroyAll()
    })

    await runShutdownStep('stop http server', async () => {
      if (!server) return
      server.closeIdleConnections?.()
      server.closeAllConnections?.()
      await new Promise<void>((resolve, reject) =>
        server!.close((err) => (err ? reject(err) : resolve())),
      )
      console.log('🔌 Interactive HTTP server closed')
    })

    await runShutdownStep('disconnect prisma', async () => {
      await safePrismaDisconnect(`interactive:${signal}`)
      console.log('🔌 Interactive database disconnected')
    })

    stopEventLoopMonitor?.()
    console.log('✅ Interactive shutdown complete')
    clearTimeout(forceKill)
    setImmediate(() => process.exit(0))
  } catch (error) {
    console.error('⚠️ Interactive shutdown error:', error)
    clearTimeout(forceKill)
    process.exit(1)
  }
}

registerRuntimeProcessHandlers(shutdown)
void bootstrap()

export default app
