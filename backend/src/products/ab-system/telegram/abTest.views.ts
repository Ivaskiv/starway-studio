//backend/src/products/ab-system/telegram/abTest.views.ts
import type { Prisma } from '@starway/db/prisma-client'
import type { Context } from 'telegraf'
import type { InlineKeyboardMarkup } from 'telegraf/types'
import { hasTelegramCtaInteraction } from '@/modules/telegram-mentor/services/ctaInteraction.service.js'
import { absystemButtons } from '@/products/absystem/config/absystem.content.js'
import { coachBot, sendOpsTelegramMessage } from '../../../lib/telegram.js'
// import { buildBehavioralSnapshot } from '../../../core/behavioral/behavioralSnapshot.js'
import { buildAbTestQuestionFlow } from '../../../core/flow-builder/flowBuilder.js'
import { testOrchestrator } from '../../../core/orchestrator/testOrchestrator.js'
import {
  AB_TEST_UI_SETTINGS_KEY,
  buildAbTestProgressPatch,
  resolveAbTestQuestionOrder,
  type AbTestProgress,
} from '../../../core/state-machine/abTestFoundation.js'
import { resolveCanonicalMessageKeyByTestEvent } from '../../../core/state-machine/ctaFoundation.js'
import { resolveCanonicalTestResult } from '../../../core/state-machine/testFoundation.js'
import { deliverTelegramFlow } from '../../../core/transport/telegramTransport.js'
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
  AB_TEST_BOLD_LINES,
  AB_TEST_FINAL_CTA_PROMPT,
  AB_TEST_REVIEW_HEADERS,
  AB_TEST_FOCUS_BENEFIT_HEADER,
  AB_TEST_FOCUS_CTA_TEXT,
  AB_TEST_FOCUS_INCLUDED_HEADER,
  AB_TEST_FOCUS_JOIN_CTA_MULTILINE_TEXT,
  AB_TEST_FOCUS_OPENING_LINES,
  AB_TEST_PRACTICE_PREVIEW_PROMPT,
  AB_TEST_FOCUS_PRACTICE_TITLE,
  AB_TEST_SHOW_INSIDE_CTA_TEXT,
  AB_TEST_SCREENSHOT_URLS,
  AB_TEST_VOICE_NOTE_HEADER,
  AB_TEST_VOICE_MESSAGE_PROMPT,
  AB_TEST_VOICE_NOTE_LINK_TEXT,
  buildAbTestScreenshotMarker,
  telegramBlock,
  type TelegramContentBlock,
  type AbTestScreenshotKey,
} from '../content/abTest.shared.js'
import { trackAbTestEvent } from './abTest.analytics.js'
import {
  buildWebAppButton,
  resolveBrowserTestUrlOrNull,
} from './abTest.buttons.js'
import {
  buildAbTestEmailGateMessage,
  getAbTestProfileEmail,
  getAbTestProgressFromUiSettings,
  getUiSettings,
  loadUserUiSettings,
  saveAbTestProgress,
} from './abTest.progress.js'

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

function shouldBoldAbTestLine(normalized: string): boolean {
  return AB_TEST_BOLD_LINES.has(normalized)
}

