//backend/src/products/ab-system/telegram/views.ts
import { absystemButtons, absystemContent } from '@/products/absystem/config/content.js'
import type { Prisma } from '@starway/db/prisma-client'
import type { Context } from 'telegraf'
import type { InlineKeyboardMarkup } from 'telegraf/types'
import { coachBot, sendOpsTelegramMessage } from '../../../lib/telegram.js'
import {
  blockquote,
  bold,
  escapeTelegramHtml,
  joinBlocks,
  sendTelegramMessage,
} from '../../../lib/telegram/messageFormatter.js'
// import { buildBehavioralSnapshot } from '../../../core/behavioral/behavioralSnapshot.js'
import { withRuntimeAdvisoryLock } from '../../../core/runtime/idempotency.js'
import {
  buildAbTestProgressPatch,
  resolveAbTestQuestionOrder,
  type AbTestProgress,
} from '../../../core/state-machine/abTestFoundation.js'
import { prisma } from '../../../db/client.js'
import { planMessage } from '../../../modules/telegram-mentor/conversation/delivery/planDelivery.js'
import { setPendingTelegramIdentity } from '../../../modules/telegram-mentor/services/identity/pending.js'
// import { PromptProvider } from '../../../PromptProvider.js'
import {
  getAbTestAnswer,
  getAbTestQuestion,
  type AbTestQuestionId,
} from '../content/abTest.questions.js'
import {
  getAbTestResultDefinition,
  interpolateFirstName,
  type AbTestResultKey,
} from '../content/abTest.results.js'
import {
  AB_TEST_AUDIO_URL,
  AB_TEST_BOLD_LINES,
  AB_TEST_PRACTICE_PREVIEW_PROMPT,
  AB_TEST_REVIEW_HEADER_VALUES,
  AB_TEST_SCREENSHOT_URLS,
  AB_TEST_VOICE_CAPTION_PROMPT,
  AB_TEST_VOICE_NOTE_HEADER,
  AB_TEST_VOICE_NOTE_LINK_TEXT,
  buildAbTestScreenshotMarker,
  telegramBlock,
  type AbTestScreenshotKey,
  type TelegramContentBlock,
} from '../content/abTest.shared.js'
import { trackAbTestEvent } from './analytics.js'
import {
  buildWebAppButton,
  resolveBrowserTestUrlOrNull,
} from './buttons.js'
import { scheduleFollowups } from './scheduler.js'
import { getUpcomingZoomBookingView } from '@/modules/zoom/service.js'
import { buildZoomCalendarUrl } from '@/modules/zoom/urls.js'
import { getUserAccessState } from '@/modules/subscriptions/payments/focus-access.js'
import {
  buildAbTestEmailGateMessage,
  getAbTestProfileEmail,
  getAbTestProgressFromUiSettings,
  loadAbTestProgress,
  loadUserUiSettings,
  saveAbTestProgress,
} from './progress.js'
import {
  formatMobileAnswerButtonText,
  formatMobileAnswerListForMessage,
} from './helpers.js'
import { logger } from '../../../utils/logger.js'
import {
  buildCanonicalResultKeyboard,
  resolveCanonicalResultActionPolicy,
} from './keyboard-policy.js'

export const QUESTION_LABELS: Record<AbTestQuestionId, string> = {
  q1: 'Що відбувається',
  q2: 'Що зупиняє',
  q3: 'Як виглядає в житті',
  q4: 'Що кажеш собі',
  q5: 'Що повторюється',
  q6: 'Чого не вистачає',
  q7: 'Чому відкладаєш',
  q8: 'Що допомогло б',
}

export const UI_COPY = {
  miniApp: absystemButtons.openMiniApp,
  browser: absystemButtons.openInBrowser,
} as const
export const RESULT_ZOOM_BOOKING_INTENT = 'booking'

