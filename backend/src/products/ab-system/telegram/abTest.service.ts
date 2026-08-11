// backend/src/products/ab-system/telegram/abTest.service.ts

import type { Context, Telegraf } from 'telegraf'
import type { Prisma } from '@starway/db/prisma-client'
import type { AbTestResultKey } from '../content/abTest.results.js'
import {
  buildAbTestProgressPatch,
  cloneAbTestProgress,
  resolveAbTestNextQuestion,
  resolveAbTestQuestionOrder,
  validateAbTestProgress,
  type AbTestProgress,
} from '../../../core/state-machine/abTestFoundation.js'
import { prisma } from '../../../db/client.js'
import {
  loadAbTestProgress,
  saveAbTestProgress,
} from './abTest.progress.js'
import {
  renderCurrentView,
  formatAbTestTelegramCard,
  sendQuestionDirect,
} from './abTest.views.js'
import {
  parseAbTestCallback,
  type AbTestCallbackAction,
  logCallbackReceived,
  logCallbackHandled,
  logAbTestStartDebug,
  logFlowStart,
  logFlowResume,
  logFlowRender,
  logMessageSent,
  resolveContextUserId,
  claimAbTestCallbackInteraction,
} from './abTest.callback.js'
import {
  trackAbTestEvent,
} from './abTest.analytics.js'
import {
  scheduleFollowups,
} from './abTest.scheduler.js'
import { deliverTelegramFlow } from '../../../core/transport/telegramTransport.js'
import { absystemButtons, absystemContent } from '@/products/absystem/config/absystem.content.js'
import {
  planMessage,
} from '../../../modules/telegram-mentor/conversation/delivery/planDelivery.js'
import { testOrchestrator } from '../../../core/orchestrator/testOrchestrator.js'
import {
  handleAbTestAnswer,
  handleAbTestRestart,
  handleShowResult,
  handleSkipEmail,
  handleConfirmEmail,
  handleChangeEmail,
  handleShowInside,
  handleTestDrive,
} from './abTest.handlers.core.js'
import {
  handleAbTestStart,
  handleRestore,
  handleMenu,
  handleSubscription,
  handleEdit,
  handleOpenFaq,
  handleFaqItem,
  handleFocusInfo,
  handlePlayAudio,
  handleQ1Direct,
  handleStartWheel,
} from './abTest.handlers.ui.js'
import {
  handleAbTestEmailCaptureText,
  resolveFocusShortcutCallback,
  handleFocusPaymentAction,
  handleResendFocusBlock12,
  handleFocusPaymentIssue,
} from './abTest.flows.js'
import { canSendAdvertising } from '@/modules/telegram-mentor/core/advertisingGuard.js'
import { splitTelegramContentBlocks, sendTelegramContentChunk } from './abTest.views.js'
import { BLOCK9_POST_RESULT } from '../content/abTest.results.js'

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
export { resolveAiSellerMode } from './abTest.aiSeller.js'
export type { AbTestCallbackAction }

// ============================================================================
// START FLOW
// ============================================================================

