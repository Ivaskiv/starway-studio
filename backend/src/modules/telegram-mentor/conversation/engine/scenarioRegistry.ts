import type { Context } from 'telegraf'

import { AB_TEST_ACTIONS } from '@/packages/abTestActions.js'
import { BLOCK10_FOCUS } from '@/products/ab-system/content/abTest.results.js'
import { resolveCanonicalFocusPaymentView } from '@/products/ab-system/telegram/flow.js'
import { renderTelegramContentMessage } from '@/products/ab-system/telegram/views/index.js'
import { buildFaqKeyboard } from '@/products/ab-system/content/abTest.faq.js'
import {
  buildAbTestProgressPatch,
  resolveAbTestNextQuestion,
  resolveAbTestQuestionOrder,
} from '@/core/state-machine/abTestFoundation.js'
import { getAbTestQuestion } from '@/products/ab-system/content/abTest.questions.js'
import {
  escapeHtml,
  formatMobileAnswerButtonText,
  formatMobileAnswerListForMessage,
  formatSubscriptionDate,
  isTestPaymentEnabled,
} from '@/products/ab-system/telegram/helpers.js'
import { loadAbTestProgress, saveAbTestProgress } from '@/products/ab-system/telegram/progress.js'
import {
  FOCUS_ALREADY_ACTIVE_MSG,
  FOCUS_RESEND_MISSING_USER_MSG,
  FOCUS_RESEND_NO_SUB_MSG,
  FOCUS_RESEND_SUCCESS_MSG,
} from '@/products/ab-system/content/abTest.focus.js'
import { buildEcosystemPaymentCheckoutSession } from '@/modules/subscriptions/payments/business/checkout.js'
import { hasActiveFocusSubscription } from '@/modules/subscriptions/payments/focus-access.js'
import { prisma } from '@/db/client.js'
import { trackEvent } from '@/modules/events/service.js'
import { scheduleFollowups } from '@/products/ab-system/telegram/scheduler.js'
import { buildAbsystemStatusFlow, buildAbTestQuestionFlow } from '@/core/flow-builder/flowBuilder.js'
import type { TelegramFlow } from '@/core/flow-builder/flowTemplates.js'
import { composeTelegramUx } from '@/core/rendering/uxComposition.js'
import { getAccessAwareAppReplyMarkupForContext } from '../../handlers/start.js'
import { renderDecisionUnlessAllowed } from '../../services/delivery/decision-transport.js'
import { resolveBehavioralContinuity, type BehavioralContinuityResolution } from '@/core/continuity/behavioralContinuity.js'
import { absystemContent } from '@/products/absystem/config/content.js'
import { createOnceInviteLink } from '@/products/focus/payments/inviteLink.js'
import { markAbTestPaymentSuccess } from '@/products/ab-system/telegram/markers.js'
import { getDevTestPaymentButton } from '../../keyboards.js'
import type { IAgentGateway } from '../../../ai/gateway/index.js'
import type { TelegramTextRoute } from '../../router/messageRouter.js'
import { buildIntelligenceConversationResponse } from './intelligenceScenario.js'
import {
  createConversationResponse,
  type ConversationButton,
  type ConversationResponse,
} from './types.js'

export interface TelegramConversationScenarioContext {
  ctx: Context
  chatId: string
  userId: string | null
  text: string
  route: TelegramTextRoute
  gateway: IAgentGateway
}

export type TelegramConversationScenarioHandler = (
  context: TelegramConversationScenarioContext,
) => Promise<ConversationResponse>

const passiveScenario =
  (builder: (context: TelegramConversationScenarioContext) => ConversationResponse): TelegramConversationScenarioHandler =>
    async (context) => builder(context)

