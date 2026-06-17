import type { AbTestResultKey } from '../content/abTest.results.js'
// backend/src/products/ab-system/telegram/abTest.handlers.core.ts
// CORE ANSWER & RESULT HANDLERS (500 рядків = answer, restart, results)

import type { Context } from 'telegraf'
import type { Prisma } from '@starway/db/prisma-client'
import {
  buildAbTestProgressPatch,
  resolveAbTestQuestionOrder,
  resolveAbTestResultKey,
  type AbTestAnswer,
} from '../../../core/state-machine/abTestFoundation.js'
import { prisma } from '../../../db/client.js'
import { getAbTestQuestion } from '../content/abTest.questions.js'
import {
  loadAbTestProgress,
  saveAbTestProgress,
  getAbTestProfileEmail,
  ensureAbTestEmailCapturedFromProfile,
} from './abTest.progress.js'
import {
  renderCurrentView,
  renderAbTestPostEmailSubmitSequence,
  renderAbTestEmailGate,
  resolveFirstName,
} from './abTest.views.js'
import {
  trackAbTestEvent,
} from './abTest.analytics.js'
import {
  scheduleFollowups,
} from './abTest.scheduler.js'
import {
  deactivateCallbackMarkup,
  logAbTestStartDebug,
  formatMobileAnswerButtonText,
  resolveQuestionLatency,
} from './abTest.callback.js'
import {
  clearPendingTelegramIdentity,
} from '../../../modules/telegram-mentor/services/pendingIdentity.service.js'
import {
  planAck,
} from '../../../modules/telegram-mentor/conversation/delivery/planDelivery.js'
import { abTestContent } from '../content/abTest.shared.js'
import { testOrchestrator } from '../../../core/orchestrator/testOrchestrator.js'
import { normalizeAbTestProgress } from '../../../core/state-machine/abTestFoundation.js'

// ============================================================================
// ANSWER HANDLER (MAIN LOGIC)
// ============================================================================

