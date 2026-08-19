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
import { QUESTION_LABELS, UI_COPY } from './view-formatting.js'
import { renderAbTestPostEmailSubmitSequence } from './view-post-result.js'

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
