import type { Context, Telegraf } from 'telegraf'

import { AB_TEST_ACTIONS } from '@/packages/abTestActions.js'
import { handleAbTestCallback } from '@/products/ab-system/telegram/service.js'
import { bot, sendDedupedTelegramMessage } from '../../../../lib/telegram.js'
import { prisma } from '../../../../db/client.js'
import { handleEveningAnswer } from '../../handlers/evening.js'
import { handleMorningAnswer } from '../../handlers/morning.js'
import { handleStatus } from '../../handlers/status.js'
import {
  handlePendingTelegramIdentityText,
  sendEntryOffer,
} from '../../handlers/start.js'
import { sendStateMenu } from '../../handlers/start.menu.js'
import {
  clearPendingName,
} from '../../services/identity/pending.js'
import { planMessage } from '../delivery/planDelivery.js'
import { telegramContentRegistry } from '../../content/contentRegistry.js'
import type {
  ConversationButton,
  ConversationResponse,
} from '../engine/types.js'

function mapButtonsToReplyMarkup(buttons: ConversationButton[]) {
  if (!buttons.length) {
    return undefined
  }

  return {
    inline_keyboard: buttons.map((button) => [
      button.kind === 'callback'
        ? { text: button.label, callback_data: button.value }
        : button.kind === 'web_app'
          ? { text: button.label, web_app: { url: button.value } }
          : { text: button.label, url: button.value },
    ]),
  }
}

type OutboundRenderTarget = {
  chatId: string
  transportBot?: Telegraf
}

export class TelegramConversationRenderer {
  async render(ctx: Context, response: ConversationResponse): Promise<boolean> {
    const orderedAcks = response.nextActions
      .filter((action): action is Extract<typeof action, { type: 'callback_ack' }> => action.type === 'callback_ack')
      .sort((a, b) => (a.order ?? 0) - (b.order ?? 0))

    for (const action of orderedAcks) {
      await ctx.answerCbQuery?.(action.text)
    }

    const orderedChatActions = response.nextActions
      .filter((action): action is Extract<typeof action, { type: 'chat_action' }> => action.type === 'chat_action')
      .sort((a, b) => (a.order ?? 0) - (b.order ?? 0))

    for (const action of orderedChatActions) {
      await ctx.telegram.sendChatAction(String(ctx.chat?.id ?? ''), action.action).catch(() => undefined)
    }

    for (const action of response.nextActions) {
      switch (action.type) {
        case 'state_menu': {
          const userId = (ctx.state as { userId?: string | null }).userId ?? null
          if (userId) {
            await sendStateMenu(ctx, userId)
          } else {
            await sendEntryOffer(ctx)
          }
          return true
        }
        case 'entry_offer':
          await sendEntryOffer(ctx)
          return true
        case 'pending_name_capture':
          await prisma.user.update({
            where: { id: action.userId },
            data: { firstName: action.text.trim().slice(0, 50) },
          })
          await clearPendingName(action.chatId)
          await planMessage(
            ctx,
            'ctx.reply',
            'pending_name_greeting',
            telegramContentRegistry.replies.pendingNameGreeting(action.text.trim().slice(0, 50)),
          )
          await handleAbTestCallback(ctx, AB_TEST_ACTIONS.ENTRY)
          return true
        case 'pending_identity_capture':
          return handlePendingTelegramIdentityText(ctx, action.text)
        case 'pending_email_capture':
          return handlePendingTelegramIdentityText(ctx, action.text)
        case 'ab_test_callback':
          return handleAbTestCallback(ctx, action.action)
        case 'status_screen':
          await handleStatus(ctx)
          return true
        case 'morning_answer':
          await handleMorningAnswer(ctx, action.text)
          return true
        case 'evening_answer':
          await handleEveningAnswer(ctx, action.text)
          return true
        case 'callback_ack':
        case 'chat_action':
          break
      }
    }

    let rendered = false

    if (response.text) {
      await planMessage(
        ctx,
        'ctx.reply',
        'conversation_engine_response',
        response.text,
        mapButtonsToReplyMarkup(response.buttons),
      )
      rendered = true
    }

    for (const card of [...response.cards].sort((a, b) => (a.order ?? 0) - (b.order ?? 0))) {
      const shouldUseResponseButtons = !response.text && !card.buttons?.length
      const cardButtons = shouldUseResponseButtons ? response.buttons : (card.buttons ?? [])
      if (card.kind === 'edit') {
        await planMessage(
          ctx,
          'ctx.editMessageText',
          'conversation_engine_edit',
          card.text,
          mapButtonsToReplyMarkup(cardButtons),
          card.parseMode,
        )
      } else {
        await planMessage(
          ctx,
          'ctx.reply',
          'conversation_engine_card',
          card.text,
          mapButtonsToReplyMarkup(cardButtons),
          card.parseMode,
        )
      }
      rendered = true
    }

    for (const item of [...response.media].sort((a, b) => (a.order ?? 0) - (b.order ?? 0))) {
      const replyMarkup = mapButtonsToReplyMarkup(item.buttons ?? [])
      if (item.kind === 'photo') {
        await ctx.telegram.sendPhoto(String(ctx.chat?.id ?? ''), item.assetKey, {
          ...(item.caption ? { caption: item.caption } : {}),
          ...(item.parseMode ? { parse_mode: item.parseMode } : {}),
          ...(replyMarkup ? { reply_markup: replyMarkup } : {}),
        })
      } else if (item.kind === 'voice') {
        await ctx.telegram.sendVoice(String(ctx.chat?.id ?? ''), item.assetKey, {
          ...(item.caption ? { caption: item.caption } : {}),
          ...(item.parseMode ? { parse_mode: item.parseMode } : {}),
          ...(replyMarkup ? { reply_markup: replyMarkup } : {}),
        })
      } else if (item.kind === 'video') {
        await ctx.telegram.sendVideo(String(ctx.chat?.id ?? ''), item.assetKey, {
          ...(item.caption ? { caption: item.caption } : {}),
          ...(item.parseMode ? { parse_mode: item.parseMode } : {}),
          ...(replyMarkup ? { reply_markup: replyMarkup } : {}),
        })
      } else {
        await ctx.telegram.sendDocument(String(ctx.chat?.id ?? ''), item.assetKey, {
          ...(item.caption ? { caption: item.caption } : {}),
          ...(item.parseMode ? { parse_mode: item.parseMode } : {}),
          ...(replyMarkup ? { reply_markup: replyMarkup } : {}),
        })
      }
      rendered = true
    }

    return rendered || response.telemetry.handled === true
  }