export async function handleAbTestAnswer(
  ctx: Context,
  userId: string,
  parsed: { kind: 'answer'; questionId: string; answerId: string; revision: number | null }
): Promise<boolean> {
  const progress = await loadAbTestProgress(userId)
  const questionOrder = resolveAbTestQuestionOrder()
  const expectedQuestionId = questionOrder[progress.answers.length] ?? null

  if (progress.status === 'completed') {
    await renderCurrentView(ctx, userId, progress)
    await planAck(ctx, 'ctx.answerCbQuery', 'ab_test_completed_ack').catch(
      () => undefined
    )
    return true
  }

  if (!expectedQuestionId || parsed.questionId !== expectedQuestionId) {
    await trackAbTestEvent({
      userId,
      type: 'AB_TEST_STALE_CALLBACK_REJECTED',
      state: progress.stage,
      payload: {
        action: `ab_test_answer:${parsed.questionId}`,
        expected_question_id: expectedQuestionId,
        received_question_id: parsed.questionId,
        answers_count: progress.answers.length,
        revision: progress.revision,
      } satisfies Prisma.JsonObject,
    })
    await renderCurrentView(ctx, userId, progress)
    await planAck(
      ctx,
      'ctx.answerCbQuery',
      'ab_test_stale_question_ack',
      abTestContent.errors.stale.join(' ')
    ).catch(() => undefined)
    return true
  }

  if (parsed.revision !== null && parsed.revision !== progress.revision) {
    await trackAbTestEvent({
      userId,
      type: 'AB_TEST_REPLAY_REJECTED',
      state: progress.stage,
      payload: {
        action: `ab_test_answer:${parsed.questionId}`,
        expected_question_id: expectedQuestionId,
        received_question_id: parsed.questionId,
        answers_count: progress.answers.length,
        revision: progress.revision,
      } satisfies Prisma.JsonObject,
    })
    await renderCurrentView(ctx, userId, progress)
    await planAck(
      ctx,
      'ctx.answerCbQuery',
      'ab_test_replay_rejected_ack',
      abTestContent.errors.stale.join(' ')
    ).catch(() => undefined)
    return true
  }

  const question = getAbTestQuestion(parsed.questionId)
  const selected = question.answers.find(
    (answer) => answer.id === parsed.answerId
  )
  if (!selected) {
    await renderCurrentView(ctx, userId, progress)
    await planAck(
      ctx,
      'ctx.answerCbQuery',
      'ab_test_invalid_answer_ack',
      abTestContent.errors.invalid.join(' ')
    ).catch(() => undefined)
    return true
  }

  const answeredAt = new Date()
  const answerLatencyMs = resolveQuestionLatency(progress, answeredAt)
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
    last_callback_key: `ab_test_answer:${parsed.questionId}`,
    last_message_key: question.message_key,
    last_event_at: answeredAt.toISOString(),
  })

  await saveAbTestProgress(userId, next)
  
  // Update button UI
  const callbackMessage = ctx.callbackQuery?.message
  if (
    callbackMessage &&
    'message_id' in callbackMessage &&
    callbackMessage.message_id
  ) {
    const updatedKeyboard = [
      question.answers.map((answer) => ({
        text:
          answer.id === selected.id
            ? `✅ ${formatMobileAnswerButtonText(answer.text)}`
            : `${formatMobileAnswerButtonText(answer.text)}`,
        callback_data: 'answered',
      })),
    ]
    await ctx.telegram
      .editMessageReplyMarkup(
        callbackMessage.chat.id,
        callbackMessage.message_id,
        undefined,
        { inline_keyboard: updatedKeyboard }
      )
      .catch(() => null)
  }

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

  if (complete) {
    console.info('[SEGMENT_DETECTED]', {
      userId,
      segment: resultKey as AbTestResultKey,
      messageId: null,
      callback: `ab_test_answer:${parsed.questionId}`,
    })
    const chatId = ctx.chat?.id ?? ctx.from?.id
    if (!chatId) {
      return true
    }
    await testOrchestrator
      .onTestCompleted(userId, resultKey ?? null, null, {
        startedAt: next.started_at ? new Date(next.started_at) : undefined,
      })
      .catch(() => undefined)

    const pendingEmailProgress = buildAbTestProgressPatch(next, {
      email_stage: 'pending',
      last_event_at: new Date().toISOString(),
    })
    await saveAbTestProgress(userId, pendingEmailProgress)
    await renderAbTestEmailGate(ctx, userId, pendingEmailProgress)
    return true
  }

  const nextQuestion = nextQuestionId ? getAbTestQuestion(nextQuestionId) : null
  if (!nextQuestion) {
    await renderCurrentView(ctx, userId, next)
    await planAck(
      ctx,
      'ctx.answerCbQuery',
      'ab_test_next_question_missing_ack',
      abTestContent.progress.resumeHint
    ).catch(() => undefined)
    return true
  }

  const scheduled = await scheduleFollowups(userId, next, next.stage)
  const finalProgress = await saveAbTestProgress(userId, scheduled)
  const chatId = ctx.chat?.id ?? ctx.from?.id
  if (!chatId) {
    return true
  }
  const { sendQuestionDirect } = await import('./abTest.views.js')
  await sendQuestionDirect(
    ctx,
    nextQuestion.question_id,
    finalProgress.revision
  )
  return true
}

// ============================================================================
// RESTART HANDLER
// ============================================================================

