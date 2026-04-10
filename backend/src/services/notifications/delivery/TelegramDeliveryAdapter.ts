import { sendDedupedTelegramMessage } from '../../../lib/telegram.js'
import type { DeliveryMessage, DeliveryUser } from './types.js'

function escapeHtml(value: string) {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
}

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

function buildKeyboard(message: DeliveryMessage) {
  if (message.ctaActions?.length) {
    const buttons = message.ctaActions
      .map(action => {
        if (action.mode === 'callback') {
          return { text: action.text, callback_data: action.url }
        }

        if (action.mode === 'url') {
          if (!isSafeTelegramUrl(action.url)) {
            return null
          }

          return { text: action.text, url: action.url }
        }

        if (isSafeTelegramWebAppUrl(action.url)) {
          return { text: action.text, web_app: { url: action.url } }
        }

        if (isSafeTelegramUrl(action.url)) {
          return { text: action.text, url: action.url }
        }

        return null
      })
      .filter((
        button,
      ): button is { text: string; url: string } | { text: string; web_app: { url: string } } | { text: string; callback_data: string } => Boolean(button))

    if (buttons.length) {
      const rows = buttons.length > 2
        ? [buttons.slice(0, 2), buttons.slice(2)]
        : [buttons]

      return {
        inline_keyboard: rows,
      }
    }
  }

  if (!message.ctaText || !message.ctaUrl) {
    return undefined
  }

  if (message.ctaMode === 'url') {
    if (!isSafeTelegramUrl(message.ctaUrl)) {
      return undefined
    }

    return {
      inline_keyboard: [[{ text: message.ctaText, url: message.ctaUrl }]],
    }
  }

  if (!isSafeTelegramWebAppUrl(message.ctaUrl)) {
    if (!isSafeTelegramUrl(message.ctaUrl)) {
      return undefined
    }

    return {
      inline_keyboard: [[{ text: message.ctaText, url: message.ctaUrl }]],
    }
  }

  return {
    inline_keyboard: [[{ text: message.ctaText, web_app: { url: message.ctaUrl } }]],
  }
}

function buildText(message: DeliveryMessage) {
  if (message.telegramHtml) {
    return message.telegramHtml
  }

  return [`<b>${escapeHtml(message.title)}</b>`, '', escapeHtml(message.body)].join('\n')
}

function resolveChatId(user: DeliveryUser) {
  return user.telegramLinks[0]?.chatId ?? user.telegramChatId ?? user.telegramUserId ?? null
}

export class TelegramDeliveryAdapter {
  async send(user: DeliveryUser, message: DeliveryMessage): Promise<boolean> {
    const chatId = resolveChatId(user)
    if (!chatId) return false

    return sendDedupedTelegramMessage(chatId, buildText(message), {
      parse_mode: 'HTML',
      reply_markup: buildKeyboard(message),
    })
  }
}

export const telegramDeliveryAdapter = new TelegramDeliveryAdapter()
