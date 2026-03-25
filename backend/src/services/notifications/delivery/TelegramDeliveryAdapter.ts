import { sendDedupedTelegramMessage } from '../../../lib/telegram.js'
import type { DeliveryMessage, DeliveryUser } from './types.js'

function buildKeyboard(message: DeliveryMessage) {
  if (!message.ctaText || !message.ctaUrl) {
    return undefined
  }

  return {
    inline_keyboard: [[{ text: message.ctaText, web_app: { url: message.ctaUrl } }]],
  }
}

function buildText(message: DeliveryMessage) {
  return [message.title, '', message.body].join('\n')
}

function resolveChatId(user: DeliveryUser) {
  return user.telegramLinks[0]?.chatId ?? user.telegramChatId ?? user.telegramUserId ?? null
}

export class TelegramDeliveryAdapter {
  async send(user: DeliveryUser, message: DeliveryMessage): Promise<boolean> {
    const chatId = resolveChatId(user)
    if (!chatId) return false

    return sendDedupedTelegramMessage(chatId, buildText(message), {
      reply_markup: buildKeyboard(message),
    })
  }
}

export const telegramDeliveryAdapter = new TelegramDeliveryAdapter()

