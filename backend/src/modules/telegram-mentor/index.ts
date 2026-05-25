import type { Context } from 'telegraf'

import { bot } from '../../lib/telegram.js'
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
import { handleFocusChannelJoinByTelegramUserId } from '../subscriptions/payments/callback.notifications.js'
import { conversationOrchestrator } from './conversation/orchestrator/ConversationOrchestrator.js'
import type { OrchestratedContext } from './conversation/types.js'
import { planAck, planMessage } from './conversation/delivery/planDelivery.js'
import {
  AB_TEST_ACTIONS,
} from '@/packages/abTestActions.js'
import {
  handleAbTestCallback,
  handleAbTestEmailCaptureText,
} from '@/products/ab-system/telegram/abTest.service.js'

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

  const normalizedText = text.toLowerCase()
  if (
    normalizedText === 'почати тест' ||
    normalizedText === 'продовжити тут' ||
    normalizedText === 'пройти тест'
  ) {
    console.info('[AB_TEST_START_DEBUG] text_fallback:start_button_text', {
      text,
      normalizedText,
      chatId,
      userId: (ctx.state as { userId?: string | null }).userId ?? null,
    })
    const started = await handleAbTestCallback(ctx, AB_TEST_ACTIONS.START)
    if (started) {
      console.info('[AB_TEST_START_DEBUG] text_fallback:start_button_handled', {
        text,
        chatId,
      })
      return
    }
    console.warn('[AB_TEST_START_DEBUG] text_fallback:start_button_not_handled', {
      text,
      chatId,
    })
  }

  if (normalizedText === 'задати питання') {
    console.info('[AB_TEST_START_DEBUG] text_fallback:faq_button_text', {
      text,
      chatId,
      userId: (ctx.state as { userId?: string | null }).userId ?? null,
    })
    const opened = await handleAbTestCallback(ctx, AB_TEST_ACTIONS.OPEN_FAQ)
    if (opened) {
      return
    }
  }

  if (normalizedText === 'дізнатись про фокус') {
    const opened = await handleAbTestCallback(ctx, AB_TEST_ACTIONS.FOCUS_INFO)
    if (opened) return
  }

  if (normalizedText === 'оплатити фокус') {
    const opened = await handleAbTestCallback(ctx, AB_TEST_ACTIONS.FOCUS_PAY)
    if (opened) return
  }

  if (
    normalizedText === 'я вже оплатив' ||
    normalizedText === 'я вже оплатила' ||
    normalizedText === 'я вже оплатив / оплатила'
  ) {
    const opened = await handleAbTestCallback(ctx, AB_TEST_ACTIONS.FOCUS_ALREADY_PAID)
    if (opened) return
  }

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
    const handledEmailCapture = await handleAbTestEmailCaptureText(ctx, userId, text)
    if (handledEmailCapture) {
      return
    }
  }
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
    conversationOrchestrator.patchContext(ctx as OrchestratedContext)
    await next()
  })

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
      await planMessage(ctx, 'ctx.reply', 'telegram_text_error', 'Не вдалося обробити повідомлення.', replyMarkup)
    }
  })

  bot.on(['voice', 'audio'], async (ctx) => {
    try {
      await handleVoice(ctx)
    } catch (error) {
      logger.error('[telegram-thin-client:voice]', error)
      const replyMarkup = await getAccessAwareAppReplyMarkupForContext(ctx)
      await planMessage(ctx, 'ctx.reply', 'telegram_voice_error', 'Не вдалося обробити голосове повідомлення.', replyMarkup)
    }
  })

  bot.on('callback_query', async (ctx) => {
    const action = 'data' in ctx.callbackQuery ? String(ctx.callbackQuery.data ?? '') : ''
    // FIX 2026-05-25 B1: answer callback immediately to prevent infinite Telegram spinner on slow handlers
    await ctx.answerCbQuery().catch(() => null)
    // FIX 2026-05-25 C2: temporary callback diagnostic log
    console.log('[BOT][CB] data:', action, 'from:', ctx.from?.id)
    console.info('[AB_TEST_START_DEBUG] callback_query:received', {
      action,
      chatId: String(ctx.chat?.id ?? ''),
      fromId: String(ctx.from?.id ?? ''),
      userId: (ctx.state as { userId?: string | null }).userId ?? null,
    })
    try {
      if (isStaleCallback(ctx)) {
        await planAck(ctx, 'ctx.answerCbQuery', 'telegram_stale_callback', 'Посилання застаріло — натисни /start').catch(() => undefined)
        console.warn('[AB_TEST_START_DEBUG] callback_query:stale_rejected', {
          action,
          chatId: String(ctx.chat?.id ?? ''),
        })
        return
      }

      const handled = await dispatchTelegramCallbackEvent(ctx, action)
      console.info('[CALLBACK_FLOW_RESULT]', {
  action,
  handled,
})

      if (!handled) {
        console.warn('[AB_TEST_START_DEBUG] callback_query:not_handled', {
          action,
          chatId: String(ctx.chat?.id ?? ''),
        })
        await planAck(ctx, 'ctx.answerCbQuery', 'telegram_callback_not_handled', 'Відкрий Mini App для продовження').catch(() => undefined)
      } else {
        console.info('[AB_TEST_START_DEBUG] callback_query:handled', {
          action,
          chatId: String(ctx.chat?.id ?? ''),
        })
      }
    } catch (error) {
      logger.error('[telegram-thin-client:callback]', error)
      await planAck(ctx, 'ctx.answerCbQuery', 'telegram_callback_restore_failed', 'Не вдалося відновити сесію').catch(() => undefined)
    }
  })

  const isParticipantStatus = (status: string | undefined): boolean =>
    status === 'member' || status === 'administrator' || status === 'creator' || status === 'restricted'

  const handleChannelJoinUpdate = async (ctx: Context) => {
    const update = ctx.update as {
      chat_member?: {
        chat?: { id?: number | string }
        old_chat_member?: { status?: string }
        new_chat_member?: { status?: string; user?: { id?: number | string } }
      }
      my_chat_member?: {
        chat?: { id?: number | string }
        old_chat_member?: { status?: string }
        new_chat_member?: { status?: string; user?: { id?: number | string } }
      }
    }

    const memberUpdate = update.chat_member ?? update.my_chat_member
    if (!memberUpdate) return

    const oldStatus = memberUpdate.old_chat_member?.status
    const newStatus = memberUpdate.new_chat_member?.status
    const becameParticipant = !isParticipantStatus(oldStatus) && isParticipantStatus(newStatus)
    if (!becameParticipant) return

    const telegramUserId = String(memberUpdate.new_chat_member?.user?.id ?? '').trim()
    const chatId = String(memberUpdate.chat?.id ?? '').trim()
    if (!telegramUserId || !chatId) return

    await handleFocusChannelJoinByTelegramUserId(telegramUserId, chatId).catch((error) => {
      logger.warn('[focus:block12:post-join] failed', error)
    })
  }

  bot.on('chat_member', async (ctx) => {
    await handleChannelJoinUpdate(ctx)
  })

  bot.on('my_chat_member', async (ctx) => {
    await handleChannelJoinUpdate(ctx)
  })

  bot.catch((err, ctx) => {
    void (async () => {
      logger.error('[telegram-thin-client:catch]', err)
      const replyMarkup = await getAccessAwareAppReplyMarkupForContext(ctx)
      await planMessage(ctx, 'ctx.reply', 'telegram_global_catch', 'Спробуй ще раз за хвилину.', replyMarkup).catch(() => undefined)
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