export function describeInlineKeyboard(keyboard: InlineKeyboardMarkup): Array<Array<{
  text: string
  destinationType: 'callback' | 'web_app' | 'url' | 'unknown'
  destination: string
}>> {
  return keyboard.inline_keyboard.map(row => row.map((button) => {
    if ('callback_data' in button) {
      return { text: button.text, destinationType: 'callback', destination: button.callback_data }
    }
    if ('web_app' in button) {
      return { text: button.text, destinationType: 'web_app', destination: 'zoom_calendar' }
    }
    if ('url' in button) {
      return { text: button.text, destinationType: 'url', destination: 'external' }
    }
    return { text: button.text, destinationType: 'unknown', destination: 'unknown' }
  }))
}

function shouldBoldAbTestLine(normalized: string): boolean {
  return AB_TEST_BOLD_LINES.has(normalized)
}

export function renderInlineBoldMarkdown(value: string): string {
  const parts = value.split(/(\*\*[\s\S]+?\*\*)/g)

  return parts
    .map((part) => {
      if (part.startsWith('**') && part.endsWith('**') && part.length > 4) {
        return bold(part.slice(2, -2))
      }

      return escapeTelegramHtml(part)
    })
    .join('')
}

function isQuoteLine(normalized: string): boolean {
  return (
    (normalized.startsWith('"') && normalized.endsWith('"')) ||
    (normalized.startsWith('«') && normalized.endsWith('»')) ||
    normalized.startsWith('[ЦИТАТА]') ||
    normalized.startsWith('ЦИТАТА:') ||
    normalized.startsWith('QUOTE:')
  )
}

function isScreenshotLine(normalized: string): boolean {
  return normalized.startsWith('📸 [СКРІН — ') && normalized.endsWith(']')
}

function isReviewHeaderLine(normalized: string): boolean {
  return AB_TEST_REVIEW_HEADER_VALUES.includes(
    normalized as (typeof AB_TEST_REVIEW_HEADER_VALUES)[number]
  )
}

function extractScreenshotKey(normalized: string): AbTestScreenshotKey | null {
  const match = normalized.match(/^📸 \[СКРІН — ([a-z0-9_]+)\]$/i)
  if (!match) return null
  const key = match[1] as AbTestScreenshotKey
  return AB_TEST_SCREENSHOT_URLS[key] ? key : null
}

export const TELEGRAM_CONTENT_MAX_CHARS = 900

function resolveTypingDelayMs(blocks: TelegramContentBlock[]): number {
  const textLength = blocks.reduce((sum, block) => {
    if ('text' in block && typeof block.text === 'string') {
      return sum + block.text.length
    }
    if ('caption' in block && typeof block.caption === 'string') {
      return sum + block.caption.length
    }
    return sum
  }, 0)

  const hasMedia = blocks.some(
    (block) =>
      block.type === 'image' || block.type === 'audio' || block.type === 'video'
  )

  if (hasMedia) {
    return 2200
  }
  if (textLength <= 220) {
    return 1400
  }
  if (textLength <= 700) {
    return 2400
  }
  return 3800
}

export async function sendTypingBeforeBlocks(
  ctx: Context,
  chatId: string | number,
  blocks: TelegramContentBlock[]
): Promise<void> {
  await ctx.telegram.sendChatAction(chatId, 'typing').catch(() => undefined)
  await sleep(resolveTypingDelayMs(blocks))
}

export function splitReviewSequence(blocks: TelegramContentBlock[]): {
  message: TelegramContentBlock[]
  screenshot: TelegramContentBlock[]
} {
  return {
    message: blocks.filter(
      (block) => block.type === 'text' || block.type === 'quote'
    ),
    screenshot: blocks.filter((block) => block.type === 'image'),
  }
}

export function interpolateFirstNameInBlocks(
  blocks: TelegramContentBlock[],
  firstName?: string | null
): TelegramContentBlock[] {
  return blocks.map((block) => {
    switch (block.type) {
      case 'text':
      case 'quote':
      case 'pricing':
      case 'cta':
        return {
          ...block,
          text: interpolateFirstName(block.text, firstName),
        }
      case 'image':
      case 'video':
      case 'audio':
        return {
          ...block,
          ...(block.caption
            ? { caption: interpolateFirstName(block.caption, firstName) }
            : {}),
        }
      default:
        return block
    }
  })
}

