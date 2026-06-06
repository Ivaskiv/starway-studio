import type { Prisma } from '@starway/db/prisma-client'
import type { Context } from 'telegraf'

import { buildBehavioralSnapshot } from '../../../core/behavioral/behavioralSnapshot.js'
import {
  buildAbTestQuestionFlow,
} from '../../../core/flow-builder/flowBuilder.js'
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
import { PromptProvider } from '../../../PromptProvider.js'
import { absystemButtons } from '@/products/absystem/config/absystem.content.js'
import {
  getAbTestAnswer,
  getAbTestQuestion,
  type AbTestQuestionId,
} from '../content/abTest.questions.js'
import {
  getAbTestResultDefinition,
  type AbTestResultKey,
} from '../content/abTest.results.js'
import { resolveAbTestFollowupCopy } from '../content/abTest.followups.js'
import { resolveTestDriveVersion } from '../content/testDrive.content.js'
import { trackAbTestEvent } from './abTest.analytics.js'
import { buildWebAppButton, resolveBrowserTestUrlOrNull } from './abTest.buttons.js'
import {
  getAbTestProgressFromUiSettings,
  getUiSettings,
  ensureAbTestEmailCapturedFromProfile,
  loadUserUiSettings,
  saveAbTestProgress,
} from './abTest.progress.js'
import { planMessage } from '../../../modules/telegram-mentor/conversation/delivery/planDelivery.js'
import { interpolateFirstName } from '../content/abTest.results.js'
import { setPendingTelegramIdentity } from '../../../modules/telegram-mentor/services/pendingIdentity.service.js'

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

export async function sendLogMessage(
  ctx: Context,
  progress: AbTestProgress
): Promise<void> {
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

  // [FIX] removed edit buttons — editing broken, not in ТЗ Block 3
  await planMessage(ctx, 'ctx.reply', 'ab_test_send_log', lines.join('\n'), undefined, 'Markdown')
}

export async function sendActionMessage(
  ctx: Context,
  userId: string,
  progress: AbTestProgress,
  questionIndex: number,
  mode: 'reply' | 'edit' = 'reply'
): Promise<void> {
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

  const answerRows = question.answers.map((answer) => [
    {
      text:
        selectedAnswerId === answer.id
          ? `✅ ${answer.text} (Обрано)`
          : answer.text,
      callback_data: `ab_test_answer:${question.question_id}:${answer.id}:${progress.revision}`,
    },
  ])

  const markup = {
    parse_mode: 'Markdown' as const,
    reply_markup: {
      inline_keyboard: [
        ...answerRows,
        ...(miniAppButton || browserUrl
          ? [[
              ...(miniAppButton ? [miniAppButton] : []),
              ...(browserUrl ? [{ text: UI_COPY.browser, url: browserUrl }] : []),
            ]]
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
        'Markdown',
      )
      return
    } catch {
      // fall through
    }
  }

  await planMessage(ctx, 'ctx.reply', 'ab_test_send_action_reply', text, markup.reply_markup, 'Markdown')
}

export async function renderAbTestCompletedResult(
  ctx: Context,
  userId: string,
  progress: AbTestProgress,
): Promise<void> {
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

  const snapshot = buildBehavioralSnapshot({ answers: resolvedAnswers })
  const canonicalResult = resolveCanonicalTestResult(
    progress.answers.map((answer) => ({
      questionId: answer.question_id,
      answerId: answer.answer_id,
    }))
  )
  const dominantBlock = canonicalResult.type
  const prompt = await PromptProvider.getPrompt(
    `test.result.${String(dominantBlock).toLowerCase()}`,
    {
      userName: user?.firstName || 'Сяюча зірка',
      unresolvedGoal: snapshot.unresolvedGoal || '',
      dominantBlock: String(dominantBlock),
    }
  )
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
      prompt_source: prompt.source,
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
  await ctx.telegram.sendMessage(
    chatId,
    escapeHtml(resultBody),
    {
      parse_mode: 'HTML',
      reply_markup: {
        inline_keyboard: [
          [{ text: 'Хочу у ФОКУС →', callback_data: 'open_focus_payment' }],
          [{ text: 'Як це виглядає зсередини?', callback_data: `show_inside_${resultKey.toUpperCase()}` }],
        ],
      },
    },
  )
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

function escapeHtml(value: string) {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
}

export async function renderAbTestFocusOffer(
  ctx: Context,
  userId: string,
  progress: AbTestProgress,
): Promise<void> {
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
  const version = progress.started_at ? resolveTestDriveVersion(progress.started_at) : 'legacy'
  const copy = resolveAbTestFollowupCopy('DOJIM_0_IMMEDIATE', progress.result_key, version, {
    firstName: user?.firstName ?? user?.telegramUserName ?? null,
  })

  await ctx.telegram.sendMessage(
    chatId,
    [copy.title, '', copy.body].join('\n'),
    {
      reply_markup: {
        inline_keyboard: [[
          {
            text: copy.cta ?? 'Приєднатись до ФОКУСУ →',
            callback_data: 'open_focus_payment',
          },
        ]],
      },
    },
  )

  await prisma.user.update({
    where: { id: userId },
    data: {
      offerShownAt: new Date(),
      lifecycleState: 'OFFER_SHOWN',
    },
  }).catch(() => undefined)
}

export async function renderAbTestResultThenOffer(
  ctx: Context,
  userId: string,
  progress: AbTestProgress,
  options: { typing?: boolean } = {},
): Promise<void> {
  if (options.typing ?? true) {
    await sleep(1000)
  }
  await renderAbTestCompletedResult(ctx, userId, progress)
  await sleep(500)
  await renderAbTestFocusOffer(ctx, userId, progress)
}

export async function renderAbTestPostEmailSubmitSequence(
  ctx: Context,
  userId: string,
  progress: AbTestProgress,
): Promise<void> {
  const chatId = ctx.chat?.id ?? ctx.from?.id
  if (!chatId) {
    return
  }

  await ctx.telegram.sendChatAction(chatId, 'typing').catch(() => undefined)
  await renderAbTestResultThenOffer(ctx, userId, progress)
}

export async function renderCurrentView(
  ctx: Context,
  userId: string,
  progress: AbTestProgress
): Promise<void> {
  // [FIX] only re-read DB for non-completed progress
  // completed progress is passed directly to avoid race condition
  if (progress.status !== 'completed') {
    const uiSettings = await loadUserUiSettings(userId)
    progress = getAbTestProgressFromUiSettings(uiSettings)
  }

  if (progress.status === 'completed' && progress.result_key) {
    const resolvedProgress = await ensureAbTestEmailCapturedFromProfile(userId, progress)
    if (resolvedProgress.email_stage === 'pending') {
      console.info('[AB_TEST_Q8_TRACE] result_render_blocked_by_email_gate', {
        userId,
        resultKey: resolvedProgress.result_key,
        emailStage: resolvedProgress.email_stage,
      })
      const chatId = ctx.chat?.id ?? ctx.from?.id
      if (chatId) {
        await ctx.telegram.sendMessage(
          chatId,
          'Введи email — надішлемо аналіз результату.\n\nАбо натисни «Пропустити» щоб продовжити без email.',
          {
            reply_markup: {
              inline_keyboard: [[
                { text: 'Пропустити →', callback_data: 'skip_email_before_result' },
              ]],
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
      return
    }
    await renderAbTestCompletedResult(ctx, userId, resolvedProgress)

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
