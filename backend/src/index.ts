// backend/src/index.ts

import 'dotenv/config'
import { type Request, type Response } from 'express'
import { createApp }                                           from './app.js'
import { prisma }                                              from './db/client.js'
import { startDailyScheduler }                                 from './modules/daily-cycle/scheduler.js'
import { registerDailyTelegramCommands }                       from './modules/daily-cycle/telegram.js'
import { bot }                                                 from './lib/telegram.js'
import { registerMentorCommands }                              from './modules/wheel/telegram.js'
import { registerMentorBot }              from './modules/telegram-mentor/index.js'
import { startScheduler } from './scheduler.js'

const PORT = Number(process.env.PORT) || 3001

const app = createApp()
let server: ReturnType<typeof app.listen> | null = null

// ─────────────────────────────────────────────
// TELEGRAM WEBHOOK ROUTE
// Telegraf v4 — handleUpdate замість webhookCallback
// Telegram надсилає POST сюди замість polling
// ─────────────────────────────────────────────
if (process.env.TELEGRAM_BOT_TOKEN) {
  app.use('/api/telegram/webhook', (req: Request, res: Response) => {
    bot.handleUpdate(req.body, res)
  })
  console.log('🔗 Telegram webhook route: POST /api/telegram/webhook')
}

// ─────────────────────────────────────────────
// TELEGRAM
// ─────────────────────────────────────────────
async function startTelegramBot() {
  if (!process.env.TELEGRAM_BOT_TOKEN) {
    console.log('🤖 Telegram skipped (no token)')
    return
  }

    try {
      // Реєструємо всі команди бота
      registerDailyTelegramCommands()
      registerMentorCommands(bot)   // /mentor, /goal, /streak, /report, /wheel
      registerMentorBot()

    // ❌ wheelBot.launch() — НЕ викликаємо (polling конфліктує з webhook)
    // ✅ Updates приходять через POST /api/telegram/webhook

    console.log('🤖 Telegram bot ready (webhook mode)')
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
      console.log('\n🚀 Starway Studio Backend')
      console.log(`🌐 Server: http://localhost:${PORT}`)
      console.log(`📍 Health: http://localhost:${PORT}/health`)
      console.log(`🔐 Auth: http://localhost:${PORT}/api/auth`)
      console.log(`🎯 Access: http://localhost:${PORT}/api/access`)
      console.log(`🤖 Mentor: http://localhost:${PORT}/api/mentor\n`)
    })

    server.on('error', (error: any) => {
      if (error?.code === 'EADDRINUSE') {
        console.error(`❌ Port ${PORT} is already in use. Stop existing process or change PORT.`)
        process.exit(1)
      }
      console.error('❌ Server error:', error)
      process.exit(1)
    })

    // Запуск у фоні — не блокує сервер
    startDailyScheduler()
    startTelegramBot().catch((err: any) => console.error('⚠️ Telegram async error:', err))
    startScheduler()

  } catch (err: any) {
    console.error('❌ [BOOT ERROR]', err)
    process.exit(1)
  }
}

bootstrap()

// ─────────────────────────────────────────────
// GRACEFUL SHUTDOWN
// ─────────────────────────────────────────────
const connections = new Set<any>()

function trackConnections() {
  server?.on('connection', socket => {
    connections.add(socket)
    socket.once('close', () => connections.delete(socket))
  })
}

async function shutdown(signal: string) {
  console.log(`\n👋 ${signal} received. Shutting down...`)

  const forceKill = setTimeout(() => {
    console.error('⚠️ Forced shutdown after timeout')
    process.exit(1)
  }, 5_000).unref()

  try {
    connections.forEach(s => s.destroy())
    connections.clear()

    if (server) {
      await new Promise<void>((resolve, reject) =>
        server!.close(err => err ? reject(err) : resolve())
      )
      console.log('🔌 HTTP server closed')
    }

    await prisma.$disconnect()
    console.log('🔌 Database disconnected\n✅ Shutdown complete')

    clearTimeout(forceKill)
    process.exit(0)
  } catch (error) {
    console.error('⚠️ Shutdown error:', error)
    process.exit(1)
  }
}



process.on('SIGINT', async () => {
  console.log('Shutting down...')
  await prisma.$disconnect()
  process.exit(0)
})

process.on('SIGTERM', async () => {
  console.log('Shutting down...')
  await prisma.$disconnect()
  process.exit(0)
})

process.on('unhandledRejection', reason => {
  console.error('❌ Unhandled Rejection:', reason)
  if (process.env.NODE_ENV !== 'production') process.exit(1)
})

export default app
