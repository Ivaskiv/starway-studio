import type { TelegramCaption, TelegramMessage } from './types.js'
import {
  ALLOWED_TELEGRAM_TAG_PATTERN,
  blockquote,
  escapeTelegramHtml,
} from './html.js'

type FormatTelegramMessageInput =
  | string
  | {
      text?: string | null
      blocks?: Array<string | null | undefined | false>
      preformatted?: boolean
    }

export function joinBlocks(
  blocks: Array<string | null | undefined | false>,
): string {
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

  if (source.startsWith('**') && !source.slice(2).includes('**')) {
    return `<b>${escapeTelegramHtml(source.slice(2).trim())}</b>`
  }

  return source.replace(
    /\*\*([^*]+)\*\*/g,
    (_, boldValue: string) =>
      `<b>${escapeTelegramHtml(boldValue)}</b>`,
  )
}

function renderSemanticTelegramText(value: string): string {
  const normalized = String(value ?? '')
    .replace(/\r/g, '')
    .trim()

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
      rendered.push(
        blockquote(trimmed.slice('[ЦИТАТА]'.length).trim()),
      )
      continue
    }

    if (trimmed.startsWith('ЦИТАТА:')) {
      rendered.push(
        blockquote(trimmed.slice('ЦИТАТА:'.length).trim()),
      )
      continue
    }

    if (trimmed.startsWith('QUOTE:')) {
      rendered.push(
        blockquote(trimmed.slice('QUOTE:'.length).trim()),
      )
      continue
    }

    if (trimmed.startsWith('>')) {
      rendered.push(
        blockquote(trimmed.replace(/^>\s*/, '')),
      )
      continue
    }

    rendered.push(renderInlineBoldMarkdown(trimmed))
  }

  return rendered.join('\n')
}

function isTelegramListLine(value: string): boolean {
  const normalized = value
    .replace(ALLOWED_TELEGRAM_TAG_PATTERN, '')
    .trim()

  return /^\s*[•·*-]\s+/u.test(normalized)
}

function isTelegramPricingLine(value: string): boolean {
  const normalized = value
    .replace(ALLOWED_TELEGRAM_TAG_PATTERN, '')
    .trim()

  return /^\s*\d+\s*(?:місяць|місяці|рік)\s+—/u.test(normalized)
}

function resolveTelegramLineSeparator(
  previousLine: string,
  currentLine: string,
): '\n' | '\n\n' {
  const previousIsList = isTelegramListLine(previousLine)
  const currentIsList = isTelegramListLine(currentLine)

  if (previousIsList && currentIsList) {
    return '\n'
  }

  const previousIsPricing = isTelegramPricingLine(previousLine)
  const currentIsPricing = isTelegramPricingLine(currentLine)

  if (previousIsPricing && currentIsPricing) {
    return '\n'
  }

  return '\n\n'
}

function normalizeTelegramParagraphSpacing(value: string): string {
  const normalized = String(value ?? '')
    .replace(/\r/g, '')
    .trim()

  if (!normalized) {
    return ''
  }

  const lines = normalized
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean)

  if (lines.length === 0) {
    return ''
  }

  let formatted = lines[0] ?? ''

  for (let index = 1; index < lines.length; index += 1) {
    formatted +=
      resolveTelegramLineSeparator(
        lines[index - 1]!,
        lines[index]!,
      ) + lines[index]
  }

  return formatted.replace(/\n{3,}/g, '\n\n')
}

export function normalizeTelegramText(
  value: string,
  _parseMode?: string | null,
): TelegramMessage {
  // Preserve canonical markup; escape only text between allowlisted tags.
  const htmlParts = value.split(new RegExp(`(${ALLOWED_TELEGRAM_TAG_PATTERN.source})`, 'gi'))
  if (htmlParts.length > 1) {
    return {
      text: normalizeTelegramParagraphSpacing(
        htmlParts.map((part, index) => index % 2 ? part : escapeTelegramHtml(part)).join(''),
      ),
      parseMode: 'HTML',
    }
  }

  return {
    text: normalizeTelegramParagraphSpacing(
      renderSemanticTelegramText(value),
    ),
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

export function formatTelegramMessage(
  input: FormatTelegramMessageInput,
): TelegramMessage {
  if (typeof input === 'string') {
    return normalizeTelegramText(input)
  }

  const preformatted = input.preformatted === true
  const sourceBlocks = input.blocks ?? [input.text ?? '']

  const text = joinBlocks(
    sourceBlocks.map((block) => {
      if (!block) return ''

      return String(block)
    }),
  )

  return preformatted
    ? normalizeTelegramText(text, 'HTML')
    : normalizeTelegramText(text)
}
