type TelegramApiLike = {
  sendMessage: (
    chatId: string | number,
    text: string,
    options?: Record<string, unknown>,
  ) => Promise<unknown>
}

type TelegramTargetLike = TelegramApiLike | { telegram: TelegramApiLike }

export type TelegramMessage = {
  text: string
  parseMode: 'HTML'
}

type FormatTelegramMessageInput =
  | string
  | {
      text?: string | null
      blocks?: Array<string | null | undefined | false>
      preformatted?: boolean
    }

function decodeBasicEntities(value: string): string {
  return value
    .replaceAll('&quot;', '"')
    .replaceAll('&#39;', "'")
    .replaceAll('&lt;', '<')
    .replaceAll('&gt;', '>')
    .replaceAll('&amp;', '&')
}

export function escapeTelegramHtml(value: string): string {
  return decodeBasicEntities(String(value ?? ''))
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;')
}

export function bold(value: string): string {
  const normalized = String(value ?? '').trim()
  return normalized ? `<b>${escapeTelegramHtml(normalized)}</b>` : ''
}

export function italic(value: string): string {
  const normalized = String(value ?? '').trim()
  return normalized ? `<i>${escapeTelegramHtml(normalized)}</i>` : ''
}

export function code(value: string): string {
  const normalized = String(value ?? '').trim()
  return normalized ? `<code>${escapeTelegramHtml(normalized)}</code>` : ''
}

export function blockquote(value: string): string {
  const normalized = String(value ?? '').trim()
  return normalized ? `<blockquote>${escapeTelegramHtml(normalized)}</blockquote>` : ''
}

export function link(label: string, url: string): string {
  const normalizedLabel = String(label ?? '').trim()
  const normalizedUrl = String(url ?? '').trim()
  if (!normalizedLabel || !normalizedUrl) return ''
  return `<a href="${escapeTelegramHtml(normalizedUrl)}">${escapeTelegramHtml(normalizedLabel)}</a>`
}

export function joinBlocks(blocks: Array<string | null | undefined | false>): string {
  return blocks
    .map((block) => (typeof block === 'string' ? block.trim() : ''))
    .filter(Boolean)
    .join('\n\n')
}

export function formatTelegramMessage(input: FormatTelegramMessageInput): TelegramMessage {
  if (typeof input === 'string') {
    return {
      text: escapeTelegramHtml(input),
      parseMode: 'HTML',
    }
  }

  const preformatted = input.preformatted === true
  const sourceBlocks = input.blocks ?? [input.text ?? '']
  const text = joinBlocks(
    sourceBlocks.map((block) => {
      if (!block) return ''
      return preformatted ? String(block) : escapeTelegramHtml(String(block))
    }),
  )

  return {
    text,
    parseMode: 'HTML',
  }
}

function stripTelegramHtml(value: string): string {
  return decodeBasicEntities(
    String(value ?? '')
      .replace(/<br\s*\/?>/gi, '\n')
      .replace(/<\/blockquote>\s*<blockquote>/gi, '\n\n')
      .replace(/<\/?(?:b|strong|i|em|code|pre|blockquote|a)(?:\s+[^>]*)?>/gi, '')
      .replace(/<[^>]+>/g, ''),
  ).trim()
}

function resolveTelegramApi(target: TelegramTargetLike): TelegramApiLike {
  return 'telegram' in target ? target.telegram : target
}

function isTelegramParseEntityError(error: unknown): boolean {
  const message = String(
    (error as { description?: string; message?: string } | null)?.description
      ?? (error as { description?: string; message?: string } | null)?.message
      ?? error,
  ).toLowerCase()

  return message.includes('parse entities') || message.includes("can't parse")
}

export async function sendTelegramMessage(
  target: TelegramTargetLike,
  chatId: string | number,
  message: TelegramMessage | string,
  options?: {
    replyMarkup?: unknown
    disableWebPagePreview?: boolean
  },
): Promise<unknown> {
  const telegram = resolveTelegramApi(target)
  const normalized = typeof message === 'string' ? formatTelegramMessage(message) : message
  const sendOptions = {
    parse_mode: normalized.parseMode,
    ...(options?.replyMarkup ? { reply_markup: options.replyMarkup } : {}),
    ...(options?.disableWebPagePreview
      ? { link_preview_options: { is_disabled: true } }
      : {}),
  }

  try {
    return await telegram.sendMessage(chatId, normalized.text, sendOptions)
  } catch (error) {
    if (!isTelegramParseEntityError(error)) {
      throw error
    }

    const fallback = formatTelegramMessage(stripTelegramHtml(normalized.text))
    console.warn('[telegram:format-fallback]', {
      chatId: String(chatId),
      reason: 'parse_entities',
    })
    return telegram.sendMessage(chatId, fallback.text, sendOptions)
  }
}
