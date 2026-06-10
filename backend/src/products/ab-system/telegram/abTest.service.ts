//backend/src/products/ab-system/telegram/abTest.service.ts
import type { Prisma } from '@starway/db/prisma-client'
import type { Context, Telegraf } from 'telegraf'

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
import {
  absystemButtons,
  absystemContent,
  AB_TEST_START_STEP2,
} from '@/products/absystem/config/absystem.content.js'
import { prisma } from '../../../db/client.js'
import { abTestContent } from '../content/abTest.content.js'
import {
  buildFaqKeyboard,
  getFaqItem,
  type FaqCallbackData,
} from '../content/abTest.faq.js'
import { abTestMenuContent } from '../content/abTest.menu.js'
import { getAbTestQuestion } from '../content/abTest.questions.js'
import {
  BLOCK10_FOCUS,
  BLOCK9_POST_RESULT,
  getAbTestResultDefinition,
  interpolateFirstName,
  type AbTestResultKey,
} from '../content/abTest.results.js'
import {
  getTestDriveInsideSurface,
  getTestDriveInsideResponseSurface,
} from '../content/testDrive.content.js'
import {
  FOCUS_ALREADY_ACTIVE_MSG,
  FOCUS_PAYMENT_ISSUE_COACH_MSG,
  FOCUS_PAYMENT_ISSUE_NO_USER_MSG,
  FOCUS_PAYMENT_ISSUE_USER_MSG,
  FOCUS_RESEND_MISSING_USER_MSG,
  FOCUS_RESEND_NO_SUB_MSG,
  FOCUS_RESEND_SUCCESS_MSG,
} from '../content/abTest.focus.js'
import {
  handleAiSellerCallback,
  resolveAiSellerMode,
} from './abTest.aiSeller.js'
import { buildEcosystemPaymentCheckoutSession } from '../../../modules/subscriptions/payments/business.js'
import { trackAbTestEvent } from './abTest.analytics.js'
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
import { cacheGet, cacheSet } from '../../../lib/cache/index.js'
import { clearPendingTelegramIdentity } from '../../../modules/telegram-mentor/services/pendingIdentity.service.js'
import { scheduleFollowups } from './abTest.scheduler.js'
import {
  renderCurrentView,
  renderAbTestPostEmailSubmitSequence,
  renderAbTestEmailGate,
  sendActionMessage,
} from './abTest.views.js'
import {
  planAck,
  planMessage,
} from '../../../modules/telegram-mentor/conversation/delivery/planDelivery.js'
import { hasActiveFocusSubscription } from '@/modules/subscriptions/payments/focus.access.js'
import { sendAbTestBlock12Welcome } from '@/modules/subscriptions/payments/callback.notifications.js'
import { markAbTestPaymentSuccess } from './abTest.markers.js'
import { attachEmailToUser } from '../../../modules/user/identity.service.js'
import { upsertTelegramBinding } from '../../../modules/telegram-mentor/services/linking.service.js'
import {
  buildWebDeepLink,
  generateDeepLink,
} from '../../../modules/deeplinks/service.js'
import { sendMagicLoginEmail } from '../../../modules/auth/mail.service.js'
import { AB_TEST_ACTIONS } from '@/packages/abTestActions.js'
import { alertCoachAboutPaymentIssue } from '@/modules/subscriptions/payments/coachAlert.service.js'
import { coachBot } from '../../../lib/telegram.js'
import { testOrchestrator } from '../../../core/orchestrator/testOrchestrator.js'
import { canSendAdvertising } from '@/modules/telegram-mentor/core/advertisingGuard.js'

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
const AB_TEST_EMAIL_SKIP_GUARD_TTL_MS = 10_000
const activeEmailSkipGuards = new Map<string, number>()

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

