//backend/src/products/ab-system/telegram/helpers.ts

// ============================================================================
// CONSTANTS
// ============================================================================

export const AB_TEST_START_DEBUG_PREFIX = '[AB_TEST_START_DEBUG]'
export const AB_TEST_EMAIL_SKIP_LOG_PREFIX = '[ab-test-email-skip]'
export const AB_TEST_EMAIL_SKIP_GUARD_TTL_MS = 10_000

// ============================================================================
// LOGGERS
// ============================================================================

export function logAbTestStartDebug(
  event: string,
  payload: Record<string, unknown>
): void {
  console.info(AB_TEST_START_DEBUG_PREFIX, event, payload)
}

export function logFlowStart(
  event: string,
  payload: Record<string, unknown>
): void {
  console.info('[FLOW_START]', event, payload)
}

export function logFlowResume(
  event: string,
  payload: Record<string, unknown>
): void {
  console.info('[FLOW_RESUME]', event, payload)
}

export function logFlowRender(
  event: string,
  payload: Record<string, unknown>
): void {
  console.info('[FLOW_RENDER]', event, payload)
}

export function logMessageSent(
  event: string,
  payload: Record<string, unknown>
): void {
  console.info('[MESSAGE_SENT]', event, payload)
}

export function logCallbackReceived(
  payload: Record<string, unknown>
): void {
  console.info('[CALLBACK_RECEIVED]', payload)
}

export function logCallbackHandled(
  payload: Record<string, unknown>
): void {
  console.info('[CALLBACK_HANDLED]', payload)
}

// ============================================================================
// EMAIL & VALIDATION
// ============================================================================

export function isValidEmail(value: string): boolean {
  const normalized = value.trim().toLowerCase()
  if (!normalized || normalized.length > 254) return false
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalized)
}

// ============================================================================
// HTML ESCAPING
// ============================================================================

export function escapeHtml(value: string): string {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;')
}

// ============================================================================
// TEXT FORMATTING
// ============================================================================

export function formatMobileAnswerButtonText(value: string): string {
  return value.match(/^([А-ДA-E])\./)?.[1] ?? value.slice(0, 1)
}

export function formatMobileAnswerListForMessage(
  answers: ReadonlyArray<{ text: string }>
): string {
  return answers
    .map((answer) => {
      const match = answer.text.match(/^([А-ДA-E])\.\s*(.*)$/s)
      const letter = match?.[1] ?? answer.text.slice(0, 1)
      const body = match?.[2] ?? answer.text.slice(2).trim()
      return `${letter}. ${body}`
    })
    .join('\n\n')
}

export function formatSubscriptionDate(
  value: Date | string | null | undefined
): string {
  if (!value) return '—'
  const date = value instanceof Date ? value : new Date(value)
  if (!Number.isFinite(date.getTime())) return '—'
  return date.toLocaleDateString('uk-UA', { timeZone: 'Europe/Kyiv' })
}

// ============================================================================
// URL UTILITIES
// ============================================================================

export function firstNonEmptyUrl(
  ...values: Array<string | null | undefined>
): string {
  for (const value of values) {
    if (typeof value === 'string' && value.trim()) {
      return value.trim()
    }
  }
  return 'https://wayforpay.com'
}

// ============================================================================
// ENVIRONMENT CHECKS
// ============================================================================

export function isTestPaymentEnabled(): boolean {
  return (
    process.env.NODE_ENV !== 'production' &&
    process.env.TEST_PAYMENT_ENABLED?.trim() === 'true'
  )
}

// ============================================================================
// QUESTION LATENCY
// ============================================================================

export function resolveQuestionLatency(
  lastEventAt: string | null | undefined,
  answeredAt: Date
): number | null {
  if (!lastEventAt) {
    return null
  }

  const openedAt = new Date(lastEventAt).getTime()
  if (!Number.isFinite(openedAt)) {
    return null
  }

  return Math.max(0, answeredAt.getTime() - openedAt)
}

// ============================================================================
// EMAIL SKIP GUARD (STATE MANAGEMENT)
// ============================================================================

const activeEmailSkipGuards = new Map<string, number>()

export async function claimEmailSkipGuard(userId: string): Promise<boolean> {
  const { cacheGet, cacheSet } = await import('../../../lib/cache/index.js')

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

// ============================================================================
// ANSWER LATENCY RESOLUTION (PROGRESS-AWARE)
// ============================================================================

import type { AbTestProgress } from '../../../core/state-machine/abTestFoundation.js'

export function resolveAbTestAnswerLatency(
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

// ============================================================================
// REGEX PATTERNS (REUSABLE)
// ============================================================================

export const PATTERNS = {
  EMAIL: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
  ANSWER_LETTER: /^([А-ДA-E])\./,
  ANSWER_WITH_TEXT: /^([А-ДA-E])\.\s*(.*)$/s,
  FOCUS_PAYMENT_PLAN: /^open_focus_payment(?::(1month|3month))?$/,
  SHOW_INSIDE: /^show_inside_(STATE|GOAL|CHOICE|DECISION|ACTION)$/,
  EDIT_QUESTION: /^ab_test_edit:(q[1-8])$/,
  ANSWER_CALLBACK: /^ab_test_answer:([^:]+):([^:]+):?(\d+)?$/,
} as const