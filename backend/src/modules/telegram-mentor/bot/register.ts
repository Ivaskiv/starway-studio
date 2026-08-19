import { AB_TEST_ACTIONS } from '@/packages/abTestActions.js'
import {
  handleAbTestCallback,
  markAbTestPaymentSuccess,
} from '@/products/ab-system/telegram/service.js'

import { prisma } from '../../../db/client.js'
import { bot } from '../../../lib/telegram.js'
import { logger } from '../../../utils/logger.js'
import {
  registerPipelineCommands,
} from '../../content-pipeline/pipeline.controller.js'
import {
  resendFocusAccessTelegramMessage,
} from '../../subscriptions/payments/callback/notifications.js'
import {
  hasActiveFocusSubscription,
} from '../../subscriptions/payments/focus-access.js'
import {
  conversationOrchestrator,
  planMessage,
} from '../conversation/delivery/planDelivery.js'
import type {
  OrchestratedContext,
} from '../conversation/types.js'
import { guard } from '../core/guard.middleware.js'
import {
  resolveLinkedUserIdFromContext,
} from '../core/state.service.js'
import { handleEvening } from '../handlers/evening.js'
import { handleMorning } from '../handlers/morning.js'
import { handlePrivacy } from '../handlers/privacy.js'
import {
  getAccessAwareAppReplyMarkupForContext,
  handleStart,
} from '../handlers/start.js'
import { handleStatus } from '../handlers/status.js'
import { registerCallbackHandler } from './callback.js'
import { registerChannelHandlers } from './channel.js'
import { registerMessageHandlers } from './messages.js'
import { registerZoomAdminHandlers } from './zoom-admin.js'

let mentorBotRegistered = false
const processedUpdates = new Set<number>()

interface MentorBotRegistrationOptions {
  product?: string
}

export async function registerMentorBot(
  _options?: MentorBotRegistrationOptions,
): Promise<void> {
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
   setTimeout(() => processedUpdates.delete(updateId), 30_000)
   await next()
   })

   bot.use(async (ctx, next) => {
   const resolvedUserId = await resolveLinkedUserIdFromContext(ctx)
   ;(
   ctx.state as { userId?: string | null; userIdResolved?: boolean }
   ).userId = resolvedUserId
   ;(
   ctx.state as { userId?: string | null; userIdResolved?: boolean }
   ).userIdResolved = true
   await next()
   })

   bot.command('start', async (ctx) => {
   await handleStart(ctx)
   })

   bot.use(guard)

   bot.command('morning', async (ctx) => {
   await handleMorning(ctx)
   })
   bot.command('evening', async (ctx) => {
   await handleEvening(ctx)
   })
   bot.command('status', async (ctx) => {
   await handleStatus(ctx)
   })
   bot.command('privacy', async (ctx) => {
   await handlePrivacy(ctx)
   })

  bot.command('resend_block12', async (ctx) => {
   if (process.env.NODE_ENV === 'production') {
   await ctx.reply('Команда доступна лише в dev середовищі.')
   return
   }
   const commandText =
   'message' in ctx && ctx.message && 'text' in ctx.message
   ? String(ctx.message.text ?? '').trim()
   : ''
   const [, rawTelegramId] = commandText.split(/\s+/, 2)

   if (rawTelegramId) {
   const telegramId = rawTelegramId.trim()
   const targetUser = await prisma.user.findFirst({
   where: {
   OR: [
   { telegramUserId: telegramId },
   { telegramChatId: telegramId },
   { telegramLinks: { some: { chatId: telegramId } } },
   ],
   },
   select: { id: true },
   })
   if (!targetUser) {
   await ctx.reply(`Користувача з telegram id ${telegramId} не знайдено.`)
   return
   }
   const hasActiveFocus = await hasActiveFocusSubscription(targetUser.id)
   if (!hasActiveFocus) {
   await ctx.reply(`Для ${telegramId} підписка ФОКУС неактивна.`)
   return
   }
   await markAbTestPaymentSuccess(targetUser.id)
   await resendFocusAccessTelegramMessage(targetUser.id)
   await ctx.reply(` Block 12 відправлено користувачу ${telegramId}.`)
   return
   }

   const resent = await handleAbTestCallback(
   ctx,
   AB_TEST_ACTIONS.FOCUS_ALREADY_PAID
   )
   if (!resent) {
   await ctx.reply(
   'Не вдалося повторно надіслати Block 12. Спробуй через меню «Я вже оплатив / оплатила».'
   )
   return
   }
   await ctx.reply(' Block 12 повторно надіслано.')
   })

  registerPipelineCommands(bot)

  registerZoomAdminHandlers()
  registerMessageHandlers()
  registerCallbackHandler()
  registerChannelHandlers()

  bot.catch((err, ctx) => {
      void (async () => {
        logger.error('[telegram-thin-client:catch]', err)
        const errorMessage = err instanceof Error ? err.message : String(err)
        const isCallbackUpdate =
          'callbackQuery' in ctx &&
          Boolean(ctx.callbackQuery)
        const isTimeoutError = errorMessage.includes('Promise timed out after')

        if (isCallbackUpdate || isTimeoutError) {
          return
        }
        const replyMarkup = await getAccessAwareAppReplyMarkupForContext(ctx)
        await planMessage(
          ctx,
          'ctx.reply',
          'telegram_global_catch',
          'Не вдалося виконати дію. Напиши ще раз.',
          replyMarkup
        ).catch(() => undefined)
      })()
    })
}