export async function startAbTestFlow(
  ctx: Context,
  userId: string,
  payload?: string | null
): Promise<void> {
  console.log('[AB_TEST][START] telegramId:', ctx.from?.id)
  logFlowStart('entered', {
    userId,
    payload: payload ?? null,
    chatId: String(ctx.chat?.id ?? ''),
    fromId: String(ctx.from?.id ?? ''),
  })
  logAbTestStartDebug('start_flow:entered', {
    userId,
    payload: payload ?? null,
    chatId: String(ctx.chat?.id ?? ''),
    fromId: String(ctx.from?.id ?? ''),
  })

  const current = await loadAbTestProgress(userId)
  const now = new Date()
  const nextQuestionFromState =
    resolveAbTestNextQuestion(current)?.question_id ?? 'q1'
  const next =
    current.status === 'completed' && current.result_key
      ? (() => {
          const cloned = { ...current }
          cloned.started_at = now.toISOString()
          return cloned
        })()
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
            status: 'idle',
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
  logFlowRender('progress_saved', {
    userId,
    previousStatus: current.status,
    nextStatus: next.status,
    nextStage: next.stage,
    currentQuestionId: next.current_question_id,
    answersCount: next.answers.length,
  })
  logAbTestStartDebug('start_flow:saved_progress', {
    userId,
    previousStatus: current.status,
    nextStatus: next.status,
    nextStage: next.stage,
    currentQuestionId: next.current_question_id,
    answersCount: next.answers.length,
  })
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

  const questionIdToOpen = next.current_question_id ?? nextQuestionFromState
  await sendQuestionDirect(ctx, questionIdToOpen, next.revision)
  logMessageSent('question_sent', {
    userId,
    questionId: questionIdToOpen,
    stage: next.stage,
    revision: next.revision,
  })
  logAbTestStartDebug('start_flow:rendered_current_view', {
    userId,
    stage: next.stage,
    status: next.status,
  })
}

// ============================================================================
// RESUME FLOW
// ============================================================================

export async function resumeAbTestFlow(
  ctx: Context,
  userId: string
): Promise<void> {
  logFlowResume('entered', {
    userId,
    chatId: String(ctx.chat?.id ?? ''),
    fromId: String(ctx.from?.id ?? ''),
  })
  await ctx.answerCbQuery().catch(() => null)
  const progress = await loadAbTestProgress(userId)
  const validation = validateAbTestProgress(progress)
  if (!validation.resumable) {
    await startAbTestFlow(ctx, userId, 'ab_test:auto_reentry')
    return
  }
  await renderCurrentView(ctx, userId, progress)
  logMessageSent('resume_rendered', {
    userId,
    status: progress.status,
    stage: progress.stage,
    answersCount: progress.answers.length,
  })
}

// ============================================================================
// MAIN CALLBACK DISPATCHER
// ============================================================================

