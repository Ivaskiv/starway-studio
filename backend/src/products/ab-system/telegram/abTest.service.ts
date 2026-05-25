//backend/src/products/ab-system/telegram/abTest.service.ts
import type { Prisma } from '@starway/db/prisma-client'
import type { Context } from 'telegraf'

import { buildAbTestQuestionFlow } from '../../../core/flow-builder/flowBuilder.js'
import {
  buildAbTestProgressPatch,
  cloneAbTestProgress,
  normalizeAbTestProgress,
  validateAbTestProgress,
  resolveAbTestAnswerLatency,
  resolveAbTestNextQuestion,
  resolveAbTestQuestionOrder,
  resolveAbTestResultKey,
  type AbTestAnswer,
  type AbTestProgress,
} from '../../../core/state-machine/abTestFoundation.js'
import { deliverTelegramFlow } from '../../../core/transport/telegramTransport.js'
import { absystemButtons, absystemContent } from '@/products/absystem/config/absystem.content.js'
import { abTestContent } from '../content/abTest.content.js'
import {
  buildFaqKeyboard,
  getFaqItem,
  type FaqCallbackData,
} from '../content/abTest.faq.js'
import { abTestMenuContent } from '../content/abTest.menu.js'
import { getAbTestQuestion } from '../content/abTest.questions.js'
import { BLOCK10_FOCUS, BLOCK9_POST_RESULT, getAbTestResultDefinition } from '../content/abTest.results.js'
import {
  handleAiSellerCallback,
  resolveAiSellerMode,
} from './abTest.aiSeller.js'
import { buildEcosystemPaymentCheckoutSession } from '../../../modules/subscriptions/payments/business.js'
import { withDevTestPaymentButton } from '../../../modules/telegram-mentor/keyboards.js'
import { trackAbTestEvent } from './abTest.analytics.js'
import { buildWebAppButton, resolveBrowserTestUrlOrNull } from './abTest.buttons.js'
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
} from './abTest.views.js'
import { planAck, planMessage } from '../../../modules/telegram-mentor/conversation/delivery/planDelivery.js'
import { hasActiveFocusSubscription } from '@/modules/subscriptions/payments/focus.access.js'
import { getConfiguredFocusProduct } from '@/modules/subscriptions/payments/focus.access.js'
import { sendAbTestBlock12Welcome } from '@/modules/subscriptions/payments/callback.notifications.js'
import { getOrCreateFocusInviteLink } from '@/products/focus/payments/inviteLink.js'
import { markAbTestPaymentSuccess } from './abTest.markers.js'
import { attachEmailToUser } from '../../../modules/user/identity.service.js'
import { upsertTelegramBinding } from '../../../modules/telegram-mentor/services/linking.service.js'
import { buildWebDeepLink, generateDeepLink } from '../../../modules/deeplinks/service.js'
import { sendMagicLoginEmail } from '../../../modules/auth/mail.service.js'
import { AB_TEST_ACTIONS } from '@/packages/abTestActions.js'
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

const AB_TEST_START_DEBUG_PREFIX = '[AB_TEST_START_DEBUG]'

function logAbTestStartDebug(event: string, payload: Record<string, unknown>) {
  console.info(AB_TEST_START_DEBUG_PREFIX, event, payload)
}

function logFlowStart(event: string, payload: Record<string, unknown>) {
  console.info('[FLOW_START]', event, payload)
}

function logFlowResume(event: string, payload: Record<string, unknown>) {
  console.info('[FLOW_RESUME]', event, payload)
}

function logFlowRender(event: string, payload: Record<string, unknown>) {
  console.info('[FLOW_RENDER]', event, payload)
}

function logMessageSent(event: string, payload: Record<string, unknown>) {
  console.info('[MESSAGE_SENT]', event, payload)
}

function logCallbackReceived(payload: Record<string, unknown>) {
  console.info('[CALLBACK_RECEIVED]', payload)
}

function logCallbackHandled(payload: Record<string, unknown>) {
  console.info('[CALLBACK_HANDLED]', payload)
}

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

