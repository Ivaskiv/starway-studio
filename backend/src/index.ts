// backend/src/index.ts

import { config as loadEnv } from 'dotenv'
import { type Express } from 'express'
import { existsSync } from 'node:fs'
import { type Server } from 'node:http'
import { dirname, resolve } from 'node:path'
import { monitorEventLoopDelay } from 'node:perf_hooks'
import { fileURLToPath } from 'node:url'
import { createApp } from './app.js'
import { prisma, withRetry } from './db/client.js'
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
} from './lib/telegram.js'
import { registerDailyTelegramCommands } from './modules/daily-cycle/telegram.js'
import {
  readCoachBotToken,
  readTelegramBotNames,
  resolveTelegramDeliveryMode,
  isProductionRuntime,
  EXPECTED_BOT_PRODUCTION,
  EXPECTED_BOT_LOCAL,
} from './modules/telegram-mentor/runtime/botConfig.js'
import { resolveRuntimeBotRegistry } from './platform/index.js'
import { getPublicCurrentWeekZoomOverview } from './modules/zoom/service.js'
import { registerStankeyBot } from './products/stankey/index.js'
import { startScheduler, stopScheduler } from './services/scheduler/index.js'
import { startZoomNotificationsCron, startBattleCron, seedDefaultAvailability } from './modules/zoom/index.js'
import { startDnaQueueWorkers, stopDnaQueueWorkers } from '@/core/dna/queues/dna.workers.js'
import { startDnaQueueTelemetry } from '@/core/dna/telemetry/dna.queue-telemetry.js'
import { registerCoachBotHandlers } from './bot/handlers/coach/coachStart.handler.js'
import { registerCoachContentHandlers } from './bot/handlers/coachContent.handler.js'

const currentFilePath = fileURLToPath(import.meta.url)
const currentDirPath = dirname(currentFilePath)
const backendEnvPath = resolve(currentDirPath, '../.env')
const rootEnvPath = resolve(currentDirPath, '../../.env')
if (existsSync(rootEnvPath)) {
  loadEnv({ path: rootEnvPath })
}
if (existsSync(backendEnvPath)) {
  loadEnv({ path: backendEnvPath, override: true })
}

const PORT = Number(process.env.PORT) || 3001
const isProduction = process.env.NODE_ENV === 'production'
const TELEGRAM_WEBHOOK_URL = process.env.TELEGRAM_WEBHOOK_URL?.trim() || ''
const START_TELEGRAM_BOT = process.env.START_TELEGRAM_BOT === 'true'
const telegramDeliveryMode = resolveTelegramDeliveryMode()
const MINIAPP_URL =
  process.env.MINIAPP_URL?.trim() ||
  'https://starway-frontend.vercel.app/miniapp'
const MINIAPP_VERSION = process.env.MINIAPP_VERSION?.trim() || 'dev'
const telegramBotNames = readTelegramBotNames()
const botRegistry = resolveRuntimeBotRegistry('backend startup')
const telegramBotConfig = botRegistry.main

// Runtime identity check — hard-guards on every startup
{
  const expectedUsername = isProductionRuntime() ? EXPECTED_BOT_PRODUCTION : EXPECTED_BOT_LOCAL

  // Hard guard — verified again after getMe() inside startTelegramBot()
  if (!telegramBotConfig.token) {
    const envVar = isProductionRuntime() ? 'TELEGRAM_BOT_TOKEN' : 'TEST_TELEGRAM_BOT_TOKEN'
    throw new Error(`[TELEGRAM_RUNTIME_CHECK] FATAL: ${envVar} is not set`)
  }
}

const app: Express = createApp()
let server: Server | null = null
let telegramRunningMode: 'webhook' | 'polling' | null = null
let coachTelegramRunningMode: 'webhook' | 'polling' | null = null
let testTelegramRunningMode: 'webhook' | 'polling' | null = null
let telegramStartupPromise: Promise<void> | null = null
let isShuttingDown = false
let databaseReady = false
let prismaDisconnectPromise: Promise<void> | null = null
const DB_FORENSIC_LOGGING = process.env.DB_FORENSIC_LOGGING === 'true'
const eventLoopMonitor = DB_FORENSIC_LOGGING
  ? monitorEventLoopDelay({ resolution: 20 })
  : null

