//backend/src/products/ab-system/telegram/abTest.callback.ts

import type {
  AbTestAnswerKey,
  AbTestQuestionId,
} from '../content/abTest.questions.js'
import type { AbTestResultKey } from '../content/abTest.results.js'
import type { Context } from 'telegraf'
import type { InlineKeyboardMarkup } from 'telegraf/types'
import { prisma } from '../../../db/client.js'
import { cacheGet, cacheSet } from '../../../lib/cache/index.js'
import type { AbTestProgress } from '../../../core/state-machine/abTestFoundation.js'
// Re-export from canonical source so existing importers don't break
export { formatMobileAnswerButtonText, formatMobileAnswerListForMessage } from './abTest.helpers.js'

// ============================================================================
// TYPES
// ============================================================================

export type AbTestCallbackAction =
  | { kind: 'entry' }
  | { kind: 'intro' }
  | { kind: 'resume' }
  | { kind: 'restart' }
  | { kind: 'show_result' }
  | { kind: 'test_drive' }
  | { kind: 'start' }
  | { kind: 'restore' }
  | { kind: 'menu' }
  | { kind: 'subscription' }
  | { kind: 'skip_email_before_result' }
  | { kind: 'confirm_profile_email_for_result' }
  | { kind: 'change_email_for_result' }
  | { kind: 'show_inside'; resultKey: AbTestResultKey }
  | { kind: 'edit'; questionId: AbTestQuestionId }
  | {
      kind: 'answer'
      questionId: AbTestQuestionId
      answerId: AbTestAnswerKey
      revision: number | null
    }

// ============================================================================
// CALLBACK PARSER
// ============================================================================

export function parseAbTestCallback(
  action: string,
): AbTestCallbackAction | null {
  if (action === 'ab_test:entry') return { kind: 'entry' }
  if (action === 'ab_test:intro') return { kind: 'intro' }
  if (action === 'ab_test:resume') return { kind: 'resume' }
  if (action === 'ab_test:continue') return { kind: 'resume' }
  if (action === 'ab_test:restart') return { kind: 'restart' }
  if (action === 'ab_test:show_result') return { kind: 'show_result' }
  if (action === 'ab_test:test_drive') return { kind: 'test_drive' }
  if (action === 'ab_test:start') return { kind: 'start' }
  if (action === 'ab_test:restore') return { kind: 'restore' }
  if (action === 'ab_test:menu') return { kind: 'menu' }
  if (action === 'ab_test:subscription') return { kind: 'subscription' }
  if (action === 'skip_email_before_result') return { kind: 'skip_email_before_result' }
  if (action === 'confirm_profile_email_for_result') return { kind: 'confirm_profile_email_for_result' }
  if (action === 'change_email_for_result') return { kind: 'change_email_for_result' }

  const showInsideMatch = action.match(/^show_inside_(STATE|GOAL|CHOICE|DECISION|ACTION)$/)
  if (showInsideMatch) {
    return { kind: 'show_inside', resultKey: showInsideMatch[1].toLowerCase() as AbTestResultKey }
  }

  const editMatch = action.match(/^ab_test_edit:(q[1-8])$/)
  if (editMatch) {
    return { kind: 'edit', questionId: editMatch[1] as AbTestQuestionId }
  }

  const match = action.match(/^ab_test_answer:([^:]+):([^:]+):?(\d+)?$/)
  if (!match) return null

  const revision = match[3] ? Number(match[3]) : null
  return {
    kind: 'answer',
    questionId: match[1] as AbTestQuestionId,
    answerId: match[2] as AbTestAnswerKey,
    revision: Number.isFinite(revision ?? NaN) ? revision : null,
  }
}

// ============================================================================
// HELPERS
// ============================================================================

const AB_TEST_START_DEBUG_PREFIX = '[AB_TEST_START_DEBUG]'
const AB_TEST_EMAIL_SKIP_GUARD_TTL_MS = 10_000
const AB_TEST_EMAIL_SKIP_LOG_PREFIX = '[ab-test-email-skip]'

const activeEmailSkipGuards = new Map<string, number>()

export function logAbTestStartDebug(event: string, payload: Record<string, unknown>) {
  console.info(AB_TEST_START_DEBUG_PREFIX, event, payload)
}

export function logFlowStart(event: string, payload: Record<string, unknown>) {
  console.info('[FLOW_START]', event, payload)
}

export function logFlowResume(event: string, payload: Record<string, unknown>) {
  console.info('[FLOW_RESUME]', event, payload)
}

