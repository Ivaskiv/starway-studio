import type { Context } from 'telegraf'

import { bot } from '../../lib/telegram.js'
import { lmOnlyModeMiddleware } from '../../middleware/lmOnlyMode.js'
import { handleChat } from './handlers/chat.js'
import { handleEvening } from './handlers/evening.js'
import { handleMorning } from './handlers/morning.js'
import { handlePrivacy } from './handlers/privacy.js'
import { handleStatus } from './handlers/status.js'
import { getTelegramAppUrl, openAppKeyboard } from './keyboards.js'
import { logger } from '../../utils/logger.js'

let mentorBotRegistered = false
const processedUpdates = new Set<number>()

function getStartText() {
  const appUrl = getTelegramAppUrl()
  if (appUrl) {
    return 'Starway підключено. Відкрий Mini App або напиши повідомлення, щоб звернутися до AI.'
  }

  return 'Starway підключено. Mini App URL зараз недоступний, але ти можеш писати асистенту прямо тут.'
}

async function handleTextMessage(ctx: Context) {
  if (!('message' in ctx) || !ctx.message || !('text' in ctx.message)) {
    return
  }

  const text = String(ctx.message.text ?? '').trim()
  if (!text || text.startsWith('/')) {
    return
  }

  await handleChat(ctx, text)
}

export async function registerMentorBot() {
  if (mentorBotRegistered) return
  mentorBotRegistered = true

  bot.use(async (ctx, next) => {
    const updateId = ctx.update.update_id
    if (processedUpdates.has(updateId)) {
      return
    }

    processedUpdates.add(updateId)
    setTimeout(() => processedUpdates.delete(updateId), 5_000)
    await next()
  })

  bot.use(lmOnlyModeMiddleware)

  bot.command('start', async (ctx) => {
    await ctx.reply(getStartText(), {
      reply_markup: openAppKeyboard().reply_markup,
    })
  })

  bot.command('morning', handleMorning)
  bot.command('evening', handleEvening)
  bot.command('status', handleStatus)
  bot.command('privacy', handlePrivacy)

  bot.on('text', async (ctx) => {
    try {
      await handleTextMessage(ctx)
    } catch (error) {
      logger.error('[telegram-thin-client:text]', error)
      await ctx.reply('Не вдалося обробити повідомлення.', {
        reply_markup: openAppKeyboard().reply_markup,
      })
    }
  })

  bot.on('callback_query', async (ctx) => {
    await ctx.answerCbQuery('Відкрий Mini App для продовження').catch(() => undefined)
  })

  bot.catch((err, ctx) => {
    void (async () => {
      logger.error('[telegram-thin-client:catch]', err)
      await ctx.reply('Сталася помилка. Відкрий Mini App для продовження.', {
        reply_markup: openAppKeyboard().reply_markup,
      }).catch(() => undefined)
    })()
  })

  await bot.telegram.setMyCommands([
    { command: 'start', description: 'Відкрити Starway' },
    { command: 'morning', description: 'Запустити ранкову сесію' },
    { command: 'evening', description: 'Запустити вечірню сесію' },
    { command: 'status', description: 'Подивитися прогрес' },
    { command: 'privacy', description: 'Політика приватності' },
  ])

  console.log('✅ [TelegramMentor] Thin client handlers registered')
}