  async renderOutbound(
    target: OutboundRenderTarget,
    response: ConversationResponse,
  ): Promise<boolean> {
    const chatId = String(target.chatId ?? '').trim()
    if (!chatId) {
      return false
    }
    const transportBot = target.transportBot ?? bot

    let rendered = false

    const orderedChatActions = response.nextActions
      .filter((action): action is Extract<typeof action, { type: 'chat_action' }> => action.type === 'chat_action')
      .sort((a, b) => (a.order ?? 0) - (b.order ?? 0))

    for (const action of orderedChatActions) {
      await transportBot.telegram.sendChatAction(chatId, action.action).catch(() => undefined)
    }

    if (response.text) {
      const sent = await sendDedupedTelegramMessage(chatId, response.text, {
        reply_markup: mapButtonsToReplyMarkup(response.buttons),
        link_preview_options: { is_disabled: true },
      }, transportBot)
      rendered = rendered || sent
    }

    for (const card of [...response.cards].sort((a, b) => (a.order ?? 0) - (b.order ?? 0))) {
      const shouldUseResponseButtons = !response.text && !card.buttons?.length
      const cardButtons = shouldUseResponseButtons ? response.buttons : (card.buttons ?? [])
      const sent = await sendDedupedTelegramMessage(chatId, card.text, {
        ...(card.parseMode ? { parse_mode: card.parseMode } : {}),
        link_preview_options: { is_disabled: true },
        ...(cardButtons.length
          ? { reply_markup: mapButtonsToReplyMarkup(cardButtons) }
          : {}),
      }, transportBot)
      rendered = rendered || sent
    }

    for (const item of [...response.media].sort((a, b) => (a.order ?? 0) - (b.order ?? 0))) {
      const options = {
        ...(item.caption ? { caption: item.caption } : {}),
        ...(item.parseMode ? { parse_mode: item.parseMode } : {}),
        ...(item.buttons?.length
          ? { reply_markup: mapButtonsToReplyMarkup(item.buttons) }
          : {}),
      }

      if (item.kind === 'photo') {
        await transportBot.telegram.sendPhoto(chatId, item.assetKey, options)
      } else if (item.kind === 'voice') {
        await transportBot.telegram.sendVoice(chatId, item.assetKey, options)
      } else if (item.kind === 'video') {
        await transportBot.telegram.sendVideo(chatId, item.assetKey, options)
      } else {
        await transportBot.telegram.sendDocument(chatId, item.assetKey, options)
      }
      rendered = true
    }

    return rendered || response.telemetry.handled === true
  }
}
