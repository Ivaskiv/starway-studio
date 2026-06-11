//backend/src/products/ab-system/telegram/abTest.views.ts
import type { Prisma } from '@starway/db/prisma-client'
import type { Context } from 'telegraf'
import type { InlineKeyboardMarkup } from 'telegraf/types'
import { hasTelegramCtaInteraction } from '@/modules/telegram-mentor/services/ctaInteraction.service.js'
import { absystemButtons } from '@/products/absystem/config/absystem.content.js'
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
  type AbTestResultKey,
} from '../content/abTest.results.js'
import {
  AB_TEST_NEONILA_REVIEW_HEADER,
  AB_TEST_VALENTYNA_REVIEW_HEADER,
  AB_TEST_YELYZAVETA_REVIEW_HEADER,
  AB_TEST_KSENIIA_REVIEW_HEADER,
  AB_TEST_SCREENSHOT_URLS,
  AB_TEST_VOICE_NOTE_HEADER,
  AB_TEST_VOICE_NOTE_LINK_TEXT,
  type AbTestScreenshotKey,
} from '../content/abTest.shared.js'
import { resolveTestDriveVersion } from '../content/testDrive.content.js'
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

export const AB_TEST_AUDIO_URL =
  'https://drive.google.com/file/d/12Jj5yk0Qb13pKozSC6Ha_nFNcqlCTA17/view?usp=drive_link'

const AB_TEST_BOLD_LINES = new Set([
  'Тримаєшся з останніх сил.',
  'Мене звати Надя. Вже 3 роки я допомагаю жінкам виходити з цього кола через систему AB System.',
  'Мене звати Надя. Вже 3 роки я допомагаю жінкам знаходити свій напрямок через систему AB System.',
  'Мене звати Надя. Вже 3 роки я допомагаю жінкам робити вибір через систему AB System.',
  'Мене звати Надя. Вже 3 роки я допомагаю жінкам переходити від "знаю але не роблю" до реальних кроків через систему AB System.',
  'AB System — це система з 5 елементів: СТАН, ЦІЛЬ, ВИБІР, РІШЕННЯ, ДІЯ.',
  'Тест показав де саме зупиняєшся ти. Коли це видно — стає зрозуміло що змінити і як іти далі.',
  'Тест показав твою головну точку на зараз.',
  'Я знаю як допомогти тобі це пройти…',
  'Що ти отримуєш у ФОКУСІ:',
  'Що входить у ФОКУС:',
  'Почати можна з одного місяця участі.',
  'Хочеш подивитись, як це проходить на практиці?',
  'Ти активна. Робиш багато. Але ходиш по колу — і сама не розумієш чому нічого не змінюється.',
  'Більше дій — не вихід.',
  'Ти приходиш з тим що робиш але що нікуди не веде.',
  'Замість списку нових дій ти виходиш з одним кроком. Але точним.',
  'Коли рішення не прийняте всередині, дія стає важкою.',
  'Якщо ти відчуваєш, що відкладаєш важливе через нечіткість у цілі, заходь у ФОКУС.',
])

const AB_TEST_BOLD_PREFIXES = [
  'Що відбувається у ФОКУСІ —',
  'У ФОКУСІ ми якраз працюємо з такими ситуаціями.',
  'У ФОКУСІ ми працюємо не з красивими цілями, а з реальними.',
  'У ФОКУСІ ми будемо працювати саме з такими моментами.',
  'У ФОКУСІ ми працюємо з рішеннями через реальні ситуації.',
  'У ФОКУСІ ми не будемо просто говорити про твою ситуацію.',
  'На практиці ми не розбираємо все життя одразу.',
  'Спочатку знаходимо де саме ти зупиняєшся.',
  'Потім бачимо що саме це підтримує.',
  'Після цього визначаємо один конкретний крок який допомагає вийти з цього кола.',
  'Саме тому після практики ти йдеш не з новою інформацією — а з розумінням що робити далі саме тобі у твоїй ситуації.',
  'Ти приходиш зі своєю реальною ситуацією — тим що давно відкладаєш або що не дає спокою.',
  'Ми не розбираємо всю твою історію. Ми беремо одну ситуацію і дивимось що саме там відбувається.',
  'Наприкінці практики ти виходиш з одним кроком. Не списком. Одним — але точним.',
  AB_TEST_KSENIIA_REVIEW_HEADER,
  AB_TEST_NEONILA_REVIEW_HEADER,
  AB_TEST_VALENTYNA_REVIEW_HEADER,
  AB_TEST_YELYZAVETA_REVIEW_HEADER,
]

type TelegramContentBlockKind = 'text' | 'quote' | 'audio' | 'screenshot'

type TelegramContentBlock = {
  kind: TelegramContentBlockKind
  lines: string[]
  screenshotKey?: AbTestScreenshotKey
}

