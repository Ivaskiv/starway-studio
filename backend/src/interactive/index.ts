import type { Express } from 'express'
import type { Server } from 'node:http'

import { createApp } from '../app.js'
import {
  bot,
  coachBot,
  destroyTelegramClientTransports,
  launchBot,
  normalizeTelegramWebhookUrl,
  resolveTelegramWebhookSecret,
  seedBotInfo,
} from '../lib/telegram.js'
import { registerDailyTelegramCommands } from '../modules/daily-cycle/telegram.js'
import {
  describeLocalTelegramConsumerDisableReason,
  isProductionRuntime,
  readCoachBotToken,
  readExpectedTelegramBotUsername,
  readTelegramBotConfig,
  readTelegramBotNames,
  resolveLocalTelegramConsumerState,
  resolveTelegramDeliveryMode,
} from '../modules/telegram-mentor/runtime/botConfig.js'
import { registerCoachBotHandlers } from '../bot/handlers/coach/register.js'
import { registerCoachContentHandlers } from '../bot/handlers/coach-content/index.js'
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
import { startInteractiveTelegramConsumers } from './telegramConsumerStartup.js'
import { syncTelegramWebhookContract } from './telegramWebhookSync.js'

loadRuntimeEnv()

const PORT = Number(process.env.PORT) || 3001
const isProduction = process.env.NODE_ENV === 'production'
const TELEGRAM_WEBHOOK_URL = process.env.TELEGRAM_WEBHOOK_URL?.trim() || ''
const START_TELEGRAM_BOT = process.env.START_TELEGRAM_BOT === 'true'
const telegramDeliveryMode = resolveTelegramDeliveryMode()
const telegramBotNames = readTelegramBotNames()
const localTelegramConsumerState = resolveLocalTelegramConsumerState()
const telegramBotConfig = readTelegramBotConfig()
const telegramConsumerEnabled =
  isProductionRuntime() || localTelegramConsumerState.enabled

{
  const expectedUsername = readExpectedTelegramBotUsername()
  if (!telegramConsumerEnabled) {
    console.warn(
      `[Telegram] interactive local consumer disabled: ${describeLocalTelegramConsumerDisableReason(
        localTelegramConsumerState.reason,
      )}`,
    )
  } else if (!telegramBotConfig.token) {
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
let telegramStartupPromise: Promise<void> | null = null
let isShuttingDown = false

function readBuildSha(): string {
  return String(
    process.env.RENDER_GIT_COMMIT
    || process.env.COMMIT_SHA
    || process.env.VERCEL_GIT_COMMIT_SHA
    || 'unknown',
  ).trim()
}

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

    if (!telegramConsumerEnabled) {
      console.warn(
        `[Telegram] interactive startup skipped: ${describeLocalTelegramConsumerDisableReason(
          localTelegramConsumerState.reason,
        )}`,
      )
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
      const mainWebhookSecret = resolveTelegramWebhookSecret({
        botId: 'main',
        token: telegramBotConfig.token,
      })
      const coachWebhookSecret = coachToken
        ? resolveTelegramWebhookSecret({ botId: 'coach', token: coachToken })
        : ''

      await startInteractiveTelegramConsumers({
        main: {
          bot,
          botName: telegramBotNames.main,
          telegramBotConfig,
          expectedUsername: readExpectedTelegramBotUsername(),
          deliveryMode: telegramDeliveryMode,
          buildSha: readBuildSha(),
          webhookUrl: mainWebhookUrl,
          webhookSecret: mainWebhookSecret,
          setRunningMode: (mode) => {
            telegramRunningMode = mode
          },
          syncTelegramWebhookContractFn: syncTelegramWebhookContract,
          launchBotFn: launchBot,
        },
        coach: coachToken
          ? {
              coachToken,
              coachBot,
              botName: telegramBotNames.coach,
              webhookUrl: coachWebhookUrl,
              webhookSecret: coachWebhookSecret,
              setRunningMode: (mode) => {
                coachTelegramRunningMode = mode
              },
              launchBotFn: launchBot,
            }
          : null,
        setMainRunningMode: (mode) => {
          telegramRunningMode = mode
        },
      })
    } catch (error) {
      telegramRunningMode = null
      throw error
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

    await startTelegramBot()
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