function renderInlineBoldMarkdown(value: string): string {
  const parts = value.split(/(\*\*[\s\S]+?\*\*)/g)

  return parts
    .map((part) => {
      if (part.startsWith('**') && part.endsWith('**') && part.length > 4) {
        return `<b>${escapeHtml(part.slice(2, -2))}</b>`
      }

      return escapeHtml(part)
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
  return AB_TEST_REVIEW_HEADERS.includes(normalized as (typeof AB_TEST_REVIEW_HEADERS)[number])
}

function extractScreenshotKey(normalized: string): AbTestScreenshotKey | null {
  const match = normalized.match(/^📸 \[СКРІН — ([a-z0-9_]+)\]$/i)
  if (!match) return null
  const key = match[1] as AbTestScreenshotKey
  return AB_TEST_SCREENSHOT_URLS[key] ? key : null
}

const AB_TEST_PROOF_PREFIXES = [...AB_TEST_REVIEW_HEADERS]

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

  const hasMedia = blocks.some((block) =>
    block.type === 'image' || block.type === 'audio' || block.type === 'video',
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
  blocks: TelegramContentBlock[],
): Promise<void> {
  await ctx.telegram.sendChatAction(chatId, 'typing').catch(() => undefined)
  await sleep(resolveTypingDelayMs(blocks))
}

function splitReviewSequence(
  blocks: TelegramContentBlock[],
): {
  header: TelegramContentBlock[]
  quote: TelegramContentBlock[]
  screenshot: TelegramContentBlock[]
} {
  return {
    header: blocks.filter((block) => block.type === 'text' || block.type === 'pricing' || block.type === 'cta').slice(0, 1),
    quote: blocks.filter((block) => block.type === 'quote'),
    screenshot: blocks.filter((block) => block.type === 'image'),
  }
}

function interpolateFirstNameInBlocks(
  blocks: TelegramContentBlock[],
  firstName?: string | null,
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

export function splitTelegramLines(lines: string[], maxChars = TELEGRAM_CONTENT_MAX_CHARS): string[][] {
  const blocks = splitTelegramContentBlocks(lines)
  return packTelegramContentBlocks(blocks, maxChars).map((chunk) =>
    chunk.flatMap((block) => {
      if (block.type === 'image' || block.type === 'video' || block.type === 'audio') {
        return block.caption ? [block.caption, ''] : []
      }
      return block.text.split('\n').flatMap((line) => [line, ''])
    }),
  )
}

export function splitTelegramContentBlocks(lines: string[]): TelegramContentBlock[] {
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
      blocks.push(telegramBlock.audio(AB_TEST_AUDIO_URL, normalized))
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
  maxChars = TELEGRAM_CONTENT_MAX_CHARS,
): TelegramContentBlock[][] {
  const chunks: TelegramContentBlock[][] = []
  let current: TelegramContentBlock[] = []
  let currentLength = 0

  for (const block of blocks) {
    if (block.type === 'quote' || block.type === 'audio' || block.type === 'image' || block.type === 'video') {
      if (current.length) {
        chunks.push(current)
        current = []
        currentLength = 0
      }
      chunks.push([block])
      continue
    }

    const rendered = renderTelegramContentBlock(block)
    const nextLength = currentLength + rendered.length + (current.length > 0 ? 2 : 0)

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
    return `<blockquote>${renderInlineBoldMarkdown(clean)}</blockquote>`
  }

  if (normalized.startsWith('· ')) {
    return `• ${renderInlineBoldMarkdown(normalized.slice(2))}`
  }

  if (normalized === AB_TEST_VOICE_NOTE_HEADER) {
    return `<b>${escapeHtml(normalized)}</b>`
  }

  if (normalized === AB_TEST_VOICE_NOTE_LINK_TEXT) {
    return ''
  }

  if (/^\*[^*].*[^*]\*$/.test(normalized)) {
    return `<b>${escapeHtml(normalized.slice(1, -1))}</b>`
  }

  if (shouldBoldAbTestLine(normalized)) {
    return `<b>${renderInlineBoldMarkdown(normalized)}</b>`
  }

  return renderInlineBoldMarkdown(normalized)
}

export function formatAbTestTelegramCard(
  title: string,
  lines: string[],
): string {
  const body = renderTelegramContentBlocks(splitTelegramContentBlocks(lines))
  return title ? `<b>${escapeHtml(title)}</b>\n\n${body}` : body
}

export function renderTelegramContentMessage(
  title: string,
  blocks: TelegramContentBlock[],
): string {
  const body = renderTelegramContentBlocks(blocks)
  return title ? `<b>${escapeHtml(title)}</b>\n\n${body}` : body
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
  return block.type === 'image' || block.type === 'video' || block.type === 'audio'
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
  }
): Promise<void> {
  const mediaBlock = resolveSingleMediaBlock(blocks)

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
      caption: mediaBlock.caption,
      reply_markup: options?.inlineKeyboard,
    })
    return
  }

  if (mediaBlock?.type === 'audio') {
    await ctx.telegram.sendVoice(chatId, mediaBlock.assetKey, {
      caption: mediaBlock.caption,
      reply_markup: options?.inlineKeyboard,
    })
    return
  }

  if (mediaBlock?.type === 'video') {
    await ctx.telegram.sendVideo(chatId, mediaBlock.assetKey, {
      caption: mediaBlock.caption,
      reply_markup: options?.inlineKeyboard,
    })
    return
  }

  const hasMedia = blocks.some(
    (block) => block.type === 'image' || block.type === 'video' || block.type === 'audio'
  )
  if (hasMedia && blocks.length > 1) {
    for (let index = 0; index < blocks.length; index += 1) {
      await sendTelegramContentChunk(
        ctx,
        chatId,
        index === 0 ? title : '',
        [blocks[index]],
        {
          inlineKeyboard: index === blocks.length - 1 ? options?.inlineKeyboard : undefined,
          parseMode: options?.parseMode ?? 'HTML',
        }
      )
    }
    return
  }

  if (options?.separateBlocks && blocks.length > 1) {
    for (let index = 0; index < blocks.length; index += 1) {
      await sendTelegramContentChunk(
        ctx,
        chatId,
        index === 0 ? title : '',
        [blocks[index]],
        {
          inlineKeyboard: index === blocks.length - 1 ? options.inlineKeyboard : undefined,
          parseMode: options.parseMode ?? 'HTML',
        }
      )
    }
    return
  }

  await ctx.telegram.sendMessage(chatId, renderedMessage, {
    parse_mode: options?.parseMode ?? 'HTML',
    reply_markup: options?.inlineKeyboard,
  })
}

