import { NotificationChannel, type Prisma, type Notification, NotificationStatus, NotificationType, type NotificationJob, type User, } from '@starway/db/prisma-client'
import { prisma } from '../../db/client.js'
import type { DeliveryMessage, DeliveryUser } from './delivery/types.js'
import { bot } from '../../lib/telegram.js'
import { blockquote, bold, escapeTelegramHtml, } from '../../lib/telegram/messageFormatter.js'
import { AB_TEST_OPEN_FOCUS_BUTTON_TEXT, AB_TEST_SHOW_INSIDE_CTA_TEXT, type TelegramContentBlock, } from '@/products/ab-system/content/abTest.shared.js'
import type { ConversationButton, ConversationResponse } from '../../modules/telegram-mentor/conversation/engine/types.js'
import { getConversationRenderer } from './NotificationService.foundation.js'

export function buildTelegramCard(input: {
  title: string
  intro?: string
  facts?: string[]
  note?: string
  closing?: string
}) {
  const toQuotedLine = (value: string): string | null => {
    const normalized = value.trim()
    if (!normalized) {
      return null
    }

    if ((normalized.startsWith('"') && normalized.endsWith('"')) || normalized.startsWith('📸 [СКРІН')) {
      return blockquote(normalized.replace(/^"|"$/g, ''))
    }

    if (normalized.startsWith('[ЦИТАТА]')) {
      return blockquote(normalized.slice('[ЦИТАТА]'.length).trim())
    }

    if (normalized.startsWith('ЦИТАТА:')) {
      return blockquote(normalized.slice('ЦИТАТА:'.length).trim())
    }

    if (normalized.startsWith('QUOTE:')) {
      return blockquote(normalized.slice('QUOTE:'.length).trim())
    }

    return null
  }

  const lines: string[] = [bold(input.title)]

  if (input.intro) {
    const introLines = input.intro.split('\n').map((line) => {
      const normalized = line.trim()
      if (!normalized) {
        return ''
      }

      const quotedLine = toQuotedLine(line)
      if (quotedLine) {
        return quotedLine
      }

      if (normalized.startsWith('· ')) {
        return `• ${escapeTelegramHtml(normalized.slice(2))}`
      }

      return escapeTelegramHtml(line)
    })
    lines.push('', ...introLines)
  }

  if (input.facts?.length) {
    lines.push('', ...input.facts.map((fact) => `• ${escapeTelegramHtml(fact)}`))
  }

  if (input.note) {
    lines.push('', toQuotedLine(input.note) ?? blockquote(input.note))
  }

  if (input.closing) {
    lines.push('', escapeTelegramHtml(input.closing))
  }

  return lines.join('\n')
}

export function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

export function resolveDeliveryChatId(user: DeliveryUser) {
  return user.telegramLinks[0]?.chatId ?? user.telegramChatId ?? user.telegramUserId ?? null
}

export function isSafeTelegramWebAppUrl(value: string): boolean {
  try {
    const url = new URL(value)
    return url.protocol === 'https:' && !['localhost', '127.0.0.1', '0.0.0.0'].includes(url.hostname)
  } catch {
    return false
  }
}

export function isSafeTelegramUrl(value: string): boolean {
  try {
    const url = new URL(value)
    return ['https:', 'http:'].includes(url.protocol) && !['localhost', '127.0.0.1', '0.0.0.0'].includes(url.hostname)
  } catch {
    return false
  }
}

