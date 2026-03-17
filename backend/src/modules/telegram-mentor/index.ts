import type { Context } from 'telegraf'
import { bot } from '../../lib/telegram.js'
import { handleStart } from './handlers/start.js'
import { handleMorning, handleMorningAnswer } from './handlers/morning.js'
import { handleEvening, handleEveningAnswer } from './handlers/evening.js'
import { handleTasks, handleTaskDone } from './handlers/tasks.js'
import { handleStatus } from './handlers/status.js'
import { handleChat } from './handlers/chat.js'
import { getSession, clearSession } from './session.js'

export function registerMentorBot() {
  // ── Commands ────────────────────────────────────────────────────────
  bot.command('start', handleStart)
  bot.command('morning', handleMorning)
  bot.command('evening', handleEvening)
  bot.command('task', handleTasks)
  bot.command('status', handleStatus)

  bot.command('cancel', async (ctx) => {
    const chatId = getChatId(ctx)
    if (!chatId) return
    const session = await getSession(chatId)
    if (session) await clearSession(session.userId, chatId)
    await ctx.reply('❌ Скасовано.')
  })

  // ── Main menu buttons ───────────────────────────────────────────────
  bot.hears('🌅 Ранок', handleMorning)
  bot.hears('🌙 Вечір', handleEvening)
  bot.hears('✅ Завдання', handleTasks)
  bot.hears('📊 Стан', handleStatus)

  bot.hears('❌ Скасувати', async (ctx) => {
    const chatId = getChatId(ctx)
    if (!chatId) return
    const session = await getSession(chatId)
    if (session) await clearSession(session.userId, chatId)
    await ctx.reply('❌ Скасовано.')
  })

  // ── Inline callbacks ───────────────────────────────────────────────
  bot.action(/^done_(.+)$/, async (ctx) => {
    await handleTaskDone(ctx, ctx.match?.[1] ?? '')
  })

  // ── Text routing ───────────────────────────────────────────────────
  bot.on('message', async (ctx) => {
    if (!('text' in ctx.message) || !ctx.message?.text) {
      await ctx.reply('Щоб почати — /start')
      return
    }
    const chatId = getChatId(ctx)
    if (!chatId) {
      await ctx.reply('Щоб почати — /start')
      return
    }
    const text = ctx.message.text.trim()
    const session = await getSession(chatId)

    if (!session) {
      await ctx.reply('Щоб почати — /start')
      return
    }

    const { state } = session

    if (state.startsWith('morning_q')) {
      await handleMorningAnswer(ctx, text)
      return
    }

    if (state.startsWith('evening_q')) {
      await handleEveningAnswer(ctx, text)
      return
    }

    await handleChat(ctx, text === '💬 Ментор' ? 'Привіт! Що зараз найважливіше?' : text)
  })

  console.log('✅ [TelegramMentor] Handlers registered')
}

function getChatId(ctx: Context): string | null {
  const chat = ctx.chat as { id?: number } | undefined
  return chat?.id ? String(chat.id) : null
}
