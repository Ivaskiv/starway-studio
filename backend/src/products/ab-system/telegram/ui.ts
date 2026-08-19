import { absystemContent } from '@/products/absystem/config/content.js'
import type { AbTestResultKey } from '../content/abTest.results.js'
import type { AbTestQuestionId } from '../content/abTest.questions.js'
// backend/src/products/ab-system/telegram/ui.ts
// UI & MENU HANDLERS (500 рядків = menus, UI, info)

import type { Context } from 'telegraf'
import { prisma } from '../../../db/client.js'
import {
  buildAbTestProgressPatch,
  resolveAbTestQuestionOrder,
} from '../../../core/state-machine/abTestFoundation.js'
import {
  loadAbTestProgress,
  saveAbTestProgress,
  getAbTestProgressFromUiSettings,
  loadUserUiSettings,
} from './progress.js'
import {
  renderCurrentView,
  formatAbTestTelegramCard,
  sendQuestionDirect,
  splitTelegramContentBlocks,
  sendTelegramContentChunk,
} from './views.js'
import {
  buildFaqKeyboard,
  getFaqItem,
  type FaqCallbackData,
} from '../content/abTest.faq.js'
import {
  abTestMenuContent,
  
} from '../content/abTest.shared.js'
import { AB_TEST_ACTIONS } from '@/packages/abTestActions.js'
import { absystemButtons } from '@/products/absystem/config/content.js'
import {
  planMessage,
  planAck,
} from '../../../modules/telegram-mentor/conversation/delivery/planDelivery.js'
import { deliverTelegramFlow } from '../../../core/transport/telegramTransport.js'
import {
  isAbTestFocusFunnelLocked,
} from './progress.js'
import {
  formatMobileAnswerButtonText,
  formatMobileAnswerListForMessage,
} from './helpers.js'
import { testOrchestrator } from '../../../core/orchestrator/testOrchestrator.js'
import {
  logAbTestStartDebug,
  logCallbackHandled,
} from './callback.js'

// ============================================================================
// START HANDLER
// ============================================================================

export async function handleAbTestStart(
  ctx: Context,
  userId: string
): Promise<boolean> {
  await ctx.answerCbQuery().catch(() => null)
  if (!ctx.chat?.id) {
    return true
  }

  logAbTestStartDebug('callback:start_pressed', {
    action: 'ab_test:start',
    userId,
    chatId: String(ctx.chat?.id ?? ''),
  })

  const currentProgress = await loadAbTestProgress(userId)
  if (currentProgress.status === 'active' && currentProgress.current_question_id) {
    logCallbackHandled({
      action: 'ab_test:start',
      handled: true,
      reason: 'active_question_already_open',
      userId,
    })
    logAbTestStartDebug('callback:start_skipped_active_question', {
      action: 'ab_test:start',
      userId,
      currentQuestionId: currentProgress.current_question_id,
      answersCount: currentProgress.answers.length,
      revision: currentProgress.revision,
    })
    return true
  }

  const nowIso = new Date().toISOString()
  const warmedProgress = buildAbTestProgressPatch(currentProgress, {
    status: 'active',
    stage: 'S2_TEST_QUESTIONS',
    current_question_id: 'q1',
    started_at: nowIso,
    revision: currentProgress.revision + 1,
    answers: [],
    questions_shown: ['q1'],
    result_key: null,
    result_opened_at: null,
    email_stage: null,
    email_captured_at: null,
    last_callback_key: 'ab_test:start',
    last_event_at: nowIso,
  })

  await saveAbTestProgress(userId, warmedProgress)
  await testOrchestrator
    .recordTestStart(userId, new Date(nowIso))
    .catch(() => undefined)
  await sendQuestionDirect(
    ctx,
    warmedProgress.current_question_id ?? 'q1',
    warmedProgress.revision
  )

  logCallbackHandled({
    action: 'ab_test:start',
    handled: true,
    reason: 'start_flow_executed',
    userId,
  })
  logAbTestStartDebug('callback:start_completed', {
    action: 'ab_test:start',
    userId,
  })
  return true
}

// ============================================================================
// RESTORE HANDLER
// ============================================================================

export async function handleRestore(
  ctx: Context,
  userId: string
): Promise<boolean> {
  const { resumeAbTestFlow } = await import('./service.js')
  await resumeAbTestFlow(ctx, userId)
  await planAck(
    ctx,
    'ctx.answerCbQuery',
    'ab_test_restore_ack',
    absystemButtons.restoreProgress
  ).catch(() => undefined)
  return true
}

