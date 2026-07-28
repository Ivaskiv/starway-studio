import type { Context } from 'telegraf'

import { AB_TEST_ACTIONS } from '@/packages/abTestActions.js'
import {
  handleAbTestEmailCaptureText,
} from '@/products/ab-system/telegram/abTest.service.js'
import {
  detectTelegramIntelligenceMessageType,
  type TelegramIntelligenceMessageType,
} from '../handlers/intelligence.handler.js'
import {
  handlePendingTelegramIdentityText,
} from '../handlers/start.js'
import { loadAbTestProgress } from '@/products/ab-system/telegram/abTest.progress.js'
import { renderCurrentView } from '@/products/ab-system/telegram/abTest.views.js'
import {
  hasPendingName,
} from '../services/pendingIdentity.service.js'
import { getSession, parseQuestionState } from '../session.js'
import { TelegramConversationEngine } from '../conversation/engine/conversationEngine.js'
import { createConversationResponse } from '../conversation/engine/types.js'
import { TelegramConversationRenderer } from '../conversation/renderers/telegramConversationRenderer.js'
import { telegramContentRegistry } from '../content/contentRegistry.js'

export type TelegramTextIntent =
  | 'start_test'
  | 'open_faq'
  | 'focus_info'
  | 'focus_payment'
  | 'subscription_status'
  | 'already_paid'
  | 'zoom'
  | 'cancel'
  | 'help'
  | 'payment_issue'
  | 'greeting'
  | 'memory_request'
  | 'followup'
  | 'personal_situation'
  | 'question'
  | 'focus_related'
  | 'navigation'
  | 'unknown'

export type TelegramTextScenario =
  | 'ab_test_callback'
  | 'status'
  | 'menu'
  | 'intelligence'
  | 'active_question'
  | 'pending_name'
  | 'pending_identity'
  | 'pending_email'

export interface TelegramTextRoute {
  intent: TelegramTextIntent
  scenario: TelegramTextScenario
  intelligenceMessageType?: TelegramIntelligenceMessageType
  abTestAction?: string
}

const conversationEngine = new TelegramConversationEngine()
const conversationRenderer = new TelegramConversationRenderer()

function normalizeText(text: string): string {
  return text.toLowerCase().trim().replace(/\s+/g, ' ')
}