if (eventLoopMonitor) {
  eventLoopMonitor.enable()
  const forensicEventLoopInterval = setInterval(() => {
    console.log('[EVENT_LOOP]', {
      mean: Math.round(eventLoopMonitor.mean / 1e6),
      max: Math.round(eventLoopMonitor.max / 1e6),
    })
    eventLoopMonitor.reset()
  }, 30000)
  forensicEventLoopInterval.unref?.()
}

async function runShutdownStep(name: string, step: () => void | Promise<void>) {
  const startedAt = Date.now()
  console.log(`[shutdown] START ${name}`)
  try {
    await step()
  } finally {
    console.log(
      `[shutdown] STOP ${name} duration=${Date.now() - startedAt}ms`
    )
  }
}

function describeDatabaseTarget(databaseUrl: string | undefined) {
  if (!databaseUrl) {
    return {
      configured: false,
      host: 'missing',
      port: 'missing',
    }
  }

  try {
    const parsed = new URL(databaseUrl)
    return {
      configured: true,
      host: parsed.hostname || 'unknown',
      port: parsed.port || 'default',
    }
  } catch {
    return {
      configured: true,
      host: 'invalid-url',
      port: 'invalid-url',
    }
  }
}

function isTelegramPollingConflict(error: unknown): boolean {
  if (typeof error === 'object' && error !== null && 'response' in error) {
    const response = (
      error as { response?: { error_code?: number; description?: string } }
    ).response
    if (response?.error_code === 409) return true
    if (
      response?.description?.includes('terminated by other getUpdates request')
    )
      return true
  }

  return (
    error instanceof Error &&
    error.message.includes('terminated by other getUpdates request')
  )
}

