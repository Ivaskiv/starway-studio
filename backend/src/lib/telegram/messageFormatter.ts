type TelegramApiLike = {
  sendMessage: (
    chatId: string | number,
    text: string,
    options?: Record<string, unknown>,
  ) => Promise<unknown>
  sendPhoto?: (
    chatId: string | number,
    photo: string,
    options?: Record<string, unknown>,
  ) => Promise<unknown>
  sendVoice?: (
    chatId: string | number,
    voice: string,
    options?: Record<string, unknown>,
  ) => Promise<unknown>
  sendVideo?: (
    chatId: string | number,
    video: string,
    options?: Record<string, unknown>,
  ) => Promise<unknown>
  sendDocument?: (
    chatId: string | number,
    document: string,
    options?: Record<string, unknown>,
  ) => Promise<unknown>
}

type TelegramTargetLike = TelegramApiLike | { telegram: TelegramApiLike }

export type TelegramMessage = {
  text: string
  parseMode: 'HTML'
}

type TelegramCaption = TelegramMessage

const ALLOWED_TELEGRAM_TAG_PATTERN =
  /<\/?(?:b|strong|i|em|code|pre|blockquote)(?:\s+[^>]*)?>|<a\s+href="[^"]+">|<\/a>/gi

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

function renderInlineBoldMarkdown(value: string): string {
  const source = String(value ?? '')
  if (!source.includes('**')) {
    return escapeTelegramHtml(source)
  }

  return source.replace(/\*\*([^*]+)\*\*/g, (_, boldValue: string) =>
    `<b>${escapeTelegramHtml(boldValue)}</b>`,
  )
}

function renderSemanticTelegramText(value: string): string {
  const normalized = String(value ?? '').replace(/\r/g, '').trim()
  if (!normalized) {
    return ''
  }

  const lines = normalized.split('\n')
  const rendered: string[] = []

  for (const line of lines) {
    const trimmed = line.trim()
    if (!trimmed) {
      rendered.push('')
      continue
    }

    if (trimmed.startsWith('[ЦИТАТА]')) {
      rendered.push(blockquote(trimmed.slice('[ЦИТАТА]'.length).trim()))
      continue
    }

    if (trimmed.startsWith('ЦИТАТА:')) {
      rendered.push(blockquote(trimmed.slice('ЦИТАТА:'.length).trim()))
      continue
    }

    if (trimmed.startsWith('QUOTE:')) {
      rendered.push(blockquote(trimmed.slice('QUOTE:'.length).trim()))
      continue
    }

    if (trimmed.startsWith('>')) {
      rendered.push(blockquote(trimmed.replace(/^>\s*/, '')))
      continue
    }

    rendered.push(renderInlineBoldMarkdown(trimmed))
  }

  return rendered.join('\n')
}

function usesOnlyAllowedTelegramHtml(value: string): boolean {
  const normalized = String(value ?? '').trim()
  if (!normalized || !/[<>]/.test(normalized)) {
    return false
  }

  const withoutAllowedTags = normalized.replace(ALLOWED_TELEGRAM_TAG_PATTERN, '')
  return !/<[^>]+>/.test(withoutAllowedTags)
}

function normalizeTelegramText(
  value: string,
  parseMode?: string | null,
): TelegramMessage {
  if (parseMode === 'HTML' && usesOnlyAllowedTelegramHtml(value)) {
    return {
      text: value.trim(),
      parseMode: 'HTML',
    }
  }

  return {
    text: renderSemanticTelegramText(value),
    parseMode: 'HTML',
  }
}

export function formatTelegramCaption(
  caption: string | null | undefined,
  parseMode?: string | null,
): TelegramCaption | null {
  const normalized = String(caption ?? '').trim()
  if (!normalized) {
    return null
  }

  return normalizeTelegramText(normalized, parseMode)
}

export function formatTelegramMessage(input: FormatTelegramMessageInput): TelegramMessage {
  if (typeof input === 'string') {
    return normalizeTelegramText(input)
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
    text: preformatted ? text : renderSemanticTelegramText(text),
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

type TelegramMediaMethod = 'sendPhoto' | 'sendVoice' | 'sendVideo' | 'sendDocument'

type TelegramMediaOptions = Record<string, unknown> | undefined

async function sendTelegramMedia(
  target: TelegramTargetLike,
  method: TelegramMediaMethod,
  chatId: string | number,
  asset: string,
  options?: TelegramMediaOptions,
): Promise<unknown> {
  const telegram = resolveTelegramApi(target)
  const sender = telegram[method]
  if (typeof sender !== 'function') {
    throw new Error(`telegram_method_not_supported:${method}`)
  }

  const caption = formatTelegramCaption(
    typeof options?.caption === 'string' ? options.caption : '',
    typeof options?.parse_mode === 'string' ? options.parse_mode : null,
  )

  const normalizedOptions = {
    ...options,
    ...(caption
      ? {
          caption: caption.text,
          parse_mode: caption.parseMode,
        }
      : {}),
  }

  return sender.call(telegram, chatId, asset, normalizedOptions)
}

export async function sendTelegramPhoto(
  target: TelegramTargetLike,
  chatId: string | number,
  photo: string,
  options?: TelegramMediaOptions,
): Promise<unknown> {
  return sendTelegramMedia(target, 'sendPhoto', chatId, photo, options)
}

export async function sendTelegramVoice(
  target: TelegramTargetLike,
  chatId: string | number,
  voice: string,
  options?: TelegramMediaOptions,
): Promise<unknown> {
  return sendTelegramMedia(target, 'sendVoice', chatId, voice, options)
}

export async function sendTelegramVideo(
  target: TelegramTargetLike,
  chatId: string | number,
  video: string,
  options?: TelegramMediaOptions,
): Promise<unknown> {
  return sendTelegramMedia(target, 'sendVideo', chatId, video, options)
}

export async function sendTelegramDocument(
  target: TelegramTargetLike,
  chatId: string | number,
  document: string,
  options?: TelegramMediaOptions,
): Promise<unknown> {
  return sendTelegramMedia(target, 'sendDocument', chatId, document, options)
}