function mapInlineKeyboardToButtons(
  replyMarkup?: {
    inline_keyboard?: ReadonlyArray<
      ReadonlyArray<{
        text: string
        callback_data?: string
        url?: string
        web_app?: { url: string }
      }>
    >
  },
): ConversationButton[] {
  if (!replyMarkup?.inline_keyboard) {
    return []
  }

  return replyMarkup.inline_keyboard.flatMap((row) =>
    row.flatMap((button): ConversationButton[] => {
      if (typeof button.callback_data === 'string') {
        return [{ kind: 'callback', label: button.text, value: button.callback_data }]
      }
      if (typeof button.url === 'string') {
        return [{ kind: 'url', label: button.text, value: button.url }]
      }
      if (button.web_app?.url) {
        return [{ kind: 'web_app', label: button.text, value: button.web_app.url }]
      }
      return []
    }),
  )
}

function createResponseFromTelegramFlow(flow: TelegramFlow): ConversationResponse {
  const payload = composeTelegramUx(flow)
  return createConversationResponse({
    text: payload.text.trim(),
    buttons: mapInlineKeyboardToButtons(payload.reply_markup),
  })
}

function buildAbTestQuestionResponse(questionId: string, revision: number): ConversationResponse {
  const question = getAbTestQuestion(questionId as never)
  const questionOrder = resolveAbTestQuestionOrder()
  const questionNumber = questionOrder.indexOf(question.question_id) + 1

  return createConversationResponse({
    text: `<b>Питання ${questionNumber} з ${questionOrder.length}</b>\n\n<b>${escapeHtml(question.prompt)}</b>\n\n${escapeHtml(formatMobileAnswerListForMessage(question.answers))}`,
    buttons: question.answers.map((answer) => ({
      kind: 'callback',
      label: formatMobileAnswerButtonText(answer.text),
      value: `ab_test_answer:${question.question_id}:${answer.id}:${revision}`,
    })),
    telemetry: {
      scenario: 'start_test',
    },
    analytics: {
      intent: 'start_test',
      questionId,
      revision,
    },
  })
}

function buildFocusInfoResponse(): ConversationResponse {
  return createConversationResponse({
    text: renderTelegramContentMessage('', [...BLOCK10_FOCUS.blocks]).trim(),
    buttons: [
      {
        label: 'ОПЛАТИТИ ФОКУС',
        kind: 'callback',
        value: AB_TEST_ACTIONS.FOCUS_PAY,
      },
    ],
    telemetry: {
      scenario: 'focus_info',
      source: 'pure_content_registry',
    },
    analytics: {
      intent: 'focus_info',
    },
  })
}

async function buildStartTestResponse(context: TelegramConversationScenarioContext): Promise<ConversationResponse> {
  if (!context.userId) {
    return createConversationResponse({
      telemetry: { handled: true, scenario: 'start_test', reason: 'missing_user' },
      analytics: {},
    })
  }

  const current = await loadAbTestProgress(context.userId)
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
            last_callback_key: 'ab_test:start',
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
            last_callback_key: 'ab_test:start',
            last_message_key: 'TEST_RESULT_STATE',
            last_event_at: now.toISOString(),
          })

  await saveAbTestProgress(context.userId, next)

  const questionIdToOpen = next.current_question_id ?? nextQuestionFromState
  return buildAbTestQuestionResponse(questionIdToOpen, next.revision)
}

function buildOpenFaqResponse(): ConversationResponse {
  return createConversationResponse({
    text: 'Оберіть питання:',
    buttons: mapInlineKeyboardToButtons(buildFaqKeyboard()),
    telemetry: { scenario: 'open_faq' },
    analytics: { intent: 'open_faq' },
  })
}

