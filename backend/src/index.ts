// backend/src/index.ts
import 'dotenv/config'
import { prisma } from './db/client.js'
import { createApp } from './app.js'
import { bot as wheelBot } from './modules/wheel/telegram.js'
import { registerDailyTelegramCommands } from './modules/daily-cycle/telegram.js'
import { startDailyScheduler } from './modules/daily-cycle/scheduler.js'

const PORT = process.env.PORT || 3001

const app = createApp()

let telegramStarted = false;

const startTelegramBot = async () => {
  if (telegramStarted || !process.env.TELEGRAM_BOT_TOKEN) return;
  try {
    // fix code_x: register daily commands on shared bot before launch.
    registerDailyTelegramCommands();
    await wheelBot.launch();
    telegramStarted = true;
    console.log('🤖 Telegram bot started');
  } catch (error) {
    console.error('⚠️ Telegram bot launch failed:', error);
  }
};

// ══════════════════════════════════════════════════════
// START SERVER
// ══════════════════════════════════════════════════════
const server = app.listen(PORT, async () => {
  try {
    await prisma.$connect()
    const result = await prisma.$queryRaw`SELECT 1`
    // fix code_x: initialize daily cron jobs (morning/evening reminders + overdue checks).
    startDailyScheduler()
    await startTelegramBot()
    console.log('🧪 [PRISMA] Boot check...')
    console.log('✅ [PRISMA] Database connected | Test query result:', result)
    console.log('\n🚀 Starway Studio Backend')
    console.log(`🌐 Server: http://localhost:${PORT}`)
    console.log(`📍 Health: http://localhost:${PORT}/health`)
    console.log(`🔐 Auth: http://localhost:${PORT}/api/auth`)
    console.log(`🎯 Access: http://localhost:${PORT}/api/access`)
    console.log(`🤖 Mentor: http://localhost:${PORT}/api/mentor\n`)
  } catch (err: any) {
    console.error('❌ [PRISMA ERROR]', err.message)
  }
})

// fix code_x: explicit handler for occupied port to avoid opaque crash during local dev.
server.on('error', (error: any) => {
  if (error?.code === 'EADDRINUSE') {
    console.error(`❌ Port ${PORT} is already in use. Stop existing process or set PORT to another value.`)
    process.exit(1)
  }
  console.error('❌ Server error:', error)
  process.exit(1)
})

// ══════════════════════════════════════════════════════
// GRACEFUL SHUTDOWN
// ══════════════════════════════════════════════════════
const shutdown = async (signal: string) => {
  console.log(`\n👋 ${signal} received. Shutting down gracefully...`)
  if (telegramStarted) {
    try {
      wheelBot.stop(signal);
      console.log('🤖 Telegram bot stopped');
    } catch (error) {
      console.error('⚠️ Telegram bot stop error:', error);
    }
  }
  server.close(async () => {
    console.log('🔌 HTTP server closed')
    await prisma.$disconnect()
    console.log('🔌 Database disconnected')
    console.log('✅ Shutdown complete')
    process.exit(0)
  })
  setTimeout(() => {
    console.error('⚠️ Forced shutdown after timeout')
    process.exit(1)
  }, 10_000)
}

process.on('SIGINT',  () => shutdown('SIGINT'))
process.on('SIGTERM', () => shutdown('SIGTERM'))
process.on('unhandledRejection', reason => {
  console.error('❌ Unhandled Rejection:', reason)
  if (process.env.NODE_ENV !== 'production') process.exit(1)
})

export default app