// ============================================================================
// MENU HANDLER
// ============================================================================

export async function handleMenu(
  ctx: Context,
  userId: string
): Promise<boolean> {
  await ctx.answerCbQuery().catch(() => null)
  await deliverTelegramFlow(
    ctx,
    {
      id: 'ab_test_menu',
      title: '',
      body: [abTestMenuContent.body],
      buttons: [
        [{ text: 'ПРОЙТИ ТЕСТ', callback_data: AB_TEST_ACTIONS.ENTRY }],
        [
          {
            text: absystemButtons.restoreProgress,
            callback_data: 'ab_test:restore',
          },
        ],
        [
          {
            text: 'ДІЗНАТИСЬ ПРО ФОКУС',
            callback_data: AB_TEST_ACTIONS.FOCUS_INFO,
          },
        ],
        [
          {
            text: 'ОПЛАТИТИ ФОКУС',
            callback_data: AB_TEST_ACTIONS.FOCUS_PAY,
          },
        ],
        [
          {
            text: 'Я ВЖЕ ОПЛАТИВ / ОПЛАТИЛА',
            callback_data: AB_TEST_ACTIONS.FOCUS_ALREADY_PAID,
          },
        ],
        [
          {
            text: absystemButtons.continue,
            callback_data: 'return_main_menu',
          },
        ],
      ],
      blocks: [],
    },
    'reply'
  )
  await planAck(
    ctx,
    'ctx.answerCbQuery',
    'ab_test_menu_ack',
    abTestMenuContent.cta.continue
  ).catch(() => undefined)
  return true
}

// ============================================================================
// SUBSCRIPTION HANDLER
// ============================================================================

export async function handleSubscription(
  ctx: Context,
  userId: string
): Promise<boolean> {
  await ctx.answerCbQuery().catch(() => null)
  const { renderFocusSubscriptionCard } = await import('./flow.js')
  await renderFocusSubscriptionCard(ctx, userId)
  await planAck(ctx, 'ctx.answerCbQuery', 'ab_test_subscription_ack').catch(
    () => undefined
  )
  return true
}

// ============================================================================
// EDIT HANDLER
// ============================================================================

export async function handleEdit(
  ctx: Context,
  userId: string,
  questionId: string
): Promise<boolean> {
  const progress = getAbTestProgressFromUiSettings(
    await loadUserUiSettings(userId)
  )
  const next = buildAbTestProgressPatch(progress, {
    status: 'active',
    stage: 'S2_TEST_QUESTIONS',
    current_question_id: questionId as AbTestQuestionId,
    last_callback_key: `ab_test_edit:${questionId}`,
    last_event_at: new Date().toISOString(),
  })
  await saveAbTestProgress(userId, next)
  await sendQuestionDirect(
    ctx,
    next.current_question_id ?? questionId,
    next.revision
  )
  await planAck(
    ctx,
    'ctx.answerCbQuery',
    'ab_test_edit_ack',
    absystemContent.RESUME_FLOW.EDIT_OPENING
  ).catch(() => undefined)
  return true
}

// ============================================================================
// OPEN FAQ HANDLER
// ============================================================================

export async function handleOpenFaq(
  ctx: Context,
  userId: string
): Promise<boolean> {
  const currentFocusProgress = await loadAbTestProgress(userId)
  if (isAbTestFocusFunnelLocked(currentFocusProgress)) {
    await renderCurrentView(ctx, userId, currentFocusProgress)
    await planAck(
      ctx,
      'ctx.answerCbQuery',
      'ab_test_open_faq_blocked',
      'Повертаю у ФОКУС-воронку'
    ).catch(() => undefined)
    return true
  }

  await planMessage(
    ctx,
    'ctx.reply',
    'ab_test_open_faq',
    'Оберіть питання:',
    buildFaqKeyboard() as {
      inline_keyboard: Array<Array<{ text: string; callback_data: string }>>
    }
  )
  await planAck(ctx, 'ctx.answerCbQuery', 'ab_test_open_faq_ack').catch(
    () => undefined
  )
  return true
}

// ============================================================================
// FAQ ITEM HANDLER
// ============================================================================

