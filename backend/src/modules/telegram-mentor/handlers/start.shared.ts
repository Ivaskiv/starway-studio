import { absystemContent } from '@/products/absystem/config/absystem.content.js'
import type { Context } from 'telegraf'

import { resolveUserState as resolveCoreUserState, resolveLinkedUserIdFromContext, type UserState as CoreUserState } from '../core/state.service.js'

export type StartContext = Context & {
  startPayload?: string
}

export type UserState =
  | 'new'
  | 'lm_started'
  | 'lm_engaged'
  | 'lm_almost_done'
  | 'lm_completed'
  | 'lm_exited'
  | 'active'
  | 'in_trial'
  | 'subscribed'
  | 'paused'

export type StateMessage = {
  text: string
  buttons: Array<
    Array<
      | { text: string; callback_data: string }
      | { text: string; url: string }
      | { text: string; web_app: { url: string } }
    >
  >
}

export type StartScenario = keyof typeof absystemContent.START_FLOWS
export type ComebackScenario = keyof typeof absystemContent.COMEBACK_FLOWS

function getUiSettings(raw: unknown): Record<string, unknown> {
  if (raw !== null && typeof raw === 'object' && !Array.isArray(raw)) {
    return { ...(raw as Record<string, unknown>) }
  }
  return {}
}
export type InterruptionRecoveryType =
  keyof typeof absystemContent.INTERRUPTION_RECOVERY

export type UserContext = {
  lifecycle: string | null
  testResultType: string | null
  inactivityDays?: number
  repeatedPostponedActions?: string[]
  lastGoal?: string | null
  lastAction?: string | null
}

export { resolveLinkedUserIdFromContext }

export const GENERIC_DEEPLINK_PREFIX = 'dl_'

export type TelegramInlineButton =
  | { text: string; callback_data: string }
  | { text: string; url: string }
  | { text: string; web_app: { url: string } }

export function getStartPayload(ctx: StartContext): string {
  if (ctx.startPayload) {
    return ctx.startPayload.trim()
  }

  const text =
    'message' in ctx && ctx.message && 'text' in ctx.message
      ? ctx.message.text
      : ''
  return String(text ?? '')
    .replace('/start', '')
    .trim()
}

export function asRecord(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return {}
  }

  return value as Record<string, unknown>
}

export function isJsonObject(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value)
}

export function asString(value: unknown): string | null {
  return typeof value === 'string' && value.trim().length > 0
    ? value.trim()
    : null
}

export function normalizeText(value: string): string {
  return value.trim().replace(/\s+/g, ' ').toLowerCase()
}

export function readJsonString(value: unknown, key: string): string | null {
  return asString(asRecord(value)[key])
}

export function readJsonTimestamp(value: unknown, key: string): Date | null {
  const raw = asString(asRecord(value)[key])
  if (!raw) {
    return null
  }

  const date = new Date(raw)
  return Number.isFinite(date.getTime()) ? date : null
}

function collectTexts(value: unknown): string[] {
  if (typeof value === 'string') {
    return [value]
  }

  if (Array.isArray(value)) {
    return value.flatMap((item) => collectTexts(item))
  }

  if (value && typeof value === 'object') {
    return Object.values(value as Record<string, unknown>).flatMap((item) =>
      collectTexts(item)
    )
  }

  return []
}

export function deriveRepeatedPostponedActions(input: {
  weeklyReport: {
    summaryText: string | null
    nextWeekTasks: unknown
    analysis: unknown
    growthAreas: unknown
    struggleAreas: unknown
  } | null
  microTasks: Array<{
    title: string
    description: string | null
    aiContext: string | null
    status: string
  }>
}): string[] {
  const counts = new Map<string, { text: string; count: number }>()

  const addText = (text: string | null | undefined) => {
    const normalized = asString(text)
    if (!normalized) return
    const key = normalizeText(normalized)
    const current = counts.get(key)
    if (current) {
      current.count += 1
      return
    }
    counts.set(key, { text: normalized, count: 1 })
  }

  addText(input.weeklyReport?.summaryText)
  for (const text of collectTexts(input.weeklyReport?.nextWeekTasks))
    addText(text)
  for (const text of collectTexts(input.weeklyReport?.analysis)) addText(text)
  for (const text of collectTexts(input.weeklyReport?.growthAreas))
    addText(text)
  for (const text of collectTexts(input.weeklyReport?.struggleAreas))
    addText(text)

  for (const task of input.microTasks) {
    addText(task.title)
    addText(task.description)
    addText(task.aiContext)
    addText(task.status)
  }

  return [...counts.values()]
    .filter((entry) => entry.count >= 2)
    .map((entry) => entry.text)
    .slice(0, 5)
}

