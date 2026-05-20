//backend/src/products/ab-system/telegram/abTest.service.ts
import type { Prisma } from '@starway/db/prisma-client'
import type { Context } from 'telegraf'

import { buildAbTestQuestionFlow } from '../../../core/flow-builder/flowBuilder.js'
import {
  buildAbTestProgressPatch,
  cloneAbTestProgress,
  normalizeAbTestProgress,
  resolveAbTestAnswerLatency,
  resolveAbTestNextQuestion,
  resolveAbTestQuestionOrder,
  resolveAbTestResultKey,
  type AbTestAnswer,
  type AbTestProgress,
} from '../../../core/state-machine/abTestFoundation.js'
import { deliverTelegramFlow } from '../../../core/transport/telegramTransport.js'
import { absystemButtons, absystemContent } from '../config/absystem.content.js'
import { abTestContent } from '../content/abTest.content.js'
import {
  buildFaqKeyboard,
  getFaqItem,
  type FaqCallbackData,
} from '../content/abTest.faq.js'
import { abTestMenuContent } from '../content/abTest.menu.js'
import { getAbTestQuestion } from '../content/abTest.questions.js'
import { BLOCK10_FOCUS, BLOCK9_POST_RESULT } from '../content/abTest.results.js'
import {
  handleAiSellerCallback,
  resolveAiSellerMode,
} from './abTest.aiSeller.js'
import { buildEcosystemPaymentCheckoutSession } from '../../../modules/subscriptions/payments/business.js'
import { withDevTestPaymentButton } from '../../../modules/telegram-mentor/keyboards.js'
import { trackAbTestEvent } from './abTest.analytics.js'
import { buildWebAppButton, resolveBrowserTestUrl } from './abTest.buttons.js'
import {
  parseAbTestCallback,
  type AbTestCallbackAction,
} from './abTest.callback.js'
import {
  getAbTestProgressFromUiSettings,
  loadAbTestProgress,
  loadUserUiSettings,
  saveAbTestProgress,
} from './abTest.progress.js'
import { scheduleFollowups } from './abTest.scheduler.js'
import {
  renderCurrentView,
  sendActionMessage,
  sendLogMessage,
} from './abTest.views.js'

export {
  observeAbTestCanonicalAction,
  resolveAbTestButtonLabel,
} from './abTest.canonical.js'
export {
  detectStateInstability,
  sendStateCourseOffer,
} from './abTest.instability.js'
export {
  getAbTestProgress,
  markAbTestPaymentSuccess,
  markAbTestPlatformReady,
  markAbTestZoomAttended,
  markAbTestZoomRegistered,
  validateAbTestRuntime,
} from './abTest.markers.js'
export { resolveAiSellerMode }
export type { AbTestCallbackAction }

function resolveQuestionLatency(
  progress: AbTestProgress,
  answeredAt: Date
): number | null {
  if (!progress.last_event_at) {
    return null
  }

  const openedAt = new Date(progress.last_event_at).getTime()
  if (!Number.isFinite(openedAt)) {
    return null
  }

  return Math.max(0, answeredAt.getTime() - openedAt)
}

export function isAbTestStartPayload(
  payload: string | null | undefined
): boolean {
  const normalized = String(payload ?? '')
    .trim()
    .toLowerCase()
  return (
    normalized === 'ab_test' ||
    normalized === 'abtest' ||
    normalized.startsWith('ab_test:')
  )
}