export async function handleAbTestRestart(
  ctx: Context,
  userId: string
): Promise<boolean> {
  await ctx.answerCbQuery().catch(() => null)
  const chatId = ctx.chat?.id ?? ctx.from?.id
  const currentProgress = await loadAbTestProgress(userId)
  
  await prisma.user
    .update({
      where: { id: userId },
      data: {
        lifecycleState: 'TEST_NOT_STARTED',
        testStartedAt: null,
        testCompletedAt: null,
        offerShownAt: null,
        testResultType: null,
      },
    })
    .catch(() => undefined)

  if (chatId) {
    await prisma.notificationJob
      .updateMany({
        where: {
          status: 'PENDING',
          type: 'AI_REMINDER',
          payload: { path: ['userId'], equals: userId },
        },
        data: { status: 'FAILED', lastError: 'cancelled_by_ab_test_restart' },
      })
      .catch(() => undefined)
    await clearPendingTelegramIdentity(String(chatId)).catch(() => undefined)
  }

  const freshProgress = buildAbTestProgressPatch(
    normalizeAbTestProgress(undefined),
    {
      answers: [],
      questions_shown: [],
      current_question_id: null,
      result_key: null,
      result_opened_at: null,
      email_stage: null,
      email_captured_at: null,
      focus_opened_at: null,
      payment_started_at: null,
      payment_success_at: null,
      zoom_registered_at: null,
      zoom_attended_at: null,
      platform_invited_at: null,
      platform_ready_at: null,
      last_callback_key: 'ab_test:restart',
      last_message_key: null,
      last_event_at: new Date().toISOString(),
    }
  )
  await saveAbTestProgress(userId, freshProgress)

  const { startAbTestFlow } = await import('./abTest.service.js')
  await startAbTestFlow(ctx, userId, 'ab_test:restart')

  return true
}

// ============================================================================
// SHOW RESULT HANDLER
// ============================================================================

export async function handleShowResult(
  ctx: Context,
  userId: string
): Promise<boolean> {
  await deactivateCallbackMarkup(ctx)
  await ctx.answerCbQuery().catch(() => null)
  const chatId = ctx.chat?.id ?? ctx.from?.id
  if (!chatId) return true

  const userRecord = await prisma.user.findUnique({
    where: { id: userId },
    select: { testResultType: true, telegramUserName: true, firstName: true },
  })
  const resultKey = (userRecord?.testResultType ?? null) as string | null
  if (!resultKey) {
    await ctx.telegram.sendMessage(
      chatId,
      'Результат не знайдено. Спробуй пройти тест заново.',
      {
        reply_markup: {
          inline_keyboard: [
            [
              {
                text: 'Почати тест',
                callback_data: 'ab_test:start',
              },
            ],
          ],
        },
      }
    )
    return true
  }

  const progress = await loadAbTestProgress(userId)
  if (progress.status === 'completed' && progress.result_key) {
    await renderAbTestPostEmailSubmitSequence(ctx, userId, progress, {
      notifyOps: false,
      forceRedelivery: true,
    })
    return true
  }

  const { dispatchAbTestResultSequence } = await import('./abTest.views.js')
  await dispatchAbTestResultSequence(ctx, {
    chatId,
    userId,
    resultKey: resultKey as AbTestResultKey,
    firstName: resolveFirstName(userRecord, ctx, userId),
    deliverySource: 'show_result',
    notifyOps: false,
  })
  return true
}

// ============================================================================
// SKIP EMAIL HANDLER
// ============================================================================

export async function handleSkipEmail(
  ctx: Context,
  userId: string
): Promise<boolean> {
  await ctx.answerCbQuery().catch(() => null)

  const progress = await loadAbTestProgress(userId)
  const AB_TEST_EMAIL_SKIP_LOG_PREFIX = '[ab-test-email-skip]'

  if (progress.status === 'completed' && progress.result_key) {
    const progressForResult =
      progress.email_stage === 'pending'
        ? buildAbTestProgressPatch(progress, {
            email_stage: 'skipped',
            last_event_at: new Date().toISOString(),
          })
        : progress

    const savedProgress =
      progress.email_stage === 'pending'
        ? await saveAbTestProgress(userId, progressForResult)
        : progressForResult

    const chatId = ctx.chat?.id ?? ctx.from?.id
    if (chatId) {
      await clearPendingTelegramIdentity(String(chatId))
    }

    await renderAbTestPostEmailSubmitSequence(
      ctx,
      userId,
      savedProgress,
      {
        forceRedelivery: true,
      }
    )
    return true
  }

  return true
}