// ─────────────────────────────────────────────
// TELEGRAM
// ─────────────────────────────────────────────
async function startTelegramBot() {
  if (telegramRunningMode || telegramStartupPromise) {
    console.log(
      `🔁 [runtime] telegram startup skipped (mode=${telegramRunningMode ?? 'starting'})`
    )
    return telegramStartupPromise ?? Promise.resolve()
  }

  telegramStartupPromise = (async () => {
    if (!START_TELEGRAM_BOT) {
      console.log(
        '🤖 [runtime] telegram runtime disabled (START_TELEGRAM_BOT=false)'
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

      const testBotToken = readTestBotToken()
      const mainWebhookUrl =
        telegramDeliveryMode === 'webhook'
          ? normalizeTelegramWebhookUrl(TELEGRAM_WEBHOOK_URL)
          : ''
      const coachWebhookUrl =
        telegramDeliveryMode === 'webhook'
          ? normalizeTelegramWebhookUrl(
              process.env.COACH_BOT_WEBHOOK_URL?.trim() || '',
            )
          : ''
      const testWebhookUrl =
        telegramDeliveryMode === 'webhook'
          ? normalizeTelegramWebhookUrl(
              process.env.TEST_BOT_WEBHOOK_URL?.trim() || '',
            )
          : ''
      const mainWebhookSecret = resolveTelegramWebhookSecret({
        botId: 'main',
        token: telegramBotConfig.token,
      })
      const coachWebhookSecret = coachToken
        ? resolveTelegramWebhookSecret({
            botId: 'coach',
            token: coachToken,
          })
        : ''
      const testWebhookSecret = testBotToken
        ? resolveTelegramWebhookSecret({
            botId: 'test',
            token: testBotToken,
          })
        : ''

      await Promise.allSettled([
        (async () => {
          if (!telegramBotConfig.token) return
          try {
            const me = await bot.telegram.getMe()

            // Hard guard: fail fast if wrong bot is running
            const expectedUsername = isProductionRuntime() ? EXPECTED_BOT_PRODUCTION : EXPECTED_BOT_LOCAL
            if (me.username !== expectedUsername) {
              throw new Error(
                `[TELEGRAM_BOT_MISMATCH] Expected @${expectedUsername} but got @${me.username}. ` +
                (isProductionRuntime()
                  ? 'Ensure TELEGRAM_BOT_TOKEN=8878569107:... in Render Dashboard.'
                  : 'Ensure TEST_TELEGRAM_BOT_TOKEN=8674915973:... in backend/.env.local')
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
                }
              )
              .catch((error) => {
                console.warn(
                  '⚠️ [Telegram] Failed to set private chat commands:',
                  error
                )
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
                }
              )
              .catch((error) => {
                console.warn(
                  '⚠️ [Telegram] Failed to set group chat commands:',
                  error
                )
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
                }
              )
              .catch((error) => {
                console.warn(
                  '⚠️ [Telegram] Failed to set admin chat commands:',
                  error
                )
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
            console.log(`🤖 Telegram ready @${telegramBotConfig.username} [${telegramDeliveryMode}]`)
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
      console.error('⚠️ Telegram bot setup failed:', error)
    } finally {
      telegramStartupPromise = null
    }
  })()

  return telegramStartupPromise
}

async function safePrismaDisconnect(reason: string) {
  if (prismaDisconnectPromise) {
    return prismaDisconnectPromise
  }

  prismaDisconnectPromise = prisma
    .$disconnect()
    .catch((error) => {
      console.warn(`⚠️ [PRISMA] Disconnect failed during ${reason}:`, error)
    })
    .finally(() => {
      prismaDisconnectPromise = null
    })

  return prismaDisconnectPromise
}

function wait(ms: number) {
  return new Promise<void>((resolve) => setTimeout(resolve, ms))
}

// ─────────────────────────────────────────────
// BOOTSTRAP
// ─────────────────────────────────────────────
async function bootstrap() {
  const schedulerEnabled = process.env.DISABLE_SCHEDULERS !== 'true'

  // Env Validation
  const criticalEnvs = {
    DATABASE_URL: !!process.env.DATABASE_URL,
    WAYFORPAY_MERCHANT: !!process.env.WAYFORPAY_MERCHANT,
    WAYFORPAY_SECRET: !!process.env.WAYFORPAY_SECRET,
    TELEGRAM_BOT_TOKEN: !!telegramBotConfig.token,
    FOCUS_INVITE_LINK: !!process.env.FOCUS_TELEGRAM_CHANNEL_INVITE_LINK,
  }

  Object.entries(criticalEnvs).forEach(([key, val]) => {
    if (!val)
      console.warn(`⚠️ [CONFIG] Missing critical environment variable: ${key}`)
  })

  const startHttpServer = async () => {
    if (server) return

    const maxPortRetries = isProduction ? 1 : 20
    const portRetryDelayMs = 250

    for (let attempt = 1; attempt <= maxPortRetries; attempt += 1) {
      try {
        const startedServer = await new Promise<Server>((resolve, reject) => {
          const candidate = app.listen(PORT, '0.0.0.0')

          candidate.once('listening', () => resolve(candidate))
          candidate.once('error', (error) => reject(error))
        })

        server = startedServer
        trackConnections()
        console.log(
          `🚀 Server running on port ${PORT} (${process.env.NODE_ENV || 'development'})`
        )
        return
      } catch (error) {
        const bindError = error as NodeJS.ErrnoException
        const canRetry =
          bindError?.code === 'EADDRINUSE' &&
          !isProduction &&
          attempt < maxPortRetries

        if (canRetry) {
          console.warn(
            `[dev-reload] port ${PORT} still busy, waiting for previous process to exit (${attempt}/${maxPortRetries - 1})`
          )
          await wait(portRetryDelayMs)
          continue
        }

        if (bindError?.code === 'EADDRINUSE') {
          console.error(
            `❌ Port ${PORT} is already in use. Stop existing process or change PORT.`
          )
          process.exit(1)
        }

        console.error('❌ Server error:', error)
        process.exit(1)
      }
    }
  }

  async function connectWithRetry(retries = 3, delay = 3000) {
    for (let index = 0; index < retries; index += 1) {
      try {
        await withRetry(() => prisma.$connect())
        return
      } catch (error: unknown) {
        if (index < retries - 1) {
          console.log(`⚠️ DB retry ${index + 1}/${retries}...`)
          await new Promise<void>((resolve) => setTimeout(resolve, delay))
          continue
        }
        throw error
      }
    }
  }

  await startHttpServer()

  void (async () => {
    try {
      const databaseTarget = describeDatabaseTarget(
        process.env.DATABASE_URL?.trim()
      )

      await connectWithRetry()

      await withRetry(() => prisma.$queryRaw`SELECT 1`)
      console.log('✅ Runtime ready', {
        port: PORT,
        env: process.env.NODE_ENV || 'development',
        dbHost: databaseTarget.host,
        bot: telegramBotConfig.username || 'unknown',
      })

      databaseReady = true

    } catch (err: unknown) {
      console.warn(
        '⚠️ [BOOT] Database unavailable, API continues in degraded mode',
        {
          target: describeDatabaseTarget(process.env.DATABASE_URL?.trim()),
          error: err instanceof Error ? err.message : err,
        }
      )

      databaseReady = false
    }

    void startTelegramBot().catch((err: unknown) =>
      console.error('⚠️ Telegram async error:', err)
    )

    if (schedulerEnabled && databaseReady) {
      startScheduler({ coachBot: readCoachBotToken() ? coachBot : null })
      startZoomNotificationsCron()
      startBattleCron()
      if (process.env.NODE_ENV !== 'production') {
        prisma.expert.findFirst().then(expert => {
          if (expert) seedDefaultAvailability(expert.id).catch(() => undefined);
        }).catch(() => undefined);
      }
    } else {
      console.warn('⚠️ [runtime] Scheduler disabled or DB not ready')
    }

    if (databaseReady) {
      startDnaQueueTelemetry()
      await startDnaQueueWorkers().catch((error) => {
        console.warn('⚠️ [DNA][queue] workers startup skipped', {
          error: error instanceof Error ? error.message : String(error),
        })
      })
    }
  })()
}

bootstrap()

// ─────────────────────────────────────────────
// GRACEFUL SHUTDOWN
// ─────────────────────────────────────────────
const connections = new Set<import('node:net').Socket>()

function trackConnections() {
  server?.on('connection', (socket) => {
    connections.add(socket)
    socket.once('close', () => connections.delete(socket))
  })
}

async function shutdown(signal: string) {
  if (isShuttingDown) {
    console.log(
      `[shutdown] ${signal} received again, shutdown already in progress`
    )
    return
  }

  isShuttingDown = true
  console.log(`[shutdown] ${signal}`)

  const forceKill = setTimeout(() => {
    console.error('⚠️ Forced shutdown after timeout')
    process.exit(1)
  }, 5_000).unref()

  try {
    await runShutdownStep('stop scheduler', async () => {
      try {
        stopScheduler()
      } catch {
        // silent
      }
    })

    await runShutdownStep('stop dna workers', async () => {
      await stopDnaQueueWorkers().catch(() => undefined)
    })

    await runShutdownStep('stop telegram', async () => {
      try {
        if (START_TELEGRAM_BOT) {
          bot.stop(signal)
          if (coachTelegramRunningMode) {
            coachBot.stop(signal)
          }
          if (testTelegramRunningMode) {
            testBot.stop(signal)
          }
        }
      } catch {
        // silent
      }

      destroyTelegramClientTransports()
    })

    await runShutdownStep('stop sockets', async () => {
      connections.forEach((s) => s.destroy())
      connections.clear()
    })

    await runShutdownStep('stop http server', async () => {
      if (!server) return
      server.closeIdleConnections?.()
      server.closeAllConnections?.()
      await new Promise<void>((resolve, reject) =>
        server!.close((err) => (err ? reject(err) : resolve()))
      )
      console.log('🔌 HTTP server closed')
    })

    await runShutdownStep('disconnect prisma', async () => {
      await safePrismaDisconnect(`shutdown:${signal}`)
      console.log('🔌 Database disconnected')
    })

    console.log('✅ Shutdown complete')

    clearTimeout(forceKill)
    setImmediate(() => process.exit(0))
    return
  } catch (error) {
    console.error('⚠️ Shutdown error:', error)
    clearTimeout(forceKill)
    process.exit(1)
  }
}

process.once('exit', (code) => {
  console.log('[shutdown] process exit, code:', code)
})

process.once('SIGINT', () => {
  void shutdown('SIGINT')
})

process.once('SIGTERM', () => {
  void shutdown('SIGTERM')
})

process.on('unhandledRejection', (reason) => {
  console.error('[unhandled]', reason)
})

export default app