export async function handleFaqItem(
  ctx: Context,
  action: FaqCallbackData
): Promise<boolean> {
  const faqItem = getFaqItem(action)
  if (!faqItem) {
    return false
  }

  const chatId = ctx.chat?.id ?? ctx.from?.id
  if (!chatId) {
    return true
  }

  const replyMarkup = faqItem.ctaCallback && faqItem.cta
    ? {
        inline_keyboard: [
          [
            {
              text: faqItem.cta,
              callback_data: faqItem.ctaCallback,
            },
          ],
        ],
      }
    : undefined

  const faqBlocks =
    'blocks' in faqItem && faqItem.blocks
      ? [...faqItem.blocks]
      : splitTelegramContentBlocks(faqItem.text.split('\n'))

  await sendTelegramContentChunk(
    ctx,
    chatId,
    '',
    faqBlocks,
    {
      inlineKeyboard: replyMarkup,
      parseMode: 'HTML',
      separateBlocks: true,
    }
  )
  await planAck(ctx, 'ctx.answerCbQuery', 'ab_test_faq_item_ack').catch(
    () => undefined
  )
  return true
}

// ============================================================================
// FOCUS INFO HANDLER
// ============================================================================

export async function handleFocusInfo(
  ctx: Context
): Promise<boolean> {
  const chatId = ctx.chat?.id ?? ctx.from?.id
  if (!chatId) {
    return true
  }

  const { BLOCK10_FOCUS } = await import('../content/abTest.results.js')
  const focusBlocks =
    BLOCK10_FOCUS.blocks
      ? [...BLOCK10_FOCUS.blocks]
      : splitTelegramContentBlocks(BLOCK10_FOCUS.text.split('\n'))

  await sendTelegramContentChunk(
    ctx,
    chatId,
    '',
    focusBlocks,
    {
      inlineKeyboard: {
        inline_keyboard: [
          [
            {
              text: 'ОПЛАТИТИ ФОКУС',
              callback_data: AB_TEST_ACTIONS.FOCUS_PAY,
            },
          ],
        ],
      },
      parseMode: 'HTML',
      separateBlocks: true,
    }
  )
  await planAck(ctx, 'ctx.answerCbQuery', 'ab_test_focus_info_ack').catch(
    () => undefined
  )
  return true
}

// ============================================================================
// PLAY AUDIO HANDLER
// ============================================================================

export async function handlePlayAudio(
  ctx: Context,
  resultKey: string
): Promise<boolean> {
  await ctx.answerCbQuery('Надсилаю голосове...').catch(() => null)
  const chatId = ctx.chat?.id ?? ctx.from?.id
  if (!chatId) {
    return true
  }

  const { getAbTestResultDefinition } = await import('../content/abTest.results.js')
  const resultDef = getAbTestResultDefinition(resultKey as AbTestResultKey)
  const audioBlocks = (resultDef.blocks?.intro ?? []).slice(1)
  if (!audioBlocks.length) {
    return true
  }

  await sendTelegramContentChunk(ctx, chatId, '', audioBlocks, {
    parseMode: 'HTML',
    separateBlocks: true,
  })
  return true
}

// ============================================================================
// Q1 DIRECT HANDLER
// ============================================================================

export async function handleQ1Direct(
  ctx: Context,
  userId: string
): Promise<boolean> {
  await ctx.answerCbQuery().catch(() => null)
  const progress = await loadAbTestProgress(userId)
  const questionId =
    progress.current_question_id
    ?? resolveAbTestQuestionOrder()[progress.answers.length]
    ?? 'q1'
  await sendQuestionDirect(
    ctx,
    questionId,
    Number(progress.revision ?? 1)
  )
  return true
}

// ============================================================================
// START WHEEL HANDLER
// ============================================================================

export async function handleStartWheel(
  ctx: Context
): Promise<boolean> {
  await ctx.answerCbQuery().catch(() => null)
  const chatId = ctx.chat?.id ?? ctx.from?.id
  if (!chatId) {
    return true
  }

  const { BLOCK9_POST_RESULT } = await import('../content/abTest.results.js')
  await sendTelegramContentChunk(
    ctx,
    chatId,
    '',
    splitTelegramContentBlocks(BLOCK9_POST_RESULT.text.split('\n')),
    {
      inlineKeyboard: {
        inline_keyboard: [
          [
            {
              text: BLOCK9_POST_RESULT.cta,
              callback_data: BLOCK9_POST_RESULT.callbackData,
            },
          ],
        ],
      },
      parseMode: 'HTML',
      separateBlocks: true,
    }
  )
  return true
}

// ============================================================================
// HELPERS
// ============================================================================

function escapeHtml(value: string): string {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;')
}
