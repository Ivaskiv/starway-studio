//backend/src/products/ab-system/telegram/abTest.views.ts
import { hasTelegramCtaInteraction } from '@/modules/telegram-mentor/services/ctaInteraction.service.js'
import { absystemButtons, absystemContent } from '@/products/absystem/config/absystem.content.js'
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
import { testOrchestrator } from '../../../core/orchestrator/testOrchestrator.js'
import { withRuntimeAdvisoryLock } from '../../../core/runtime/runtimeIdempotency.js'
import {
  AB_TEST_UI_SETTINGS_KEY,
  buildAbTestProgressPatch,
  resolveAbTestQuestionOrder,
  type AbTestProgress,
} from '../../../core/state-machine/abTestFoundation.js'
import { prisma } from '../../../db/client.js'
import { planMessage } from '../../../modules/telegram-mentor/conversation/delivery/planDelivery.js'
import { setPendingTelegramIdentity } from '../../../modules/telegram-mentor/services/pendingIdentity.service.js'
// import { PromptProvider } from '../../../PromptProvider.js'
import { resolveAbTestFollowupCopy } from '../content/abTest.followups.js'
import {
  getAbTestAnswer,
  getAbTestQuestion,
  type AbTestQuestionId,
} from '../content/abTest.questions.js'
import {
  getAbTestResultDefinition,
  interpolateFirstName,
  resolveTestDriveVersion,
  type AbTestResultKey,
} from '../content/abTest.results.js'
import {
  AB_TEST_AUDIO_URL,
  AB_TEST_BOOK_ZOOM_CTA_TEXT,
  AB_TEST_BOLD_LINES,
  AB_TEST_CHOOSE_ZOOM_BUTTON_TEXT,
  AB_TEST_OPEN_FOCUS_BUTTON_TEXT,
  AB_TEST_FOCUS_JOIN_CTA_MULTILINE_TEXT,
  AB_TEST_PRACTICE_PREVIEW_PROMPT,
  AB_TEST_REVIEW_HEADER_VALUES,
  AB_TEST_SCREENSHOT_URLS,
  AB_TEST_SHOW_INSIDE_CTA_TEXT,
  AB_TEST_VOICE_CAPTION_PROMPT,
  AB_TEST_VOICE_NOTE_HEADER,
  AB_TEST_VOICE_NOTE_LINK_TEXT,
  buildAbTestScreenshotMarker,
  telegramBlock,
  type AbTestScreenshotKey,
  type TelegramContentBlock,
} from '../content/abTest.shared.js'
import { trackAbTestEvent } from './abTest.analytics.js'
import {
  buildWebAppButton,
  resolveBrowserTestUrlOrNull,
} from './abTest.buttons.js'
import { scheduleFollowups } from './abTest.scheduler.js'
import { getUpcomingZoomBookingView } from '@/modules/zoom/service.js'
import { buildZoomCalendarUrl } from '@/modules/zoom/urls.js'
import { getUserAccessState } from '@/modules/subscriptions/payments/focus.access.js'
import {
  buildAbTestEmailGateMessage,
  getAbTestProfileEmail,
  getAbTestProgressFromUiSettings,
  loadAbTestProgress,
  loadUserUiSettings,
  saveAbTestProgress,
} from './abTest.progress.js'
import {
  formatMobileAnswerButtonText,
  formatMobileAnswerListForMessage,
} from './abTest.helpers.js'

const QUESTION_LABELS: Record<AbTestQuestionId, string> = {
  q1: 'Що відбувається',
  q2: 'Що зупиняє',
  q3: 'Як виглядає в житті',
  q4: 'Що кажеш собі',
  q5: 'Що повторюється',
  q6: 'Чого не вистачає',
  q7: 'Чому відкладаєш',
  q8: 'Що допомогло б',
}

const UI_COPY = {
  miniApp: absystemButtons.openMiniApp,
  browser: absystemButtons.openInBrowser,
} as const
const RESULT_ZOOM_BOOKING_INTENT = 'booking'

function buildResultPreviewKeyboard(
  resultKey: AbTestResultKey,
): InlineKeyboardMarkup {
  return {
    inline_keyboard: [
      [
        {
          text: AB_TEST_SHOW_INSIDE_CTA_TEXT,
          callback_data: `show_inside_${resultKey.toUpperCase()}`,
        },
        {
          text: AB_TEST_BOOK_ZOOM_CTA_TEXT,
          web_app: {
            url: buildZoomCalendarUrl({ intent: RESULT_ZOOM_BOOKING_INTENT }),
          },
        },
      ],
    ],
  }
}

function buildResultPreviewKeyboardForBookingState(input: {
  resultKey: AbTestResultKey
  isMyBooking: boolean
}): InlineKeyboardMarkup {
  if (input.isMyBooking) {
    return {
      inline_keyboard: [
        [
          {
            text: AB_TEST_SHOW_INSIDE_CTA_TEXT,
            callback_data: `show_inside_${input.resultKey.toUpperCase()}`,
          },
        ],
      ],
    }
  }

  return buildResultPreviewKeyboard(input.resultKey)
}

