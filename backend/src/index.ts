// backend/src/index.ts

import { config as loadEnv } from 'dotenv'
import { existsSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { type Request, type Response } from 'express'
import { createApp }                                           from './app.js'
import { prisma, withRetry }                                   from './db/client.js'
import { registerDailyTelegramCommands }                       from './modules/daily-cycle/telegram.js'
import { bot }                                                 from './lib/telegram.js'
import { registerMentorBot }              from './modules/telegram-mentor/index.js'
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
const START_TELEGRAM_BOT = process.env.START_TELEGRAM_BOT !== 'false'
const TELEGRAM_POLLING_ENABLED = process.env.TELEGRAM_POLLING_ENABLED === 'true'
  || (!TELEGRAM_WEBHOOK_URL && !isProduction && process.env.TELEGRAM_POLLING_ENABLED !== 'false')
const MINIAPP_URL = process.env.MINIAPP_URL?.trim() || 'https://starway-frontend.vercel.app/miniapp'
const MINIAPP_VERSION = process.env.MINIAPP_VERSION?.trim() || 'dev'

const app = createApp()
let server: ReturnType<typeof app.listen> | null = null
let telegramRunningMode: 'webhook' | 'polling' | null = null
let isShuttingDown = false
let prismaKeepAliveInterval: NodeJS.Timeout | null = null
let databaseReady = false

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
    const response = (error as { response?: { error_code?: number; description?: string } }).response
    if (response?.error_code === 409) return true
    if (response?.description?.includes('terminated by other getUpdates request')) return true
  }

  return error instanceof Error && error.message.includes('terminated by other getUpdates request')
}

// ─────────────────────────────────────────────
// TELEGRAM WEBHOOK ROUTE
// Реєструємо маршрут тільки якщо є публічний webhook URL.
// ─────────────────────────────────────────────
if (START_TELEGRAM_BOT && process.env.TELEGRAM_BOT_TOKEN && TELEGRAM_WEBHOOK_URL) {
  app.use('/api/telegram/webhook', (req: Request, res: Response) => {
    bot.handleUpdate(req.body, res)
  })
  console.log('🔗 Telegram webhook route: POST /api/telegram/webhook')
}

app.get('/', (_req, res) => {
  res.status(200).send('OK')
})

// ─────────────────────────────────────────────
// TELEGRAM
// ─────────────────────────────────────────────
async function startTelegramBot() {
  if (isProduction) {
    console.log('🤖 Telegram: production mode (no polling)')
    return
  }

  if (!START_TELEGRAM_BOT) {
    console.log('🤖 Telegram skipped in backend (START_TELEGRAM_BOT=false)')
    return
  }

  if (!process.env.TELEGRAM_BOT_TOKEN) {
    console.log('🤖 Telegram skipped (no token)')
    return
  }

    try {
      // Реєструємо всі команди бота
      registerDailyTelegramCommands()
      await registerMentorBot()

      console.log('🤖 [Telegram] Checking bot identity...')
      const me = await bot.telegram.getMe()
      console.log(`🤖 [Telegram] Bot: @${me.username} (id: ${me.id})`)
      await bot.telegram.setChatMenuButton({
        menuButton: {
          type: 'default',
        },
      }).catch((error) => {
        console.warn('⚠️ [Telegram] Failed to reset chat menu button:', error)
      })
      await bot.telegram.setMyCommands([
        { command: 'privacy', description: 'Політика конфіденційності чат-бота' },
      ]).catch((error) => {
        console.warn('⚠️ [Telegram] Failed to set global commands:', error)
      })
      await bot.telegram.setMyCommands([
        { command: 'privacy', description: 'Політика конфіденційності чат-бота' },
      ], {
        scope: { type: 'all_private_chats' },
      }).catch((error) => {
        console.warn('⚠️ [Telegram] Failed to set private chat commands:', error)
      })
      await bot.telegram.setMyCommands([
        { command: 'privacy', description: 'Політика конфіденційності чат-бота' },
      ], {
        scope: { type: 'all_group_chats' },
      }).catch((error) => {
        console.warn('⚠️ [Telegram] Failed to set group chat commands:', error)
      })
      await bot.telegram.setMyCommands([
        { command: 'privacy', description: 'Політика конфіденційності чат-бота' },
      ], {
        scope: { type: 'all_chat_administrators' },
      }).catch((error) => {
        console.warn('⚠️ [Telegram] Failed to set admin chat commands:', error)
      })

      const webhookInfoBefore = await bot.telegram.getWebhookInfo()
      console.log('🤖 [Telegram] Webhook before start:', {
        url: webhookInfoBefore.url,
        has_custom_certificate: webhookInfoBefore.has_custom_certificate,
        pending_update_count: webhookInfoBefore.pending_update_count,
        last_error_date: webhookInfoBefore.last_error_date,
        last_error_message: webhookInfoBefore.last_error_message,
      })

      if (TELEGRAM_WEBHOOK_URL) {
        const webhookEndpoint = `${TELEGRAM_WEBHOOK_URL.replace(/\/$/, '')}/api/telegram/webhook`
        console.log(`🤖 [Telegram] Setting webhook: ${webhookEndpoint}`)
        await bot.telegram.setWebhook(webhookEndpoint)
        const webhookInfoAfter = await bot.telegram.getWebhookInfo()
        console.log('🤖 [Telegram] Webhook after set:', {
          url: webhookInfoAfter.url,
          pending_update_count: webhookInfoAfter.pending_update_count,
        })
        telegramRunningMode = 'webhook'
        console.log(`🤖 Telegram bot ready (webhook mode: ${webhookEndpoint})`)
        return
      }

      if (!TELEGRAM_POLLING_ENABLED) {
        console.log('🤖 [Telegram] Polling skipped (set TELEGRAM_POLLING_ENABLED=true to enable local polling)')
        return
      }

      // Local development fallback:
      // Telegram cannot reach localhost webhook, so we switch to polling.
      console.log('🤖 [Telegram] Switching to polling mode...')
      console.log('🤖 [Telegram] Deleting webhook...')
      await bot.telegram.deleteWebhook({ drop_pending_updates: false }).catch(() => undefined)
      const webhookInfoAfterDelete = await bot.telegram.getWebhookInfo()
      console.log('🤖 [Telegram] Webhook after delete:', {
        url: webhookInfoAfterDelete.url,
        pending_update_count: webhookInfoAfterDelete.pending_update_count,
      })
      console.log('🤖 [Telegram] Launching polling...')
      telegramRunningMode = 'polling'
      void bot.launch(
        { dropPendingUpdates: false },
        () => console.log('🤖 Telegram bot ready (polling mode for local development)'),
      ).catch((error) => {
        if (isTelegramPollingConflict(error)) {
          console.warn('⚠️ [Telegram] Polling skipped: another bot instance is already consuming updates')
          return
        }
        console.error('⚠️ [Telegram] Polling launch failed:', error)
      })
      console.log('🤖 [Telegram] Polling launch started')
  } catch (error) {
    console.error('⚠️ Telegram bot setup failed:', error)
  }
}