async function buildFocusPaymentResponse(context: TelegramConversationScenarioContext): Promise<ConversationResponse> {
  const resolvedUserId = context.userId
  if (!resolvedUserId) {
    return createConversationResponse({
      telemetry: { handled: true, scenario: 'focus_payment', reason: 'missing_user' },
      analytics: {},
    })
  }

  const hasActive = await hasActiveFocusSubscription(resolvedUserId)
  if (hasActive) {
    const inviteUrl = String(process.env.FOCUS_TELEGRAM_CHANNEL_INVITE_LINK ?? '').trim()
    return createConversationResponse({
      text: FOCUS_ALREADY_ACTIVE_MSG(inviteUrl),
      buttons: [
        ...(inviteUrl ? [{ kind: 'url' as const, label: '🔗 ПЕРЕЙТИ В КАНАЛ ФОКУС', value: inviteUrl }] : []),
        { kind: 'callback', label: '🔄 ВІДНОВИТИ ДОСТУП', value: 'resend_focus_block12' },
        { kind: 'callback', label: '📋 МОЯ ПІДПИСКА', value: 'ab_test:subscription' },
        { kind: 'callback', label: '← МЕНЮ', value: 'ab_test:menu' },
      ],
      cards: [],
      media: [],
      nextActions: [],
      telemetry: { scenario: 'focus_payment', state: 'already_active' },
      analytics: { intent: 'focus_payment' },
    })
  }

  const [session1m, session3m] = await Promise.all([
    buildEcosystemPaymentCheckoutSession('focus', '1month', resolvedUserId, 'telegram'),
    buildEcosystemPaymentCheckoutSession('focus', '3month', resolvedUserId, 'telegram'),
  ])

  const progressForCheckout = await loadAbTestProgress(resolvedUserId).catch(() => null)
  const { blocks: paymentBlocks } = await resolveCanonicalFocusPaymentView(resolvedUserId)
  const paymentText = renderTelegramContentMessage('', paymentBlocks).trim()

  const testPaymentButton = isTestPaymentEnabled()
    ? getDevTestPaymentButton()
    : null

  if (progressForCheckout) {
    await scheduleFollowups(resolvedUserId, progressForCheckout, 'S4_FOCUS_INVITE').catch(() => undefined)
  }

  await trackEvent({
    userId: resolvedUserId,
    type: 'PAYMENT_OPENED',
    source: 'telegram',
    state: 'S5_PAYMENT',
    productId: 'focus',
    payload: {
      checkout_urls: [session1m.checkoutUrl, session3m.checkoutUrl],
      source_action: 'open_focus_payment',
    },
  }).catch(() => undefined)

  return createConversationResponse({
    text: paymentText,
    buttons: [
      { kind: 'url', label: BLOCK10_FOCUS.cta_1m, value: session1m.checkoutUrl },
      { kind: 'url', label: BLOCK10_FOCUS.cta_3m, value: session3m.checkoutUrl },
      ...(testPaymentButton
        ? [{ kind: 'url' as const, label: testPaymentButton.text, value: testPaymentButton.url }]
        : []),
      { kind: 'callback', label: '⚠️ ПРОБЛЕМА З ОПЛАТОЮ', value: 'focus:payment_issue' },
    ],
    telemetry: { scenario: 'focus_payment' },
    analytics: { intent: 'focus_payment' },
  })
}

