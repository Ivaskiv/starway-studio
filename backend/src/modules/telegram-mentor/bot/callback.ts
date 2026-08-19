import type { Context } from 'telegraf'

import { bot } from '../../../lib/telegram.js'
import { logger } from '../../../utils/logger.js'
import { dispatchPipelineCallback } from '../../content-pipeline/pipeline.controller.js'
import { planAck, planMessage } from '../conversation/delivery/planDelivery.js'
import { resolveLinkedUserIdFromContext } from '../core/state.service.js'
import type { TelegramTextRoute } from '../router/messageRouter.js'
import { routeTelegramTextMessage } from '../router/messageRouter.js'
import { dispatchTelegramCallbackEvent } from '../services/delivery/event-bus/index.js'
import { recordTelegramCtaInteraction } from '../services/engagement/cta.js'

const ASSISTANT_CALLBACK_MESSAGES: Record<
  string,
  { text: string; route: TelegramTextRoute }
> = {
  continue: {
    text: 'ПРОДОВЖИТИ З ТОГО МІСЦЯ, ДЕ МИ ЗУПИНИЛИСЬ',
 route: {
 intent: 'memory_request',
 scenario: 'intelligence',
 intelligenceMessageType: 'MEMORY_REQUEST',
 },
 },
 plan_today: {
 text: 'ДОПОМОЖИ СПЛАНУВАТИ СЬОГОДНІ',
 route: {
 intent: 'question',
 scenario: 'intelligence',
 intelligenceMessageType: 'QUESTION',
 },
 },
 prepare_zoom: {
 text: 'ПІДГОТУЙ МЕНЕ ДО НАСТУПНОГО ZOOM',
 route: {
 intent: 'question',
 scenario: 'intelligence',
 intelligenceMessageType: 'QUESTION',
 },
 },
 review_progress: {
 text: 'ПЕРЕГЛЯНЬ МІЙ ПРОГРЕС',
 route: {
 intent: 'memory_request',
 scenario: 'intelligence',
 intelligenceMessageType: 'MEMORY_REQUEST',
 },
 },
 talk: {
 text: 'ПОГОВОРИТИ З AI АСИСТЕНТОМ',
 route: {
 intent: 'question',
 scenario: 'intelligence',
 intelligenceMessageType: 'QUESTION',
 },
 },
 unsure: {
 text: 'Я НЕ ЗНАЮ, ЩО РОБИТИ ДАЛІ',
 route: {
 intent: 'personal_situation',
 scenario: 'intelligence',
 intelligenceMessageType: 'PERSONAL_SITUATION',
 },
 },
}

const USER_CALLBACK_PREFIX = 'user:'
const LEGACY_USER_CALLBACK_PREFIX = 'assistant:'
const LEGACY_USER_CALLBACK_MESSAGE = 'Дія застаріла. Відкрийте меню ще раз'

function resolveUserCallbackPreset(action: string): { text: string; route: TelegramTextRoute } | null {
 if (action.startsWith(USER_CALLBACK_PREFIX)) {
 const key = action.slice(USER_CALLBACK_PREFIX.length)
 return ASSISTANT_CALLBACK_MESSAGES[key] ?? null
 }

 if (action.startsWith(LEGACY_USER_CALLBACK_PREFIX)) {
 return null
 }

 return null
}