function buildBlockPausePlan(
  blocks: TelegramContentBlock[],
): number[] {
  return blocks.slice(1).map((block) => {
    if (block.type === 'image' || block.type === 'video' || block.type === 'audio') {
      return 1800
    }
    const textLength = 'text' in block ? block.text.length : 0
    if (textLength <= 90) return 1100
    if (textLength <= 180) return 1500
    return 2100
  })
}

export function buildPracticeBlockPausePlan(
  blocks: TelegramContentBlock[],
): number[] {
  return blocks.slice(1).map(() => 5000)
}

export async function pauseBetweenPracticeSections(): Promise<void> {
  await sleep(2600)
}

/**
 * Resolves display name from all available sources in priority order.
 * Safe: never returns empty string with comma — either a name or null.
 * Backfills DB if name was missing (fire-and-forget, no await).
 */
export function resolveFirstName(
  user: { firstName?: string | null; telegramUserName?: string | null } | null | undefined,
  ctx: Context,
  userId?: string,
): string | null {
  const name =
    user?.firstName?.trim() ||
    ctx.from?.first_name?.trim() ||
    user?.telegramUserName?.trim() ||
    null

  // Backfill DB if we got name from Telegram ctx but DB was empty
  if (userId && !user?.firstName?.trim() && ctx.from?.first_name?.trim()) {
    void prisma.user.update({
      where: { id: userId },
      data: { firstName: ctx.from.first_name.trim() },
    }).catch(() => undefined)
  }

  return name || null
}

export function splitTelegramLines(
  lines: string[],
  maxChars = TELEGRAM_CONTENT_MAX_CHARS
): string[][] {
  const blocks = splitTelegramContentBlocks(lines)
  return packTelegramContentBlocks(blocks, maxChars).map((chunk) =>
    chunk.flatMap((block) => {
      if (
        block.type === 'image' ||
        block.type === 'video' ||
        block.type === 'audio'
      ) {
        return block.caption ? [block.caption, ''] : []
      }
      return block.text.split('\n').flatMap((line) => [line, ''])
    })
  )
}

export function splitTelegramContentBlocks(
  lines: string[]
): TelegramContentBlock[] {
  const blocks: TelegramContentBlock[] = []
  let currentText: string[] = []

  const flushText = () => {
    const trimmed = currentText.map((line) => line.trim()).filter(Boolean)
    if (trimmed.length) {
      blocks.push(telegramBlock.text(trimmed.join('\n')))
    }
    currentText = []
  }

  for (let index = 0; index < lines.length; index += 1) {
    const raw = lines[index]
    const normalized = raw.trim()

    if (!normalized) {
      flushText()
      continue
    }

    if (normalized.startsWith('[КНОПКА:')) {
      continue
    }

    if (normalized === AB_TEST_VOICE_NOTE_HEADER) {
      flushText()
      const next = lines[index + 1]?.trim()
      if (next === AB_TEST_VOICE_NOTE_LINK_TEXT) {
        index += 1
      }
      blocks.push(
        telegramBlock.audio(AB_TEST_AUDIO_URL, AB_TEST_VOICE_CAPTION_PROMPT)
      )
      continue
    }

    if (isScreenshotLine(normalized)) {
      flushText()
      const screenshotKey = extractScreenshotKey(normalized)
      if (screenshotKey) {
        blocks.push(telegramBlock.image(AB_TEST_SCREENSHOT_URLS[screenshotKey]))
      }
      continue
    }

    if (isQuoteLine(normalized)) {
      const lastTextLine = currentText[currentText.length - 1]?.trim()
      if (lastTextLine && isReviewHeaderLine(lastTextLine)) {
        currentText.push(raw)
        while (index + 1 < lines.length) {
          const next = lines[index + 1].trim()
          if (!next || !isQuoteLine(next)) break
          currentText.push(lines[index + 1])
          index += 1
        }
        continue
      }

      flushText()
      const quoteLines = [normalized]
      while (index + 1 < lines.length) {
        const next = lines[index + 1].trim()
        if (!next || !isQuoteLine(next)) break
        quoteLines.push(next)
        index += 1
      }
      blocks.push(telegramBlock.quote(quoteLines.join('\n')))
      continue
    }

    currentText.push(raw)
  }

  flushText()
  return blocks
}