export async function handleAbTestCallback(
  ctx: Context,
  action: string
): Promise<boolean> {
  logCallbackReceived({
    action,
    chatId: String(ctx.chat?.id ?? ''),
    fromId: String(ctx.from?.id ?? ''),
    userId: (ctx.state as { userId?: string | null }).userId ?? null,
  })
  logAbTestStartDebug('callback:received', {
    action,
    chatId: String(ctx.chat?.id ?? ''),
    fromId: String(ctx.from?.id ?? ''),
    userId: (ctx.state as { userId?: string | null }).userId ?? null,
  })

  let userId = (ctx.state as { userId?: string | null }).userId ?? null
  if (!userId && (
    action === 'ab_test:show_result' ||
    action === 'ab_test:test_drive' ||
    action === 'skip_email_before_result' ||
    action.startsWith('show_inside_') ||
    action === 'open_focus_payment' ||
    action.startsWith('open_focus_payment:')
  )) {
    userId = await resolveContextUserId(ctx)
    if (userId) {
      ;(ctx.state as { userId?: string | null }).userId = userId
    }
  }
  if (!userId) {
    if (
      action === 'ab_test:show_result' ||
      action.startsWith('show_inside_') ||
      action === 'open_focus_payment' ||
      action.startsWith('open_focus_payment:')
    ) {
      const errorText =
      action === 'ab_test:show_result'
          ? 'Не вдалося відкрити результат. Спробуй ще раз.'
          : action.startsWith('show_inside_')
            ? 'Не вдалося відкрити практику. Спробуй ще раз.'
          : action === 'ab_test:test_drive'
            ? 'Не вдалося відкрити практику. Спробуй ще раз.'
          : 'Не вдалося відкрити ФОКУС. Спробуй ще раз.'
      await ctx.answerCbQuery(errorText).catch(() => null)
      console.error('[AB_TEST_CALLBACK_MISSING_USER_ID]', {
        action,
        chatId: String(ctx.chat?.id ?? ''),
        fromId: String(ctx.from?.id ?? ''),
      })
    }
    logCallbackHandled({
      action,
      handled:
        action === 'ab_test:show_result' ||
        action.startsWith('show_inside_') ||
        action === 'ab_test:test_drive' ||
        action === 'open_focus_payment' ||
        action.startsWith('open_focus_payment:'),
      reason: 'missing_user_id',
    })
    logAbTestStartDebug('callback:missing_user_id', { action })
    return (
      action === 'ab_test:show_result' ||
      action.startsWith('show_inside_') ||
      action === 'ab_test:test_drive' ||
      action === 'open_focus_payment' ||
      action.startsWith('open_focus_payment:')
    )
  }

  const directShowInsideMatch = action.match(
    /^show_inside_(STATE|GOAL|CHOICE|DECISION|ACTION)$/
  )
  if (directShowInsideMatch) {
    const resultKey = directShowInsideMatch[1].toLowerCase() as AbTestResultKey
    const dedupeClaimed = await claimAbTestCallbackInteraction(ctx, userId, action)
    if (!dedupeClaimed) {
      await ctx.answerCbQuery().catch(() => null)
      logCallbackHandled({
        action,
        handled: true,
        reason: 'duplicate_callback_deduped',
        userId,
      })
      return true
    }
    return handleShowInside(ctx, userId, resultKey)
  }

  // ========== FOCUS SHORTCUTS ==========
  if (await resolveFocusShortcutCallback(ctx, action, userId)) {
    return true
  }

  // ========== START WHEEL ==========
  if (action === 'ab_test:start_wheel' || action === 'start_wheel') {
    return handleStartWheel(ctx)
  }

  // ========== FOCUS PAYMENT ==========
  const focusPaymentAction = action.match(
    /^open_focus_payment(?::(1month|3month))?$/
  )
  if (focusPaymentAction) {
    const payingUserId = userId
    const chatId = ctx.chat?.id ?? ctx.from?.id
    return handleFocusPaymentAction(ctx, payingUserId, chatId ?? null)
  }

  // ========== RESEND FOCUS BLOCK 12 ==========
  if (action === 'resend_focus_block12') {
    return handleResendFocusBlock12(ctx)
  }

  // ========== FOCUS PAYMENT ISSUE ==========
  if (action === 'focus:payment_issue') {
    return handleFocusPaymentIssue(ctx, userId)
  }

  // ========== FOCUS INFO ==========
  if (action === 'open_focus_info' || action === 'ab_test:focus_info') {
    return handleFocusInfo(ctx)
  }

  // ========== OPEN FAQ ==========
  if (action === 'ab_test:faq' || action === 'open_faq') {
    return handleOpenFaq(ctx, userId)
  }

  // ========== FAQ ITEMS ==========
  const faqHandled = await handleFaqItem(ctx, action as any)
  if (faqHandled) {
    return true
  }

  // ========== PLAY AUDIO ==========
  if (action.startsWith('play_audio_')) {
    const resultKey = action
      .replace('play_audio_', '')
      .trim()
      .toLowerCase()
    return handlePlayAudio(ctx, resultKey)
  }

  // ========== Q1 DIRECT ==========
  if (action === 'ab_test:q1') {
    await startAbTestFlow(ctx, userId, action)
    return true
  }

  // ========== PARSE CALLBACK ==========
  const parsed = parseAbTestCallback(action)
  console.log('[AB_TEST][CB] action:', action, 'kind:', parsed?.kind)
  if (!parsed) {
    logCallbackHandled({
      action,
      handled: false,
      reason: 'not_ab_test_action',
    })
    logAbTestStartDebug('callback:not_ab_test_action', { action })
    return false
  }

  logAbTestStartDebug('callback:parsed', {
    action,
    kind: parsed.kind,
  })

  const dedupeClaimed = await claimAbTestCallbackInteraction(ctx, userId, action)
  if (!dedupeClaimed) {
    await ctx.answerCbQuery().catch(() => null)
    logCallbackHandled({
      action,
      handled: true,
      reason: 'duplicate_callback_deduped',
      userId,
    })
    return true
  }

  // ========== FOCUS FUNNEL LOCK ==========
  const focusProgress = await loadAbTestProgress(userId)
  const focusFlowLocked = isAbTestFocusFunnelLocked(focusProgress)
  const allowedDuringFocusLock = new Set<string>([
    'ab_test:show_result',
    'ab_test:restart',
    'open_focus_info',
    'open_focus_payment',
    'ab_test:focus_already_paid',
  ])
  const isAllowedFocusLockAction =
    allowedDuringFocusLock.has(action) ||
    parsed.kind === 'confirm_profile_email_for_result' ||
    parsed.kind === 'change_email_for_result' ||
    parsed.kind === 'skip_email_before_result' ||
    parsed.kind === 'test_drive' ||
    action.startsWith('show_inside_') ||
    action.startsWith('open_focus_payment:')

  if (focusFlowLocked && !isAllowedFocusLockAction) {
    await renderCurrentView(ctx, userId, focusProgress)
    return true
  }

  // ========== DISPATCH BY KIND ==========
  if (parsed.kind === 'answer') {
    void ctx.answerCbQuery().catch(() => null)
    return handleAbTestAnswer(ctx, userId, parsed)
  }

  if (parsed.kind === 'restart') {
    return handleAbTestRestart(ctx, userId)
  }

  if (parsed.kind === 'show_result') {
    return handleShowResult(ctx, userId)
  }

  if (parsed.kind === 'skip_email_before_result') {
    return handleSkipEmail(ctx, userId)
  }

  if (parsed.kind === 'confirm_profile_email_for_result') {
    return handleConfirmEmail(ctx, userId)
  }

  if (parsed.kind === 'change_email_for_result') {
    return handleChangeEmail(ctx, userId)
  }

  if (parsed.kind === 'show_inside') {
    return handleShowInside(ctx, userId, parsed.resultKey)
  }

  if (parsed.kind === 'test_drive') {
    const progress = await loadAbTestProgress(userId)
    if (progress.status === 'completed' && progress.result_key) {
      return handleShowInside(ctx, userId, progress.result_key)
    }
    return handleTestDrive(ctx, userId)
  }

  if (parsed.kind === 'start') {
    return handleAbTestStart(ctx, userId)
  }

  if (parsed.kind === 'restore') {
    return handleRestore(ctx, userId)
  }

  if (parsed.kind === 'menu') {
    return handleMenu(ctx, userId)
  }

  if (parsed.kind === 'subscription') {
    return handleSubscription(ctx, userId)
  }

  if (parsed.kind === 'edit') {
    return handleEdit(ctx, userId, parsed.questionId)
  }

  if (parsed.kind === 'intro') {
    logFlowStart('legacy_intro_redirected_to_start', {
      userId,
      action,
    })
    await startAbTestFlow(ctx, userId, 'legacy_intro_callback')
    logCallbackHandled({
      action,
      handled: true,
      reason: 'legacy_intro_redirect_to_start',
      userId,
    })
    return true
  }

  if (parsed.kind === 'entry') {
    logFlowStart('legacy_entry_redirected_to_start', {
      userId,
      action,
    })
    await startAbTestFlow(ctx, userId, action)
    logCallbackHandled({
      action,
      handled: true,
      reason: 'legacy_entry_redirect_to_start',
      userId,
    })
    return true
  }

  if (parsed.kind === 'resume') {
    await ctx.answerCbQuery().catch(() => null)
    const progress = await loadAbTestProgress(userId)
    const answers = progress.answers ?? []
    const nextQ = answers.length + 1
    const questionOrder = resolveAbTestQuestionOrder()
    if (nextQ > questionOrder.length) {
      await renderCurrentView(ctx, userId, progress)
      return true
    }
    const questionId = questionOrder[nextQ - 1]
    if (questionId) {
      await sendQuestionDirect(ctx, questionId, progress.revision)
    }
    return true
  }

  logCallbackHandled({
    action,
    handled: false,
    reason: 'no_matching_handler',
  })
  return false
}