async function buildSubscriptionStatusResponse(context: TelegramConversationScenarioContext): Promise<ConversationResponse> {
  if (!context.userId) {
    return createConversationResponse({
      telemetry: { handled: true, scenario: 'subscription_status', reason: 'missing_user' },
      analytics: {},
    })
  }

  const focusProductId = '68c3e55a-4b70-4680-a26c-15fdd607fd59'
  const productName = 'ФОКУС'
  const productCode = 'focus'
  const currency = 'UAH'
  const [active, subscription, checkout, user] = await Promise.all([
    hasActiveFocusSubscription(context.userId).catch(() => false),
    prisma.productSubscription.findFirst({
      where: { userId: context.userId, productId: focusProductId },
      orderBy: { updatedAt: 'desc' },
      select: {
        status: true,
        amount: true,
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
    }).catch(() => null),
    prisma.checkoutSession.findFirst({
      where: { userId: context.userId },
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
    }).catch(() => null),
    prisma.user.findUnique({
      where: { id: context.userId },
      select: { email: true },
    }).catch(() => null),
  ])

  if (!subscription) {
    return createConversationResponse({
      text: ['<b>Підписка ФОКУС</b>', '', 'Статус: <code>не знайдено</code>', 'Ще немає оформленої підписки.'].join('\n'),
      buttons: [
        { kind: 'callback', label: 'ОПЛАТИТИ ФОКУС', value: AB_TEST_ACTIONS.FOCUS_PAY },
        { kind: 'callback', label: '← МЕНЮ', value: 'ab_test:menu' },
      ],
      telemetry: { scenario: 'subscription_status', state: 'missing' },
      analytics: { intent: 'subscription_status' },
    })
  }

  const inviteUrl = String(process.env.FOCUS_TELEGRAM_CHANNEL_INVITE_LINK ?? '').trim()
  const daysLeft = subscription.expiresAt
    ? Math.max(0, Math.ceil((new Date(subscription.expiresAt).getTime() - Date.now()) / 86400000))
    : null
  const manualGrantLabel = subscription.manuallyGrantedBy
    ? `🔧 ручна активація: <code>${escapeHtml(subscription.manuallyGrantedBy)}</code>`
    : 'Автоактивація'
  const manualGrantNoteLabel = subscription.manualGrantNote
    ? `Примітка: ${escapeHtml(subscription.manualGrantNote)}`
    : null

  const lines = [
    '<b>Підписка ФОКУС</b>',
    '',
    `Активний доступ: <b>${active ? 'так' : 'ні'}</b>`,
    `Статус: <code>${escapeHtml(String(subscription.status ?? '—'))}</code>`,
    `Продукт: <code>${escapeHtml(productName)}</code> (<code>${escapeHtml(productCode)}</code>)`,
    `Сума: <b>${escapeHtml(subscription.amount !== null && subscription.amount !== undefined ? `${subscription.amount} ${currency}` : '—')}</b>`,
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
      `Проблема з оплатою: ${checkout.paymentIssueReportedAt ? '✅ зафіксовано' : '❌ немає'}`,
    )
  }

  return createConversationResponse({
    text: lines.join('\n'),
    buttons: [
      ...(inviteUrl ? [{ kind: 'url' as const, label: '🔗 ПОСИЛАННЯ НА КАНАЛ', value: inviteUrl }] : []),
      { kind: 'callback', label: '🔄 ВІДНОВИТИ ДОСТУП', value: 'resend_focus_block12' },
      { kind: 'callback', label: '← МЕНЮ', value: 'ab_test:menu' },
    ],
    telemetry: { scenario: 'subscription_status', state: 'native' },
    analytics: { intent: 'subscription_status' },
  })
}

async function buildAlreadyPaidResponse(context: TelegramConversationScenarioContext): Promise<ConversationResponse> {
  if (!context.userId) {
    return createConversationResponse({
      text: FOCUS_RESEND_MISSING_USER_MSG,
      telemetry: { scenario: 'already_paid', state: 'missing_user' },
      analytics: { intent: 'already_paid' },
    })
  }

  const [hasCanonicalAccess, verifiedFocusPayment, paidFocusSubscription] = await Promise.all([
    hasActiveFocusSubscription(context.userId),
    prisma.paymentLog.findFirst({
      where: {
        userId: context.userId,
        status: 'SUCCESS',
        OR: [
          { orderReference: { startsWith: 'focus_' } },
          { metadata: { path: ['productId'], equals: 'focus' } },
        ],
      },
      select: { id: true },
      orderBy: { processedAt: 'desc' },
    }),
    prisma.productSubscription.findFirst({
      where: {
        userId: context.userId,
        productId: '68c3e55a-4b70-4680-a26c-15fdd607fd59',
        status: 'PAID',
        paidAt: { not: null },
      },
      select: { id: true },
      orderBy: { paidAt: 'desc' },
    }),
  ])

  if (!hasCanonicalAccess && !verifiedFocusPayment && !paidFocusSubscription) {
    return createConversationResponse({
      text: FOCUS_RESEND_NO_SUB_MSG,
      telemetry: { scenario: 'already_paid', state: 'no_subscription' },
      analytics: { intent: 'already_paid' },
    })
  }

  await markAbTestPaymentSuccess(context.userId)

  const inviteUrl = await createOnceInviteLink(context.chatId).catch(() => '')
  await prisma.productSubscription.updateMany({
    where: {
      userId: context.userId,
      productId: '68c3e55a-4b70-4680-a26c-15fdd607fd59',
    },
    data: { focusWelcomedAt: new Date() },
  }).catch(() => undefined)

  return createConversationResponse({
    text: FOCUS_RESEND_SUCCESS_MSG,
    buttons: inviteUrl
      ? [{ kind: 'url', label: 'ПЕРЕЙТИ В КАНАЛ ФОКУС', value: inviteUrl }]
      : [],
    telemetry: { scenario: 'already_paid', state: 'resent' },
    analytics: { intent: 'already_paid' },
  })
}

