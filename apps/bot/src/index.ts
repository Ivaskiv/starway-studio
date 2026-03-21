import 'dotenv/config'

import { prisma } from '../../../backend/src/db/client.js'
import { registerDailyTelegramCommands } from '../../../backend/src/modules/daily-cycle/telegram.js'
import { registerMentorBot } from '../../../backend/src/modules/telegram-mentor/index.js'
import { bot } from '../../../backend/src/lib/telegram.js'

const TELEGRAM_WEBHOOK_URL = process.env.TELEGRAM_WEBHOOK_URL?.trim() || ''

async function bootstrapBot() {
  if (!process.env.TELEGRAM_BOT_TOKEN) {
    console.log('🤖 Telegram bot skipped (no token)')
    return
  }

  await prisma.$connect()

  registerDailyTelegramCommands()
  await registerMentorBot()

  const me = await bot.telegram.getMe()
  console.log(`🤖 [Bot] @${me.username} (id: ${me.id})`)

  if (TELEGRAM_WEBHOOK_URL) {
    const webhookEndpoint = `${TELEGRAM_WEBHOOK_URL.replace(/\/$/, '')}/api/telegram/webhook`
    await bot.telegram.setWebhook(webhookEndpoint)
    console.log(`🤖 Telegram bot ready (webhook mode: ${webhookEndpoint})`)
    return
  }

  await bot.telegram.deleteWebhook({ drop_pending_updates: false }).catch(() => undefined)
  await bot.launch({ dropPendingUpdates: false })
  console.log('🤖 Telegram bot ready (polling mode)')
}

async function shutdown(signal: string) {
  console.log(`[bot-shutdown] ${signal}`)

  try {
    bot.stop(signal)
  } catch {
    // Compat: preserve current silent stop behavior.
  }

  await prisma.$disconnect().catch(() => undefined)
  process.exitCode = 0
}

bootstrapBot().catch(error => {
  console.error('⚠️ Bot bootstrap failed:', error)
  process.exit(1)
})

process.once('SIGINT', () => {
  void shutdown('SIGINT')
})

process.once('SIGTERM', () => {
  void shutdown('SIGTERM')
})
