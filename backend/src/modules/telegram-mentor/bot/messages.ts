import { handleCommerceReply } from '../../zoom/commerce/zoom.commerce-telegram.js'
import type { Context } from 'telegraf'

import {
  resolveDecision,
  shouldRenderDecisionBeforeTransport,
} from '../../../core/decision/decision.resolver.js'
import {
  bot,
  clearOpsReplyTarget,
  getOpsReplyTarget,
  resolveOpsChatId,
  sendOpsTelegramMessage,
  sendUserTelegramMessage,
} from '../../../lib/telegram.js'
import { logger } from '../../../utils/logger.js'
import {
  handlePendingFocusPaymentEvidenceAttachment,
  handlePendingFocusPaymentEvidenceText,
} from '../../../products/ab-system/telegram/flow.js'
import { trackDmStartFromContent } from '../../events/contentAttribution.service.js'
import { planMessage } from '../conversation/delivery/planDelivery.js'
import { runInPerChatFlow } from '../conversation/queue/perChatFlowQueue.js'
import { resolveLinkedUserIdFromContext } from '../core/state.service.js'
import { buildUserSessionsMessage } from '../handlers/homeScreen.builder.js'
import { getSession, setSupportPending } from '../session.js'
import { escapeTelegramHtml } from '../../../lib/telegram/messageFormatter.js'
import { handleChat } from '../handlers/chat.js'
import {
  getAccessAwareAppReplyMarkupForContext,
} from '../handlers/start.js'
import { handleVoice } from '../handlers/voice.js'
import { renderTelegram } from '../renderers/decisionTelegram.js'
import { resolveTelegramTextRoute, routeTelegramTextMessage } from '../router/messageRouter.js'
import { handleShowResult } from '../../../products/ab-system/telegram/handler.js'

export async function handleUserHomeMessage(ctx: Context, text: string, userId: string | null): Promise<boolean> {
  const menuText = text.toLocaleUpperCase('uk-UA').replace(/^(?:📅|🗓|💬)\uFE0F?\s*/u, '')
  if (!['ПІДТРИМКА', 'МОЇ СЕСІЇ', 'ZOOM КАЛЕНДАР'].includes(menuText)) return false

  const chatId = ctx.chat?.id ?? ctx.from?.id
  if (!chatId) return true

  return runInPerChatFlow(chatId, async () => {
  if (menuText === 'ПІДТРИМКА') {
    const session = await getSession(String(ctx.chat?.id ?? ''))
    if (!session || !resolveOpsChatId()) {
      await planMessage(ctx, 'ctx.reply', 'support_unavailable', 'Підтримка зараз недоступна. Спробуй ще раз пізніше.')
      return true
    }
    await setSupportPending(session.userId, session.chatId, true)
    await planMessage(ctx, 'ctx.reply', 'user_home_support', 'Напиши запитання наступним текстовим повідомленням. Я передам його підтримці.')
    return true
  }
  const linkedUserId = userId ?? await resolveLinkedUserIdFromContext(ctx)
  if (!linkedUserId) {
    await planMessage(ctx, 'ctx.reply', 'user_home_sessions_no_user', 'Не вдалося визначити користувача. Відкрий меню через /start.')
    return true
  }
  const payload = await buildUserSessionsMessage(linkedUserId)
  await planMessage(ctx, 'ctx.reply', 'user_home_my_sessions', menuText === 'ZOOM КАЛЕНДАР' ? 'ZOOM КАЛЕНДАР' : payload.text, {
    inline_keyboard: menuText === 'ZOOM КАЛЕНДАР'
      ? payload.buttons.map(row => row.filter(button => 'web_app' in button)).filter(row => row.length)
      : [...payload.buttons, [{ text: 'МОЇ РЕЗУЛЬТАТИ', callback_data: 'ab_test:show_result' }]],
  })
  return true
  })
}