async function buildZoomResponse(context: TelegramConversationScenarioContext): Promise<ConversationResponse> {
  const replyMarkup = await getAccessAwareAppReplyMarkupForContext(context.ctx)
  const userId = context.userId

  try {
    if (
      await renderDecisionUnlessAllowed(context.ctx, 'status_requested', [
        'show_product',
        'resume_session',
        'show_offer',
        'show_trial_offer',
        'show_winback',
        'show_paywall',
        'show_funnel_step',
        'show_funnel',
      ])
    ) {
      return createConversationResponse({
        telemetry: { handled: true, scenario: 'zoom', source: 'decision_transport' },
        analytics: { intent: 'zoom' },
      })
    }

    const continuity = userId
      ? await resolveBehavioralContinuity(userId)
      : null

    if (continuity) {
      return createResponseFromTelegramFlow(buildAbsystemStatusFlow(continuity))
    }

    return createConversationResponse({
      text: [absystemContent.status.title, '', absystemContent.status.intro].join('\n'),
      buttons: mapInlineKeyboardToButtons(replyMarkup as never),
      telemetry: { scenario: 'zoom', source: 'status_fallback' },
      analytics: { intent: 'zoom' },
    })
  } catch {
    const fallback: BehavioralContinuityResolution = {
      snapshot: {
        focusParticipation: false,
        repeatedRollback: false,
        dailyCycleInterrupted: false,
        momentumLevel: 'low',
      },
      signals: {
        unresolvedGoal: null,
        repeatedPostponedAction: null,
        wheelImbalance: null,
        interruptedDailyCycles: false,
        repeatedRollbackPatterns: false,
        focusParticipation: false,
        lastZoomTopic: null,
        inactiveDuration: null,
        unfinishedStrategyNode: null,
        repeatedHesitationPattern: null,
        repeatedUnfinishedDecision: null,
        lastMeaningfulMovement: null,
        emotionalOverload: null,
        movementInstability: 'low',
      },
      interpretation: {
        priority: 'genericFallback',
        interpretation: {
          mainPattern: 'generic',
          priority: 'genericFallback',
          riskLevel: 'low',
          movementState: {
            stalledAfterClarity: false,
            repeatedAvoidance: false,
            unstableRhythm: false,
            unresolvedDecisionLoop: false,
            overloadedActionState: false,
            interruptedMomentum: false,
          },
          recognition: 'Я бачу, де рух зупинився.',
          interpretation: 'Не треба починати спочатку — достатньо повернутись до найближчої дії.',
          nextMovement: 'Почнімо з найближчої простої дії.',
          recommendedNarrative: 'generic_return',
        },
        movementState: {
          stalledAfterClarity: false,
          repeatedAvoidance: false,
          unstableRhythm: false,
          unresolvedDecisionLoop: false,
          overloadedActionState: false,
          interruptedMomentum: false,
        },
        nextMeaningfulAction: 'Почнімо з найближчої простої дії.',
        summary: 'найближчий крок',
      },
      continuityMode: 'generic',
      recommendedNextAction: 'Почнімо з найближчої простої дії.',
      primaryBlock: null,
      unresolvedAction: null,
      repeatedPattern: null,
      inactiveDays: null,
      lastMeaningfulFocus: null,
      lastZoomTopic: null,
      relationship: null,
    }

    return createResponseFromTelegramFlow(buildAbsystemStatusFlow(fallback))
  }
}