export function buildTelegramReplyMarkup(message: DeliveryMessage) {
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

export function renderFocusDojimBlock(block: TelegramContentBlock): string | null {
  const renderInlineBold = (value: string) =>
    value
      .split(/(\*\*[\s\S]+?\*\*)/g)
      .map((part) => {
        if (part.startsWith('**') && part.endsWith('**') && part.length > 4) {
          return bold(part.slice(2, -2))
        }

        return escapeTelegramHtml(part)
      })
      .join('')

  switch (block.type) {
    case 'text':
      return renderInlineBold(block.text)
    case 'quote':
      return blockquote(block.text.replace(/^"|"$/g, '').replace(/^«|»$/g, '').trim())
    case 'pricing':
      return renderInlineBold(`**${block.text}**`)
    case 'cta':
      return bold(block.text)
    case 'image':
    case 'video':
    case 'audio':
      return block.caption ? escapeTelegramHtml(block.caption) : null
    default:
      return null
  }
}

export function compactFocusDojimBlocks(blocks: TelegramContentBlock[]): TelegramContentBlock[] {
  const compacted: TelegramContentBlock[] = []

  for (const block of blocks) {
    const previous = compacted[compacted.length - 1]

    if (block.type === 'text' && previous?.type === 'text') {
      compacted[compacted.length - 1] = {
        ...previous,
        text: `${previous.text}\n\n${block.text}`,
      }
      continue
    }

    if (block.type === 'pricing') {
      if (previous?.type === 'text') {
        compacted[compacted.length - 1] = {
          ...previous,
          text: `${previous.text}\n\n**${block.text}**`,
        }
        continue
      }

      if (previous?.type === 'pricing') {
        compacted[compacted.length - 1] = {
          ...previous,
          text: `${previous.text}\n**${block.text}**`,
        }
        continue
      }
    }

    compacted.push(block)
  }

  return compacted
}

export async function sendFocusDojimBlockMessage(input: {
  chatId: string | number
  block: TelegramContentBlock
  replyMarkup?: ReturnType<typeof buildTelegramReplyMarkup>
}): Promise<void> {
  const { chatId, block, replyMarkup } = input
  const buttons = mapReplyMarkupToConversationButtons(replyMarkup)
  const response = buildFocusDojimConversationResponse(block, buttons)
  if (!response) return

  await getConversationRenderer().renderOutbound({ chatId: String(chatId), transportBot: bot }, response)
}

export function mapReplyMarkupToConversationButtons(
  replyMarkup?: ReturnType<typeof buildTelegramReplyMarkup>,
): ConversationButton[] {
  const rows = replyMarkup?.inline_keyboard ?? []

  return rows.flatMap((row) =>
    row.flatMap((button): ConversationButton[] => {
      if ('callback_data' in button && typeof button.callback_data === 'string') {
        return [{ kind: 'callback', label: button.text, value: button.callback_data }]
      }

      if ('web_app' in button && button.web_app?.url) {
        return [{ kind: 'web_app', label: button.text, value: button.web_app.url }]
      }

      if ('url' in button && typeof button.url === 'string') {
        return [{ kind: 'url', label: button.text, value: button.url }]
      }

      return []
    }),
  )
}

export function buildFocusDojimConversationResponse(
  block: TelegramContentBlock,
  buttons: ConversationButton[],
): ConversationResponse | null {
  if (block.type === 'image') {
    return {
      text: null,
      buttons: [],
      cards: [],
      media: [{
        kind: 'photo',
        assetKey: block.assetKey,
        ...(block.caption ? { caption: renderFocusDojimBlock(block) ?? undefined } : {}),
        parseMode: 'HTML',
        buttons,
      }],
      nextActions: [],
      telemetry: {},
      analytics: {},
    }
  }

  if (block.type === 'audio') {
    return {
      text: null,
      buttons: [],
      cards: [],
      media: [{
        kind: 'voice',
        assetKey: block.assetKey,
        ...(block.caption ? { caption: renderFocusDojimBlock(block) ?? undefined } : {}),
        parseMode: 'HTML',
        buttons,
      }],
      nextActions: [],
      telemetry: {},
      analytics: {},
    }
  }

  if (block.type === 'video') {
    return {
      text: null,
      buttons: [],
      cards: [],
      media: [{
        kind: 'video',
        assetKey: block.assetKey,
        ...(block.caption ? { caption: renderFocusDojimBlock(block) ?? undefined } : {}),
        parseMode: 'HTML',
        buttons,
      }],
      nextActions: [],
      telemetry: {},
      analytics: {},
    }
  }

  const text = renderFocusDojimBlock(block)
  if (!text) return null

  return {
    text: null,
    buttons: [],
    cards: [{
      kind: 'message',
      text,
      parseMode: 'HTML',
      buttons,
    }],
    media: [],
    nextActions: [],
    telemetry: {},
    analytics: {},
  }
}

export async function loadEligibleUsers(): Promise<Array<Pick<User, 'id' | 'firstName' | 'email' | 'telegramChatId' | 'telegramUserId'> & { telegramLinks: Array<{ chatId: string | null }> }>> {
  return prisma.user.findMany({
    where: {
      deletedAt: null,
      OR: [
        { telegramChatId: { not: null } },
        { telegramUserId: { not: null } },
        { telegramLinks: { some: { isActive: true, chatId: { not: null } } } },
      ],
    },
    select: {
      id: true,
      firstName: true,
      email: true,
      telegramChatId: true,
      telegramUserId: true,
      telegramLinks: {
        where: { isActive: true, chatId: { not: null } },
        orderBy: { updatedAt: 'desc' },
        take: 1,
        select: { chatId: true },
      },
    },
  })
}

export async function loadDeliveryUser(userId: string): Promise<DeliveryUser | null> {
  return prisma.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      firstName: true,
      email: true,
      telegramChatId: true,
      telegramUserId: true,
      telegramLinks: {
        where: { isActive: true, chatId: { not: null } },
        orderBy: { updatedAt: 'desc' },
        take: 1,
        select: { chatId: true },
      },
    },
  })
}