export function packTelegramContentBlocks(
  blocks: TelegramContentBlock[],
  maxChars = TELEGRAM_CONTENT_MAX_CHARS
): TelegramContentBlock[][] {
  const chunks: TelegramContentBlock[][] = []
  let current: TelegramContentBlock[] = []
  let currentLength = 0

  for (const block of blocks) {
    if (
      block.type === 'quote' ||
      block.type === 'audio' ||
      block.type === 'image' ||
      block.type === 'video'
    ) {
      if (current.length) {
        chunks.push(current)
        current = []
        currentLength = 0
      }
      chunks.push([block])
      continue
    }

    const rendered = renderTelegramContentBlock(block)
    const nextLength =
      currentLength + rendered.length + (current.length > 0 ? 2 : 0)

    if (current.length > 0 && nextLength > maxChars) {
      chunks.push(current)
      current = []
      currentLength = 0
    }

    current.push(block)
    currentLength += rendered.length + (current.length > 1 ? 2 : 0)
  }

  if (current.length) {
    chunks.push(current)
  }

  return chunks
}

export function formatAbTestTelegramLine(line: string): string {
  const normalized = line.trim()
  if (!normalized) {
    return ''
  }

  if (isQuoteLine(normalized)) {
    const clean = normalized
      .replace(/^"|"$/g, '')
      .replace(/^«|»$/g, '')
      .replace(/^\[ЦИТАТА\]\s*/i, '')
      .replace(/^ЦИТАТА:\s*/i, '')
      .replace(/^QUOTE:\s*/i, '')
      .trim()
    return blockquote(clean)
  }

  if (normalized.startsWith('· ')) {
    return `• ${renderInlineBoldMarkdown(normalized.slice(2))}`
  }

  if (normalized === AB_TEST_VOICE_NOTE_HEADER) {
    return bold(normalized)
  }

  if (normalized === AB_TEST_VOICE_NOTE_LINK_TEXT) {
    return ''
  }

  if (/^\*[^*].*[^*]\*$/.test(normalized)) {
    return bold(normalized.slice(1, -1))
  }

  if (shouldBoldAbTestLine(normalized)) {
    return bold(normalized)
  }

  return renderInlineBoldMarkdown(normalized)
}

export function formatAbTestTelegramCard(
  title: string,
  lines: string[]
): string {
  const body = renderTelegramContentBlocks(splitTelegramContentBlocks(lines))
  return joinBlocks([title ? bold(title) : '', body])
}

export function renderTelegramContentMessage(
  title: string,
  blocks: TelegramContentBlock[]
): string {
  const body = renderTelegramContentBlocks(blocks)
  return joinBlocks([title ? bold(title) : '', body])
}

export function resolveTelegramContentPhotoUrl(
  blocks: TelegramContentBlock[]
): string | null {
  if (blocks.length !== 1) {
    return null
  }

  const [block] = blocks
  if (block.type !== 'image') {
    return null
  }

  return block.assetKey || null
}

export function resolveSingleMediaBlock(
  blocks: TelegramContentBlock[]
): Extract<TelegramContentBlock, { type: 'image' | 'video' | 'audio' }> | null {
  if (blocks.length !== 1) {
    return null
  }

  const [block] = blocks
  return block.type === 'image' ||
    block.type === 'video' ||
    block.type === 'audio'
    ? block
    : null
}



function renderTelegramContentBlocks(blocks: TelegramContentBlock[]): string {
  return blocks.map(renderTelegramContentBlock).join('\n\n')
}

function renderTelegramContentBlock(block: TelegramContentBlock): string {
  if (block.type === 'quote') {
    return blockquote(block.text.replace(/^"|"$/g, '').replace(/^«|»$/g, '').trim())
  }

  if (
    block.type === 'image' ||
    block.type === 'video' ||
    block.type === 'audio'
  ) {
    return block.caption ? renderInlineBoldMarkdown(block.caption) : ''
  }

  if (block.type === 'pricing' || block.type === 'cta') {
    return bold(block.text)
  }

  return renderInlineBoldMarkdown(block.text)
}



export function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}