export const telegramScenarioRegistry: Record<string, TelegramConversationScenarioHandler> = {
  start_test: async (context) => buildStartTestResponse(context),
  open_faq: async () => buildOpenFaqResponse(),
  focus_info: passiveScenario(() => buildFocusInfoResponse()),
  focus_payment: async (context) => buildFocusPaymentResponse(context),
  subscription_status: async (context) => buildSubscriptionStatusResponse(context),
  already_paid: async (context) => buildAlreadyPaidResponse(context),
  zoom: async (context) => buildZoomResponse(context),
  cancel: passiveScenario((context) =>
    createConversationResponse({
      nextActions: [
        context.userId
          ? { type: 'state_menu' as const }
          : { type: 'entry_offer' as const },
      ],
      telemetry: { scenario: 'cancel' },
      analytics: { intent: 'cancel' },
    })),
  help: passiveScenario((context) =>
    createConversationResponse({
      nextActions: [
        context.userId
          ? { type: 'state_menu' as const }
          : { type: 'entry_offer' as const },
      ],
      telemetry: { scenario: 'help' },
      analytics: { intent: 'help' },
    })),
  payment_issue: async (context) =>
    buildIntelligenceConversationResponse({
      ctx: context.ctx,
      chatId: context.chatId,
      userId: context.userId,
      message: context.text,
      messageType: context.route.intelligenceMessageType ?? 'FOCUS_RELATED',
      gateway: context.gateway,
    }),
  greeting: async (context) =>
    buildIntelligenceConversationResponse({
      ctx: context.ctx,
      chatId: context.chatId,
      userId: context.userId,
      message: context.text,
      messageType: context.route.intelligenceMessageType ?? 'SMALL_TALK',
      gateway: context.gateway,
    }),
  memory_request: async (context) =>
    buildIntelligenceConversationResponse({
      ctx: context.ctx,
      chatId: context.chatId,
      userId: context.userId,
      message: context.text,
      messageType: context.route.intelligenceMessageType ?? 'MEMORY_REQUEST',
      gateway: context.gateway,
    }),
  followup: async (context) =>
    buildIntelligenceConversationResponse({
      ctx: context.ctx,
      chatId: context.chatId,
      userId: context.userId,
      message: context.text,
      messageType: context.route.intelligenceMessageType ?? 'FOLLOWUP',
      gateway: context.gateway,
    }),
  personal_situation: async (context) =>
    buildIntelligenceConversationResponse({
      ctx: context.ctx,
      chatId: context.chatId,
      userId: context.userId,
      message: context.text,
      messageType: context.route.intelligenceMessageType ?? 'PERSONAL_SITUATION',
      gateway: context.gateway,
    }),
  question: async (context) =>
    buildIntelligenceConversationResponse({
      ctx: context.ctx,
      chatId: context.chatId,
      userId: context.userId,
      message: context.text,
      messageType: context.route.intelligenceMessageType ?? 'QUESTION',
      gateway: context.gateway,
    }),
  focus_related: async (context) =>
    buildIntelligenceConversationResponse({
      ctx: context.ctx,
      chatId: context.chatId,
      userId: context.userId,
      message: context.text,
      messageType: context.route.intelligenceMessageType ?? 'FOCUS_RELATED',
      gateway: context.gateway,
    }),
  unknown: async (context) =>
    buildIntelligenceConversationResponse({
      ctx: context.ctx,
      chatId: context.chatId,
      userId: context.userId,
      message: context.text,
      messageType: context.route.intelligenceMessageType ?? 'UNKNOWN',
      gateway: context.gateway,
    }),
}

export function resolveTelegramScenarioHandler(
  route: TelegramTextRoute,
): TelegramConversationScenarioHandler {
  return telegramScenarioRegistry[route.intent] ?? telegramScenarioRegistry.unknown
}
