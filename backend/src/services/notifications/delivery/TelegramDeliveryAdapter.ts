import type { ConversationButton } from '../../../modules/telegram-mentor/conversation/engine/types.js'
import { bot } from '../../../lib/telegram.js'
import { TelegramConversationRenderer } from '../../../modules/telegram-mentor/conversation/renderers/telegramConversationRenderer.js'
import {
  bold,
  escapeTelegramHtml,
  formatTelegramMessage,
  type TelegramMessage,
} from '../../../lib/telegram/messageFormatter.js'
import type { DeliveryMessage, DeliveryUser } from './types.js'

function isSafeTelegramWebAppUrl(value: string): boolean {
  try {
    const url = new URL(value)
    return url.protocol === 'https:' && !['localhost', '127.0.0.1', '0.0.0.0'].includes(url.hostname)
  } catch {
    return false
  }
}

function isSafeTelegramUrl(value: string): boolean {
  try {
    const url = new URL(value)
    return ['https:', 'http:'].includes(url.protocol) && !['localhost', '127.0.0.1', '0.0.0.0'].includes(url.hostname)
  } catch {
    return false
  }
}

function buildButtons(message: DeliveryMessage): ConversationButton[] {
  if (message.ctaActions?.length) {
    return message.ctaActions
      .map((action): ConversationButton | null => {
        if (action.mode === 'callback') {
          return { kind: 'callback', label: action.text, value: action.url }
        }

        if (action.mode === 'url') {
          return isSafeTelegramUrl(action.url)
            ? { kind: 'url', label: action.text, value: action.url }
            : null
        }

        if (isSafeTelegramWebAppUrl(action.url)) {
          return { kind: 'web_app', label: action.text, value: action.url }
        }

        return isSafeTelegramUrl(action.url)
          ? { kind: 'url', label: action.text, value: action.url }
          : null
      })
      .filter((button): button is ConversationButton => Boolean(button))
  }

  if (!message.ctaText || !message.ctaUrl) {
    return []
  }

  if (message.ctaMode === 'url') {
    return isSafeTelegramUrl(message.ctaUrl)
      ? [{ kind: 'url', label: message.ctaText, value: message.ctaUrl }]
      : []
  }

  if (isSafeTelegramWebAppUrl(message.ctaUrl)) {
    return [{ kind: 'web_app', label: message.ctaText, value: message.ctaUrl }]
  }

  return isSafeTelegramUrl(message.ctaUrl)
    ? [{ kind: 'url', label: message.ctaText, value: message.ctaUrl }]
    : []
}

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

function buildText(message: DeliveryMessage): TelegramMessage {
  if (message.telegramHtml) {
    return {
      text: message.telegramHtml,
      parseMode: 'HTML',
    }
  }

  return formatTelegramMessage({
    blocks: [bold(message.title), escapeTelegramHtml(message.body)],
    preformatted: true,
  })
}

function resolveChatId(user: DeliveryUser) {
  return user.telegramLinks[0]?.chatId ?? user.telegramChatId ?? user.telegramUserId ?? null
}

export class TelegramDeliveryAdapter {
  async send(user: DeliveryUser, message: DeliveryMessage): Promise<boolean> {
    const chatId = resolveChatId(user)
    if (!chatId) return false

    try {
      const renderer = new TelegramConversationRenderer()
      const text = buildText(message)

      return renderer.renderOutbound(
        { chatId, transportBot: bot },
        {
          text: null,
          buttons: buildButtons(message),
          cards: [{
            kind: 'message',
            text: text.text,
            ...(text.parseMode ? { parseMode: text.parseMode } : {}),
          }],
          media: [],
          nextActions: [],
          telemetry: {},
          analytics: {},
        },
      )
    } catch {
      return false
    }
  }
}

export const telegramDeliveryAdapter = new TelegramDeliveryAdapter()
