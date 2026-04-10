import type { Context } from 'telegraf'

import { bot } from '../../lib/telegram.js'
import { trackDmStartFromContent } from '../events/contentAttribution.service.js'
import { guard } from './core/guard.middleware.js'
import { handleChat } from './handlers/chat.js'
import { handleEvening } from './handlers/evening.js'
import { handleMorning, resumeQuestionSession } from './handlers/morning.js'
import { handlePrivacy } from './handlers/privacy.js'
import { handleStatus } from './handlers/status.js'
import { handleVoice } from './handlers/voice.js'
import { getSession, parseQuestionState } from './session.js'
import { handleEveningAnswer } from './handlers/evening.js'
import { handleMorningAnswer } from './handlers/morning.js'
import { getAccessAwareAppReplyMarkupForContext, handleStart, sendStateMenu } from './handlers/start.js'
import { handleTasks } from './handlers/tasks.js'
import { logger } from '../../utils/logger.js'
import { resolveLinkedUserIdFromContext } from './core/state.service.js'
import { startLeadMagnet } from './flows/leadMagnet.flow.js'
import { dismissNudges } from './services/nudge.service.js'
import { resolveDecision, shouldRenderDecisionBeforeTransport } from '../../core/decision/decision.resolver.js'
import { renderTelegram } from './renderers/decisionTelegram.js'

let mentorBotRegistered = false
const processedUpdates = new Set<number>()

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

async function renderDecisionForContext(
  ctx: Context,
  userId: string | null,
  event: string,
  payload?: Record<string, unknown>,
): Promise<boolean> {
  const firstName = ctx.from?.first_name ?? 'Привіт'
  const { decision } = await resolveDecision(userId, event, payload)
  return renderTelegram(ctx, decision, firstName)
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
    const userId = (ctx.state as { userId?: string | null }).userId ?? null

    try {
      if (action === 'start_trial') {
        if (!(await renderDecisionForContext(ctx, userId, 'trial_offer_requested'))) {
          if (userId) {
            await sendStateMenu(ctx, userId)
          }
        }
        await ctx.answerCbQuery('Показую наступний крок').catch(() => undefined)
        return
      }

      if (action === 'open_status') {
        const { decision } = await resolveDecision(userId, 'status_requested')
        if (decision.nextAction === 'bind_user') {
          await renderTelegram(ctx, decision, ctx.from?.first_name ?? 'Привіт')
        } else {
          await handleStatus(ctx)
        }
        await ctx.answerCbQuery('Оновлюю стан').catch(() => undefined)
        return
      }

      if (action === 'waitlist_early_access') {
        if (!(await renderDecisionForContext(ctx, userId, 'waitlist_requested'))) {
          if (userId) {
            await sendStateMenu(ctx, userId)
          }
        }
        await ctx.answerCbQuery('Оновлюю доступний сценарій').catch(() => undefined)
        return
      }

      if (action === 'continue_ai_mentor') {
        await resumeQuestionSession(ctx)
        await ctx.answerCbQuery('Продовжуємо сесію').catch(() => undefined)
        return
      }

      if (action === 'resume_morning_session') {
        await handleMorning(ctx)
        await ctx.answerCbQuery('Відкриваю ранкову сесію').catch(() => undefined)
        return
      }

      if (action === 'resume_evening_session') {
        await handleEvening(ctx)
        await ctx.answerCbQuery('Відкриваю вечірню сесію').catch(() => undefined)
        return
      }

      if (action === 'continue_ai_mentor_chat') {
        await ctx.reply('👇 Напиши питання ABsystemу в поле вводу нижче, і я продовжу розмову тут у Telegram.')
        await ctx.answerCbQuery('Продовжуємо в Telegram').catch(() => undefined)
        return
      }

      if (action === 'continue_task') {
        await handleTasks(ctx)
        await ctx.answerCbQuery('Показую пріоритетне завдання').catch(() => undefined)
        return
      }

      if (action === 'dismiss_task') {
        if (userId) {
          await dismissNudges(userId)
        }
        await ctx.answerCbQuery('Добре, поки без нагадувань').catch(() => undefined)
        return
      }

      if (action === 'lm_continue') {
        const chatId = String(ctx.chat?.id ?? '')
        const session = chatId ? await getSession(chatId) : null
        if (chatId && session?.userId) {
          const started = await startLeadMagnet(session.userId, chatId, 'telegram_resume')
          if (!started) {
            await sendStateMenu(ctx, session.userId)
            await ctx.answerCbQuery('Доступний актуальний сценарій').catch(() => undefined)
            return
          }
        }
        if (session?.userId) {
          await sendStateMenu(ctx, session.userId)
        }
        await ctx.answerCbQuery('Запускаю практикум').catch(() => undefined)
        return
      }

      if (action === 'lm_continue_material') {
        const chatId = String(ctx.chat?.id ?? '')
        const userId = (ctx.state as { userId?: string | null }).userId ?? null
        if (chatId && userId) {
          const started = await startLeadMagnet(userId, chatId, 'telegram_resume_material')
          if (!started) {
            await sendStateMenu(ctx, userId)
            await ctx.answerCbQuery('Доступний актуальний сценарій').catch(() => undefined)
            return
          }
        }
        await ctx.answerCbQuery('Запускаю матеріал').catch(() => undefined)
        return
      }

      if (action === 'return_main_menu') {
        const chatId = String(ctx.chat?.id ?? '')
        const session = chatId ? await getSession(chatId) : null
        const targetUserId = session?.userId ?? userId
        if (targetUserId) {
          if (!(await renderDecisionForContext(ctx, targetUserId, 'menu_open'))) {
            await sendStateMenu(ctx, targetUserId)
          }
        } else {
          const replyMarkup = await getAccessAwareAppReplyMarkupForContext(ctx)
          await ctx.reply('Starway підключено. Відкрий Mini App для продовження.', {
            ...(replyMarkup ? { reply_markup: replyMarkup } : {}),
          })
        }
        await ctx.answerCbQuery('Готово').catch(() => undefined)
        return
      }

      await ctx.answerCbQuery('Відкрий Mini App для продовження').catch(() => undefined)
    } catch (error) {
      logger.error('[telegram-thin-client:callback]', error)
      await ctx.answerCbQuery('Не вдалося відновити сесію').catch(() => undefined)
    }
  })

  bot.catch((err, ctx) => {
    void (async () => {
      logger.error('[telegram-thin-client:catch]', err)
      const replyMarkup = await getAccessAwareAppReplyMarkupForContext(ctx)
      await ctx.reply('Сталася помилка. Відкрий Mini App для продовження.', {
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