function shouldBoldAbTestLine(normalized: string): boolean {
  return (
    AB_TEST_BOLD_LINES.has(normalized) ||
    AB_TEST_BOLD_PREFIXES.some((prefix) => normalized.startsWith(prefix))
  )
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

function extractScreenshotKey(normalized: string): AbTestScreenshotKey | null {
  const match = normalized.match(/^📸 \[СКРІН — ([a-z0-9_]+)\]$/i)
  if (!match) return null
  const key = match[1] as AbTestScreenshotKey
  return AB_TEST_SCREENSHOT_URLS[key] ? key : null
}

const AB_TEST_PROOF_PREFIXES = [
  AB_TEST_NEONILA_REVIEW_HEADER,
  AB_TEST_VALENTYNA_REVIEW_HEADER,
  AB_TEST_YELYZAVETA_REVIEW_HEADER,
  AB_TEST_KSENIIA_REVIEW_HEADER,
]

export function splitTelegramLines(lines: string[], maxChars = 650): string[][] {
  const blocks = splitTelegramContentBlocks(lines)
  return packTelegramContentBlocks(blocks, maxChars).map((chunk) =>
    chunk.flatMap((block) => (block.lines.length > 0 ? [...block.lines, ''] : [])),
  )
}

export function splitTelegramContentBlocks(lines: string[]): TelegramContentBlock[] {
  const blocks: TelegramContentBlock[] = []
  let currentText: string[] = []

  const flushText = () => {
    const trimmed = currentText.map((line) => line.trim()).filter(Boolean)
    if (trimmed.length) {
      blocks.push({ kind: 'text', lines: trimmed })
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
      const audioLines = [normalized]
      if (next === AB_TEST_VOICE_NOTE_LINK_TEXT) {
        audioLines.push(next)
        index += 1
      }
      blocks.push({ kind: 'audio', lines: audioLines })
      continue
    }

    if (isScreenshotLine(normalized)) {
      flushText()
      const screenshotKey = extractScreenshotKey(normalized)
      if (screenshotKey) {
        blocks.push({ kind: 'screenshot', lines: [], screenshotKey })
      }
      continue
    }

    if (isQuoteLine(normalized)) {
      flushText()
      const quoteLines = [normalized]
      while (index + 1 < lines.length) {
        const next = lines[index + 1].trim()
        if (!next || !isQuoteLine(next)) break
        quoteLines.push(next)
        index += 1
      }
      blocks.push({ kind: 'quote', lines: quoteLines })
      continue
    }

    currentText.push(raw)
  }

  flushText()
  return blocks
}

export function packTelegramContentBlocks(
  blocks: TelegramContentBlock[],
  maxChars = 3000,
): TelegramContentBlock[][] {
  const chunks: TelegramContentBlock[][] = []
  let current: TelegramContentBlock[] = []
  let currentLength = 0

  for (const block of blocks) {
    if (block.kind === 'quote' || block.kind === 'audio' || block.kind === 'screenshot') {
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
    return `<blockquote>${escapeHtml(clean)}</blockquote>`
  }

  if (normalized.startsWith('· ')) {
    return `• ${escapeHtml(normalized.slice(2))}`
  }

  if (normalized === AB_TEST_VOICE_NOTE_HEADER) {
    return `<b>${escapeHtml(normalized)}</b>`
  }

  if (normalized === AB_TEST_VOICE_NOTE_LINK_TEXT) {
    return `<a href="${AB_TEST_AUDIO_URL}">${escapeHtml(AB_TEST_VOICE_NOTE_LINK_TEXT)}</a>`
  }

  if (shouldBoldAbTestLine(normalized)) {
    return `<b>${escapeHtml(normalized)}</b>`
  }

  return escapeHtml(normalized)
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
  if (block.kind !== 'screenshot' || !block.screenshotKey) {
    return null
  }

  return AB_TEST_SCREENSHOT_URLS[block.screenshotKey] ?? null
}

export async function sendTelegramContentChunk(
  ctx: Context,
  chatId: string | number,
  title: string,
  blocks: TelegramContentBlock[],
  options?: {
    inlineKeyboard?: InlineKeyboardMarkup
    parseMode?: 'HTML' | 'Markdown'
  }
): Promise<void> {
  const photoUrl = resolveTelegramContentPhotoUrl(blocks)
  if (photoUrl) {
    await ctx.telegram.sendPhoto(chatId, photoUrl, {
      reply_markup: options?.inlineKeyboard,
    })
    return
  }

  await ctx.telegram.sendMessage(
    chatId,
    renderTelegramContentMessage(title, blocks),
    {
      parse_mode: options?.parseMode ?? 'HTML',
      reply_markup: options?.inlineKeyboard,
    }
  )
}

function renderTelegramContentBlocks(blocks: TelegramContentBlock[]): string {
  return blocks.map(renderTelegramContentBlock).join('\n\n')
}

function renderTelegramContentBlock(block: TelegramContentBlock): string {
  if (block.kind === 'audio') {
    const [header, link] = block.lines
    const rendered = [formatAbTestTelegramLine(header)]
    if (link) {
      rendered.push(formatAbTestTelegramLine(link))
    }
    return rendered.join('\n')
  }

  if (block.kind === 'quote') {
    return block.lines
      .map((line) => formatAbTestTelegramLine(line))
      .join('\n')
  }

  if (block.kind === 'screenshot') {
    return ''
  }

  return block.lines.map((line) => formatAbTestTelegramLine(line)).join('\n\n')
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
  const text = `*${question.prompt}*`

  const answerRow = question.answers.map((answer) => ({
    text:
      selectedAnswerId === answer.id
        ? `✅ ${formatTelegramButtonText(answer.text)}`
        : formatTelegramButtonText(answer.text),
    callback_data: `ab_test_answer:${question.question_id}:${answer.id}:${progress.revision}`,
  }))

  const markup = {
    parse_mode: 'Markdown' as const,
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
        'Markdown'
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
    'Markdown'
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

  const resultBody = interpolateFirstName(resultDef.body, firstName)
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
                text: 'Показати\nяк проходить\nпрактика',
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
    await sendTelegramHtmlCard(
      ctxIntro,
      'ab_test_result_intro',
      resultDef.title,
      sections.intro,
      inlineKeyboard
    )
  }

  const practiceLines = resultDef.msg2.split('\n')
  if (practiceLines.some((line) => line.trim())) {
    await sleep(3000)
    await ctx.telegram.sendChatAction(chatId, 'typing').catch(() => undefined)
    const ctxPractice = {
      ...ctx,
      update: { ...ctx.update, update_id: Date.now() + 2 },
    } as Context
    await sendTelegramHtmlCard(
      ctxPractice,
      'ab_test_result_practice',
      'Як це виглядає зсередини?',
      practiceLines,
      inlineKeyboard
    )
  }

  if (sections.proof.length) {
    await sleep(3000)
    await ctx.telegram.sendChatAction(chatId, 'typing').catch(() => undefined)
    const ctxProof = {
      ...ctx,
      update: { ...ctx.update, update_id: Date.now() + 3 },
    } as Context
    await sendTelegramHtmlCard(
      ctxProof,
      'ab_test_result_proof',
      'Відгук і умови',
      sections.proof,
      inlineKeyboard
    )
  }
}

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms))
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
): Promise<void> {
  const chatId = ctx.chat?.id ?? ctx.from?.id
  if (!chatId) return

  const chunks = packTelegramContentBlocks(splitTelegramContentBlocks(lines))
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
      line.startsWith('Що відбувається у ФОКУСІ —') ||
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
  const hasPreviewClick = await hasTelegramCtaInteraction(
    userId,
    `show_inside_${progress.result_key.toUpperCase()}`
  )
  const inlineKeyboard = [
    [
      {
        text: copy.cta ?? 'Приєднатись до\nФОКУСУ →',
        callback_data: 'open_focus_payment',
      },
    ],
    ...(hasPreviewClick
      ? []
      : [
          [
            {
              text: 'Показати\nяк проходить\nпрактика',
              callback_data: `show_inside_${progress.result_key.toUpperCase()}`,
            },
          ],
        ]),
  ]

  await sendTelegramHtmlCard(
    ctx,
    'ab_test_focus_offer',
    copy.title,
    copy.body.split('\n'),
    {
      inline_keyboard: inlineKeyboard,
    }
  )

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
  progress: AbTestProgress
) {
  const chatId = ctx.chat?.id ?? ctx.from?.id
  if (!chatId) return

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { firstName: true, telegramUserName: true },
  })

  const resultKey = String(progress.result_key ?? '').toLowerCase() as AbTestResultKey
  const resultDef = getAbTestResultDefinition(resultKey)
  const firstName = user?.firstName ?? user?.telegramUserName ?? null
  const resultBody = interpolateFirstName(resultDef.body, firstName)

  const rawLines = resultBody
    .split('\n')
    .filter((line) => !line.trim().startsWith('[КНОПКА:'))
  const resultBlocks = splitTelegramContentBlocks(rawLines)
  if (firstName) {
    resultBlocks.unshift({
      kind: 'text',
      lines: [`${firstName}, ось твій результат.`],
    })
  }
  const chunks = packTelegramContentBlocks(resultBlocks)

  for (let index = 0; index < chunks.length; index += 1) {
    await ctx.telegram.sendChatAction(chatId, 'typing').catch(() => undefined)
    if (index > 0) await sleep(3000)

    await sendTelegramContentChunk(
      ctx,
      chatId,
      index === 0 ? resultDef.title : '',
      chunks[index],
      { parseMode: 'HTML' }
    )
  }

  await sleep(3000)
  await ctx.telegram.sendChatAction(chatId, 'typing').catch(() => undefined)
  await ctx.telegram.sendMessage(
    chatId,
    '<b>Хочеш подивитись, як це проходить на практиці?</b>',
    {
      parse_mode: 'HTML',
    reply_markup: {
      inline_keyboard: [
        [{ text: 'Показати практику', callback_data: `show_inside_${resultKey.toUpperCase()}` }],
        [{ text: 'Хочу у ФОКУС →', callback_data: 'open_focus_payment' }],
      ],
    },
  }
  )

  console.info('[AB_TEST_SKIP_DIRECT_RESULT_OK]', {
    userId,
    chatId: String(chatId),
    resultKey,
    messageKey: resultDef.message_key,
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
          [{ text: 'Пропустити →', callback_data: 'skip_email_before_result' }],
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