export async function startAbTestFlow(
  ctx: Context,
  userId: string,
  payload?: string | null
): Promise<void> {
  const current = await loadAbTestProgress(userId)
  const now = new Date()
  const nextQuestionFromState =
    resolveAbTestNextQuestion(current)?.question_id ?? 'q1'
  const next =
    current.status === 'completed' && current.result_key
      ? cloneAbTestProgress(current, now)
      : current.status === 'active' &&
          (current.current_question_id || current.answers.length > 0)
        ? buildAbTestProgressPatch(current, {
            current_question_id:
              current.current_question_id ?? nextQuestionFromState,
            stage: 'S2_TEST_QUESTIONS',
            last_callback_key: payload ?? current.last_callback_key,
            last_event_at: now.toISOString(),
          })
        : buildAbTestProgressPatch(current, {
            status: 'active',
            stage: 'S1_TEST_STARTED',
            current_question_id: 'q1',
            started_at: current.started_at ?? now.toISOString(),
            revision: current.revision + 1,
            questions_shown: current.questions_shown.includes('q1')
              ? current.questions_shown
              : [...current.questions_shown, 'q1'],
            last_callback_key: payload ?? current.last_callback_key,
            last_message_key: 'TEST_RESULT_STATE',
            last_event_at: now.toISOString(),
          })

  await saveAbTestProgress(userId, next)
  await trackAbTestEvent({
    userId,
    type:
      current.status === 'completed' ? 'AB_TEST_REOPENED' : 'AB_TEST_STARTED',
    state: next.stage,
    payload: {
      payload: payload ?? null,
      current_question_id: next.current_question_id,
      revision: next.revision,
    } satisfies Prisma.JsonObject,
  })

  await renderCurrentView(ctx, userId, next)
}

export async function resumeAbTestFlow(
  ctx: Context,
  userId: string
): Promise<void> {
  const progress = await loadAbTestProgress(userId)
  await renderCurrentView(ctx, userId, progress)
}