async function resolveAbTestEmailTargetUserId(
  ctx: Context,
  fallbackUserId: string
): Promise<string> {
  const chatId = String(ctx.chat?.id ?? '').trim()
  const telegramUserId = String(ctx.from?.id ?? '').trim()

  const candidate = await prisma.user.findFirst({
    where: {
      OR: [
        { id: fallbackUserId },
        ...(telegramUserId ? [{ telegramUserId }] : []),
        ...(chatId ? [{ telegramChatId: chatId }] : []),
      ],
    },
    select: { id: true },
  })

  return candidate?.id ?? fallbackUserId
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

const AB_TEST_EMAIL_SKIP_LOG_PREFIX = '[ab-test-email-skip]'

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

function firstNonEmptyUrl(...values: Array<string | null | undefined>): string {
  for (const value of values) {
    if (typeof value === 'string' && value.trim()) {
      return value.trim()
    }
  }
  return 'https://wayforpay.com'
}

function isTestPaymentEnabled(): boolean {
  return (
    process.env.NODE_ENV !== 'production' &&
    process.env.TEST_PAYMENT_ENABLED?.trim() === 'true'
  )
}

function formatSubscriptionDate(
  value: Date | string | null | undefined
): string {
  if (!value) return '—'
  const date = value instanceof Date ? value : new Date(value)
  if (!Number.isFinite(date.getTime())) return '—'
  return date.toLocaleDateString('uk-UA', { timeZone: 'Europe/Kyiv' })
}

function escapeHtml(value: string): string {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;')
}

async function claimEmailSkipGuard(userId: string): Promise<boolean> {
  const now = Date.now()
  const existing = activeEmailSkipGuards.get(userId)
  if (existing && existing > now) {
    return false
  }

  const cacheKey = `ab-test-email-skip:${userId}`
  if (await cacheGet<boolean>(cacheKey)) {
    return false
  }

  const expiresAt = now + AB_TEST_EMAIL_SKIP_GUARD_TTL_MS
  activeEmailSkipGuards.set(userId, expiresAt)
  void cacheSet(cacheKey, true, AB_TEST_EMAIL_SKIP_GUARD_TTL_MS / 1000)

  const timeout = setTimeout(() => {
    if (activeEmailSkipGuards.get(userId) === expiresAt) {
      activeEmailSkipGuards.delete(userId)
    }
  }, AB_TEST_EMAIL_SKIP_GUARD_TTL_MS)
  timeout.unref?.()
  return true
}

async function renderFocusSubscriptionCard(
  ctx: Context,
  userId: string
): Promise<void> {
  const focusProductId = '68c3e55a-4b70-4680-a26c-15fdd607fd59'
  const productName = 'ФОКУС'
  const productCode = 'focus'
  const currency = 'UAH'
  const [active, subscription, checkout, user] = await Promise.all([
    hasActiveFocusSubscription(userId).catch(() => false),
    prisma.productSubscription
      .findFirst({
        where: {
          userId,
          productId: focusProductId,
        },
        orderBy: { updatedAt: 'desc' },
        select: {
          id: true,
          status: true,
          amount: true,
          createdAt: true,
          updatedAt: true,
          paidAt: true,
          trialEndsAt: true,
          expiresAt: true,
          focusWelcomedAt: true,
          channelJoinedAt: true,
          manuallyGrantedBy: true,
          manualGrantNote: true,
          paymentIssueCount: true,
          lastPaymentIssueAt: true,
        },
      })
      .catch(() => null),
    prisma.checkoutSession
      .findFirst({
        where: { userId },
        orderBy: { createdAt: 'desc' },
        select: {
          status: true,
          amount: true,
          currency: true,
          createdAt: true,
          completedAt: true,
          lastOpenedAt: true,
          paymentIssueReportedAt: true,
        },
      })
      .catch(() => null),
    prisma.user
      .findUnique({
        where: { id: userId },
        select: { email: true },
      })
      .catch(() => null),
  ])

  if (!subscription) {
    await planMessage(
      ctx,
      'ctx.reply',
      'ab_test_subscription_missing',
      [
        '<b>Підписка ФОКУС</b>',
        '',
        'Статус: <code>не знайдено</code>',
        'Ще немає оформленої підписки.',
      ].join('\n'),
      {
        inline_keyboard: [
          [
            {
              text: 'Оплатити ФОКУС',
              callback_data: AB_TEST_ACTIONS.FOCUS_PAY,
            },
          ],
          [{ text: '← Меню', callback_data: 'ab_test:menu' }],
        ],
      },
      'HTML'
    )
    return
  }

  const statusValue = String(subscription.status ?? '—')
  const activeLabel = active ? 'так' : 'ні'
  const amountLabel =
    subscription.amount !== null && subscription.amount !== undefined
      ? `${subscription.amount} ${currency}`
      : '—'
  const inviteUrl = String(
    process.env.FOCUS_TELEGRAM_CHANNEL_INVITE_LINK ?? ''
  ).trim()
  const manualGrantLabel = subscription.manuallyGrantedBy
    ? `🔧 ручна активація: <code>${escapeHtml(subscription.manuallyGrantedBy)}</code>`
    : 'Автоактивація'
  const daysLeft = subscription.expiresAt
    ? Math.max(
        0,
        Math.ceil(
          (new Date(subscription.expiresAt).getTime() - Date.now()) / 86400000
        )
      )
    : null
  const manualGrantNoteLabel = subscription.manualGrantNote
    ? `Примітка: ${escapeHtml(subscription.manualGrantNote)}`
    : null
  const lines = [
    '<b>Підписка ФОКУС</b>',
    '',
    `Активний доступ: <b>${activeLabel}</b>`,
    `Статус: <code>${escapeHtml(statusValue)}</code>`,
    `Продукт: <code>${escapeHtml(productName)}</code> (<code>${escapeHtml(productCode)}</code>)`,
    `Сума: <b>${escapeHtml(amountLabel)}</b>`,
    `Оплачено: ${escapeHtml(formatSubscriptionDate(subscription.paidAt))}`,
    `Email: ${user?.email ? escapeHtml(user.email) : '—'}`,
    `Діє до: ${escapeHtml(formatSubscriptionDate(subscription.expiresAt))}`,
    ...(daysLeft !== null ? [`Залишилось: <b>${daysLeft} днів</b>`] : []),
    `Trial до: ${escapeHtml(formatSubscriptionDate(subscription.trialEndsAt))}`,
    `Block 12 надіслано: ${subscription.focusWelcomedAt ? '✅ надіслано' : '❌ не надіслано'}`,
    `Вступ у канал: ${subscription.channelJoinedAt ? '✅ вступив' : '⏳ не вступив'}`,
    `Проблема з оплатою: ${subscription.paymentIssueCount}`,
    `Остання проблема: ${escapeHtml(formatSubscriptionDate(subscription.lastPaymentIssueAt))}`,
    manualGrantLabel,
    ...(manualGrantNoteLabel ? [manualGrantNoteLabel] : []),
    `Оновлено: ${escapeHtml(formatSubscriptionDate(subscription.updatedAt))}`,
  ]

  if (checkout) {
    lines.push(
      '',
      '<b>Остання checkout-сесія</b>',
      `Статус: <code>${escapeHtml(String(checkout.status))}</code>`,
      `Сума: <b>${escapeHtml(`${checkout.amount} ${checkout.currency}`)}</b>`,
      `Створено: ${escapeHtml(formatSubscriptionDate(checkout.createdAt))}`,
      `Відкривали: ${escapeHtml(formatSubscriptionDate(checkout.lastOpenedAt))}`,
      `Завершено: ${escapeHtml(formatSubscriptionDate(checkout.completedAt))}`,
      `Проблема з оплатою: ${checkout.paymentIssueReportedAt ? '✅ зафіксовано' : '❌ немає'}`
    )
  }

  await planMessage(
    ctx,
    'ctx.reply',
    'ab_test_subscription_card',
    lines.join('\n'),
    {
      inline_keyboard: [
        ...(inviteUrl
          ? [[{ text: '🔗 Посилання на канал', url: inviteUrl }]]
          : []),
        [
          {
            text: '🔄 Відновити доступ',
            callback_data: 'resend_focus_block12',
          },
        ],
        [{ text: '← Меню', callback_data: 'ab_test:menu' }],
      ],
    },
    'HTML'
  )
}

async function resolveContextUserId(ctx: Context): Promise<string | null> {
  const stateUserId = (ctx.state as { userId?: string | null }).userId ?? null
  if (stateUserId) {
    return stateUserId
  }

  const chatId = String(ctx.chat?.id ?? '').trim()
  const telegramUserId = String(ctx.from?.id ?? '').trim()
  if (!chatId && !telegramUserId) {
    return null
  }

  const user = await prisma.user.findFirst({
    where: {
      OR: [
        ...(chatId ? [{ telegramChatId: chatId }] : []),
        ...(telegramUserId ? [{ telegramUserId }] : []),
        ...(chatId ? [{ telegramLinks: { some: { chatId } } }] : []),
      ],
    },
    select: { id: true },
  })

  return user?.id ?? null
}

async function sendQuestionDirect(
  ctx: Context,
  questionId: ReturnType<typeof resolveAbTestQuestionOrder>[number],
  revision: number
): Promise<void> {
  const chatId = ctx.chat?.id ?? ctx.from?.id
  if (!chatId) return
  const question = getAbTestQuestion(questionId)
  const questionOrder = resolveAbTestQuestionOrder()
  const questionNumber = questionOrder.indexOf(question.question_id) + 1
  await ctx.telegram.sendMessage(
    chatId,
    `*Питання ${questionNumber} з ${questionOrder.length}*\n\n${question.prompt}`,
    {
      parse_mode: 'Markdown',
      reply_markup: {
        inline_keyboard: question.answers.map((answer) => [
          {
            text: answer.text,
            callback_data: `ab_test_answer:${question.question_id}:${answer.id}:${revision}`,
          },
        ]),
      },
    }
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
  const resolvedUserId = await resolveAbTestEmailTargetUserId(ctx, userId)
  const progress = await loadAbTestProgress(resolvedUserId)
  if (progress.email_stage !== 'pending') {
    return false
  }

  const normalizedEmail = text.trim().toLowerCase()
  if (!isValidEmail(normalizedEmail)) {
    const chatId = ctx.chat?.id ?? ctx.from?.id
    if (chatId) {
      await ctx.telegram.sendMessage(
        chatId,
        'Схоже, це не email. Введіть коректний email одним повідомленням.'
      )
    }
    return true
  }

  const chatId = String(ctx.chat?.id ?? '').trim()
  const telegramUserId = String(ctx.from?.id ?? '').trim()

  try {
    const attachment = await attachEmailToUser(resolvedUserId, normalizedEmail)
    const persistedUserId = attachment.userId

    if (chatId && telegramUserId) {
      await upsertTelegramBinding({
        userId: persistedUserId,
        chatId,
        telegramUserId,
        telegramUserName: ctx.from?.username ?? null,
        firstName: ctx.from?.first_name ?? null,
      })
    }

    const deepLink = await generateDeepLink({
      userId: persistedUserId,
      action: 'magic_login',
      source: 'telegram',
      target: 'web',
      path: '/onboarding/continue',
      payload: {
        origin: 'ab_test_email_capture',
      } satisfies Prisma.InputJsonValue,
    })
    const magicLoginUrl = buildWebDeepLink(deepLink.token, deepLink.path)
    const mailSent = await sendMagicLoginEmail({
      to: normalizedEmail,
      loginUrl: magicLoginUrl,
    })

    const nowIso = new Date().toISOString()
    const next = buildAbTestProgressPatch(progress, {
      email_stage: 'captured',
      email_captured_at: nowIso,
      last_event_at: nowIso,
    })
    await saveAbTestProgress(persistedUserId, next)
    if (chatId) {
      await clearPendingTelegramIdentity(chatId)
    }

    await testOrchestrator.onTestCompleted(
      persistedUserId,
      progress.result_key ?? null,
      normalizedEmail,
      {
        startedAt: progress.started_at
          ? new Date(progress.started_at)
          : undefined,
      }
    )

    if (!mailSent) {
      console.warn('[AB_TEST_EMAIL_CAPTURE] magic_login_email_not_sent', {
        userId: persistedUserId,
        email: normalizedEmail,
      })
    }

    const scheduled = await scheduleFollowups(
      persistedUserId,
      next,
      'S3_TEST_RESULT'
    ).catch((error) => {
      console.error('[AB_TEST_EMAIL_CAPTURE] followups_failed', {
        userId: persistedUserId,
        error: error instanceof Error ? error.message : String(error),
      })
      return next
    })
    if (scheduled !== next) {
      await saveAbTestProgress(persistedUserId, scheduled)
    }

    await renderAbTestPostEmailSubmitSequence(ctx, persistedUserId, next)
    return true
  } catch (error) {
    console.error('[AB_TEST_EMAIL_CAPTURE] persistence_failed', {
      userId,
      chatId: chatId || null,
      telegramUserId: telegramUserId || null,
      error: error instanceof Error ? error.message : String(error),
    })

    await planMessage(
      ctx,
      'ctx.reply',
      'ab_test_email_retry',
      'Не вдалося зберегти email. Спробуйте ще раз.'
    )
    return true
  }
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
    await ctx.answerCbQuery().catch(() => null)
    const chatId = ctx.chat?.id ?? ctx.from?.id
    if (!chatId) {
      return true
    }
    await ctx.telegram.sendMessage(chatId, BLOCK9_POST_RESULT.text, {
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
    return true
  }

  const focusPaymentAction = action.match(
    /^open_focus_payment(?::(1month|3month))?$/
  )
  if (focusPaymentAction) {
    await ctx.answerCbQuery().catch(() => null)
    const payingUserId =
      (ctx.state as { userId?: string | null }).userId ?? null
    const chatId = ctx.chat?.id ?? ctx.from?.id
    console.log('[FOCUS_PAY] reached', {
      userId: payingUserId,
      chatId: ctx.chat?.id,
    })
    if (!chatId) {
      return true
    }

    if (payingUserId) {
      const hasActive = await hasActiveFocusSubscription(payingUserId)
      if (hasActive) {
        const inviteUrl = String(
          process.env.FOCUS_TELEGRAM_CHANNEL_INVITE_LINK ?? ''
        ).trim()
        await ctx.telegram.sendMessage(
          chatId,
          FOCUS_ALREADY_ACTIVE_MSG(inviteUrl),
          {
            parse_mode: 'HTML',
            reply_markup: {
              inline_keyboard: [
                ...(inviteUrl
                  ? [
                      [
                        {
                          text: '🔗 Перейти в канал ФОКУС',
                          url: inviteUrl,
                        },
                      ],
                    ]
                  : []),
                [
                  {
                    text: '🔄 Відновити доступ',
                    callback_data: 'resend_focus_block12',
                  },
                ],
                [
                  {
                    text: '📋 Моя підписка',
                    callback_data: 'ab_test:subscription',
                  },
                ],
                [
                  {
                    text: '← Меню',
                    callback_data: 'ab_test:menu',
                  },
                ],
              ],
            },
          }
        )
        return true
      }
    }

    const url1m = firstNonEmptyUrl(
      process.env.WAYFORPAY_FOCUS_BOT_1M_URL,
      process.env.WAYFORPAY_FOCUS_1M_URL,
      process.env.FOCUS_1M_URL,
      process.env.WAYFORPAY_FOCUS_LANDING_URL
    )
    const url3m = firstNonEmptyUrl(
      process.env.WAYFORPAY_FOCUS_BOT_3M_URL,
      process.env.WAYFORPAY_FOCUS_3M_URL,
      process.env.FOCUS_3M_URL,
      process.env.WAYFORPAY_FOCUS_LANDING_URL
    )
    const text =
      BLOCK10_FOCUS?.text ??
      'ФОКУС | Zoom-практики AB System\n\n' +
        'ФОКУС — це живі Zoom-практики раз на тиждень.\n' +
        'Ти приходиш із реальною ситуацією:\n' +
        '— що відкладаєш,\n' +
        '— яке рішення переносиш,\n' +
        '— яка ціль не рухається.\n\n' +
        'Тарифи:\n' +
        '1 місяць — 15 євро\n' +
        '3 місяці — 39 євро'
    const cta1m = BLOCK10_FOCUS?.cta_1m ?? 'Оплатити 1 місяць\n— 15 євро'
    const cta3m = BLOCK10_FOCUS?.cta_3m ?? 'Оплатити 3 місяці — 39 євро'
    let testButtonRow: Array<{ text: string; url: string }> = []
    if (payingUserId && isTestPaymentEnabled()) {
      try {
        const testSession = await buildEcosystemPaymentCheckoutSession(
          'focus',
          '1month',
          payingUserId,
          {
            amountOverride: 1,
            orderRefTag: 'test1uah',
          }
        )
        testButtonRow = [
          { text: '🧪 Тест 1 грн', url: testSession.checkoutUrl },
        ]
      } catch (error) {
        console.error('[TEST_PAYMENT] failed_to_build_checkout', error)
      }
    }
    try {
      await ctx.telegram.sendMessage(chatId, text, {
        parse_mode: 'Markdown',
        reply_markup: {
          inline_keyboard: [
            [{ text: cta1m, url: url1m }],
            [{ text: cta3m, url: url3m }],
            ...testButtonRow.map((row) => [row]),
            [
              {
                text: '⚠️ Проблема з оплатою',
                callback_data: 'focus:payment_issue',
              },
            ],
          ],
        },
      })
      console.log('[FOCUS_PAY] sent ok', { userId: payingUserId, chatId })
    } catch (error) {
      console.error('[FOCUS_PAY] FAILED', error)
    }
    if (payingUserId) {
      loadAbTestProgress(payingUserId)
        .then((progressAfterFocusClick) =>
          saveAbTestProgress(
            payingUserId,
            buildAbTestProgressPatch(progressAfterFocusClick, {
              focus_opened_at:
                progressAfterFocusClick.focus_opened_at ??
                new Date().toISOString(),
              last_event_at: new Date().toISOString(),
            })
          )
        )
        .catch((error: Error) =>
          console.error('[FOCUS_PAYMENT] save progress failed', error)
        )
    }
    return true
  }

  if (action === 'resend_focus_block12') {
    const targetUserId = await resolveContextUserId(ctx)
    if (!targetUserId) {
      const chatId = ctx.chat?.id ?? ctx.from?.id
      if (chatId) {
        await ctx.telegram.sendMessage(
          String(chatId),
          FOCUS_RESEND_MISSING_USER_MSG
        )
      }
      await planAck(
        ctx,
        'ctx.answerCbQuery',
        'ab_test_resend_missing_user_ack'
      ).catch(() => undefined)
      return true
    }
    const hasActiveFocus = await hasActiveFocusSubscription(targetUserId)
    if (!hasActiveFocus) {
      const chatId = ctx.chat?.id ?? ctx.from?.id
      if (chatId) {
        await ctx.telegram.sendMessage(String(chatId), FOCUS_RESEND_NO_SUB_MSG)
      }
      await planAck(
        ctx,
        'ctx.answerCbQuery',
        'ab_test_resend_inactive_ack'
      ).catch(() => undefined)
      return true
    }
    await markAbTestPaymentSuccess(targetUserId)
    await sendAbTestBlock12Welcome(targetUserId)
    await prisma.productSubscription
      .updateMany({
        where: {
          userId: targetUserId,
          productId: '68c3e55a-4b70-4680-a26c-15fdd607fd59',
        },
        data: { focusWelcomedAt: new Date() },
      })
      .catch(() => undefined)
    const chatId = ctx.chat?.id ?? ctx.from?.id
    if (chatId) {
      await ctx.telegram.sendMessage(String(chatId), FOCUS_RESEND_SUCCESS_MSG)
    }
    await planAck(ctx, 'ctx.answerCbQuery', 'ab_test_resend_sent_ack').catch(
      () => undefined
    )
    return true
  }

  if (action === 'focus:payment_issue') {
    await ctx.answerCbQuery().catch(() => null)
    const issueUserId = (ctx.state as { userId?: string | null }).userId ?? null
    const chatId = ctx.chat?.id ?? ctx.from?.id
    if (!issueUserId) {
      if (chatId) {
        await ctx.telegram.sendMessage(
          String(chatId),
          FOCUS_PAYMENT_ISSUE_NO_USER_MSG
        )
      }
      return true
    }

    if (chatId) {
      await ctx.telegram.sendMessage(
        String(chatId),
        FOCUS_PAYMENT_ISSUE_USER_MSG,
        { parse_mode: 'HTML' }
      )
    }

    const lastCheckout = await prisma.checkoutSession.findFirst({
      where: { userId: issueUserId },
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        orderReference: true,
        amount: true,
      },
    })

    await prisma.productSubscription
      .updateMany({
        where: {
          userId: issueUserId,
          product: { is: { code: { in: ['focus', 'FOCUS'] } } },
        },
        data: {
          paymentIssueCount: { increment: 1 },
          lastPaymentIssueAt: new Date(),
        },
      })
      .catch(() => undefined)

    const coachChatId = String(
      process.env.STARWAY_OPS_CHAT_ID ?? process.env.OPS_TELEGRAM_CHAT_ID ?? ''
    ).trim()
    if (coachChatId) {
      await alertCoachAboutPaymentIssue({
        bot: coachBot,
        coachChatId,
        userId: issueUserId,
        orderReference: lastCheckout?.orderReference ?? 'unknown',
        amount: lastCheckout?.amount ?? 0,
        reason: FOCUS_PAYMENT_ISSUE_COACH_MSG({
          userId: issueUserId,
          orderReference: lastCheckout?.orderReference ?? 'unknown',
          amount: lastCheckout?.amount ?? 0,
        }),
        scenario: 'E',
      }).catch((error) =>
        console.error('[PAYMENT_ISSUE] coach alert failed', error)
      )
    }

    return true
  }

  if (action === AB_TEST_ACTIONS.OPEN_FAQ) {
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

  if (action === AB_TEST_ACTIONS.FOCUS_INFO) {
    await planMessage(
      ctx,
      'ctx.reply',
      'ab_test_focus_info',
      BLOCK10_FOCUS.text,
      {
        inline_keyboard: [
          [
            {
              text: 'Оплатити ФОКУС',
              callback_data: AB_TEST_ACTIONS.FOCUS_PAY,
            },
          ],
        ],
      },
      'Markdown'
    )
    await planAck(ctx, 'ctx.answerCbQuery', 'ab_test_focus_info_ack').catch(
      () => undefined
    )
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
    await planMessage(
      ctx,
      'ctx.reply',
      'ab_test_faq_item',
      faqItem.text,
      replyOptions?.reply_markup,
      'Markdown'
    )
    await planAck(ctx, 'ctx.answerCbQuery', 'ab_test_faq_item_ack').catch(
      () => undefined
    )
    return true
  }

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
    await ctx.telegram.sendMessage(
      q1ChatId,
      `*Питання 1 з 8*\n\n${q1Question.prompt}`,
      {
        parse_mode: 'Markdown',
        reply_markup: {
          inline_keyboard: q1Question.answers.map((answer) => [
            {
              text: answer.text,
              callback_data: `ab_test_answer:q1:${answer.id}:${revision}`,
            },
          ]),
        },
      }
    )
    return true
  }

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

  let userId = (ctx.state as { userId?: string | null }).userId ?? null
  if (!userId && parsed.kind === 'skip_email_before_result') {
    userId = await resolveContextUserId(ctx)
    ;(ctx.state as { userId?: string | null }).userId = userId
  }
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
    ).catch(() => undefined)
    return true
  }

  if (parsed.kind === 'answer') {
    void ctx.answerCbQuery().catch(() => null)
  }

  if (parsed.kind === 'intro') {
    logFlowStart('legacy_intro_redirected_to_start', {
      userId,
      action,
    })
    await startAbTestFlow(ctx, userId, 'legacy_intro_callback')
    await planAck(ctx, 'ctx.answerCbQuery', 'ab_test_intro_ack').catch(
      () => undefined
    )
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
    await planAck(ctx, 'ctx.answerCbQuery', 'ab_test_entry_ack').catch(
      () => undefined
    )
    logCallbackHandled({
      action,
      handled: true,
      reason: 'entry_flow_rendered',
      userId,
    })
    return true
  }

  if (parsed.kind === 'restart') {
    await ctx.answerCbQuery().catch(() => null)
    const chatId = ctx.chat?.id ?? ctx.from?.id
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
    await saveAbTestProgress(userId, normalizeAbTestProgress(undefined))
    if (chatId) {
      await ctx.telegram.sendMessage(
        chatId,
        absystemContent.START_BLOCK1.MSG1,
        {
          reply_markup: {
            inline_keyboard: [
              [{ text: 'Почати тест', callback_data: 'ab_test:start' }],
            ],
          },
        }
      )
    }
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

  if (parsed.kind === 'show_result') {
    await ctx.answerCbQuery().catch(() => null)
    const chatId = ctx.chat?.id ?? ctx.from?.id
    if (!chatId) return true

    const userRecord = await prisma.user.findUnique({
      where: { id: userId },
      select: { testResultType: true, telegramUserName: true },
    })
    const resultKey = (userRecord?.testResultType ??
      null) as AbTestResultKey | null
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

    const resultDef = getAbTestResultDefinition(resultKey)
    const firstName = userRecord?.telegramUserName ?? ''
    await ctx.telegram.sendMessage(
      chatId,
      interpolateFirstName(resultDef.body, firstName),
      {
        reply_markup: {
          inline_keyboard: [
            [
              {
                text: 'Показати\nяк проходить\nпрактика',
                callback_data: `show_inside_${resultKey.toUpperCase()}`,
              },
            ],
          ],
        },
      }
    )
    return true
  }

  if (parsed.kind === 'skip_email_before_result') {
    await ctx.answerCbQuery().catch(() => null)

    const progress = await loadAbTestProgress(userId)
    console.info(AB_TEST_EMAIL_SKIP_LOG_PREFIX, 'received', {
      userId,
      emailStage: progress.email_stage,
      status: progress.status,
      resultKey: progress.result_key,
    })

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

      console.info(AB_TEST_EMAIL_SKIP_LOG_PREFIX, 'continue_flow', {
        userId,
        emailStage: savedProgress.email_stage,
        resultKey: savedProgress.result_key,
      })

      await renderAbTestPostEmailSubmitSequence(ctx, userId, savedProgress)
      return true
    }

    console.info(AB_TEST_EMAIL_SKIP_LOG_PREFIX, 'ignored_not_completed', {
      userId,
      emailStage: progress.email_stage,
      status: progress.status,
    })
    return true
  }

  if (parsed.kind === 'show_inside') {
    await ctx.answerCbQuery().catch(() => null)
    const chatId = ctx.chat?.id ?? ctx.from?.id
    if (!chatId) {
      return true
    }
    const surface = getTestDriveInsideResponseSurface({
      resultKey: parsed.resultKey,
    })
    if (!surface) {
      const progress = await loadAbTestProgress(userId)
      await renderCurrentView(ctx, userId, progress)
      return true
    }
    await ctx.telegram.sendMessage(
      chatId,
      `${surface.title}\n\n${surface.bodyLines.join('\n')}`,
      {
        reply_markup: {
          inline_keyboard: surface.buttons,
        },
      }
    )
    return true
  }

  if (parsed.kind === 'test_drive') {
    await ctx.answerCbQuery().catch(() => null)
    const progress = await loadAbTestProgress(userId)
    const insideSurface = getTestDriveInsideSurface({
      resultKey: progress.result_key,
      startedAt: progress.started_at,
    })
    const chatId = ctx.chat?.id ?? ctx.from?.id
    if (!chatId || !insideSurface) {
      await renderCurrentView(ctx, userId, progress)
      return true
    }

    await ctx.telegram.sendMessage(
      chatId,
      `${insideSurface.title}\n\n${insideSurface.bodyLines.join('\n')}`,
      {
        reply_markup: {
          inline_keyboard: insideSurface.buttons,
        },
      }
    )
    return true
  }

  if (parsed.kind === 'start') {
    await ctx.answerCbQuery().catch(() => null)
    const startChatId = ctx.chat?.id
    if (!startChatId) {
      return true
    }
    await ctx.telegram.sendMessage(startChatId, AB_TEST_START_STEP2, {
      parse_mode: 'Markdown',
      reply_markup: {
        inline_keyboard: [
          [{ text: 'Продовжити', callback_data: 'ab_test:q1' }],
        ],
      },
    })
    logAbTestStartDebug('callback:start_pressed', {
      action,
      userId,
      chatId: String(ctx.chat?.id ?? ''),
    })
    const currentProgress = await loadAbTestProgress(userId)
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
      last_callback_key: action,
      last_event_at: nowIso,
    })
    await saveAbTestProgress(userId, warmedProgress)
    await testOrchestrator
      .recordTestStart(userId, new Date(nowIso))
      .catch(() => undefined)
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
    ).catch(() => undefined)
    return true
  }

  if (parsed.kind === 'menu') {
    await ctx.answerCbQuery().catch(() => null)
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
              text: '📋 Моя підписка',
              callback_data: AB_TEST_ACTIONS.SUBSCRIPTION,
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
    ).catch(() => undefined)
    return true
  }

  if (parsed.kind === 'subscription') {
    await ctx.answerCbQuery().catch(() => null)
    await renderFocusSubscriptionCard(ctx, userId)
    await planAck(ctx, 'ctx.answerCbQuery', 'ab_test_subscription_ack').catch(
      () => undefined
    )
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
    ).catch(() => undefined)
    return true
  }

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
    ).catch(() => undefined)
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
  if (
    callbackMessage &&
    'message_id' in callbackMessage &&
    callbackMessage.message_id
  ) {
    const updatedKeyboard = question.answers.map((answer) => [
      {
        text: answer.id === selected.id ? `✅ ${answer.text}` : answer.text,
        callback_data: `ab_test_answer:${parsed.questionId}:${answer.id}:${next.revision}`,
      },
    ])
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

  console.info('[AB_TEST_Q8_TRACE] result_complete_branch_entered', {
    userId,
    questionId: parsed.questionId,
    complete,
    resultKey,
    nextQuestionId,
  })
  if (complete) {
    const chatId = ctx.chat?.id ?? ctx.from?.id
    if (!chatId) {
      console.info(
        '[AB_TEST_Q8_TRACE] result_complete_branch_skipped_no_chat',
        {
          userId,
        }
      )
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
    console.info('[AB_TEST_Q8_TRACE] result_progress_before_email_gate_saved', {
      userId,
      emailStage: pendingEmailProgress.email_stage,
      resultKey: pendingEmailProgress.result_key,
    })
    await saveAbTestProgress(userId, pendingEmailProgress)
    console.info('[AB_TEST_Q8_TRACE] result_email_prompt_sent', {
      userId,
      transition: 'ab_test_email_prompt_before_result',
      deliveryKind: 'ab_test_email_gate',
    })
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
  await sendQuestionDirect(
    ctx,
    nextQuestion.question_id,
    finalProgress.revision
  )
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
  await planMessage(
    ctx,
    'ctx.reply',
    'ab_test_entry_intro',
    absystemContent.START_BLOCK1.MSG1,
    {
      inline_keyboard: [
        [{ text: 'Далі', callback_data: AB_TEST_ACTIONS.ENTRY }],
      ],
    },
    'Markdown'
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
      inline_keyboard: [
        [
          {
            text: absystemContent.START_BLOCK1.CTA1,
            callback_data: AB_TEST_ACTIONS.START,
          },
        ],
      ],
    },
    'Markdown'
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
      await bot.telegram.sendMessage(tgId, BLOCK9_POST_RESULT.text, {
        parse_mode: 'Markdown',
        reply_markup: { inline_keyboard },
      })
      sent += 1
      await new Promise((resolve) => setTimeout(resolve, 100))
    } catch (err) {
      console.warn(`[broadcast] failed ${tgId}:`, err)
      failed += 1
    }
  }

  return { sent, failed }
}
