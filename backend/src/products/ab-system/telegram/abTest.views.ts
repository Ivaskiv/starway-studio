import type { Prisma } from '@starway/db/prisma-client'
import type { Context } from 'telegraf'

import { buildBehavioralSnapshot } from '../../../core/behavioral/behavioralSnapshot.js'
import {
  buildAbTestQuestionFlow,
  buildAbTestResultFlow,
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
import { trackAbTestEvent } from './abTest.analytics.js'
import { buildWebAppButton, resolveBrowserTestUrlOrNull } from './abTest.buttons.js'
import {
  getAbTestProgressFromUiSettings,
  getUiSettings,
  loadUserUiSettings,
  saveAbTestProgress,
} from './abTest.progress.js'
import { planMessage } from '../../../modules/telegram-mentor/conversation/delivery/planDelivery.js'

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
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { firstName: true, settings: true },
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

    // [FIX] ТЗ Блоки 4-8: єдине джерело — abTest.results.ts
    const resultKey = dominantBlock.toLowerCase() as AbTestResultKey
    const resultDef = getAbTestResultDefinition(resultKey)
    const flow = buildAbTestResultFlow(next)
    flow.body = [`*${resultDef.title}*`, '', resultDef.body]
    await deliverTelegramFlow(ctx, flow, 'reply')

    if (next.email_stage !== 'captured') {
      await planMessage(
        ctx,
        'ctx.reply',
        'ab_test_email_prompt',
        [
          'Хочете зберегти результат і отримати персональний план дій?',
          'Введіть email — і ми відкриємо вам платформу.',
        ].join('\n'),
        {
          inline_keyboard: [
            [{ text: 'Ввести email', callback_data: 'ab_test:email_continue' }],
            [{ text: 'Пропустити поки що', callback_data: 'ab_test:email_skip' }],
          ],
        },
      )
    }

    return
  }

  const activeIndex = progress.answers.length
  const questionId =
    resolveAbTestQuestionOrder()[Math.min(activeIndex, 7)] ?? 'q1'
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