// ============================================================================
// INTRO RENDER
// ============================================================================

export async function renderAbTestIntro(
  ctx: Context,
  userId: string,
  payload?: string | null
): Promise<void> {
  logAbTestStartDebug('entry:legacy_intro_redirect', {
    userId,
    payload: payload ?? null,
    chatId: String(ctx.chat?.id ?? ''),
    redirectTo: 'startAbTestFlow',
  })
  await startAbTestFlow(ctx, userId, payload ?? 'legacy_intro_redirect')
}

// ============================================================================
// ENTRY RENDER
// ============================================================================

export async function renderAbTestEntry(
  ctx: Context,
  userId: string,
  payload?: string | null
): Promise<void> {
  logAbTestStartDebug('entry:legacy_entry_redirect', {
    userId,
    payload: payload ?? null,
    chatId: String(ctx.chat?.id ?? ''),
    redirectTo: 'startAbTestFlow',
  })
  await startAbTestFlow(ctx, userId, payload ?? 'legacy_entry_redirect')
}

// ============================================================================
// BROADCAST BLOCK 9
// ============================================================================

export async function broadcastBlock9Update(
  bot: Telegraf
): Promise<{ sent: number; failed: number }> {
  const subscribers = await prisma.user.findMany({
    where: {
      OR: [
        { focusPaid: true },
        { productSubscriptions: { some: { status: 'ACTIVE' } } },
      ],
      deletedAt: null,
    },
    select: {
      id: true,
      telegramChatId: true,
      telegramLinks: {
        where: { isActive: true, chatId: { not: null } },
        orderBy: { createdAt: 'desc' },
        take: 1,
        select: { chatId: true },
      },
    },
  })

  let sent = 0
  let failed = 0
  const inline_keyboard = [
    [
      {
        text: BLOCK9_POST_RESULT.cta,
        callback_data: BLOCK9_POST_RESULT.callbackData,
      },
    ],
  ]

  for (const user of subscribers) {
    const tgId = user.telegramChatId ?? user.telegramLinks[0]?.chatId ?? null
    if (!tgId) {
      failed += 1
      continue
    }

    const allowed = await canSendAdvertising(user.id)
    if (!allowed) {
      console.log(`[broadcast] blocked by guard: ${user.id}`)
      continue
    }

    try {
      const blockChunks = splitTelegramContentBlocks(
        BLOCK9_POST_RESULT.text.split('\n')
      )
      for (let index = 0; index < blockChunks.length; index += 1) {
        await sendTelegramContentChunk(bot as unknown as Context, tgId, '', [blockChunks[index]], {
          inlineKeyboard:
            index === blockChunks.length - 1 ? { inline_keyboard } : undefined,
          parseMode: 'HTML',
          separateBlocks: true,
        })
      }
      sent += 1
      await new Promise((resolve) => setTimeout(resolve, 100))
    } catch (err) {
      console.warn(`[broadcast] failed ${tgId}:`, err)
      failed += 1
    }
  }

  return { sent, failed }
}

// ============================================================================
// HELPER: CHECK FOCUS FUNNEL LOCK
// ============================================================================

function isAbTestFocusFunnelLocked(progress: AbTestProgress): boolean {
  return (
    progress.status === 'completed' &&
    !!progress.result_key &&
    progress.email_stage !== 'captured' &&
    progress.email_stage !== 'skipped'
  )
}

// ============================================================================
// RE-EXPORTS
// ============================================================================

export { handleAbTestEmailCaptureText, resolveFocusShortcutCallback } from './abTest.flows.js'
