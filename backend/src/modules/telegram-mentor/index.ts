import type { Context } from 'telegraf'

import { bot } from '../../lib/telegram.js'
import { absystemContent } from '@/products/absystem/config/absystem.content.js'
import { trackDmStartFromContent } from '../events/contentAttribution.service.js'
import { guard } from './core/guard.middleware.js'
import { handleChat } from './handlers/chat.js'
import { handleEvening } from './handlers/evening.js'
import { handleMorning } from './handlers/morning.js'
import { handlePrivacy } from './handlers/privacy.js'
import { handleStatus } from './handlers/status.js'
import { handleVoice } from './handlers/voice.js'
import { getSession, parseQuestionState } from './session.js'
import { handleEveningAnswer } from './handlers/evening.js'
import { handleMorningAnswer } from './handlers/morning.js'
import { getAccessAwareAppReplyMarkupForContext, handleStart } from './handlers/start.js'
import { logger } from '../../utils/logger.js'
import { resolveLinkedUserIdFromContext } from './core/state.service.js'
import { resolveDecision, shouldRenderDecisionBeforeTransport } from '../../core/decision/decision.resolver.js'
import { renderTelegram } from './renderers/decisionTelegram.js'
import { dispatchTelegramCallbackEvent } from './services/telegram-event-bus.service.js'

let mentorBotRegistered = false
const processedUpdates = new Set<number>()

interface MentorBotRegistrationOptions {
  product?: string
}

async function handleTextMessage(ctx: Context) {
  if (!('message' in ctx) || !ctx.message || !('text' in ctx.message)) {
    return
  }

  const text = String(ctx.message.text ?? '').trim()
  if (!text || text.startsWith('/')) {
    return
  }

  const chatId = String(ctx.chat?.id ?? '')
  if (chatId) {
    const session = await getSession(chatId)
    const parsed = session ? parseQuestionState(session.state) : null

    if (parsed?.type === 'morning') {
      await handleMorningAnswer(ctx, text)
      return
    }

    if (parsed?.type === 'evening') {
      await handleEveningAnswer(ctx, text)
      return
    }
  }

  const userId = (ctx.state as { userId?: string | null }).userId ?? null
  const userState = (ctx.state as { userState?: string | null }).userState ?? null
  if (userId) {
    await trackDmStartFromContent(userId, text, 'telegram', typeof userState === 'string' ? userState : null)
  }

  const { decision } = await resolveDecision(userId, 'chat_requested', { text })
  if (shouldRenderDecisionBeforeTransport(decision)) {
    await renderTelegram(ctx, decision, ctx.from?.first_name ?? 'Привіт')
    return
  }

  await handleChat(ctx, text)
}

function isStaleCallback(ctx: Context, maxAgeMs = 2 * 60 * 60 * 1000): boolean {
  if (!('callbackQuery' in ctx) || !ctx.callbackQuery || !('message' in ctx.callbackQuery)) {
    return false
  }

  const message = ctx.callbackQuery.message
  if (!message || typeof message !== 'object' || !('date' in message)) {
    return false
  }

  const messageDate = Number((message as { date?: number }).date ?? 0) * 1000
  if (!Number.isFinite(messageDate) || messageDate <= 0) {
    return false
  }

  return Date.now() - messageDate > maxAgeMs
}

export async function registerMentorBot(_options?: MentorBotRegistrationOptions) {
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

  bot.use(async (ctx, next) => {
    ;(ctx.state as { userId?: string | null }).userId = await resolveLinkedUserIdFromContext(ctx)
    await next()
  })

  bot.command('start', handleStart)

  bot.use(guard)

  bot.command('morning', handleMorning)
  bot.command('evening', handleEvening)
  bot.command('status', handleStatus)
  bot.command('privacy', handlePrivacy)

  bot.on('text', async (ctx) => {
    try {
      await handleTextMessage(ctx)
    } catch (error) {
      logger.error('[telegram-thin-client:text]', error)
      const replyMarkup = await getAccessAwareAppReplyMarkupForContext(ctx)
      await ctx.reply('Не вдалося обробити повідомлення.', {
        ...(replyMarkup ? { reply_markup: replyMarkup } : {}),
      })
    }
  })

  bot.on(['voice', 'audio'], async (ctx) => {
    try {
      await handleVoice(ctx)
    } catch (error) {
      logger.error('[telegram-thin-client:voice]', error)
      const replyMarkup = await getAccessAwareAppReplyMarkupForContext(ctx)
      await ctx.reply('Не вдалося обробити голосове повідомлення.', {
        ...(replyMarkup ? { reply_markup: replyMarkup } : {}),
      })
    }
  })

  bot.on('callback_query', async (ctx) => {
    const action = 'data' in ctx.callbackQuery ? String(ctx.callbackQuery.data ?? '') : ''
    try {
      if (isStaleCallback(ctx)) {
        await ctx.answerCbQuery().catch(() => undefined)
        return
      }

      const handled = await dispatchTelegramCallbackEvent(ctx, action)
      if (!handled) {
        await ctx.answerCbQuery('Відкрий Mini App для продовження').catch(() => undefined)
      }
    } catch (error) {
      logger.error('[telegram-thin-client:callback]', error)
      await ctx.answerCbQuery('Не вдалося відновити сесію').catch(() => undefined)
    }
  })

  bot.catch((err, ctx) => {
    void (async () => {
      logger.error('[telegram-thin-client:catch]', err)
      const replyMarkup = await getAccessAwareAppReplyMarkupForContext(ctx)
      await ctx.reply('Спробуй ще раз за хвилину.', {
        ...(replyMarkup ? { reply_markup: replyMarkup } : {}),
      }).catch(() => undefined)
    })()
  })

  // await bot.telegram.setMyCommands([
  //   { command: 'start', description: 'Відкрити Starway' },
  //   { command: 'morning', description: 'Запустити ранкову сесію' },
  //   { command: 'evening', description: 'Запустити вечірню сесію' },
  //   { command: 'status', description: 'Подивитися прогрес' },
  //   { command: 'privacy', description: 'Політика приватності' },
  // ])

  console.log('✅ [TelegramMentor] Thin client handlers registered')
}
