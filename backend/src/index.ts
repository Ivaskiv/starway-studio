// backend/src/index.ts

import { config as loadEnv } from 'dotenv'
import { type Express, type Request, type Response } from 'express'
import { existsSync } from 'node:fs'
import { type Server } from 'node:http'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { createApp } from './app.js'
import { prisma, withRetry } from './db/client.js'
import { bot } from './lib/telegram.js'
import { registerDailyTelegramCommands } from './modules/daily-cycle/telegram.js'
import { resolveRuntimeBotRegistry } from './platform/index.js'
import { registerStankeyBot } from './products/stankey/index.js'
import { startScheduler, stopScheduler } from './services/scheduler/index.js'

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
const TELEGRAM_POLLING_ENABLED =
  process.env.TELEGRAM_POLLING_ENABLED === 'true' ||
  (!TELEGRAM_WEBHOOK_URL &&
    !isProduction &&
    process.env.TELEGRAM_POLLING_ENABLED !== 'false')
const MINIAPP_URL =
  process.env.MINIAPP_URL?.trim() ||
  'https://starway-frontend.vercel.app/miniapp'
const MINIAPP_VERSION = process.env.MINIAPP_VERSION?.trim() || 'dev'
const botRegistry = resolveRuntimeBotRegistry('backend startup')
const telegramBotConfig = botRegistry.main