async function handleTextMessage(ctx: Context) {
 if (!('message' in ctx) || !ctx.message || !('text' in ctx.message)) {
 return
 }

 if (await handleCommerceReply(ctx)) return
 const text = String(ctx.message.text ?? '').trim()
 if (!text) {
 return
 }
 const chatId = String(ctx.chat?.id ?? '')

 // Canonical OPS support reply path.
 // Telegram privacy mode delivers replies to bot messages.
 // Route only the operator's explicit reply to the ForceReply prompt.
 const resolvedOpsChatId = resolveOpsChatId()

 if (chatId && chatId === resolvedOpsChatId) {
   const operatorTelegramUserId = String(ctx.from?.id ?? '')
   const target = operatorTelegramUserId
     ? getOpsReplyTarget(chatId, operatorTelegramUserId)
     : null

   const replyTo =
     'reply_to_message' in ctx.message
       ? ctx.message.reply_to_message
       : undefined

   const replyToMessageId =
     replyTo && typeof replyTo.message_id === 'number'
       ? replyTo.message_id
       : null

   console.info(
     `[OPS_REPLY_TEXT_RECEIVED] incomingChatId=${chatId} operator=${operatorTelegramUserId} ` +
     `hasTarget=${Boolean(target)} replyToMessageId=${replyToMessageId ?? 'null'} ` +
     `expectedPromptMessageId=${target?.promptMessageId ?? 'null'}`,
   )

   if (
     target &&
     replyToMessageId === target.promptMessageId
   ) {
     console.info(
       `[OPS_REPLY_SEND_ATTEMPT] opsChatId=${chatId} operator=${operatorTelegramUserId} targetChatId=${target.userChatId}`,
     )
     let sent = false
     try {
       sent = await sendUserTelegramMessage(target.userChatId, ctx.message.text, { entities: [] })
       console.info(
         `[${sent ? 'OPS_REPLY_SEND_OK' : 'OPS_REPLY_SEND_FAIL'}] opsChatId=${chatId} operator=${operatorTelegramUserId} targetChatId=${target.userChatId}`,
       )
     } catch (error) {
       console.error('[OPS_REPLY_SEND_FAIL]', {
         opsChatId: chatId, operator: operatorTelegramUserId, targetChatId: target.userChatId,
         error: error instanceof Error ? error.message : String(error),
       })
     }

     if (sent) {
       if (getOpsReplyTarget(chatId, operatorTelegramUserId)?.promptMessageId === target.promptMessageId) {
         clearOpsReplyTarget(chatId, operatorTelegramUserId)
       }

       await ctx.reply(
         '✅ ВІДПОВІДЬ НАДІСЛАНО КОРИСТУВАЧУ',
         {
           reply_parameters: {
             message_id: ctx.message.message_id,
           },
         },
       )
     } else {
       await ctx.reply(
         '❌ НЕ ВДАЛОСЯ НАДІСЛАТИ ВІДПОВІДЬ',
         {
           reply_parameters: {
             message_id: ctx.message.message_id,
           },
         },
       )
     }

     return
   }
   return
 }

 if (text.startsWith('/')) return

 const userId = (ctx.state as { userId?: string | null }).userId ?? null
 const userState =
 (ctx.state as { userState?: string | null }).userState ?? null
 if (userId) {
 await trackDmStartFromContent(
 userId,
 text,
 'telegram',
 typeof userState === 'string' ? userState : null
 )
 }

 if (await handleUserHomeMessage(ctx, text, userId)) {
 return
 }

 if (['МОЇ РЕЗУЛЬТАТИ', '📊 МОЇ РЕЗУЛЬТАТИ'].includes(text.toLocaleUpperCase('uk-UA'))) {
 const linkedUserId = userId ?? await resolveLinkedUserIdFromContext(ctx)
 if (linkedUserId) {
 await handleShowResult(ctx, linkedUserId)
 } else {
 await planMessage(ctx, 'ctx.reply', 'user_home_results_no_user', 'Не вдалося визначити користувача. Відкрий меню через /start.')
 }
 return
 }

 if (await handlePendingFocusPaymentEvidenceText(ctx, userId, text)) {
 return
 }

 const route = resolveTelegramTextRoute(text)
 if (route.scenario === 'menu' || route.scenario === 'ab_test_callback' || route.scenario === 'status') {
   if (await routeTelegramTextMessage(ctx, text, route)) return
 }
 const session = await getSession(chatId)
 if (session?.data.supportPending === true) {
   const from = ctx.from
   const supportName =
     [from?.first_name, from?.last_name].filter(Boolean).join(' ').trim()
     || 'Користувач'

   const supportUsername =
     from?.username
       ? ` · @${from.username}`
       : ''

   const supportTime = new Date(ctx.message.date * 1000).toLocaleTimeString(
     'uk-UA',
     {
       hour: '2-digit',
       minute: '2-digit',
       timeZone: 'Europe/Prague',
     },
   )

   const opsText = [
     '🆘 <b>ПІДТРИМКА</b>',
     '',
     `👤 <b>${escapeTelegramHtml(supportName)}</b>${escapeTelegramHtml(supportUsername)}`,
     '',
     `💬 ${escapeTelegramHtml(text)}`,
     '',
     `🕒 ${escapeTelegramHtml(supportTime)}`,
   ].join('\n')
   const sent = await sendOpsTelegramMessage(opsText, {
     parse_mode: 'HTML',
     reply_markup: {
       inline_keyboard: [[
         {
           text: '✍️ ВІДПОВІСТИ',
           callback_data: `ops:support:reply:${chatId}`,
         },
       ]],
     },
   }, {
     messageType: 'user_support', source: 'user_home_support',
   })
   if (sent) {
     await setSupportPending(session.userId, chatId, false)
   }
   await planMessage(ctx, 'ctx.reply', 'support_delivery', sent
     ? 'Твоє повідомлення передано підтримці.'
     : 'Не вдалося передати повідомлення. Спробуй надіслати його ще раз.')
   return
 }

 if (await routeTelegramTextMessage(ctx, text)) return

 const { decision } = await resolveDecision(userId, 'chat_requested', { text })
 if (shouldRenderDecisionBeforeTransport(decision)) {
 await renderTelegram(ctx, decision, ctx.from?.first_name ?? 'Привіт')
 return
 }

 await handleChat(ctx, text)
}