export function resolvePrimaryProductKey(
  productAccesses: Array<{ product: string }> | undefined
): 'STANKEY' | 'FOCUS' | 'ABsystem' | null {
  const product = productAccesses?.[0]?.product
  if (product === 'stankey') return 'STANKEY'
  if (product === 'focus') return 'FOCUS'
  if (product === 'absystem') return 'ABsystem'
  return null
}

export function toInactivityDays(
  updatedAt: Date,
  latestDailyCycleDate?: Date | null
): number {
  const source = latestDailyCycleDate ?? updatedAt
  const diff = Date.now() - source.getTime()
  return Number.isFinite(diff) && diff > 0 ? Math.floor(diff / 86_400_000) : 0
}

export function toAgeDays(createdAt: Date, now = new Date()): number {
  const diff = now.getTime() - createdAt.getTime()
  return Number.isFinite(diff) && diff > 0 ? Math.floor(diff / 86_400_000) : 0
}

function mapStateToLegacy(state: CoreUserState): UserState {
  switch (state) {
    case 'LEAD_MAGNET':
      return 'lm_engaged'
    case 'TRIAL':
      return 'in_trial'
    case 'ACTIVE':
      return 'subscribed'
    case 'PAUSED':
      return 'paused'
    case 'ONBOARDING':
      return 'active'
    case 'WAITLIST':
    default:
      return 'new'
  }
}

export function isLeadMagnetActive(
  state: UserState | null | undefined
): boolean {
  return (
    state === 'lm_started' ||
    state === 'lm_engaged' ||
    state === 'lm_almost_done' ||
    state === 'lm_completed' ||
    state === 'lm_exited'
  )
}

export function isLockedState(state: UserState | null | undefined): boolean {
  return isLeadMagnetActive(state)
}

export async function resolveUserState(userId: string): Promise<UserState> {
  return mapStateToLegacy(await resolveCoreUserState(userId))
}

export type StartContextRecord = UserContext & {
  primaryProductKey: 'STANKEY' | 'FOCUS' | 'ABsystem' | null
  settings: Record<string, unknown>
  updatedAt: Date
  latestDailyCycleDate: Date | null
  latestDailyCycleSummary: string | null
  subscriptionCreatedAt: Date | null
  weeklyReportSummaries: string[]
  referralSentAt: Date | null
  wheelAnsweredCount: number
  latestWheelAssessmentAt: Date | null
  latestGoalsSetAt: Date | null
  latestGoalsCompleted: number
  latestGoalsCount: number
}

export function isSameUtcDay(left: Date | string, right: Date | string): boolean {
  const leftDate = new Date(left)
  const rightDate = new Date(right)
  if (Number.isNaN(leftDate.getTime()) || Number.isNaN(rightDate.getTime())) {
    return false
  }

  return (
    leftDate.toISOString().slice(0, 10) === rightDate.toISOString().slice(0, 10)
  )
}

export function countWheelAnswered(value: unknown): number {
  if (Array.isArray(value)) {
    return value.filter((item) => {
      if (item === null || item === undefined) return false
      if (typeof item === 'number') return Number.isFinite(item)
      if (typeof item === 'object') {
        const record = item as Record<string, unknown>
        return (
          typeof record.categoryId === 'string' ||
          typeof record.score === 'number'
        )
      }
      return true
    }).length
  }

  if (value && typeof value === 'object') {
    return Object.entries(value as Record<string, unknown>).filter(
      ([key, item]) =>
        key !== '__regenCount' && item !== null && item !== undefined
    ).length
  }

  return 0
}

export function countCompletedGoals(value: unknown): number {
  if (!Array.isArray(value)) {
    return 0
  }

  return value.filter((item) => {
    if (!item || typeof item !== 'object') {
      return false
    }

    const goal = item as Record<string, unknown>
    return (
      (goal.completedAt !== null && goal.completedAt !== undefined) ||
      goal.isCompleted === true ||
      goal.status === 'completed'
    )
  }).length
}

export function countGoalsTotal(value: unknown): number {
  return Array.isArray(value) ? value.length : 0
}

export function normalizeMemoryFlowContent(flow: {
  text: string
  cta?: string | null
  ctaUrl?: string | null
  callbackData?: string | null
}) {
  return {
    text: flow.text,
    cta: flow.cta ?? absystemContent.buttons.continue,
    ctaUrl: flow.ctaUrl ?? null,
    callbackData: flow.callbackData ?? null,
  }
}

export * from './start.context.js'
export * from './start.recovery.js'
export * from './start.menu.js'