// ============================================================================
// CONFIRM EMAIL HANDLER
// ============================================================================

export async function handleConfirmEmail(
  ctx: Context,
  userId: string
): Promise<boolean> {
  await ctx.answerCbQuery().catch(() => null)
  const progress = await loadAbTestProgress(userId)
  const profileEmail = await getAbTestProfileEmail(userId)
  if (!profileEmail || progress.status !== 'completed' || !progress.result_key) {
    await renderCurrentView(ctx, userId, progress)
    return true
  }

  const savedProgress = await ensureAbTestEmailCapturedFromProfile(
    userId,
    progress
  )
  const chatId = ctx.chat?.id ?? ctx.from?.id
  if (chatId) {
    await clearPendingTelegramIdentity(String(chatId))
  }
  await renderAbTestPostEmailSubmitSequence(ctx, userId, savedProgress, {
    notifyOps: false,
  })
  return true
}

// ============================================================================
// CHANGE EMAIL HANDLER
// ============================================================================

export async function handleChangeEmail(
  ctx: Context,
  userId: string
): Promise<boolean> {
  await ctx.answerCbQuery().catch(() => null)

  const progress = await loadAbTestProgress(userId)
  const next = buildAbTestProgressPatch(progress, {
    email_stage: 'pending',
    last_event_at: new Date().toISOString(),
  })

  await saveAbTestProgress(userId, next)

  const chatId = ctx.chat?.id ?? ctx.from?.id
  if (chatId) {
    await ctx.telegram.sendMessage(
      chatId,
      'Надішли новий email одним повідомленням. Поточний email залишиться без змін, доки ти не надішлеш новий.'
    )
  }

  return true
}

// ============================================================================
// SHOW INSIDE (PRACTICE) HANDLER
// ============================================================================

export async function handleShowInside(
  ctx: Context,
  userId: string,
  resultKey: string
): Promise<boolean> {
  await deactivateCallbackMarkup(ctx)
  await ctx.answerCbQuery().catch(() => null)
  const chatId = ctx.chat?.id ?? ctx.from?.id
  if (!chatId) {
    return true
  }
  const progress = await loadAbTestProgress(userId)
  if (progress.result_key !== resultKey) {
    await renderCurrentView(ctx, userId, progress)
    await planAck(
      ctx,
      'ctx.answerCbQuery',
      'ab_test_show_inside_stale_result',
      'Показую актуальний крок'
    ).catch(() => undefined)
    return true
  }
  const userRecord = await prisma.user.findUnique({
    where: { id: userId },
    select: { firstName: true, telegramUserName: true },
  })
  const { dispatchAbTestPracticeSequence } = await import('./abTest.views.js')
  await dispatchAbTestPracticeSequence(ctx, {
    chatId,
    resultKey: resultKey as AbTestResultKey,
    firstName: resolveFirstName(userRecord, ctx, userId),
  })
  return true
}

// ============================================================================
// TEST DRIVE HANDLER
// ============================================================================

export async function handleTestDrive(
  ctx: Context,
  userId: string
): Promise<boolean> {
  await deactivateCallbackMarkup(ctx)
  await ctx.answerCbQuery().catch(() => null)
  const progress = await loadAbTestProgress(userId)
  const chatId = ctx.chat?.id ?? ctx.from?.id
  if (!chatId || !progress.result_key) {
    await renderCurrentView(ctx, userId, progress)
    return true
  }
  const userRecord = await prisma.user.findUnique({
    where: { id: userId },
    select: { firstName: true, telegramUserName: true },
  })
  const { dispatchAbTestPracticeSequence } = await import('./abTest.views.js')
  await dispatchAbTestPracticeSequence(ctx, {
    chatId,
    resultKey: progress.result_key,
    firstName: resolveFirstName(userRecord, ctx, userId),
  })
  return true
}