// backend/src/index.ts

import 'dotenv/config'
import { type Request, type Response } from 'express'
import { createApp }                                           from './app.js'
import { prisma }                                              from './db/client.js'
import { startDailyScheduler, stopDailyScheduler }             from './modules/daily-cycle/scheduler.js'
import { registerDailyTelegramCommands }                       from './modules/daily-cycle/telegram.js'
import { bot }                                                 from './lib/telegram.js'
import { registerMentorBot }              from './modules/telegram-mentor/index.js'

const PORT = Number(process.env.PORT) || 3001
const TELEGRAM_WEBHOOK_URL = process.env.TELEGRAM_WEBHOOK_URL?.trim() || ''
const START_TELEGRAM_BOT = process.env.START_TELEGRAM_BOT !== 'false'

const app = createApp()
let server: ReturnType<typeof app.listen> | null = null
let telegramRunningMode: 'webhook' | 'polling' | null = null
let isShuttingDown = false
let prismaKeepAliveInterval: NodeJS.Timeout | null = null

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

// ─────────────────────────────────────────────
// TELEGRAM
// ─────────────────────────────────────────────
async function startTelegramBot() {
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
  try {
    console.log('🧪 [BOOT] Connecting to database...')
    await prisma.$connect()

    const result = await prisma.$queryRaw`SELECT 1`
    console.log('✅ [PRISMA] Database connected | Test query result:', result)

    server = app.listen(PORT, () => {
      trackConnections()
      console.log('\n🚀 Starway Studio Backend')
      console.log(`🌐 Server: http://localhost:${PORT}`)
      console.log(`📍 Health: http://localhost:${PORT}/health`)
      console.log(`🔐 Auth: http://localhost:${PORT}/api/auth`)
      console.log(`🎯 Access: http://localhost:${PORT}/api/access`)
      console.log(`🤖 Mentor: http://localhost:${PORT}/api/mentor\n`)
    })

    server.on('error', (error: NodeJS.ErrnoException) => {
      if (error.code === 'EADDRINUSE') {
        console.error(`❌ Port ${PORT} is already in use. Stop existing process or change PORT.`)
        process.exit(1)
      }
      console.error('❌ Server error:', error)
      process.exit(1)
    })

    // Запуск у фоні — не блокує сервер
    startDailyScheduler()
    startTelegramBot().catch((err: unknown) => console.error('⚠️ Telegram async error:', err))

    prismaKeepAliveInterval = setInterval(async () => {
      try {
        await prisma.$queryRaw`SELECT 1`
      } catch {
        await prisma.$connect().catch(() => undefined)
      }
    }, 30 * 60 * 1000)
    prismaKeepAliveInterval.unref()

  } catch (err: unknown) {
    console.error('❌ [BOOT ERROR]', err)
    process.exit(1)
  }
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
      stopDailyScheduler()
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
    process.exitCode = 0
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