export function registerMessageHandlers(): void {
  bot.on('text', async (ctx) => {
      try {
        await handleTextMessage(ctx)
      } catch (error) {
        logger.error('[telegram-thin-client:text]', error)
        const replyMarkup = await getAccessAwareAppReplyMarkupForContext(ctx)
        await planMessage(
          ctx,
          'ctx.reply',
          'telegram_text_error',
          'Не вдалося обробити повідомлення.',
          replyMarkup
        )
      }
    })
    bot.on(['voice', 'audio'], async (ctx) => {
      try {
        await handleVoice(ctx)
      } catch (error) {
        logger.error('[telegram-thin-client:voice]', error)
        const replyMarkup = await getAccessAwareAppReplyMarkupForContext(ctx)
        await planMessage(
          ctx,
          'ctx.reply',
          'telegram_voice_error',
          'Не вдалося обробити голосове повідомлення.',
          replyMarkup
        )
      }
    })
    bot.on(['photo', 'document'], async (ctx) => {
      try {
        const userId =
          (ctx.state as { userId?: string | null }).userId ??
          (await resolveLinkedUserIdFromContext(ctx).catch(() => null))

        const handled = await handlePendingFocusPaymentEvidenceAttachment(ctx, userId)
        if (handled) {
          return
        }

        const replyMarkup = await getAccessAwareAppReplyMarkupForContext(ctx)
        await planMessage(
          ctx,
          'ctx.reply',
          'telegram_attachment_not_expected',
          'Зараз я не очікую на файл. Якщо це чек за оплату, спочатку натисни «ПРОБЛЕМА З ОПЛАТОЮ».',
          replyMarkup
        )
      } catch (error) {
        logger.error('[telegram-thin-client:attachment]', error)
        const replyMarkup = await getAccessAwareAppReplyMarkupForContext(ctx)
        await planMessage(
          ctx,
          'ctx.reply',
          'telegram_attachment_error',
          'Не вдалося обробити файл. Спробуй надіслати чек ще раз або напиши дані платежу текстом.',
          replyMarkup
        )
      }
    })
}
