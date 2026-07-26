import { TelegramConversationRenderer } from '../../../modules/telegram-mentor/conversation/renderers/telegramConversationRenderer.js'
import type { ConversationButton, ConversationResponse } from '../../../modules/telegram-mentor/conversation/engine/types.js'
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

function buildText(message: DeliveryMessage) {
  if (message.telegramHtml) {
    return message.telegramHtml
  }

  return [`<b>${escapeHtml(message.title)}</b>`, '', escapeHtml(message.body)].join('\n')
}

function resolveChatId(user: DeliveryUser) {
  return user.telegramLinks[0]?.chatId ?? user.telegramChatId ?? user.telegramUserId ?? null
}

function buildConversationResponse(message: DeliveryMessage): ConversationResponse {
  return {
    text: null,
    buttons: [],
    cards: [{
      kind: 'message',
      text: buildText(message),
      buttons: buildButtons(message),
      parseMode: 'HTML',
    }],
    media: [],
    nextActions: [],
    telemetry: {},
    analytics: {},
  }
}

const renderer = new TelegramConversationRenderer()

export class TelegramDeliveryAdapter {
  async send(user: DeliveryUser, message: DeliveryMessage): Promise<boolean> {
    const chatId = resolveChatId(user)
    if (!chatId) return false

    return renderer.renderOutbound(
      { chatId },
      buildConversationResponse(message),
    )
  }
}

export const telegramDeliveryAdapter = new TelegramDeliveryAdapter()