export async function handleAbTestCallback(
  ctx: Context,
  action: string
): Promise<boolean> {
  if (await handleAiSellerCallback(ctx, action)) {
    return true
  }

  if (action === 'start_wheel') {
    // [FIX] ТЗ Блок 9 — відповідь на [Що з цим робити?]
    await ctx.reply(BLOCK9_POST_RESULT.text, {
      parse_mode: 'Markdown',
      reply_markup: {
        inline_keyboard: [
          [
            {
              text: BLOCK9_POST_RESULT.cta,
              callback_data: BLOCK9_POST_RESULT.callbackData,
            },
          ],
        ],
      },
    })
    await ctx.answerCbQuery().catch(() => undefined)
    return true
  }

  const focusPaymentAction = action.match(/^open_focus_payment(?::(1month|3month))?$/)
  if (focusPaymentAction) {
    // FIX(18.05.2026): dynamic per-user Focus checkout — Claude
    const selectedPlanId = focusPaymentAction[1] as '1month' | '3month' | undefined
    const payingUserId = (ctx.state as { userId?: string | null }).userId ?? null
    console.log('[PAYMENT BUTTON]', {
      userId: payingUserId,
      action,
      productId: 'focus',
      planId: selectedPlanId ?? 'all',
    })

    if (!payingUserId) {
      console.error('[PAYMENT BUTTON] Missing userId for dynamic Focus checkout', {
        action,
      })
      await ctx.reply('Не вдалося підготувати оплату: користувача не знайдено. Натисни /start і спробуй ще раз.')
      await ctx.answerCbQuery().catch(() => undefined)
      return true
    }

    let checkout1m: ReturnType<typeof buildEcosystemPaymentCheckoutSession> | null = null
    let checkout3m: ReturnType<typeof buildEcosystemPaymentCheckoutSession> | null = null
    try {
      if (!selectedPlanId || selectedPlanId === '1month') {
        checkout1m = buildEcosystemPaymentCheckoutSession('focus', '1month', payingUserId)
      }
      if (!selectedPlanId || selectedPlanId === '3month') {
        checkout3m = buildEcosystemPaymentCheckoutSession('focus', '3month', payingUserId)
      }
    } catch (error) {
      const reason = error instanceof Error ? error.message : String(error)
      console.error('[PAYMENT URL] Failed to generate dynamic Focus checkout URL', {
        userId: payingUserId,
        reason,
      })
      await ctx.reply('Оплата тимчасово недоступна. Ми вже бачимо помилку конфігурації й можемо швидко це виправити.')
      await ctx.answerCbQuery().catch(() => undefined)
      return true
    }

    if (checkout1m) {
      console.log('[PAYMENT URL]', {
        userId: payingUserId,
        planId: '1month',
        generatedOrderReference: checkout1m.orderReference,
        generatedCheckoutUrl: checkout1m.checkoutUrl,
      })
    }
    if (checkout3m) {
      console.log('[PAYMENT URL]', {
        userId: payingUserId,
        planId: '3month',
        generatedOrderReference: checkout3m.orderReference,
        generatedCheckoutUrl: checkout3m.checkoutUrl,
      })
    }

    await ctx.reply(BLOCK10_FOCUS.text, {
      parse_mode: 'Markdown',
      reply_markup: {
        inline_keyboard: withDevTestPaymentButton([
          ...(checkout1m ? [[{ text: BLOCK10_FOCUS.cta_1m, url: checkout1m.checkoutUrl }]] : []),
          ...(checkout3m ? [[{ text: BLOCK10_FOCUS.cta_3m, url: checkout3m.checkoutUrl }]] : []),
        ]),
      },
    })
    await ctx.answerCbQuery().catch(() => undefined)
    return true
  }

  // [FIX] ТЗ Блоки 16-21: FAQ відповіді
  if (action === 'open_faq') {
    await ctx.reply('Оберіть питання:', { reply_markup: buildFaqKeyboard() })
    await ctx.answerCbQuery().catch(() => undefined)
    return true
  }

  const faqItem = getFaqItem(action as FaqCallbackData)
  if (faqItem) {
    const replyOptions: Parameters<typeof ctx.reply>[1] = {
      parse_mode: 'Markdown',
    }
    if (faqItem.ctaCallback && faqItem.cta) {
      replyOptions.reply_markup = {
        inline_keyboard: [
          [
            {
              text: faqItem.cta,
              callback_data: faqItem.ctaCallback,
            },
          ],
        ],
      }
    }
    await ctx.reply(faqItem.text, replyOptions)
    await ctx.answerCbQuery().catch(() => undefined)
    return true
  }

  const parsed = parseAbTestCallback(action)
  if (!parsed) {
    return false
  }

  const userId = (ctx.state as { userId?: string | null }).userId ?? null
  if (!userId) {
    await ctx
      .answerCbQuery(abTestContent.errors.invalid.join(' '))
      .catch(() => undefined)
    return true
  }

  if (parsed.kind === 'intro') {
    const uiSettings = await loadUserUiSettings(userId)
    const progress = getAbTestProgressFromUiSettings(uiSettings)
    const answeredCount = progress.answers.length
    const isCompleted =
      progress.status === 'completed' && Boolean(progress.result_key)
    const isInProgress = answeredCount > 0 && !isCompleted
    const staleDays = 7
    const updatedAt = progress.updated_at ? new Date(progress.updated_at) : null
    const updatedAtMs = updatedAt?.getTime() ?? NaN
    const elapsedDays = Number.isFinite(updatedAtMs)
      ? Math.floor((Date.now() - updatedAtMs) / (24 * 60 * 60 * 1000))
      : 0
    const isStale = elapsedDays >= staleDays

    if (isCompleted && progress.result_key) {
      const resultLabel =
        absystemContent.RESULT_TYPE_LABELS[
          progress.result_key.toUpperCase() as keyof typeof absystemContent.RESULT_TYPE_LABELS
        ] ?? progress.result_key

      await ctx.reply(absystemContent.RESUME_FLOW.COMPLETED(resultLabel), {
        parse_mode: 'Markdown',
        reply_markup: {
          inline_keyboard: [
            [
              {
                text: absystemContent.RESUME_FLOW.CTA_SHOW_RESULT,
                callback_data: 'ab_test:show_result',
              },
            ],
            [
              {
                text: absystemContent.RESUME_FLOW.CTA_RESTART,
                callback_data: 'ab_test:restart',
              },
            ],
          ],
        },
      })
      await ctx.answerCbQuery().catch(() => undefined)
      return true
    }

    if (isInProgress && isStale) {
      await ctx.reply(
        absystemContent.RESUME_FLOW.STALE_PROGRESS(answeredCount, elapsedDays),
        {
          parse_mode: 'Markdown',
          reply_markup: {
            inline_keyboard: [
              [
                {
                  text: absystemContent.RESUME_FLOW.CTA_CONTINUE,
                  callback_data: 'ab_test:start',
                },
              ],
              [
                {
                  text: absystemContent.RESUME_FLOW.CTA_RESTART,
                  callback_data: 'ab_test:restart',
                },
              ],
            ],
          },
        }
      )
      await ctx.answerCbQuery().catch(() => undefined)
      return true
    }

    if (isInProgress) {
      await ctx.reply(absystemContent.RESUME_FLOW.IN_PROGRESS(answeredCount), {
        parse_mode: 'Markdown',
        reply_markup: {
          inline_keyboard: [
            [
              {
                text: absystemContent.RESUME_FLOW.CTA_CONTINUE,
                callback_data: 'ab_test:start',
              },
            ],
            [
              {
                text: absystemContent.RESUME_FLOW.CTA_RESTART,
                callback_data: 'ab_test:restart',
              },
            ],
          ],
        },
      })
      await ctx.answerCbQuery().catch(() => undefined)
      return true
    }

    await ctx.reply(absystemContent.START_BLOCK1.MSG2, {
      parse_mode: 'Markdown',
      reply_markup: {
        inline_keyboard: [
          [
            {
              text: absystemContent.START_BLOCK1.CTA_CHAT,
              callback_data: 'ab_test:start',
            },
          ],
          [
            buildWebAppButton(
              absystemContent.START_BLOCK1.CTA_MINIAPP,
              '/ab-test'
            ),
          ],
          [
            {
              text: absystemContent.START_BLOCK1.CTA_BROWSER,
              url: resolveBrowserTestUrl(),
            },
          ],
        ],
      },
    })

    await ctx.answerCbQuery().catch(() => undefined)
    return true
  }

  if (parsed.kind === 'restart') {
    await saveAbTestProgress(userId, normalizeAbTestProgress(undefined))
    await ctx.reply(absystemContent.START_BLOCK1.MSG2, {
      parse_mode: 'Markdown',
      reply_markup: {
        inline_keyboard: [
          [
            {
              text: absystemContent.START_BLOCK1.CTA_CHAT,
              callback_data: 'ab_test:start',
            },
          ],
          [
            buildWebAppButton(
              absystemContent.START_BLOCK1.CTA_MINIAPP,
              '/ab-test'
            ),
          ],
          [
            {
              text: absystemContent.START_BLOCK1.CTA_BROWSER,
              url: resolveBrowserTestUrl(),
            },
          ],
        ],
      },
    })
    await ctx.answerCbQuery().catch(() => undefined)
    return true
  }

  if (parsed.kind === 'show_result') {
    const progress = await loadAbTestProgress(userId)
    await renderCurrentView(ctx, userId, progress)
    await ctx.answerCbQuery().catch(() => undefined)
    return true
  }

  if (parsed.kind === 'start') {
    await startAbTestFlow(ctx, userId, action)
    await ctx.answerCbQuery(absystemButtons.startTest).catch(() => undefined)
    return true
  }

  if (parsed.kind === 'restore') {
    await resumeAbTestFlow(ctx, userId)
    await ctx
      .answerCbQuery(absystemButtons.restoreProgress)
      .catch(() => undefined)
    return true
  }

  if (parsed.kind === 'menu') {
    await deliverTelegramFlow(
      ctx,
      {
        id: 'ab_test_menu',
        title: '',
        body: [abTestMenuContent.body],
        buttons: [
          [{ text: absystemButtons.startTest, callback_data: 'ab_test:start' }],
          [
            {
              text: absystemButtons.restoreProgress,
              callback_data: 'ab_test:restore',
            },
          ],
          [
            {
              text: absystemButtons.continue,
              callback_data: 'return_main_menu',
            },
          ],
          [{ text: 'Задати питання', callback_data: 'open_faq' }],
        ],
        blocks: [],
      },
      'reply'
    )
    await ctx
      .answerCbQuery(abTestMenuContent.cta.continue)
      .catch(() => undefined)
    return true
  }

  if (parsed.kind === 'edit') {
    const progress = getAbTestProgressFromUiSettings(
      await loadUserUiSettings(userId)
    )
    const next = buildAbTestProgressPatch(progress, {
      status: 'active',
      stage: 'S2_TEST_QUESTIONS',
      current_question_id: parsed.questionId,
      last_callback_key: action,
      last_event_at: new Date().toISOString(),
    })
    await saveAbTestProgress(userId, next)
    const targetIndex = resolveAbTestQuestionOrder().indexOf(parsed.questionId)
    await sendActionMessage(ctx, userId, next, targetIndex, 'edit')
    await ctx
      .answerCbQuery(absystemContent.RESUME_FLOW.EDIT_OPENING)
      .catch(() => undefined)
    return true
  }

  const progress = await loadAbTestProgress(userId)
  const questionOrder = resolveAbTestQuestionOrder()
  const expectedQuestionId = questionOrder[progress.answers.length] ?? null

  if (progress.status === 'completed') {
    await renderCurrentView(ctx, userId, progress)
    await ctx.answerCbQuery().catch(() => undefined)
    return true
  }

  if (!expectedQuestionId || parsed.questionId !== expectedQuestionId) {
    await trackAbTestEvent({
      userId,
      type: 'AB_TEST_STALE_CALLBACK_REJECTED',
      state: progress.stage,
      payload: {
        action,
        expected_question_id: expectedQuestionId,
        received_question_id: parsed.questionId,
        answers_count: progress.answers.length,
        revision: progress.revision,
      } satisfies Prisma.JsonObject,
    })
    await renderCurrentView(ctx, userId, progress)
    await ctx
      .answerCbQuery(abTestContent.errors.stale.join(' '))
      .catch(() => undefined)
    return true
  }

  if (parsed.revision !== null && parsed.revision !== progress.revision) {
    await trackAbTestEvent({
      userId,
      type: 'AB_TEST_REPLAY_REJECTED',
      state: progress.stage,
      payload: {
        action,
        expected_question_id: expectedQuestionId,
        received_question_id: parsed.questionId,
        answers_count: progress.answers.length,
        revision: progress.revision,
      } satisfies Prisma.JsonObject,
    })
    await renderCurrentView(ctx, userId, progress)
    await ctx
      .answerCbQuery(abTestContent.errors.stale.join(' '))
      .catch(() => undefined)
    return true
  }

  const question = getAbTestQuestion(parsed.questionId)
  const selected = question.answers.find(
    (answer) => answer.id === parsed.answerId
  )
  if (!selected) {
    await renderCurrentView(ctx, userId, progress)
    await ctx
      .answerCbQuery(abTestContent.errors.invalid.join(' '))
      .catch(() => undefined)
    return true
  }

  const answeredAt = new Date()
  const answerLatencyMs =
    resolveQuestionLatency(progress, answeredAt) ??
    resolveAbTestAnswerLatency(progress, parsed.questionId, answeredAt)
  const answer: AbTestAnswer = {
    question_id: parsed.questionId,
    answer_id: selected.id,
    score: selected.score,
    category: selected.category,
    behavioral_type: question.behavioral_type,
    analytics_hooks: question.analytics_hooks,
    answered_at: answeredAt.toISOString(),
    latency_ms: answerLatencyMs,
  }

  const nextAnswers = [
    ...progress.answers.filter(
      (item) => item.question_id !== parsed.questionId
    ),
    answer,
  ]
  const nextQuestionIndex =
    resolveAbTestQuestionOrder().indexOf(parsed.questionId) + 1
  const nextQuestionId = resolveAbTestQuestionOrder()[nextQuestionIndex] ?? null
  const complete = !nextQuestionId
  const resultKey = complete
    ? resolveAbTestResultKey(nextAnswers)
    : progress.result_key

  const next = buildAbTestProgressPatch(progress, {
    status: complete ? 'completed' : 'active',
    stage: complete ? 'S3_TEST_RESULT' : 'S2_TEST_QUESTIONS',
    current_question_id: nextQuestionId,
    revision: progress.revision + 1,
    questions_shown: progress.questions_shown.includes(parsed.questionId)
      ? progress.questions_shown
      : [...progress.questions_shown, parsed.questionId],
    answers: nextAnswers,
    result_key: resultKey,
    last_callback_key: action,
    last_message_key: question.message_key,
    last_event_at: answeredAt.toISOString(),
  })

  await saveAbTestProgress(userId, next)
  await trackAbTestEvent({
    userId,
    type: complete ? 'AB_TEST_COMPLETED' : 'AB_TEST_QUESTION_ANSWERED',
    state: next.stage,
    payload: {
      question_id: parsed.questionId,
      message_key: question.message_key,
      answer_id: selected.id,
      answer_score: selected.score,
      answer_latency_ms: answerLatencyMs,
      behavioral_type: question.behavioral_type,
      next_question_id: nextQuestionId,
      result_key: resultKey,
      question_progression: `${nextAnswers.length}/${resolveAbTestQuestionOrder().length}`,
    } satisfies Prisma.JsonObject,
  })

  // ── COMPLETE (8th answer) ──────────────────────────────────
  if (complete && resultKey) {
    const scheduled = await scheduleFollowups(userId, next, 'S3_TEST_RESULT')
    const finalProgress = await saveAbTestProgress(userId, scheduled)
    await sendLogMessage(ctx, finalProgress)
    await renderCurrentView(ctx, userId, finalProgress)
    await ctx.answerCbQuery().catch(() => undefined)
    return true
    // [FIX] early return — does NOT fall through to next question render
  }

  // ── NON-COMPLETE (questions 1-7) ──────────────────────────
  const nextQuestion = nextQuestionId ? getAbTestQuestion(nextQuestionId) : null
  if (!nextQuestion) {
    await renderCurrentView(ctx, userId, next)
    await ctx
      .answerCbQuery(abTestContent.progress.resumeHint)
      .catch(() => undefined)
    return true
  }

  // [FIX] use next.stage not hardcoded 'S3_TEST_RESULT'
  const scheduled = await scheduleFollowups(userId, next, next.stage)
  const finalProgress = await saveAbTestProgress(userId, scheduled)

  const flow = buildAbTestQuestionFlow(
    finalProgress,
    nextQuestion.question_id,
    finalProgress.revision
  )
  flow.body = [nextQuestion.prompt]
  await deliverTelegramFlow(ctx, flow, 'reply')
  await ctx.answerCbQuery().catch(() => undefined)
  return true
}

export async function renderAbTestEntry(
  ctx: Context,
  userId: string,
  payload?: string | null
): Promise<void> {
  void payload
  void userId

  await ctx.reply(absystemContent.START_BLOCK1.MSG1, {
    parse_mode: 'Markdown',
    reply_markup: {
      inline_keyboard: [
        [
          {
            text: absystemContent.START_BLOCK1.CTA1,
            callback_data: 'ab_test:intro',
          },
        ],
      ],
    },
  })
}

export async function renderAbTestResume(
  ctx: Context,
  userId: string
): Promise<void> {
  const progress = await loadAbTestProgress(userId)
  await renderCurrentView(ctx, userId, progress)
}