function isLikelyMistypedStartCommand(text: string): boolean {
  const normalized = normalizeText(text).replace(/^[#!/]+/, '')
  return normalized === 'start' || normalized === 'старт'
}

function isFocusInfoText(normalizedText: string): boolean {
  return normalizedText === 'дізнатись про фокус'
    || (
      normalizedText.includes('фокус')
      && telegramContentRegistry.routes.focusInfoKeywords.some((token) => normalizedText.includes(token))
    )
}

function isSubscriptionText(normalizedText: string): boolean {
  return normalizedText === 'підписка'
    || normalizedText === 'моя підписка'
    || (
      normalizedText.includes('підписк')
      && telegramContentRegistry.routes.subscriptionKeywords.some((token) => normalizedText.includes(token))
    )
}

function isPaymentIssueText(normalizedText: string): boolean {
  return normalizedText.includes('оплат')
    && telegramContentRegistry.routes.paymentIssueKeywords.some((token) => normalizedText.includes(token))
}

function isZoomText(normalizedText: string): boolean {
  return normalizedText.includes('zoom')
    || normalizedText.includes('зум')
}

function isHelpText(normalizedText: string): boolean {
  return telegramContentRegistry.routes.helpTriggers.some((value) => value === normalizedText)
}

function isCancelText(normalizedText: string): boolean {
  return telegramContentRegistry.routes.cancelTriggers.some((value) => value === normalizedText)
}

function isGreetingText(normalizedText: string): boolean {
  return telegramContentRegistry.routes.greetingTriggers.some((value) => value === normalizedText)
}

export function resolveTelegramTextRoute(text: string): TelegramTextRoute {
  const normalizedText = normalizeText(text)

  if (
    telegramContentRegistry.routes.startTestTriggers.some((value) => value === normalizedText)
  ) {
    return {
      intent: 'start_test',
      scenario: 'ab_test_callback',
      abTestAction: AB_TEST_ACTIONS.START,
    }
  }

  if (telegramContentRegistry.routes.openFaqTriggers.some((value) => value === normalizedText)) {
    return {
      intent: 'open_faq',
      scenario: 'ab_test_callback',
      abTestAction: AB_TEST_ACTIONS.OPEN_FAQ,
    }
  }

  if (telegramContentRegistry.routes.focusPaymentTriggers.some((value) => value === normalizedText)) {
    return {
      intent: 'focus_payment',
      scenario: 'ab_test_callback',
      abTestAction: AB_TEST_ACTIONS.FOCUS_PAY,
    }
  }

  if (
    telegramContentRegistry.routes.alreadyPaidTriggers.some((value) => value === normalizedText)
  ) {
    return {
      intent: 'already_paid',
      scenario: 'ab_test_callback',
      abTestAction: AB_TEST_ACTIONS.FOCUS_ALREADY_PAID,
    }
  }

  if (isSubscriptionText(normalizedText)) {
    return {
      intent: 'focus_related',
      scenario: 'intelligence',
      intelligenceMessageType: 'QUESTION',
    }
  }

  if (isFocusInfoText(normalizedText)) {
    return {
      intent: 'focus_related',
      scenario: 'intelligence',
      intelligenceMessageType: 'FOCUS_RELATED',
    }
  }

  if (isCancelText(normalizedText)) {
    return {
      intent: 'cancel',
      scenario: 'menu',
    }
  }

  if (isHelpText(normalizedText)) {
    return {
      intent: 'navigation',
      scenario: 'intelligence',
      intelligenceMessageType: 'QUESTION',
    }
  }

  if (isZoomText(normalizedText)) {
    return {
      intent: 'navigation',
      scenario: 'intelligence',
      intelligenceMessageType: 'QUESTION',
    }
  }

  if (isPaymentIssueText(normalizedText)) {
    return {
      intent: 'payment_issue',
      scenario: 'intelligence',
      intelligenceMessageType: 'FOCUS_RELATED',
    }
  }

  if (isGreetingText(normalizedText)) {
    return {
      intent: 'greeting',
      scenario: 'intelligence',
      intelligenceMessageType: 'SMALL_TALK',
    }
  }

  const intelligenceMessageType = detectTelegramIntelligenceMessageType(text)
  switch (intelligenceMessageType) {
    case 'MEMORY_REQUEST':
      return { intent: 'memory_request', scenario: 'intelligence', intelligenceMessageType }
    case 'FOLLOWUP':
      return { intent: 'followup', scenario: 'intelligence', intelligenceMessageType }
    case 'PERSONAL_SITUATION':
      return { intent: 'personal_situation', scenario: 'intelligence', intelligenceMessageType }
    case 'QUESTION':
      return { intent: 'question', scenario: 'intelligence', intelligenceMessageType }
    case 'FOCUS_RELATED':
      return { intent: 'focus_related', scenario: 'intelligence', intelligenceMessageType }
    case 'SMALL_TALK':
      return {
        intent: isGreetingText(normalizedText) ? 'greeting' : 'unknown',
        scenario: 'intelligence',
        intelligenceMessageType,
      }
    case 'UNKNOWN':
    default:
      return { intent: 'unknown', scenario: 'intelligence', intelligenceMessageType: 'UNKNOWN' }
  }
}

async function handlePendingNameScenario(ctx: Context, userId: string, chatId: string, text: string): Promise<boolean> {
  if (!(await hasPendingName(chatId))) {
    return false
  }

  const name = text.trim().slice(0, 50)
  if (!name) {
    return false
  }

  const response = createConversationResponse({
    nextActions: [
      {
        type: 'pending_name_capture',
        userId,
        chatId,
        text: name,
      },
    ],
    telemetry: {
      scenario: 'pending_name',
      source: 'message_router',
    },
    analytics: {
      intent: 'pending_name',
    },
  })

  return conversationRenderer.render(ctx, response)
}

async function handleActiveQuestionScenario(
  ctx: Context,
  chatId: string,
  text: string,
  userId: string | null,
): Promise<boolean> {
  const session = await getSession(chatId)
  const parsed = session ? parseQuestionState(session.state) : null

  if (parsed?.type === 'morning') {
    const response = createConversationResponse({
      nextActions: [{ type: 'morning_answer', text }],
      telemetry: { scenario: 'active_question', session: 'morning' },
      analytics: { intent: 'morning_answer' },
    })
    return conversationRenderer.render(ctx, response)
  }

  if (parsed?.type === 'evening') {
    const response = createConversationResponse({
      nextActions: [{ type: 'evening_answer', text }],
      telemetry: { scenario: 'active_question', session: 'evening' },
      analytics: { intent: 'evening_answer' },
    })
    return conversationRenderer.render(ctx, response)
  }

  if (userId) {
    const abTestProgress = await loadAbTestProgress(userId).catch(() => null)
    if (abTestProgress?.status === 'active' && abTestProgress.current_question_id) {
      await renderCurrentView(ctx, userId, abTestProgress)
      return true
    }
  }

  return false
}

export async function routeTelegramTextMessage(
  ctx: Context,
  text: string,
  forcedRoute?: TelegramTextRoute,
): Promise<boolean> {
  const chatId = String(ctx.chat?.id ?? '')
  const userId = (ctx.state as { userId?: string | null }).userId ?? null
  const route = forcedRoute ?? resolveTelegramTextRoute(text)

  if (userId && chatId && await handlePendingNameScenario(ctx, userId, chatId, text)) {
    return true
  }

  if (userId) {
    const handledEmailCapture = await handleAbTestEmailCaptureText(ctx, userId, text)
    if (handledEmailCapture) {
      return true
    }
  } else {
    const handledPendingIdentity = await handlePendingTelegramIdentityText(ctx, text)
    if (handledPendingIdentity) {
      return true
    }
  }

  if (
    route.intent !== 'cancel'
    && route.intent !== 'focus_payment'
    && route.intent !== 'already_paid'
    && route.intent !== 'start_test'
    && route.intent !== 'open_faq'
    && route.intent !== 'payment_issue'
    && chatId
    && await handleActiveQuestionScenario(ctx, chatId, text, userId)
  ) {
    return true
  }

  if (chatId && isLikelyMistypedStartCommand(text)) {
    await ctx.telegram.sendMessage(
      chatId,
      'Можливо, ти мала на увазі команду /start? Натисни її внизу, щоб продовжити.',
    )
    return true
  }

  switch (route.scenario) {
    case 'ab_test_callback':
    case 'status':
    case 'menu':
    case 'intelligence': {
      const response = await conversationEngine.execute(ctx, {
        chatId,
        userId,
        text,
        route,
      })
      return conversationRenderer.render(ctx, response)
    }
    default:
      return false
  }
}
