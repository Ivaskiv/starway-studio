import type { Context } from 'telegraf'

import {
  resolveDecision,
  shouldRenderDecisionBeforeTransport,
} from '../../../core/decision/decision.resolver.js'
import { bot } from '../../../lib/telegram.js'
import { logger } from '../../../utils/logger.js'
import {
  handlePendingFocusPaymentEvidenceAttachment,
  handlePendingFocusPaymentEvidenceText,
} from '../../../products/ab-system/telegram/flow.js'
import { trackDmStartFromContent } from '../../events/contentAttribution.service.js'
import { planMessage } from '../conversation/delivery/planDelivery.js'
import { resolveLinkedUserIdFromContext } from '../core/state.service.js'
import { handleChat } from '../handlers/chat.js'
import {
  getAccessAwareAppReplyMarkupForContext,
} from '../handlers/start.js'
import { handleVoice } from '../handlers/voice.js'
import { renderTelegram } from '../renderers/decisionTelegram.js'
import { routeTelegramTextMessage } from '../router/messageRouter.js'

async function handleTextMessage(ctx: Context) {
 if (!('message' in ctx) || !ctx.message || !('text' in ctx.message)) {
 return
 }

 const text = String(ctx.message.text ?? '').trim()
 if (!text || text.startsWith('/')) {
 return
 }
 const chatId = String(ctx.chat?.id ?? '')

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

 if (await handlePendingFocusPaymentEvidenceText(ctx, userId, text)) {
 return
 }

 if (await routeTelegramTextMessage(ctx, text)) {
 return
 }

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