function isValidEmail(value: string): boolean {
  const normalized = value.trim().toLowerCase()
  if (!normalized || normalized.length > 254) return false
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalized)
}

// FIX 2025-05-25 C: shared direct sender for question rendering used by resume and answer flow.
async function sendQuestionDirect(
  ctx: Context,
  questionId: ReturnType<typeof resolveAbTestQuestionOrder>[number],
  revision: number,
): Promise<void> {
  const chatId = ctx.chat?.id ?? ctx.from?.id
  if (!chatId) return
  const question = getAbTestQuestion(questionId)
  const questionNumber = resolveAbTestQuestionOrder().indexOf(question.question_id) + 1
  await ctx.telegram.sendMessage(
    chatId,
    `Питання ${questionNumber} з 8\n\n${question.prompt}`,
    {
      reply_markup: {
        inline_keyboard: question.answers.map((answer) => ([{
          text: answer.text,
          callback_data: `ab_test_answer:${question.question_id}:${answer.id}:${revision}`,
        }])),
      },
    },
  )
}

async function sendAbTestEmailStep(ctx: Context): Promise<void> {
  await planMessage(
    ctx,
    'ctx.reply',
    'ab_test_email_step',
    [
      'Введіть email, щоб:',
      '— зберегти ваш результат',
      '— продовжити з будь-якого пристрою',
      '— отримати персональні рекомендації після тесту',
      '',
      'Можна пропустити на цьому кроці.',
    ].join('\n'),
    {
      inline_keyboard: [
        [{ text: 'Продовжити', callback_data: 'ab_test:email_continue' }],
        [{ text: 'Пропустити поки що', callback_data: 'ab_test:email_skip' }],
      ],
    },
  )
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
  // FIX 2026-05-25 C2: temporary start-flow diagnostic log
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
  const firstQuestion = getAbTestQuestion(questionIdToOpen)

  const flow = buildAbTestQuestionFlow(next, questionIdToOpen, next.revision)

  flow.body = [firstQuestion.prompt]

  await deliverTelegramFlow(ctx, flow, 'reply')
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

export async function resumeAbTestFlow(
  ctx: Context,
  userId: string
): Promise<void> {
  logFlowResume('entered', {
    userId,
    chatId: String(ctx.chat?.id ?? ''),
    fromId: String(ctx.from?.id ?? ''),
  })
  // FIX 2025-05-25 B1: ack immediately for answer callbacks before any async work
  await ctx.answerCbQuery().catch(() => null)
  const progress = await loadAbTestProgress(userId)
  const validation = validateAbTestProgress(progress)
  if (!validation.resumable) {
    await renderAbTestIntro(ctx, userId, 'ab_test:auto_reentry')
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

export async function handleAbTestEmailCaptureText(
  ctx: Context,
  userId: string,
  text: string
): Promise<boolean> {
  const progress = await loadAbTestProgress(userId)
  if (progress.email_stage !== 'pending') {
    return false
  }

  const normalizedEmail = text.trim().toLowerCase()
  if (!isValidEmail(normalizedEmail)) {
    await planMessage(ctx, 'ctx.reply', 'ab_test_email_invalid', 'Схоже, це не email. Введіть коректний email або натисніть «Пропустити поки що».')
    return true
  }

  await attachEmailToUser(userId, normalizedEmail)

  const chatId = String(ctx.chat?.id ?? '').trim()
  const telegramUserId = String(ctx.from?.id ?? '').trim()
  if (chatId && telegramUserId) {
    await upsertTelegramBinding({
      userId,
      chatId,
      telegramUserId,
      telegramUserName: ctx.from?.username ?? null,
      firstName: ctx.from?.first_name ?? null,
    })
  }

  const deepLink = await generateDeepLink({
    userId,
    action: 'magic_login',
    source: 'telegram',
    target: 'web',
    path: '/onboarding/continue',
    payload: { origin: 'ab_test_email_capture' } satisfies Prisma.InputJsonValue,
  })
  const magicLoginUrl = buildWebDeepLink(deepLink.token, deepLink.path)
  const mailSent = await sendMagicLoginEmail({
    to: normalizedEmail,
    loginUrl: magicLoginUrl,
  })

  const next = buildAbTestProgressPatch(progress, {
    email_stage: 'captured',
    email_captured_at: new Date().toISOString(),
    last_event_at: new Date().toISOString(),
  })
  await saveAbTestProgress(userId, next)

  await planMessage(
    ctx,
    'ctx.reply',
    'ab_test_email_saved',
    mailSent
      ? 'Email збережено. Ми надіслали магічне посилання для входу в платформу.'
      : 'Email збережено. Відкрити платформу можна одразу з цього посилання:',
    {
      inline_keyboard: [[{ text: 'Відкрити платформу', url: magicLoginUrl }]],
    },
  )

  await startAbTestFlow(ctx, userId, AB_TEST_ACTIONS.START)
  return true
}

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

  if (await handleAiSellerCallback(ctx, action)) {
    logCallbackHandled({
      action,
      handled: true,
      reason: 'ai_seller',
    })
    logAbTestStartDebug('callback:handled_by_ai_seller', { action })
    return true
  }

  if (action === 'ab_test:start_wheel' || action === 'start_wheel') {
    // FIX 2025-05-25 C: Block 9 after [Що з цим робити?] with direct send
    await ctx.answerCbQuery().catch(() => null)
    const chatId = ctx.chat?.id ?? ctx.from?.id
    if (!chatId) {
      return true
    }
    await ctx.telegram.sendMessage(
      chatId,
      BLOCK9_POST_RESULT.text,
      {
        parse_mode: 'Markdown',
        reply_markup: {
          inline_keyboard: [[{ text: BLOCK9_POST_RESULT.cta, callback_data: BLOCK9_POST_RESULT.callbackData }]],
        },
      },
    )
    return true
  }

  const focusPaymentAction = action.match(/^open_focus_payment(?::(1month|3month))?$/)
  if (focusPaymentAction) {
    // FIX 2025-05-25 D1: direct send Block 10 with robust fallback and diagnostics.
    await ctx.answerCbQuery().catch(() => null)
    const payingUserId = (ctx.state as { userId?: string | null }).userId ?? null
    const chatId = ctx.chat?.id ?? ctx.from?.id
    console.log('[FOCUS_PAY] reached', { userId: payingUserId, chatId: ctx.chat?.id })
    if (!chatId) {
      return true
    }
    const url1m = process.env.WAYFORPAY_FOCUS_1M_URL
      ?? process.env.FOCUS_1M_URL
      ?? process.env.WAYFORPAY_FOCUS_LANDING_URL
      ?? 'https://wayforpay.com'
    const url3m = process.env.WAYFORPAY_FOCUS_3M_URL
      ?? process.env.FOCUS_3M_URL
      ?? process.env.WAYFORPAY_FOCUS_LANDING_URL
      ?? 'https://wayforpay.com'
    const text = BLOCK10_FOCUS?.text
      ?? 'ФОКУС | Zoom-практики AB System\n\n'
      + 'ФОКУС — це живі Zoom-практики раз на тиждень.\n'
      + 'Ти приходиш із реальною ситуацією:\n'
      + '— що відкладаєш,\n'
      + '— яке рішення переносиш,\n'
      + '— яка ціль не рухається.\n\n'
      + 'Тарифи:\n'
      + '1 місяць — 780 грн\n'
      + '3 місяці — 1990 грн'
    const cta1m = BLOCK10_FOCUS?.cta_1m ?? 'Оплатити 1 місяць — 780 грн'
    const cta3m = BLOCK10_FOCUS?.cta_3m ?? 'Оплатити 3 місяці — 1990 грн'
    try {
      await ctx.telegram.sendMessage(
        chatId,
        text,
        {
          parse_mode: 'Markdown',
          reply_markup: {
            inline_keyboard: [
              [{ text: cta1m, url: url1m }],
              [{ text: cta3m, url: url3m }],
            ],
          },
        },
      )
      console.log('[FOCUS_PAY] sent ok', { userId: payingUserId, chatId })
    } catch (error) {
      console.error('[FOCUS_PAY] FAILED', error)
    }
    if (payingUserId) {
      // FIX 2025-05-25 D2: non-blocking save.
      loadAbTestProgress(payingUserId)
        .then((progressAfterFocusClick) =>
          saveAbTestProgress(
            payingUserId,
            buildAbTestProgressPatch(progressAfterFocusClick, {
              focus_opened_at: progressAfterFocusClick.focus_opened_at ?? new Date().toISOString(),
              last_event_at: new Date().toISOString(),
            }),
          )
        )
        .catch((error: Error) =>
          console.error('[FOCUS_PAYMENT] save progress failed', error)
        )
    }
    return true
  }

  if (action === 'resend_focus_block12') {
    const targetUserId = (ctx.state as { userId?: string | null }).userId ?? null
    if (!targetUserId) {
      await planMessage(ctx, 'ctx.reply', 'ab_test_resend_missing_user', 'Не вдалося відновити доступ: користувача не знайдено.')
      await planAck(ctx, 'ctx.answerCbQuery', 'ab_test_resend_missing_user_ack').catch(() => undefined)
      return true
    }
    const hasActiveFocus = await hasActiveFocusSubscription(targetUserId)
    if (!hasActiveFocus) {
      await planMessage(ctx, 'ctx.reply', 'ab_test_resend_inactive', 'Підписка ФОКУС неактивна. Спочатку активуй підписку.')
      await planAck(ctx, 'ctx.answerCbQuery', 'ab_test_resend_inactive_ack').catch(() => undefined)
      return true
    }
    await markAbTestPaymentSuccess(targetUserId)
    await sendAbTestBlock12Welcome(targetUserId)
    await planMessage(ctx, 'ctx.reply', 'ab_test_resend_sent', 'Доступ повторно надіслано. Перевір повідомлення з інвайтом.')
    await planAck(ctx, 'ctx.answerCbQuery', 'ab_test_resend_sent_ack').catch(() => undefined)
    return true
  }

  // [FIX] ТЗ Блоки 16-21: FAQ відповіді
  if (action === AB_TEST_ACTIONS.OPEN_FAQ) {
    await planMessage(ctx, 'ctx.reply', 'ab_test_open_faq', 'Оберіть питання:', buildFaqKeyboard() as { inline_keyboard: Array<Array<{ text: string; callback_data: string }>> })
    await planAck(ctx, 'ctx.answerCbQuery', 'ab_test_open_faq_ack').catch(() => undefined)
    return true
  }

  if (action === AB_TEST_ACTIONS.FOCUS_INFO) {
    await planMessage(ctx, 'ctx.reply', 'ab_test_focus_info', BLOCK10_FOCUS.text, {
      inline_keyboard: [[
        { text: 'Оплатити ФОКУС', callback_data: AB_TEST_ACTIONS.FOCUS_PAY },
      ]],
    }, 'Markdown')
    await planAck(ctx, 'ctx.answerCbQuery', 'ab_test_focus_info_ack').catch(() => undefined)
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
    await planMessage(ctx, 'ctx.reply', 'ab_test_faq_item', faqItem.text, replyOptions?.reply_markup, 'Markdown')
    await planAck(ctx, 'ctx.answerCbQuery', 'ab_test_faq_item_ack').catch(() => undefined)
    return true
  }

  // FIX 2025-05-25 D: question 1 after [Продовжити]
  if (action === 'ab_test:q1') {
    await ctx.answerCbQuery().catch(() => null)
    const q1ChatId = ctx.chat?.id
    if (!q1ChatId) {
      return true
    }
    const q1UserId = (ctx.state as { userId?: string | null }).userId ?? null
    if (!q1UserId) {
      return true
    }
    const progress = await loadAbTestProgress(q1UserId)
    const revision = Number(progress.revision ?? 1)
    const q1Question = getAbTestQuestion('q1')
    // FIX 2025-05-25 F2: send q1 using canonical answer ids to keep parser-compatible flow
    await ctx.telegram.sendMessage(
      q1ChatId,
      `Питання 1 з 8\n\n${q1Question.prompt}`,
      {
        reply_markup: {
          inline_keyboard: q1Question.answers.map((answer) => ([{
            text: answer.text,
            callback_data: `ab_test_answer:q1:${answer.id}:${revision}`,
          }])),
        },
      },
    )
    return true
  }

  const parsed = parseAbTestCallback(action)
  // FIX 2026-05-25 C2: temporary callback diagnostic log with parsed kind
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

  const userId = (ctx.state as { userId?: string | null }).userId ?? null
  if (!userId) {
    logCallbackHandled({
      action,
      handled: true,
      reason: 'missing_user_id',
      kind: parsed.kind,
    })
    logAbTestStartDebug('callback:missing_user_id', {
      action,
      kind: parsed.kind,
    })
    await planAck(
      ctx,
      'ctx.answerCbQuery',
      'ab_test_missing_user_ack',
      abTestContent.errors.invalid.join(' ')
    )
      .catch(() => undefined)
    return true
  }

  if (parsed.kind === 'intro') {
    logFlowStart('legacy_intro_redirected_to_start', {
      userId,
      action,
    })
    await startAbTestFlow(ctx, userId, 'legacy_intro_callback')
    await planAck(ctx, 'ctx.answerCbQuery', 'ab_test_intro_ack').catch(() => undefined)
    logCallbackHandled({
      action,
      handled: true,
      reason: 'legacy_intro_redirect_to_start',
      userId,
    })
    return true
  }

  if (parsed.kind === 'entry') {
    await renderAbTestEntry(ctx, userId, action)
    await planAck(ctx, 'ctx.answerCbQuery', 'ab_test_entry_ack').catch(() => undefined)
    logCallbackHandled({
      action,
      handled: true,
      reason: 'entry_flow_rendered',
      userId,
    })
    return true
  }

  if (parsed.kind === 'restart') {
    // FIX 2025-05-25 D: restart — reset progress and send MSG1 directly.
    await ctx.answerCbQuery().catch(() => null)
    await saveAbTestProgress(userId, normalizeAbTestProgress(undefined))
    const chatId = ctx.chat?.id ?? ctx.from?.id
    if (chatId) {
      await ctx.telegram.sendMessage(
        chatId,
        'Привіт.\n'
        + 'Це тест AB System:\n'
        + '«Чому ти відкладаєш те, що давно хочеш зробити?»\n\n'
        + 'Він допоможе побачити, чому ти знову переносиш важливе і з чого почати.\n'
        + 'Тут не буде складних питань.\n'
        + 'Просто відповідай так, як є зараз.',
        {
          reply_markup: {
            inline_keyboard: [[
              { text: 'Почати тест', callback_data: 'ab_test:start' },
            ]],
          },
        },
      )
    }
    return true
  }

  if (parsed.kind === 'resume') {
    // FIX 2025-05-25 C: resume — continue from next unanswered question.
    await ctx.answerCbQuery().catch(() => null)
    const progress = await loadAbTestProgress(userId)
    const answers = progress.answers ?? []
    const nextQ = answers.length + 1
    if (nextQ > 8) {
      const resultKey = progress.result_key
      if (resultKey) {
        const resultDef = getAbTestResultDefinition(resultKey)
        const chatId = ctx.chat?.id ?? ctx.from?.id
        if (chatId) {
          await ctx.telegram.sendMessage(
            chatId,
            `${resultDef.title}\n\n${resultDef.body}`,
            {
              reply_markup: {
                inline_keyboard: [[{
                  text: 'Що з цим робити?',
                  callback_data: 'ab_test:start_wheel',
                }]],
              },
            },
          )
        }
      }
      return true
    }
    const questionId = resolveAbTestQuestionOrder()[nextQ - 1]
    if (questionId) {
      await sendQuestionDirect(ctx, questionId, progress.revision)
    }
    return true
  }

  if (parsed.kind === 'show_result') {
    // FIX 2025-05-25 E: show_result — return saved result or fallback to start.
    await ctx.answerCbQuery().catch(() => null)
    const progress = await loadAbTestProgress(userId)
    const resultKey = progress.result_key
    const chatId = ctx.chat?.id ?? ctx.from?.id
    if (!chatId) return true
    if (!resultKey) {
      await ctx.telegram.sendMessage(
        chatId,
        'Результат не знайдено. Спробуй пройти тест заново.',
        {
          reply_markup: {
            inline_keyboard: [[{
              text: 'Почати тест',
              callback_data: 'ab_test:start',
            }]],
          },
        },
      )
      return true
    }
    const resultDef = getAbTestResultDefinition(resultKey)
    await ctx.telegram.sendMessage(
      chatId,
      `${resultDef.title}\n\n${resultDef.body}`,
      {
        reply_markup: {
          inline_keyboard: [[{
            text: 'Що з цим робити?',
            callback_data: 'ab_test:start_wheel',
          }]],
        },
      },
    )
    return true
  }

  if (parsed.kind === 'email_continue') {
    const progress = await loadAbTestProgress(userId)
    const next = buildAbTestProgressPatch(progress, {
      email_stage: 'pending',
      last_event_at: new Date().toISOString(),
    })
    await saveAbTestProgress(userId, next)
    await planMessage(ctx, 'ctx.reply', 'ab_test_email_continue_prompt', 'Введіть email одним повідомленням у цьому чаті.')
    await planAck(ctx, 'ctx.answerCbQuery', 'ab_test_email_continue_ack').catch(() => undefined)
    return true
  }

  if (parsed.kind === 'email_skip') {
    const progress = await loadAbTestProgress(userId)
    const next = buildAbTestProgressPatch(progress, {
      email_stage: 'skipped',
      last_event_at: new Date().toISOString(),
    })
    await saveAbTestProgress(userId, next)
    await startAbTestFlow(ctx, userId, action)
    await planAck(ctx, 'ctx.answerCbQuery', 'ab_test_email_skip_ack').catch(() => undefined)
    return true
  }

  if (parsed.kind === 'start') {
    // FIX 2025-05-25 C: MSG2 direct send after [Почати тест]
    await ctx.answerCbQuery().catch(() => null)
    const startChatId = ctx.chat?.id
    if (!startChatId) {
      return true
    }
    // FIX 2025-05-25 D: bypass orchestrator dedupe for direct start flow message
    await ctx.telegram.sendMessage(
      startChatId,
      'У тесті буде 8 питань.\n'
      + 'Обирай той варіант, який найбільше схожий на тебе зараз.\n\n'
      + 'Не треба відповідати «правильно».\n'
      + 'Треба чесно.',
      {
        reply_markup: {
          inline_keyboard: [[
            { text: 'Продовжити', callback_data: 'ab_test:q1' },
          ]],
        },
      },
    )
    logAbTestStartDebug('callback:start_pressed', {
      action,
      userId,
      chatId: String(ctx.chat?.id ?? ''),
    })
    // FIX 2025-05-25 B2: do not set active question stage before first answer (prevents auto-recovery reset)
    const currentProgress = await loadAbTestProgress(userId)
    const warmedProgress = buildAbTestProgressPatch(currentProgress, {
      started_at: currentProgress.started_at ?? new Date().toISOString(),
      last_callback_key: action,
      last_event_at: new Date().toISOString(),
    })
    await saveAbTestProgress(userId, warmedProgress)
    // DISABLED 2025-05-25: replaced by direct send fix
    // await startAbTestFlow(ctx, userId, action)
    // DISABLED 2025-05-25: replaced by direct ack fix
    // await planAck(ctx, 'ctx.answerCbQuery', 'ab_test_start_ack', absystemButtons.startTest).catch(() => undefined)
    logCallbackHandled({
      action,
      handled: true,
      reason: 'start_flow_executed',
      userId,
    })
    logAbTestStartDebug('callback:start_completed', {
      action,
      userId,
    })
    return true
  }

  if (parsed.kind === 'restore') {
    await resumeAbTestFlow(ctx, userId)
    await planAck(
      ctx,
      'ctx.answerCbQuery',
      'ab_test_restore_ack',
      absystemButtons.restoreProgress
    )
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
          [{ text: 'Пройти тест', callback_data: AB_TEST_ACTIONS.ENTRY }],
          [
            {
              text: absystemButtons.restoreProgress,
              callback_data: 'ab_test:restore',
            },
          ],
          [
            {
              text: 'Дізнатись про ФОКУС',
              callback_data: AB_TEST_ACTIONS.FOCUS_INFO,
            },
          ],
          [
            {
              text: 'Оплатити ФОКУС',
              callback_data: AB_TEST_ACTIONS.FOCUS_PAY,
            },
          ],
          [
            {
              text: 'Я вже оплатив / оплатила',
              callback_data: AB_TEST_ACTIONS.FOCUS_ALREADY_PAID,
            },
          ],
          [
            {
              text: absystemButtons.continue,
              callback_data: 'return_main_menu',
            },
          ],
          [{ text: 'Задати питання', callback_data: AB_TEST_ACTIONS.OPEN_FAQ }],
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
    )
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
    await planAck(
      ctx,
      'ctx.answerCbQuery',
      'ab_test_edit_ack',
      absystemContent.RESUME_FLOW.EDIT_OPENING
    )
      .catch(() => undefined)
    return true
  }

  const progress = await loadAbTestProgress(userId)
  const questionOrder = resolveAbTestQuestionOrder()
  const expectedQuestionId = questionOrder[progress.answers.length] ?? null

  if (progress.status === 'completed') {
    await renderCurrentView(ctx, userId, progress)
    await planAck(ctx, 'ctx.answerCbQuery', 'ab_test_completed_ack').catch(() => undefined)
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
    await planAck(
      ctx,
      'ctx.answerCbQuery',
      'ab_test_stale_question_ack',
      abTestContent.errors.stale.join(' ')
    )
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
    await planAck(
      ctx,
      'ctx.answerCbQuery',
      'ab_test_replay_rejected_ack',
      abTestContent.errors.stale.join(' ')
    )
      .catch(() => undefined)
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
    )
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
  const callbackMessage = ctx.callbackQuery?.message
  if (callbackMessage && 'message_id' in callbackMessage && callbackMessage.message_id) {
    const updatedKeyboard = question.answers.map((answer) => ([{
      // FIX 2025-05-25 C1: mark selected answer on current question before moving to next.
      text: answer.id === selected.id ? `✅ ${answer.text}` : answer.text,
      callback_data: `ab_test_answer:${parsed.questionId}:${answer.id}:${next.revision}`,
    }]))
    await ctx.telegram.editMessageReplyMarkup(
      callbackMessage.chat.id,
      callbackMessage.message_id,
      undefined,
      { inline_keyboard: updatedKeyboard },
    ).catch(() => null)
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

  // ── COMPLETE (8th answer) ──────────────────────────────────
  if (complete && resultKey) {
    const chatId = ctx.chat?.id ?? ctx.from?.id
    if (!chatId) {
      return true
    }
    const scheduled = await scheduleFollowups(userId, next, 'S3_TEST_RESULT')
    const finalProgress = await saveAbTestProgress(userId, scheduled)
    const resultDef = getAbTestResultDefinition(resultKey)
    // FIX 2025-05-25 E1: summary message removed; replaced by inline checkmarks.
    // FIX 2025-05-25 B3: direct send result to bypass orchestrator timeout/retry paths
    await ctx.telegram.sendMessage(
      chatId,
      `${resultDef.title}\n\n${resultDef.body}`,
      {
        reply_markup: {
          inline_keyboard: [[
            {
              text: 'Що з цим робити?',
              callback_data: 'ab_test:start_wheel',
            },
          ]],
        },
      },
    )
    // DISABLED 2025-05-25: replaced by direct send fix
    // await sendLogMessage(ctx, finalProgress)
    // await renderCurrentView(ctx, userId, finalProgress)
    // await planAck(ctx, 'ctx.answerCbQuery', 'ab_test_complete_result_ack').catch(() => undefined)
    return true
    // [FIX] early return — does NOT fall through to next question render
  }

  // ── NON-COMPLETE (questions 1-7) ──────────────────────────
  const nextQuestion = nextQuestionId ? getAbTestQuestion(nextQuestionId) : null
  if (!nextQuestion) {
    await renderCurrentView(ctx, userId, next)
    await planAck(
      ctx,
      'ctx.answerCbQuery',
      'ab_test_next_question_missing_ack',
      abTestContent.progress.resumeHint
    )
      .catch(() => undefined)
    return true
  }

  // [FIX] use next.stage not hardcoded 'S3_TEST_RESULT'
  const scheduled = await scheduleFollowups(userId, next, next.stage)
  const finalProgress = await saveAbTestProgress(userId, scheduled)
  const chatId = ctx.chat?.id ?? ctx.from?.id
  if (!chatId) {
    return true
  }
  // FIX 2025-05-25 B2: direct send next question to bypass orchestrator timeout/retry paths
  await sendQuestionDirect(ctx, nextQuestion.question_id, finalProgress.revision)
  // DISABLED 2025-05-25: replaced by direct send fix
  // const flow = buildAbTestQuestionFlow(
  //   finalProgress,
  //   nextQuestion.question_id,
  //   finalProgress.revision
  // )
  // flow.body = [nextQuestion.prompt]
  // await deliverTelegramFlow(ctx, flow, 'reply')
  // await planAck(ctx, 'ctx.answerCbQuery', 'ab_test_next_question_ack').catch(() => undefined)
  return true
}

export async function renderAbTestIntro(
  ctx: Context,
  userId: string,
  payload?: string | null
): Promise<void> {
  logAbTestStartDebug('entry:render_intro', {
    userId,
    payload: payload ?? null,
    chatId: String(ctx.chat?.id ?? ''),
    buttonCallbackData: AB_TEST_ACTIONS.ENTRY,
    buttonText: 'Далі',
  })
  // FIX 2025-05-25 C4: direct send test — remove after webhook/queue diagnosis is confirmed
  try {
    await ctx.reply('🔧 діагностика: render_intro досягнуто')
    console.log('[DIAG] direct ctx.reply — ok')
  } catch (error) {
    console.error('[DIAG] direct ctx.reply — FAILED:', error)
  }

  await planMessage(
    ctx,
    'ctx.reply',
    'ab_test_entry_intro',
    absystemContent.START_BLOCK1.MSG1,
    {
      inline_keyboard: [[{ text: 'Далі', callback_data: AB_TEST_ACTIONS.ENTRY }]],
    },
    'Markdown',
  )
  logMessageSent('start_block1_intro_with_next_sent', {
    userId,
    chatId: String(ctx.chat?.id ?? ''),
    cta: 'Далі',
    callback_data: AB_TEST_ACTIONS.ENTRY,
  })
}

export async function renderAbTestEntry(
  ctx: Context,
  userId: string,
  payload?: string | null
): Promise<void> {
  logAbTestStartDebug('entry:render_step2', {
    userId,
    payload: payload ?? null,
    chatId: String(ctx.chat?.id ?? ''),
    buttonCallbackData: AB_TEST_ACTIONS.START,
    buttonText: absystemContent.START_BLOCK1.CTA1,
  })

  void payload
  void userId

  await planMessage(
    ctx,
    'ctx.reply',
    'ab_test_entry_msg2',
    absystemContent.START_BLOCK1.MSG2,
    {
      inline_keyboard: [[{ text: absystemContent.START_BLOCK1.CTA1, callback_data: AB_TEST_ACTIONS.START }]],
    },
    'Markdown',
  )
  logMessageSent('start_block1_msg2_with_cta_sent', {
    userId,
    chatId: String(ctx.chat?.id ?? ''),
    cta: absystemContent.START_BLOCK1.CTA1,
    callback_data: AB_TEST_ACTIONS.START,
  })
}

export async function renderAbTestResume(
  ctx: Context,
  userId: string
): Promise<void> {
  const progress = await loadAbTestProgress(userId)
  await renderCurrentView(ctx, userId, progress)
}