export function logFlowRender(event: string, payload: Record<string, unknown>) {
  console.info('[FLOW_RENDER]', event, payload)
}

export function logMessageSent(event: string, payload: Record<string, unknown>) {
  console.info('[MESSAGE_SENT]', event, payload)
}

export function logCallbackReceived(payload: Record<string, unknown>) {
  console.info('[CALLBACK_RECEIVED]', payload)
}

export function logCallbackHandled(payload: Record<string, unknown>) {
  console.info('[CALLBACK_HANDLED]', payload)
}

export async function resolveAbTestEmailTargetUserId(
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

export function resolveQuestionLatency(
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

export function isValidEmail(value: string): boolean {
  const normalized = value.trim().toLowerCase()
  if (!normalized || normalized.length > 254) return false
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalized)
}

export function firstNonEmptyUrl(...values: Array<string | null | undefined>): string {
  for (const value of values) {
    if (typeof value === 'string' && value.trim()) {
      return value.trim()
    }
  }
  return 'https://wayforpay.com'
}

export function isTestPaymentEnabled(): boolean {
  return (
    process.env.NODE_ENV !== 'production' &&
    process.env.TEST_PAYMENT_ENABLED?.trim() === 'true'
  )
}

export function formatSubscriptionDate(
  value: Date | string | null | undefined
): string {
  if (!value) return '—'
  const date = value instanceof Date ? value : new Date(value)
  if (!Number.isFinite(date.getTime())) return '—'
  return date.toLocaleDateString('uk-UA', { timeZone: 'Europe/Kyiv' })
}

export async function deactivateCallbackMarkup(
  ctx: Context
): Promise<void> {
  const callbackMessage =
    ctx.callbackQuery && 'message' in ctx.callbackQuery
      ? ctx.callbackQuery.message
      : null
  const pressedCallbackData =
    ctx.callbackQuery && 'data' in ctx.callbackQuery
      ? ctx.callbackQuery.data
      : null

  const currentKeyboard =
    callbackMessage &&
    'reply_markup' in callbackMessage &&
    callbackMessage.reply_markup &&
    typeof callbackMessage.reply_markup === 'object' &&
    'inline_keyboard' in callbackMessage.reply_markup &&
    Array.isArray(callbackMessage.reply_markup.inline_keyboard)
      ? callbackMessage.reply_markup.inline_keyboard
      : null

  const inline_keyboard = currentKeyboard?.length
    ? currentKeyboard.map((row) =>
        row.map((button) => {
          if (!('callback_data' in button) || button.callback_data !== pressedCallbackData) {
            return button
          }

          return {
            ...button,
            text: button.text.startsWith('✅ ') ? button.text : `✅ ${button.text}`,
            callback_data: 'disabled',
          }
        })
      )
    : [
        [
          {
            text: '✅ ПЕРЕГЛЯНУТО',
            callback_data: 'disabled',
          },
        ],
      ]

  await ctx
    .editMessageReplyMarkup({ inline_keyboard })
    .catch(() => undefined)
}

export function escapeHtml(value: string): string {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;')
}

export async function claimEmailSkipGuard(userId: string): Promise<boolean> {
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


export async function sendStructuredTelegramMessage(
  ctx: Context,
  chatId: string | number,
  title: string,
  lines: string[],
  replyMarkup?: InlineKeyboardMarkup
): Promise<void> {
  const { packTelegramContentBlocks, splitTelegramContentBlocks, sendTelegramContentChunk } = await import('./abTest.views.js')

  const chunks = packTelegramContentBlocks(
    splitTelegramContentBlocks(lines),
    900
  )

  for (let index = 0; index < chunks.length; index += 1) {
    await ctx.telegram.sendChatAction(chatId, 'typing').catch(() => undefined)
    if (index > 0) {
      await new Promise((resolve) => setTimeout(resolve, 3000))
    }

    await sendTelegramContentChunk(ctx, chatId, index === 0 ? title : '', chunks[index], {
      inlineKeyboard: index === chunks.length - 1 ? replyMarkup : undefined,
    })
  }
}

export async function resolveContextUserId(ctx: Context): Promise<string | null> {
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

export const AB_TEST_EMAIL_SKIP_LOG_PREFIX_EXPORT = AB_TEST_EMAIL_SKIP_LOG_PREFIX
export const AB_TEST_START_DEBUG_PREFIX_EXPORT = AB_TEST_START_DEBUG_PREFIX