function isStaleCallback(ctx: Context, maxAgeMs = 2 * 60 * 60 * 1000): boolean {
 if (
 !('callbackQuery' in ctx) ||
 !ctx.callbackQuery ||
 !('message' in ctx.callbackQuery)
 ) {
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

export function registerCallbackHandler(): void {
  bot.on('callback_query', async (ctx) => {
      const action =
        'data' in ctx.callbackQuery ? String(ctx.callbackQuery.data ?? '') : ''
      // FIX 2025-05-25 B1: remove global callback ack; ack is handled inside concrete callback handlers
      // FIX 2026-05-25 C2: temporary callback diagnostic log
      console.log('[BOT][CB] data:', action, 'from:', ctx.from?.id)
      console.info('[AB_TEST_START_DEBUG] callback_query:received', {
        action,
        chatId: String(ctx.chat?.id ?? ''),
        fromId: String(ctx.from?.id ?? ''),
        userId: (ctx.state as { userId?: string | null }).userId ?? null,
      })
      try {
        if (action.startsWith(USER_CALLBACK_PREFIX)) {
          const callbackPreset = resolveUserCallbackPreset(action)

          await planAck(
            ctx,
            'ctx.answerCbQuery',
            'user_callback_ack',
            'Продовжуємо',
          ).catch(() => undefined)

          if (!callbackPreset) {
            await planMessage(
              ctx,
              'ctx.reply',
              'user_callback_unknown',
              LEGACY_USER_CALLBACK_MESSAGE,
            ).catch(() => undefined)
            return
          }

          const handled = await routeTelegramTextMessage(
            ctx,
            callbackPreset.text,
            callbackPreset.route,
          )

          if (!handled) {
            await planMessage(
              ctx,
              'ctx.reply',
              'assistant_callback_fallback',
              'Не вдалося продовжити розмову. Напиши мені повідомленням, що тобі потрібно зараз.',
            ).catch(() => undefined)
          }

          return
        }

        if (action.startsWith(LEGACY_USER_CALLBACK_PREFIX)) {
          await planAck(
            ctx,
            'ctx.answerCbQuery',
            'assistant_callback_legacy',
            LEGACY_USER_CALLBACK_MESSAGE,
          ).catch(() => undefined)
          return
        }

        const isFocusPaymentCallback =
          action === 'open_focus_payment' ||
          action.startsWith('open_focus_payment:')
        if (isFocusPaymentCallback && ctx.callbackQuery?.id) {
          const directAckResult = await ctx.telegram
            .answerCbQuery(String(ctx.callbackQuery.id))
            .catch(() => undefined)
          if (directAckResult) {
            ;(ctx.state as { __callback_ack_sent__?: boolean }).__callback_ack_sent__ =
              true
          }
        } else {
          await planAck(
            ctx,
            'ctx.answerCbQuery',
            'telegram_callback_immediate_ack',
          ).catch(() => undefined)
        }
        const userId =
          (ctx.state as { userId?: string | null }).userId ??
          (await resolveLinkedUserIdFromContext(ctx).catch(() => null))
        if (await dispatchPipelineCallback(bot, ctx, action)) {
          if (userId) {
            await recordTelegramCtaInteraction(userId, action)
          }
          return
        }

        // Stale check пропускається для дій що мають сенс з будь-якого старого повідомлення.
        const isStaleExempt =
          action === 'ab_test:restart' ||
          action === 'ab_test:show_result' ||
          action === 'ab_test:menu' ||
          action === 'skip_email_before_result' ||
          action === 'open_focus_payment' ||
          action.startsWith('open_focus_payment:')
        if (!isStaleExempt && isStaleCallback(ctx)) {
          await planAck(
            ctx,
            'ctx.answerCbQuery',
            'telegram_stale_callback',
            'Посилання застаріло — натисни /start'
          ).catch(() => undefined)
          console.warn('[AB_TEST_START_DEBUG] callback_query:stale_rejected', {
            action,
            chatId: String(ctx.chat?.id ?? ''),
          })
          return
        }

        const handled = await dispatchTelegramCallbackEvent(ctx, action)
        if (handled && userId) {
          await recordTelegramCtaInteraction(userId, action)
        }
        console.info('[CALLBACK_FLOW_RESULT]', {
          action,
          handled,
        })

        if (!handled) {
          console.warn('[AB_TEST_START_DEBUG] callback_query:not_handled', {
            action,
            chatId: String(ctx.chat?.id ?? ''),
          })
          await planAck(
            ctx,
            'ctx.answerCbQuery',
            'telegram_callback_not_handled',
            'Відкрий Mini App для продовження'
          ).catch(() => undefined)
        } else {
          console.info('[AB_TEST_START_DEBUG] callback_query:handled', {
            action,
            chatId: String(ctx.chat?.id ?? ''),
          })
        }
      } catch (error) {
        logger.error('[telegram-thin-client:callback]', error)
        await planAck(
          ctx,
          'ctx.answerCbQuery',
          'telegram_callback_restore_failed',
          'Не вдалося відновити сесію'
        ).catch(() => undefined)
      }
    })
}