function renderTelegramContentBlocks(blocks: TelegramContentBlock[]): string {
  return blocks.map(renderTelegramContentBlock).join('\n\n')
}

function renderTelegramContentBlock(block: TelegramContentBlock): string {
  if (block.type === 'quote') {
    return `<blockquote>${renderInlineBoldMarkdown(block.text.replace(/^"|"$/g, '').replace(/^«|»$/g, '').trim())}</blockquote>`
  }

  if (block.type === 'image' || block.type === 'video' || block.type === 'audio') {
    return block.caption ? renderInlineBoldMarkdown(block.caption) : ''
  }

  if (block.type === 'pricing' || block.type === 'cta') {
    return `<b>${renderInlineBoldMarkdown(block.text)}</b>`
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
  const text = `<b>${escapeHtml(question.prompt)}</b>`

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

export async function renderAbTestCompletedResult(
  ctx: Context,
  userId: string,
  progress: AbTestProgress
) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { firstName: true, telegramUserName: true, settings: true },
  })
  console.info('[AB_TEST_Q8_TRACE] result_render_entered', {
    userId,
    resultKey: progress.result_key,
    emailStage: progress.email_stage,
  })
  const resolvedAnswers = progress.answers.flatMap((item) => {
    const answer = getAbTestAnswer(item.question_id, item.answer_id)
    return answer
      ? [
          {
            category: answer.category as any,
            text: answer.text,
            score: answer.score,
            questionId: item.question_id,
            answerId: item.answer_id,
          },
        ]
      : []
  })

  // const snapshot = buildBehavioralSnapshot({ answers: resolvedAnswers })
  const canonicalResult = resolveCanonicalTestResult(
    progress.answers.map((answer) => ({
      questionId: answer.question_id,
      answerId: answer.answer_id,
    }))
  )
  const dominantBlock = canonicalResult.type
  // const prompt = await PromptProvider.getPrompt(
  //   `test.result.${String(dominantBlock).toLowerCase()}`,
  //   {
  //     userName: user?.firstName || 'Сяюча зірка',
  //     unresolvedGoal: snapshot.unresolvedGoal || '',
  //     dominantBlock: String(dominantBlock),
  //   }
  // )
  const next = buildAbTestProgressPatch(progress, {
    result_opened_at: progress.result_opened_at ?? new Date().toISOString(),
    last_event_at: new Date().toISOString(),
    last_message_key: resolveCanonicalMessageKeyByTestEvent('RESULT_OPENED'),
  })

  await prisma.user.update({
    where: { id: userId },
    data: {
      currentStep: 'START_FLOW',
      settings: {
        ...getUiSettings(user?.settings),
        ui: {
          ...getUiSettings(getUiSettings(user?.settings).ui),
          dominantBlock,
          [AB_TEST_UI_SETTINGS_KEY]: next,
        },
      } as Prisma.InputJsonValue,
    },
  })

  await trackAbTestEvent({
    userId,
    type: 'AB_TEST_RESULT_OPENED',
    state: next.stage,
    payload: {
      result_key: next.result_key,
      dominantBlock,
      // prompt_source: prompt.source,
    } satisfies Prisma.JsonObject,
  })

  const resultKey = dominantBlock.toLowerCase() as AbTestResultKey
  const resultDef = getAbTestResultDefinition(resultKey)
  const firstName = user?.firstName ?? user?.telegramUserName ?? null
  const chatId = ctx.chat?.id ?? ctx.from?.id
  if (!chatId) {
    return
  }

  const resultBody = interpolateFirstName(resultDef.msg1, firstName)
  const resultBlocks = resultDef.blocks?.intro
    ? interpolateFirstNameInBlocks(resultDef.blocks.intro, firstName)
    : splitTelegramContentBlocks(resultBody.split('\n'))
  const hasPreviewClick = await hasTelegramCtaInteraction(
    userId,
    `show_inside_${resultKey.toUpperCase()}`
  )
  const inlineKeyboard = {
    inline_keyboard: [
      ...(hasPreviewClick
        ? []
        : [
            [
              {
                text: AB_TEST_SHOW_INSIDE_CTA_TEXT,
                callback_data: `show_inside_${resultKey.toUpperCase()}`,
              },
            ],
          ]),
      [{ text: 'Хочу у\nФОКУС →', callback_data: 'open_focus_payment' }],
    ],
  }
  const sections = splitResultSections(resultBody)
  const hasAnyResultSection =
    sections.intro.length > 0 ||
    sections.proof.length > 0 ||
    resultDef.msg2.trim().length > 0

  if (!hasAnyResultSection) {
    await ctx.telegram.sendMessage(
      chatId,
      formatAbTestTelegramCard(
        resultDef.title,
        resultBody.trim() ? resultBody.split('\n') : ['Твій результат готовий.']
      ),
      {
        parse_mode: 'HTML',
        reply_markup: inlineKeyboard,
      },
    )

    console.info('[AB_TEST_RESULT_SEND_OK]', {
      transition: 'ab_test_result_fallback',
      chatId: String(chatId),
    })

    return
  }


  if (sections.intro.length) {
    await ctx.telegram.sendChatAction(chatId, 'typing').catch(() => undefined)
    const ctxIntro = {
      ...ctx,
      update: { ...ctx.update, update_id: Date.now() + 1 },
    } as Context
    await sendTelegramContentChunk(ctxIntro, chatId, resultDef.title, resultBlocks, {
      inlineKeyboard,
      parseMode: 'HTML',
      separateBlocks: true,
    })
  }

  const practiceBlocks = resultDef.blocks?.practice
    ? interpolateFirstNameInBlocks(resultDef.blocks.practice, firstName)
    : splitTelegramContentBlocks(interpolateFirstName(resultDef.msg2, firstName).split('\n'))
  if (practiceBlocks.length) {
    await sleep(3000)
    await ctx.telegram.sendChatAction(chatId, 'typing').catch(() => undefined)
    const ctxPractice = {
      ...ctx,
      update: { ...ctx.update, update_id: Date.now() + 2 },
    } as Context
    await sendTelegramContentChunk(ctxPractice, chatId, 'Як це виглядає зсередини?', practiceBlocks, {
      inlineKeyboard,
      parseMode: 'HTML',
      separateBlocks: true,
    })
  }

  const reviewBlocks = resultDef.blocks?.review
    ? interpolateFirstNameInBlocks(resultDef.blocks.review, firstName)
    : splitTelegramContentBlocks(interpolateFirstName(resultDef.msg2_review, firstName).split('\n'))
  if (reviewBlocks.length) {
    await sleep(3000)
    await ctx.telegram.sendChatAction(chatId, 'typing').catch(() => undefined)
    const ctxReview = {
      ...ctx,
      update: { ...ctx.update, update_id: Date.now() + 3 },
    } as Context
    await sendTelegramContentChunk(ctxReview, chatId, 'Відгук після практики', reviewBlocks, {
      inlineKeyboard,
      parseMode: 'HTML',
      separateBlocks: true,
    })
  }

  const pricingBlocks = resultDef.blocks?.pricing
    ? interpolateFirstNameInBlocks(resultDef.blocks.pricing, firstName)
    : splitTelegramContentBlocks(interpolateFirstName(resultDef.msg3_pricing, firstName).split('\n'))
  if (pricingBlocks.length) {
    await sleep(3000)
    await ctx.telegram.sendChatAction(chatId, 'typing').catch(() => undefined)
    const ctxPricing = {
      ...ctx,
      update: { ...ctx.update, update_id: Date.now() + 4 },
    } as Context
    await sendTelegramContentChunk(ctxPricing, chatId, 'Формат і участь', pricingBlocks, {
      inlineKeyboard,
      parseMode: 'HTML',
      separateBlocks: true,
    })
  }
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
  await sendOpsTelegramMessage([
    'AB test result delivered',
    `userId: ${input.userId}`,
    `result: ${input.resultKey}`,
    `messageKey: ${input.messageKey}`,
    `source: ${input.deliverySource}`,
    'blocks: intro, voice, practice, review, pricing, cta',
  ].join('\n'), undefined, {
    messageType: 'ab_test_result_delivered',
    source: 'sendAbTestDeliveryTelemetry',
  }).catch(() => false)

  const coachChatId = String(
    process.env.STARWAY_OPS_CHAT_ID ?? process.env.OPS_TELEGRAM_CHAT_ID ?? '',
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
    `[OPS_ROUTE_DEBUG] messageType=ab_mentor_analytics chatId=${coachChatId} source=sendAbTestDeliveryTelemetry bot=coachBot`,
  )
  await coachBot.telegram.sendMessage(
    coachChatId,
    analyticsText,
  ).then(() => {
    console.info(
      `[OPS_ROUTE_OK] messageType=ab_mentor_analytics chatId=${coachChatId} source=sendAbTestDeliveryTelemetry bot=coachBot`,
    )
  }).catch((error) => {
    console.error(
      `[OPS_ROUTE_ERROR] messageType=ab_mentor_analytics chatId=${coachChatId} source=sendAbTestDeliveryTelemetry bot=coachBot`,
      error,
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
  },
): Promise<void> {
  const resultDef = getAbTestResultDefinition(input.resultKey)
  const introBlocks = resultDef.blocks?.intro
    ? interpolateFirstNameInBlocks(resultDef.blocks.intro, input.firstName)
    : splitTelegramContentBlocks(interpolateFirstName(resultDef.msg1, input.firstName).split('\n'))
  const practiceBlocks = resultDef.blocks?.practice
    ? interpolateFirstNameInBlocks(resultDef.blocks.practice, input.firstName)
    : splitTelegramContentBlocks(interpolateFirstName(resultDef.msg2, input.firstName).split('\n'))
  const reviewBlocks = resultDef.blocks?.review
    ? interpolateFirstNameInBlocks(resultDef.blocks.review, input.firstName)
    : splitTelegramContentBlocks(interpolateFirstName(resultDef.msg2_review, input.firstName).split('\n'))
  const pricingBlocks = resultDef.blocks?.pricing
    ? interpolateFirstNameInBlocks(resultDef.blocks.pricing, input.firstName)
    : splitTelegramContentBlocks(interpolateFirstName(resultDef.msg3_pricing, input.firstName).split('\n'))
  const previewKeyboard: InlineKeyboardMarkup = {
    inline_keyboard: [
      [{ text: AB_TEST_SHOW_INSIDE_CTA_TEXT, callback_data: `show_inside_${input.resultKey.toUpperCase()}` }],
    ],
  }

  await sendTypingBeforeBlocks(ctx, input.chatId, introBlocks)
  await sendTelegramContentChunk(ctx, input.chatId, resultDef.title, introBlocks, {
    parseMode: 'HTML',
    separateBlocks: false,
  })

  await sendTypingBeforeBlocks(ctx, input.chatId, [telegramBlock.text(AB_TEST_VOICE_MESSAGE_PROMPT)])
  await ctx.telegram.sendMessage(input.chatId, AB_TEST_VOICE_MESSAGE_PROMPT)

  await sendTypingBeforeBlocks(ctx, input.chatId, [telegramBlock.audio(AB_TEST_AUDIO_URL, interpolateFirstName(resultDef.msg1_audio, input.firstName))])
  await ctx.telegram.sendVoice(input.chatId, AB_TEST_AUDIO_URL, {
    caption: interpolateFirstName(resultDef.msg1_audio, input.firstName),
  })

  await sendTypingBeforeBlocks(ctx, input.chatId, [telegramBlock.text(AB_TEST_PRACTICE_PREVIEW_PROMPT)])
  await ctx.telegram.sendMessage(input.chatId, AB_TEST_PRACTICE_PREVIEW_PROMPT, {
    reply_markup: previewKeyboard,
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

export async function dispatchAbTestPracticeSequence(
  ctx: Context,
  input: {
    chatId: string | number
    resultKey: AbTestResultKey
    firstName?: string | null
  },
): Promise<void> {
  const resultDef = getAbTestResultDefinition(input.resultKey)
  const practiceBlocks = resultDef.blocks?.practice
    ? interpolateFirstNameInBlocks(resultDef.blocks.practice, input.firstName)
    : splitTelegramContentBlocks(interpolateFirstName(resultDef.msg2, input.firstName).split('\n'))
  const reviewBlocks = resultDef.blocks?.review
    ? interpolateFirstNameInBlocks(resultDef.blocks.review, input.firstName)
    : splitTelegramContentBlocks(interpolateFirstName(resultDef.msg2_review, input.firstName).split('\n'))
  const pricingBlocks = resultDef.blocks?.pricing
    ? interpolateFirstNameInBlocks(resultDef.blocks.pricing, input.firstName)
    : splitTelegramContentBlocks(interpolateFirstName(resultDef.msg3_pricing, input.firstName).split('\n'))
  const reviewSequence = splitReviewSequence(reviewBlocks)

  await sendTypingBeforeBlocks(ctx, input.chatId, practiceBlocks)
  await sendTelegramContentChunk(ctx, input.chatId, 'Як це виглядає зсередини?', practiceBlocks, {
    parseMode: 'HTML',
    separateBlocks: false,
  })

  if (reviewSequence.header.length) {
    await sendTypingBeforeBlocks(ctx, input.chatId, reviewSequence.header)
    await sendTelegramContentChunk(ctx, input.chatId, '', reviewSequence.header, {
      parseMode: 'HTML',
    })
  }

  if (reviewSequence.quote.length) {
    await sendTypingBeforeBlocks(ctx, input.chatId, reviewSequence.quote)
    await sendTelegramContentChunk(ctx, input.chatId, '', reviewSequence.quote, {
      parseMode: 'HTML',
    })
  }

  if (reviewSequence.screenshot.length) {
    await sendTypingBeforeBlocks(ctx, input.chatId, reviewSequence.screenshot)
    await sendTelegramContentChunk(ctx, input.chatId, '', reviewSequence.screenshot, {
      parseMode: 'HTML',
    })
  }

  await sendTypingBeforeBlocks(ctx, input.chatId, pricingBlocks)
  await sendTelegramContentChunk(ctx, input.chatId, 'Формат і участь', pricingBlocks, {
    parseMode: 'HTML',
    separateBlocks: false,
  })

  await sendTypingBeforeBlocks(ctx, input.chatId, [telegramBlock.text(AB_TEST_FINAL_CTA_PROMPT)])
  await ctx.telegram.sendMessage(input.chatId, AB_TEST_FINAL_CTA_PROMPT, {
    reply_markup: {
      inline_keyboard: [
        [{ text: AB_TEST_FOCUS_CTA_TEXT, callback_data: 'open_focus_payment' }],
      ],
    },
  })
}

function escapeHtml(value: string) {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
}

async function sendTelegramHtmlCard(
  ctx: Context,
  transition: string,
  title: string,
  lines: string[],
  inlineKeyboard?: InlineKeyboardMarkup,
  options?: {
    separateBlocks?: boolean
  },
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
        await ctx.telegram.sendChatAction(chatId, 'typing').catch(() => undefined)
      } else {
        await sleep(3000)
        await ctx.telegram.sendChatAction(chatId, 'typing').catch(() => undefined)
      }
      await sendTelegramContentChunk(ctx, chatId, index === 0 ? title : '', chunks[index], {
        inlineKeyboard: index === chunks.length - 1 ? inlineKeyboard : undefined,
        parseMode: 'HTML',
        separateBlocks: true,
      })
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
    await sendTelegramContentChunk(ctx, chatId, index === 0 ? title : '', chunks[index], {
      inlineKeyboard: index === chunks.length - 1 ? inlineKeyboard : undefined,
      parseMode: 'HTML',
    })
  }

  console.info('[AB_TEST_RESULT_SEND_OK]', {
    transition,
    chatId: String(chatId),
  })
}

function splitResultSections(body: string) {
  const lines = body.split('\n')
  const practiceStart = lines.findIndex(
    (line) =>
      line.startsWith(AB_TEST_FOCUS_PRACTICE_TITLE) ||
      line.startsWith('У ФОКУСІ ми якраз працюємо з такими ситуаціями.') ||
      line.startsWith(
        'У ФОКУСІ ми працюємо не з красивими цілями, а з реальними.'
      ) ||
      line.startsWith(
        'У ФОКУСІ ми будемо працювати саме з такими моментами.'
      ) ||
      line.startsWith(
        'У ФОКУСІ ми працюємо з рішеннями через реальні ситуації.'
      ) ||
      line.startsWith(
        'У ФОКУСІ ми не будемо просто говорити про твою ситуацію.'
      )
  )
  const proofStart = lines.findIndex((line) =>
    AB_TEST_PROOF_PREFIXES.some((prefix) => line.startsWith(prefix)) ||
    line.startsWith('📸 [СКРІН — ')
  )

  const introEnd = practiceStart > 0 ? practiceStart : lines.length
  const proofBegin = proofStart > 0 ? proofStart : lines.length

  return {
    intro: lines.slice(0, introEnd),
    practice: practiceStart > 0 ? lines.slice(practiceStart, proofBegin) : [],
    proof: proofStart > 0 ? lines.slice(proofStart) : [],
  }
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
      firstName: user?.firstName ?? user?.telegramUserName ?? null,
    }
  )
  const focusBlocks = copy.blocks ?? splitTelegramContentBlocks(copy.body.split('\n'))
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
  options: { notifyOps?: boolean } = {},
) {
  const chatId = ctx.chat?.id ?? ctx.from?.id
  if (!chatId) return

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { firstName: true, telegramUserName: true },
  })

  const resultKey = String(progress.result_key ?? '').toLowerCase() as AbTestResultKey
  const firstName = user?.firstName ?? user?.telegramUserName ?? null
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

  await ctx.telegram.sendMessage(
    chatId,
    buildAbTestEmailGateMessage(profileEmail),
    {
      parse_mode: 'HTML',
      reply_markup: {
        inline_keyboard: [
          ...(profileEmail
            ? [
                [{ text: 'Так, це мій email', callback_data: 'confirm_profile_email_for_result' }],
                [{ text: 'Змінити email', callback_data: 'change_email_for_result' }],
              ]
            : []),
          [{ text: 'Пропустити', callback_data: 'skip_email_before_result' }],
        ],
      },
    }
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

  const flow = buildAbTestQuestionFlow(
    next,
    question.question_id,
    next.revision
  )
  flow.body = [question.prompt]

  await deliverTelegramFlow(ctx, flow, 'reply')
}