const app: Express = createApp()
let server: Server | null = null
let telegramRunningMode: 'webhook' | 'polling' | null = null
let telegramStartupPromise: Promise<void> | null = null
let isShuttingDown = false
let prismaKeepAliveInterval: NodeJS.Timeout | null = null
let databaseReady = false
let prismaDisconnectPromise: Promise<void> | null = null

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
// TELEGRAM WEBHOOK ROUTE
// Реєструємо маршрут тільки якщо є публічний webhook URL.
// ─────────────────────────────────────────────
if (START_TELEGRAM_BOT && telegramBotConfig.token && TELEGRAM_WEBHOOK_URL) {
app.post('/api/telegram/webhook', async (req: Request, res: Response) => {
  try {
    console.log('📩 [TELEGRAM WEBHOOK]', {
      updateId: req.body?.update_id,
      message: req.body?.message?.text,
      callback: req.body?.callback_query?.data,
    })

    await bot.handleUpdate(req.body)

    res.status(200).send('OK')
  } catch (error) {
    console.error('❌ [TELEGRAM WEBHOOK ERROR]', error)

    res.status(500).send('Webhook error')
  }
})

console.log('🔗 Telegram webhook route: POST /api/telegram/webhook')
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
    if (isProduction) {
      console.log('🤖 Telegram: production mode (no polling)')
      return
    }

    if (!START_TELEGRAM_BOT) {
      console.log(
        '🤖 [runtime] telegram runtime disabled (START_TELEGRAM_BOT=false)'
      )
      return
    }

    try {
      console.log('🤖 [runtime] telegram runtime enabled', {
        username: telegramBotConfig.username,
        botId: botRegistry.main.id,
        productOwnership: botRegistry.main.productOwnership,
        polling: TELEGRAM_POLLING_ENABLED,
        webhook: Boolean(TELEGRAM_WEBHOOK_URL),
      })

      registerDailyTelegramCommands()
      await registerStankeyBot()

      console.log('🤖 [Telegram] Checking bot identity...')
      const me = await bot.telegram.getMe()
      console.log(`🤖 [Telegram] Bot: @${me.username} (id: ${me.id})`)
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

      if (TELEGRAM_WEBHOOK_URL) {
        const webhookEndpoint = `${TELEGRAM_WEBHOOK_URL.replace(/\/$/, '')}/api/telegram/webhook`
        telegramRunningMode = 'webhook'
        console.log(`🤖 Telegram bot ready (webhook route active: ${webhookEndpoint})`)
        return
      }

      if (!TELEGRAM_POLLING_ENABLED) {
        console.log(
          '🤖 [Telegram] Polling skipped (set TELEGRAM_POLLING_ENABLED=true to enable local polling)'
        )
        return
      }

      console.log('🤖 [Telegram] Switching to polling mode...')
      console.log('🤖 [Telegram] Deleting webhook...')
      await bot.telegram
        .deleteWebhook({ drop_pending_updates: false })
        .catch(() => undefined)
      const webhookInfoAfterDelete = await bot.telegram.getWebhookInfo()
      console.log('🤖 [Telegram] Webhook after delete:', {
        url: webhookInfoAfterDelete.url,
        pending_update_count: webhookInfoAfterDelete.pending_update_count,
      })
      console.log('🤖 [Telegram] Launching polling...')
      telegramRunningMode = 'polling'
      void bot
        .launch({ dropPendingUpdates: false }, () =>
          console.log(
            '🤖 Telegram bot ready (polling mode for local development)'
          )
        )
        .catch((error) => {
          telegramRunningMode = null
          if (isTelegramPollingConflict(error)) {
            console.warn(
              '⚠️ [Telegram] Polling skipped: another bot instance is already consuming updates'
            )
            return
          }
          console.error('⚠️ [Telegram] Polling launch failed:', error)
        })
      console.log('🤖 [Telegram] Polling launch started')
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

// ─────────────────────────────────────────────
// BOOTSTRAP
// ─────────────────────────────────────────────
async function bootstrap() {
  const schedulerEnabled = process.env.DISABLE_SCHEDULERS !== 'true'

  // Env Validation
  const criticalEnvs = {
    DATABASE_URL: !!process.env.DATABASE_URL,
    WAYFORPAY_MERCHANT: !!(
      process.env.WAYFORPAY_MERCHANT_ACCOUNT || process.env.WAYFORPAY_MERCHANT
    ),
    WAYFORPAY_SECRET: !!(
      process.env.WAYFORPAY_SECRET_KEY || process.env.WAYFORPAY_SECRET
    ),
    TELEGRAM_BOT_TOKEN: !!telegramBotConfig.token,
    FOCUS_INVITE_LINK: !!process.env.FOCUS_TELEGRAM_CHANNEL_INVITE_LINK,
  }

  Object.entries(criticalEnvs).forEach(([key, val]) => {
    if (!val)
      console.warn(`⚠️ [CONFIG] Missing critical environment variable: ${key}`)
  })

  console.log('🧭 [runtime] startup config', {
    ...criticalEnvs,
    schedulerEnabled,
  })

  const startHttpServer = () => {
    if (server) return

    server = app.listen(PORT, '0.0.0.0', () => {
      trackConnections()
      console.log(
        `🚀 Server running on port ${PORT} (${process.env.NODE_ENV || 'development'})`
      )
    })

    server.on('error', (error: NodeJS.ErrnoException) => {
      if (error.code === 'EADDRINUSE') {
        console.error(
          `❌ Port ${PORT} is already in use. Stop existing process or change PORT.`
        )
        process.exit(1)
      }
      console.error('❌ Server error:', error)
      process.exit(1)
    })
  }

  async function connectWithRetry(retries = 3, delay = 3000) {
    for (let index = 0; index < retries; index += 1) {
      try {
        await withRetry(() => prisma.$connect())
        console.log('✅ DB connected')
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

  startHttpServer()

  void (async () => {
    try {
      const databaseTarget = describeDatabaseTarget(
        process.env.DATABASE_URL?.trim()
      )

      console.log('🧪 [BOOT] Connecting to database...', databaseTarget)

      await connectWithRetry()

      const result = await withRetry(() => prisma.$queryRaw`SELECT 1`)

      console.log('✅ [PRISMA] Database connected | Test query result:', result)

      databaseReady = true

      prismaKeepAliveInterval = setInterval(
        async () => {
          try {
            await withRetry(() => prisma.$queryRaw`SELECT 1`)
          } catch {
            await withRetry(() => prisma.$connect()).catch(() => undefined)
          }
        },
        30 * 60 * 1000
      )

      prismaKeepAliveInterval.unref()
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
      console.log('⏰ [runtime] Starting scheduler...')
      startScheduler()
    } else {
      console.warn('⚠️ [runtime] Scheduler disabled or DB not ready')
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
    try {
      stopScheduler()
    } catch {
      // silent
    }

    try {
      if (START_TELEGRAM_BOT) {
        bot.stop(signal)
      }
    } catch {
      // silent
    }

    if (prismaKeepAliveInterval) {
      clearInterval(prismaKeepAliveInterval)
      prismaKeepAliveInterval = null
    }

    connections.forEach((s) => s.destroy())
    connections.clear()

    if (server) {
      server.closeIdleConnections?.()
      server.closeAllConnections?.()
      await new Promise<void>((resolve, reject) =>
        server!.close((err) => (err ? reject(err) : resolve()))
      )
      console.log('🔌 HTTP server closed')
    }

    await safePrismaDisconnect(`shutdown:${signal}`)
    console.log('🔌 Database disconnected\n✅ Shutdown complete')

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