function shouldBoldAbTestLine(normalized: string): boolean {
  return AB_TEST_BOLD_LINES.has(normalized)
}

function renderInlineBoldMarkdown(value: string): string {
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

const TELEGRAM_CONTENT_MAX_CHARS = 900

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

async function sendTypingBeforeBlocks(
  ctx: Context,
  chatId: string | number,
  blocks: TelegramContentBlock[]
): Promise<void> {
  await ctx.telegram.sendChatAction(chatId, 'typing').catch(() => undefined)
  await sleep(resolveTypingDelayMs(blocks))
}

function splitReviewSequence(blocks: TelegramContentBlock[]): {
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

function interpolateFirstNameInBlocks(
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

function buildPracticeBlockPausePlan(
  blocks: TelegramContentBlock[],
): number[] {
  return blocks.slice(1).map((block) => {
    if (block.type === 'image' || block.type === 'video' || block.type === 'audio') {
      return 3200
    }
    const textLength = 'text' in block ? block.text.length : 0
    if (textLength <= 90) return 2600
    if (textLength <= 180) return 4200
    return 6500
  })
}

async function pauseBetweenPracticeSections(): Promise<void> {
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

function resolveSingleMediaBlock(
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

export async function sendTelegramContentChunk(
  ctx: Context,
  chatId: string | number,
  title: string,
  blocks: TelegramContentBlock[],
  options?: {
    inlineKeyboard?: InlineKeyboardMarkup
    parseMode?: 'HTML' | 'Markdown'
    separateBlocks?: boolean
    pauseMsBetweenBlocks?: number[]
  }
): Promise<void> {
  const mediaBlock = resolveSingleMediaBlock(blocks)
  const renderedMediaCaption =
    mediaBlock && mediaBlock.caption
      ? renderInlineBoldMarkdown(mediaBlock.caption).trim()
      : undefined

  const renderedMessage = renderTelegramContentMessage(title, blocks).trim()

  if (!renderedMessage && !mediaBlock) {
    console.warn('[AB_TEST_EMPTY_MESSAGE_SKIPPED]', {
      title,
      blocksCount: blocks.length,
    })
    return
  }

  if (mediaBlock?.type === 'image') {
    await ctx.telegram.sendPhoto(chatId, mediaBlock.assetKey, {
      caption: renderedMediaCaption,
      parse_mode: options?.parseMode ?? 'HTML',
      reply_markup: options?.inlineKeyboard,
    })
    return
  }

  if (mediaBlock?.type === 'audio') {
    await ctx.telegram.sendVoice(chatId, mediaBlock.assetKey, {
      caption: renderedMediaCaption,
      parse_mode: options?.parseMode ?? 'HTML',
      reply_markup: options?.inlineKeyboard,
    })
    return
  }

  if (mediaBlock?.type === 'video') {
    await ctx.telegram.sendVideo(chatId, mediaBlock.assetKey, {
      caption: renderedMediaCaption,
      parse_mode: options?.parseMode ?? 'HTML',
      reply_markup: options?.inlineKeyboard,
    })
    return
  }

  const hasMedia = blocks.some(
    (block) =>
      block.type === 'image' || block.type === 'video' || block.type === 'audio'
  )
  if (hasMedia && blocks.length > 1) {
    for (let index = 0; index < blocks.length; index += 1) {
      if (index > 0 && options?.pauseMsBetweenBlocks) {
        await sleep(options.pauseMsBetweenBlocks[index - 1] ?? 0)
        await sendTypingBeforeBlocks(ctx, chatId, [blocks[index]])
      }
      await sendTelegramContentChunk(
        ctx,
        chatId,
        index === 0 ? title : '',
        [blocks[index]],
        {
          inlineKeyboard:
            index === blocks.length - 1 ? options?.inlineKeyboard : undefined,
          parseMode: options?.parseMode ?? 'HTML',
        }
      )
    }
    return
  }

  if (options?.separateBlocks && blocks.length > 1) {
    for (let index = 0; index < blocks.length; index += 1) {
      if (index > 0 && options.pauseMsBetweenBlocks) {
        await sleep(options.pauseMsBetweenBlocks[index - 1] ?? 0)
        await sendTypingBeforeBlocks(ctx, chatId, [blocks[index]])
      }
      await sendTelegramContentChunk(
        ctx,
        chatId,
        index === 0 ? title : '',
        [blocks[index]],
        {
          inlineKeyboard:
            index === blocks.length - 1 ? options.inlineKeyboard : undefined,
          parseMode: options.parseMode ?? 'HTML',
        }
      )
    }
    return
  }

  await sendTelegramMessage(
    ctx,
    chatId,
    {
      text: renderedMessage,
      parseMode: 'HTML',
    },
    {
      replyMarkup: options?.inlineKeyboard,
    },
  )
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

export async function sendLogMessage(ctx: Context, progress: AbTestProgress) {
  if (progress.answers.length === 0) {
    return
  }

  const lines: string[] = []
  for (let index = 0; index < progress.answers.length; index += 1) {
    const item = progress.answers[index]
    const answerText =
      getAbTestAnswer(item.question_id, item.answer_id)?.text ?? item.answer_id
    lines.push(
      `✅ ${index + 1}. ${QUESTION_LABELS[item.question_id]}: *${answerText}*`
    )
  }

  await planMessage(
    ctx,
    'ctx.reply',
    'ab_test_send_log',
    lines.join('\n'),
    undefined,
    'Markdown'
  )
}

function formatTelegramButtonText(value: string): string {
  return value.match(/^([А-ДA-E])\./)?.[1] ?? value.slice(0, 1)
}

export async function sendActionMessage(
  ctx: Context,
  userId: string,
  progress: AbTestProgress,
  questionIndex: number,
  mode: 'reply' | 'edit' = 'reply'
) {
  const questionOrder = resolveAbTestQuestionOrder()
  if (questionIndex < 0 || questionIndex >= questionOrder.length) {
    await renderCurrentView(ctx, userId, progress)
    return
  }

  const questionId = questionOrder[questionIndex]
  const question = getAbTestQuestion(questionId)
  const selectedAnswerId =
    progress.answers.find((item) => item.question_id === questionId)
      ?.answer_id ?? null
  const browserUrl = resolveBrowserTestUrlOrNull()
  const miniAppButton = buildWebAppButton(UI_COPY.miniApp, '/ab-test')
  const text = bold(question.prompt)

  const answerRow = question.answers.map((answer) => ({
    text:
      selectedAnswerId === answer.id
        ? `✅ ${formatTelegramButtonText(answer.text)}`
        : formatTelegramButtonText(answer.text),
    callback_data: `ab_test_answer:${question.question_id}:${answer.id}:${progress.revision}`,
  }))

  const markup = {
    parse_mode: 'HTML' as const,
    reply_markup: {
      inline_keyboard: [
        answerRow,
        ...(miniAppButton || browserUrl
          ? [
              [
                ...(miniAppButton ? [miniAppButton] : []),
                ...(browserUrl
                  ? [{ text: UI_COPY.browser, url: browserUrl }]
                  : []),
              ],
            ]
          : []),
      ],
    },
  }

  if (
    mode === 'edit' &&
    ctx.callbackQuery &&
    'message' in ctx.callbackQuery &&
    ctx.callbackQuery.message
  ) {
    try {
      await planMessage(
        ctx,
        'ctx.editMessageText',
        'ab_test_send_action_edit',
        text,
        markup.reply_markup,
        'HTML'
      )
      return
    } catch {
      // fall through
    }
  }

  await planMessage(
    ctx,
    'ctx.reply',
    'ab_test_send_action_reply',
    text,
    markup.reply_markup,
    'HTML'
  )
}

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

async function sendAbTestDeliveryTelemetry(input: {
  userId: string
  resultKey: AbTestResultKey
  messageKey: string
  deliverySource: 'post_email' | 'show_result'
}): Promise<void> {
  await sendOpsTelegramMessage(
    [
      'AB test result delivered',
      `userId: ${input.userId}`,
      `result: ${input.resultKey}`,
      `messageKey: ${input.messageKey}`,
      `source: ${input.deliverySource}`,
      'blocks: intro, voice, practice, review, pricing, cta',
    ].join('\n'),
    undefined,
    {
      messageType: 'ab_test_result_delivered',
      source: 'sendAbTestDeliveryTelemetry',
    }
  ).catch(() => false)

  const coachChatId = String(
    process.env.STARWAY_OPS_CHAT_ID ?? process.env.OPS_TELEGRAM_CHAT_ID ?? ''
  ).trim()
  if (!coachChatId) return

  const analyticsText = [
    '📊 AB mentor analytics',
    `userId: ${input.userId}`,
    `result: ${input.resultKey}`,
    `messageKey: ${input.messageKey}`,
    `source: ${input.deliverySource}`,
  ].join('\n')

  console.info(
    `[OPS_ROUTE_DEBUG] messageType=ab_mentor_analytics chatId=${coachChatId} source=sendAbTestDeliveryTelemetry bot=coachBot`
  )
  await coachBot.telegram
    .sendMessage(coachChatId, analyticsText)
    .then(() => {
      console.info(
        `[OPS_ROUTE_OK] messageType=ab_mentor_analytics chatId=${coachChatId} source=sendAbTestDeliveryTelemetry bot=coachBot`
      )
    })
    .catch((error) => {
      console.error(
        `[OPS_ROUTE_ERROR] messageType=ab_mentor_analytics chatId=${coachChatId} source=sendAbTestDeliveryTelemetry bot=coachBot`,
        error
      )
    })
}

export async function dispatchAbTestResultSequence(
  ctx: Context,
  input: {
    chatId: string | number
    userId?: string
    resultKey: AbTestResultKey
    firstName?: string | null
    deliverySource: 'post_email' | 'show_result'
    notifyOps?: boolean
  }
): Promise<void> {
  const resultDef = getAbTestResultDefinition(input.resultKey)
  const introBlocks = interpolateFirstNameInBlocks(
    resultDef.blocks?.intro ?? [],
    input.firstName
  )
  const practiceBlocks = interpolateFirstNameInBlocks(
    resultDef.blocks?.practice ?? [],
    input.firstName
  )
  const reviewBlocks = interpolateFirstNameInBlocks(
    resultDef.blocks?.review ?? [],
    input.firstName
  )
  const pricingBlocks = interpolateFirstNameInBlocks(
    resultDef.blocks?.pricing ?? [],
    input.firstName
  )
  const previewKeyboard = buildResultPreviewKeyboard(input.resultKey)
  console.info('[RESULT_FLOW]', {
    step: 'result_sequence_started',
    userId: input.userId ?? null,
    chatId: String(input.chatId),
    resultKey: input.resultKey,
    deliverySource: input.deliverySource,
  })

  await sendTypingBeforeBlocks(ctx, input.chatId, introBlocks)
  await sendTelegramContentChunk(
    ctx,
    input.chatId,
    '',
    introBlocks,
    {
      parseMode: 'HTML',
      separateBlocks: true,
      pauseMsBetweenBlocks: [5000, 7000, 5000, 0],
    }
  )
  console.info('[RESULT_SENT]', {
    step: 'result_intro_sent',
    userId: input.userId ?? null,
    chatId: String(input.chatId),
    resultKey: input.resultKey,
    deliverySource: input.deliverySource,
  })
  await sendTypingBeforeBlocks(ctx, input.chatId, [
    telegramBlock.text(AB_TEST_PRACTICE_PREVIEW_PROMPT),
  ])
  const practicePreviewMessage = await sendTelegramMessage(
    ctx,
    input.chatId,
    {
      text: AB_TEST_PRACTICE_PREVIEW_PROMPT,
      parseMode: 'HTML',
    },
    {
      replyMarkup: previewKeyboard,
    },
  )
  console.info('[PRACTICE_BUTTON_RENDERED]', {
    userId: input.userId ?? null,
    chatId: String(input.chatId),
    resultKey: input.resultKey,
    callbackData: `show_inside_${input.resultKey.toUpperCase()}`,
    deliverySource: input.deliverySource,
    messageId:
      typeof practicePreviewMessage === 'object' &&
      practicePreviewMessage !== null &&
      'message_id' in practicePreviewMessage
        ? practicePreviewMessage.message_id
        : null,
  })

  if (input.notifyOps && input.userId) {
    await sendAbTestDeliveryTelemetry({
      userId: input.userId,
      resultKey: input.resultKey,
      messageKey: resultDef.message_key,
      deliverySource: input.deliverySource,
    }).catch(() => undefined)
  }
}

export async function sendResultSnapshot(
  ctx: Context,
  input: {
    chatId: string | number
    userId: string
    resultKey: AbTestResultKey
    firstName?: string | null
  }
): Promise<void> {
  const resultDef = getAbTestResultDefinition(input.resultKey)
  const snapshotCopyByKey = {
    state: absystemContent.TELEGRAM_COPY.RESULT_SNAPSHOT.STATE,
    goal: absystemContent.TELEGRAM_COPY.RESULT_SNAPSHOT.GOAL,
    choice: absystemContent.TELEGRAM_COPY.RESULT_SNAPSHOT.CHOICE,
    decision: absystemContent.TELEGRAM_COPY.RESULT_SNAPSHOT.DECISION,
    action: absystemContent.TELEGRAM_COPY.RESULT_SNAPSHOT.ACTION,
  } as const
  const snapshotCopy = snapshotCopyByKey[input.resultKey]
  const snapshotOverrides = snapshotCopy as Partial<{
    statusHeader: string
    zoomNotBookedLabel: string
    subscriptionInactiveLabel: string
    nextStepNoAccess: string
  }>
  const formatStatusLine = (line: string) =>
    snapshotOverrides.statusHeader && !line.trim().startsWith('•')
      ? `• ${line}`
      : line

  const [attendedCount, totalBookedCount, accessState, upcomingZoom] = await Promise.all([
    prisma.zoomSessionAttendee.count({
      where: { userId: input.userId, attended: true },
    }),
    prisma.zoomSessionAttendee.count({
      where: { userId: input.userId },
    }),
    getUserAccessState(input.userId),
    getUpcomingZoomBookingView(input.userId),
  ])

  const subscriptionLine = accessState.isActive
    ? absystemContent.TELEGRAM_COPY.RESULT_SNAPSHOT.subscriptionActiveLabel(
        `<b>${accessState.expiresAt?.toLocaleDateString('uk-UA', { timeZone: 'Europe/Kyiv' }) ?? 'без кінцевої дати'}</b>`,
      )
    : snapshotOverrides.subscriptionInactiveLabel ??
      absystemContent.TELEGRAM_COPY.RESULT_SNAPSHOT.subscriptionInactiveLabel

  const zoomLine =
    upcomingZoom?.isMyBooking === true
      ? `Zoom-практики: ти вже записана на ${upcomingZoom.scheduledAt.toLocaleDateString(
          'uk-UA',
          {
            day: 'numeric',
            month: 'long',
            timeZone: 'Europe/Kyiv',
          },
        )}`
      : totalBookedCount > 0
        ? absystemContent.TELEGRAM_COPY.RESULT_SNAPSHOT.zoomAttendedLabel(
            attendedCount,
            totalBookedCount,
          )
        : snapshotOverrides.zoomNotBookedLabel ??
          absystemContent.TELEGRAM_COPY.RESULT_SNAPSHOT.zoomNotBookedLabel

  const nextStep =
    !accessState.isActive
      ? snapshotOverrides.nextStepNoAccess ??
        absystemContent.TELEGRAM_COPY.RESULT_SNAPSHOT.nextStepNoAccess
      : upcomingZoom && !upcomingZoom.isMyBooking
        ? absystemContent.TELEGRAM_COPY.RESULT_SNAPSHOT.nextStepZoom(
            upcomingZoom.scheduledAt.toLocaleDateString('uk-UA', {
              day: 'numeric',
              month: 'long',
              timeZone: 'Europe/Kyiv',
            }),
          )
        : upcomingZoom?.isMyBooking
          ? absystemContent.TELEGRAM_COPY.RESULT_SNAPSHOT.nextStepBooked
          : absystemContent.TELEGRAM_COPY.RESULT_SNAPSHOT.nextStepZoomGeneric

  const liveQuestionLines =
    upcomingZoom?.isMyBooking && upcomingZoom.myQuestion
      ? [
          '',
          '<b>Твоя точка фокусу:</b>',
          `«${upcomingZoom.myQuestion.text}»`,
          `Питання №${upcomingZoom.myQuestion.position} у черзі`,
        ]
      : []

  const text = [
    snapshotCopy.title,
    '',
    snapshotCopy.quote,
    '',
    ...(snapshotOverrides.statusHeader ? [snapshotOverrides.statusHeader] : []),
    formatStatusLine(zoomLine),
    formatStatusLine(subscriptionLine),
    ...liveQuestionLines,
    '',
    nextStep,
  ].join('\n')

  await sendTelegramMessage(
    ctx,
    input.chatId,
    {
      text,
      parseMode: 'HTML',
    },
    {
      replyMarkup: {
        inline_keyboard: buildResultPreviewKeyboardForBookingState({
          resultKey: input.resultKey,
          isMyBooking: upcomingZoom?.isMyBooking === true,
        }).inline_keyboard,
      },
    },
  ).catch((error) => {
    console.error('[sendResultSnapshot] failed', {
      userId: input.userId,
      resultKey: input.resultKey,
      error,
    })
  })
}

export async function dispatchAbTestPracticeSequence(
  ctx: Context,
  input: {
    chatId: string | number
    resultKey: AbTestResultKey
    firstName?: string | null
  }
): Promise<void> {
  const resultDef = getAbTestResultDefinition(input.resultKey)
  const practiceBlocks = interpolateFirstNameInBlocks(
    resultDef.blocks?.practice ?? [],
    input.firstName
  )
  const reviewBlocks = interpolateFirstNameInBlocks(
    resultDef.blocks?.review ?? [],
    input.firstName
  )
  const pricingBlocks = interpolateFirstNameInBlocks(
    resultDef.blocks?.pricing ?? [],
    input.firstName
  )
  const reviewSequence = splitReviewSequence(reviewBlocks)

  await sendTypingBeforeBlocks(ctx, input.chatId, practiceBlocks.slice(0, 1))
  await sendTelegramContentChunk(
    ctx,
    input.chatId,
    'Як це виглядає зсередини?',
    practiceBlocks,
    {
      parseMode: 'HTML',
      separateBlocks: true,
      pauseMsBetweenBlocks: buildPracticeBlockPausePlan(practiceBlocks),
    }
  )
  console.info('[FOCUS_DESCRIPTION_SENT]', {
    userId: null,
    segment: input.resultKey,
    messageId: null,
    callback: `show_inside_${input.resultKey.toUpperCase()}`,
  })

  if (reviewSequence.message.length) {
    await pauseBetweenPracticeSections()
    await sendTypingBeforeBlocks(ctx, input.chatId, reviewSequence.message)
    await sendTelegramContentChunk(
      ctx,
      input.chatId,
      '',
      reviewSequence.message,
      {
        parseMode: 'HTML',
      }
    )
  }

  if (reviewSequence.screenshot.length) {
    await pauseBetweenPracticeSections()
    await sendTypingBeforeBlocks(ctx, input.chatId, reviewSequence.screenshot)
    await sendTelegramContentChunk(
      ctx,
      input.chatId,
      '',
      reviewSequence.screenshot,
      {
        parseMode: 'HTML',
      }
    )
  }

  await pauseBetweenPracticeSections()
  await sendTypingBeforeBlocks(ctx, input.chatId, pricingBlocks.slice(0, 1))
  await sendTelegramContentChunk(
    ctx,
    input.chatId,
    'Формат участі',
    pricingBlocks,
    {
      inlineKeyboard: {
        inline_keyboard: [
          [
            {
              text: AB_TEST_OPEN_FOCUS_BUTTON_TEXT,
              callback_data: 'open_focus_payment',
            },
            {
              text: AB_TEST_CHOOSE_ZOOM_BUTTON_TEXT,
              web_app: { url: buildZoomCalendarUrl({ intent: RESULT_ZOOM_BOOKING_INTENT }) },
            },
          ],
        ],
      },
      parseMode: 'HTML',
    }
  )
  console.info('[FOCUS_OFFER_SENT]', {
    chatId: String(input.chatId),
    resultKey: input.resultKey,
    callbackData: 'open_focus_payment',
    zoomWebAppUrl: buildZoomCalendarUrl({ intent: RESULT_ZOOM_BOOKING_INTENT }),
  })
}


async function sendTelegramHtmlCard(
  ctx: Context,
  transition: string,
  title: string,
  lines: string[],
  inlineKeyboard?: InlineKeyboardMarkup,
  options?: {
    separateBlocks?: boolean
  }
): Promise<void> {
  const chatId = ctx.chat?.id ?? ctx.from?.id
  if (!chatId) return

  const sourceBlocks = splitTelegramContentBlocks(lines)
  const chunks = options?.separateBlocks
    ? sourceBlocks.map((block) => [block])
    : packTelegramContentBlocks(sourceBlocks, TELEGRAM_CONTENT_MAX_CHARS)
  if (options?.separateBlocks) {
    for (let index = 0; index < chunks.length; index += 1) {
      if (index === 0) {
        await ctx.telegram
          .sendChatAction(chatId, 'typing')
          .catch(() => undefined)
      } else {
        await sleep(3000)
        await ctx.telegram
          .sendChatAction(chatId, 'typing')
          .catch(() => undefined)
      }
      await sendTelegramContentChunk(
        ctx,
        chatId,
        index === 0 ? title : '',
        chunks[index],
        {
          inlineKeyboard:
            index === chunks.length - 1 ? inlineKeyboard : undefined,
          parseMode: 'HTML',
          separateBlocks: true,
        }
      )
    }

    console.info('[AB_TEST_RESULT_SEND_OK]', {
      transition,
      chatId: String(chatId),
    })
    return
  }

  for (let index = 0; index < chunks.length; index += 1) {
    if (index === 0) {
      await ctx.telegram.sendChatAction(chatId, 'typing').catch(() => undefined)
    } else {
      await sleep(3000)
      await ctx.telegram.sendChatAction(chatId, 'typing').catch(() => undefined)
    }
    await sendTelegramContentChunk(
      ctx,
      chatId,
      index === 0 ? title : '',
      chunks[index],
      {
        inlineKeyboard:
          index === chunks.length - 1 ? inlineKeyboard : undefined,
        parseMode: 'HTML',
      }
    )
  }

  console.info('[AB_TEST_RESULT_SEND_OK]', {
    transition,
    chatId: String(chatId),
  })
}


function normalizeResultReviewScreenshot(
  resultKey: AbTestResultKey,
  lines: string[]
): string[] {
  const screenshotKeyByResult: Record<AbTestResultKey, AbTestScreenshotKey> = {
    state: 'state_review',
    goal: 'goal_review',
    choice: 'choice_review',
    decision: 'decision_review',
    action: 'action_review_1',
  }

  const screenshotMarker = buildAbTestScreenshotMarker(
    screenshotKeyByResult[resultKey]
  )

  return lines.map((line) =>
    line.includes('📸 **[СКРІН]**') ? screenshotMarker : line
  )
}

export async function renderAbTestFocusOffer(
  ctx: Context,
  userId: string,
  progress: AbTestProgress
) {
  if (!progress.result_key) {
    return
  }

  const chatId = ctx.chat?.id ?? ctx.from?.id
  if (!chatId) {
    return
  }

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { firstName: true, telegramUserName: true },
  })
  const version = progress.started_at
    ? resolveTestDriveVersion(progress.started_at)
    : 'legacy'
  const copy = resolveAbTestFollowupCopy(
    'DOJIM_0_IMMEDIATE',
    progress.result_key,
    version,
    {
      firstName: resolveFirstName(user, ctx, userId),
    }
  )
  const focusBlocks =
    copy.blocks ?? splitTelegramContentBlocks(copy.body.split('\n'))
  const hasPreviewClick = await hasTelegramCtaInteraction(
    userId,
    `show_inside_${progress.result_key.toUpperCase()}`
  )
  const inlineKeyboard = [
    [
      {
        text: copy.cta ?? AB_TEST_FOCUS_JOIN_CTA_MULTILINE_TEXT,
        callback_data: 'open_focus_payment',
      },
    ],
    ...(hasPreviewClick
      ? []
      : [
          [
            {
              text: AB_TEST_SHOW_INSIDE_CTA_TEXT,
              callback_data: `show_inside_${progress.result_key.toUpperCase()}`,
            },
          ],
        ]),
  ]

  await sendTelegramContentChunk(ctx, chatId, copy.title, focusBlocks, {
    inlineKeyboard: {
      inline_keyboard: inlineKeyboard,
    },
    parseMode: 'HTML',
    separateBlocks: true,
  })

  await testOrchestrator.onDojimSequenceComplete(userId).catch(() => undefined)
}

export async function renderAbTestResultThenOffer(
  ctx: Context,
  userId: string,
  progress: AbTestProgress,
  options: { typing?: boolean } = {}
) {
  if (options.typing ?? true) {
    await sleep(1000)
  }
  await renderAbTestPostEmailSubmitSequence(ctx, userId, progress)
}

export async function renderAbTestPostEmailSubmitSequence(
  ctx: Context,
  userId: string,
  progress: AbTestProgress,
  options: {
    notifyOps?: boolean
    forceRedelivery?: boolean
    trigger?: string
  } = {}
) {
  const chatId = ctx.chat?.id ?? ctx.from?.id
  if (!chatId) return

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { firstName: true, telegramUserName: true },
  })

  const resultKey = String(
    progress.result_key ?? ''
  ).toLowerCase() as AbTestResultKey
  const firstName = resolveFirstName(user, ctx, userId)
  const shouldSkipRedelivery =
    !options.forceRedelivery &&
    progress.status === 'completed' &&
    progress.email_stage !== 'pending' &&
    Boolean(progress.result_opened_at)
  const callbackData =
    ctx.callbackQuery && 'data' in ctx.callbackQuery && typeof ctx.callbackQuery.data === 'string'
      ? ctx.callbackQuery.data.trim()
      : ''
  const trigger =
    options.trigger ??
    (callbackData || 'text_message')
  const dedupeKey = `${userId}:S3_TEST_RESULT:result_sequence`

  console.info('[RESULT_FLOW]', {
    step: shouldSkipRedelivery
      ? 'post_email_sequence_skipped_duplicate'
      : 'post_email_sequence_dispatching',
    userId,
    chatId: String(chatId),
    resultKey,
    emailStage: progress.email_stage,
    resultOpenedAt: progress.result_opened_at,
    forceRedelivery: options.forceRedelivery ?? false,
    trigger,
  })
  console.info('[AB_TEST_S3_TRACE]', {
    userId,
    updateId: ctx.update?.update_id ?? null,
    currentState: progress.stage,
    trigger,
    sender: 'renderAbTestPostEmailSubmitSequence',
    messageType: 'result_sequence',
    orderReference: null,
    sessionId: null,
    dedupeKey,
    deliveryResult: shouldSkipRedelivery ? 'skipped_duplicate' : 'dispatching',
  })

  if (shouldSkipRedelivery) {
    return
  }

  const deliveryClaim = await withRuntimeAdvisoryLock({
    scope: 'ab_test_delivery',
    type: 'S3_TEST_RESULT',
    source: 'telegram',
    userId,
    state: 'S3_TEST_RESULT',
  }, async () => {
    const persistedProgress = await loadAbTestProgress(userId)
    if (persistedProgress.result_opened_at) {
      return {
        outcome: 'duplicate' as const,
        progress: persistedProgress,
      }
    }

    const nextProgress = buildAbTestProgressPatch(persistedProgress, {
      result_opened_at: new Date().toISOString(),
      last_event_at: new Date().toISOString(),
    })
    const scheduledProgress = await scheduleFollowups(
      userId,
      nextProgress,
      'S4_FOCUS_INVITE'
    )
    const savedProgress = await saveAbTestProgress(userId, scheduledProgress)

    return {
      outcome: 'claimed' as const,
      progress: savedProgress,
    }
  })

  if (!deliveryClaim.acquired) {
    console.info('[RESULT_FLOW]', {
      step: 'post_email_sequence_race_condition_skipped',
      userId,
      chatId: String(chatId),
      resultKey,
    })
    console.info('[AB_TEST_S3_TRACE]', {
      userId,
      updateId: ctx.update?.update_id ?? null,
      currentState: progress.stage,
      trigger,
      sender: 'renderAbTestPostEmailSubmitSequence',
      messageType: 'result_sequence',
      orderReference: null,
      sessionId: null,
      dedupeKey,
      deliveryResult: 'skipped_race_condition',
    })
    return
  }

  if (deliveryClaim.value.outcome === 'duplicate') {
    console.info('[RESULT_FLOW]', {
      step: 'post_email_sequence_skipped_duplicate',
      userId,
      chatId: String(chatId),
      resultKey,
    })
    console.info('[AB_TEST_S3_TRACE]', {
      userId,
      updateId: ctx.update?.update_id ?? null,
      currentState: deliveryClaim.value.progress.stage,
      trigger,
      sender: 'renderAbTestPostEmailSubmitSequence',
      messageType: 'result_sequence',
      orderReference: null,
      sessionId: null,
      dedupeKey,
      deliveryResult: 'skipped_duplicate',
    })
    return
  }

  if (deliveryClaim.value.outcome === 'claimed') {
    await trackAbTestEvent({
      userId,
      type: 'RESULT_OPENED',
      state: 'S3_TEST_RESULT',
      payload: {
        result_key: resultKey,
        delivery_source: options.forceRedelivery ? 'forced_redelivery' : 'post_email',
      } satisfies Prisma.JsonObject,
    })
  }

  await dispatchAbTestResultSequence(ctx, {
    chatId,
    userId,
    resultKey,
    firstName,
    deliverySource: 'post_email',
    notifyOps: options.notifyOps ?? true,
  })

  console.info('[AB_TEST_SKIP_DIRECT_RESULT_OK]', {
    userId,
    chatId: String(chatId),
    resultKey,
  })
  console.info('[AB_TEST_S3_TRACE]', {
    userId,
    updateId: ctx.update?.update_id ?? null,
    currentState: 'S3_TEST_RESULT',
    trigger,
    sender: 'renderAbTestPostEmailSubmitSequence',
    messageType: 'result_sequence',
    orderReference: null,
    sessionId: null,
    dedupeKey,
    deliveryResult: 'sent',
  })
}

export async function renderAbTestEmailGate(
  ctx: Context,
  userId: string,
  progress: AbTestProgress
) {
  const profileEmail = await getAbTestProfileEmail(userId)
  console.info('[AB_TEST_Q8_TRACE] result_render_blocked_by_email_gate', {
    userId,
    resultKey: progress.result_key,
    emailStage: progress.email_stage,
  })
  const chatId = ctx.chat?.id ?? ctx.from?.id
  if (!chatId) {
    return
  }

  await sendTelegramMessage(
    ctx,
    chatId,
    {
      text: buildAbTestEmailGateMessage(profileEmail),
      parseMode: 'HTML',
    },
    {
      replyMarkup: {
        inline_keyboard: [
          ...(profileEmail
            ? [
                [
                  {
                    text: 'ТАК, ЦЕ МІЙ EMAIL',
                    callback_data: 'confirm_profile_email_for_result',
                  },
                ],
                [
                  {
                    text: 'ЗМІНИТИ EMAIL',
                    callback_data: 'change_email_for_result',
                  },
                ],
              ]
            : []),
          [{ text: 'ПРОПУСТИТИ', callback_data: 'skip_email_before_result' }],
        ],
      },
    },
  )
  await setPendingTelegramIdentity({
    chatId: String(chatId),
    telegramUserId: String(ctx.from?.id ?? ''),
    telegramUserName: ctx.from?.username ?? null,
    firstName: ctx.from?.first_name ?? null,
    source: 'email_after_test',
    requestId: null,
  })
}

export async function renderCurrentView(
  ctx: Context,
  userId: string,
  progress: AbTestProgress
) {
  if (progress.status !== 'completed') {
    const uiSettings = await loadUserUiSettings(userId)
    progress = getAbTestProgressFromUiSettings(uiSettings)
  }

  if (progress.status === 'completed' && progress.result_key) {
    if (progress.email_stage === 'pending') {
      await renderAbTestEmailGate(ctx, userId, progress)
      return
    }
    await renderAbTestPostEmailSubmitSequence(ctx, userId, progress)

    return
  }

  const activeIndex = progress.answers.length
  const questionOrder = resolveAbTestQuestionOrder()
  const questionId =
    questionOrder[Math.min(activeIndex, questionOrder.length - 1)] ?? 'q1'
  const question = getAbTestQuestion(questionId)
  const next = buildAbTestProgressPatch(progress, {
    stage: 'S2_TEST_QUESTIONS',
    current_question_id: question.question_id,
    last_event_at: new Date().toISOString(),
    last_message_key: question.message_key,
  })

  await saveAbTestProgress(userId, next)
  await trackAbTestEvent({
    userId,
    type: 'AB_TEST_QUESTION_OPENED',
    state: next.stage,
    payload: {
      question_id: question.question_id,
      message_key: question.message_key,
      current_question_index: resolveAbTestQuestionOrder().indexOf(
        question.question_id
      ),
    } satisfies Prisma.JsonObject,
  })

  await sendQuestionDirect(ctx, question.question_id, next.revision)
}

// ============================================================================
// SEND QUESTION DIRECT
// ============================================================================

export async function sendQuestionDirect(
  ctx: Context,
  questionId: string,
  revision: number
): Promise<void> {
  const chatId = ctx.chat?.id ?? ctx.from?.id
  if (!chatId) return
  
  const { getAbTestQuestion } = await import('../content/abTest.questions.js')
  const { resolveAbTestQuestionOrder } = await import('../../../core/state-machine/abTestFoundation.js')
  
  const question = getAbTestQuestion(questionId as any)
  const questionOrder = resolveAbTestQuestionOrder()
  const questionNumber = questionOrder.indexOf(question.question_id) + 1
  
  await sendTelegramMessage(
    ctx,
    chatId,
    {
      text: joinBlocks([
        bold(`Питання ${questionNumber} з ${questionOrder.length}`),
        bold(question.prompt),
        escapeTelegramHtml(formatMobileAnswerListForMessage(question.answers)),
      ]),
      parseMode: 'HTML',
    },
    {
      replyMarkup: {
        inline_keyboard: [
          question.answers.map((answer) => ({
            text: formatMobileAnswerButtonText(answer.text),
            callback_data: `ab_test_answer:${question.question_id}:${answer.id}:${revision}`,
          })),
        ],
      },
    },
  )
}