// ─────────────────────────────────────────────
// BOOTSTRAP
// ─────────────────────────────────────────────
async function bootstrap() {
  const startHttpServer = () => {
    if (server) return

    server = app.listen(PORT, '0.0.0.0', () => {
      trackConnections()
      console.log(`🚀 Server running on port ${PORT} (${process.env.NODE_ENV || 'development'})`)
    })

    server.on('error', (error: NodeJS.ErrnoException) => {
      if (error.code === 'EADDRINUSE') {
        console.error(`❌ Port ${PORT} is already in use. Stop existing process or change PORT.`)
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
          await new Promise<void>(resolve => setTimeout(resolve, delay))
          continue
        }
        throw error
      }
    }
  }

  startHttpServer()

  void (async () => {
    try {
      const databaseTarget = describeDatabaseTarget(process.env.DATABASE_URL?.trim())
      console.log('🧪 [BOOT] Connecting to database...', databaseTarget)
      await connectWithRetry()

      const result = await withRetry(() => prisma.$queryRaw`SELECT 1`)
      console.log('✅ [PRISMA] Database connected | Test query result:', result)
      databaseReady = true

      startScheduler()

      prismaKeepAliveInterval = setInterval(async () => {
        try {
          await withRetry(() => prisma.$queryRaw`SELECT 1`)
        } catch {
          await withRetry(() => prisma.$connect()).catch(() => undefined)
        }
      }, 30 * 60 * 1000)
      prismaKeepAliveInterval.unref()
    } catch (err: unknown) {
      console.warn('⚠️ [BOOT] Database unavailable, API continues in degraded mode', {
        target: describeDatabaseTarget(process.env.DATABASE_URL?.trim()),
        error: err instanceof Error ? err.message : err,
      })
      databaseReady = false
    }
  })()

  startTelegramBot().catch((err: unknown) => console.error('⚠️ Telegram async error:', err))
}

bootstrap()

// ─────────────────────────────────────────────
// GRACEFUL SHUTDOWN
// ─────────────────────────────────────────────
const connections = new Set<import('node:net').Socket>()

function trackConnections() {
  server?.on('connection', socket => {
    connections.add(socket)
    socket.once('close', () => connections.delete(socket))
  })
}

async function shutdown(signal: string) {
  if (isShuttingDown) {
    console.log(`[shutdown] ${signal} received again, shutdown already in progress`)
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
      if (START_TELEGRAM_BOT) {
        bot.stop(signal)
      }
    } catch {
      // silent
    }

    try {
      stopScheduler()
    } catch {
      // silent
    }

    if (prismaKeepAliveInterval) {
      clearInterval(prismaKeepAliveInterval)
      prismaKeepAliveInterval = null
    }

    connections.forEach(s => s.destroy())
    connections.clear()

    if (server) {
      server.closeIdleConnections?.()
      server.closeAllConnections?.()
      await new Promise<void>((resolve, reject) =>
        server!.close(err => err ? reject(err) : resolve())
      )
      console.log('🔌 HTTP server closed')
    }

    await prisma.$disconnect().catch(() => {})
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

process.on('unhandledRejection', reason => {
  console.error('[unhandled]', reason)
})

export default app
