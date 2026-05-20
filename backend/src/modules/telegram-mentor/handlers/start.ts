import { absystemContent } from '@/products/absystem/config/absystem.content.js'
import { stankeyContent } from '@/products/stankey/config/stankey.content.js'
import type { Context } from 'telegraf'

import { getTelegramProductContext } from '@/content/telegram.product-context.js'
import { resolveTelegramWebappBaseUrl } from '@/config/webapp.js'
import { resolveBehavioralContinuity } from '../../../core/continuity/behavioralContinuity.js'
import { resolveDecision } from '../../../core/decision/decision.resolver.js'
import { buildAbsystemStartFlow } from '../../../core/flow-builder/flowBuilder.js'
import { resolveRelationshipMemory } from '../../../core/memory/relationshipMemory.js'
import {
  buildRelationshipContinuityLead,
  resolveConversationProfile,
} from '../../../core/state-machine/conversationPresentation.js'
import { deliverTelegramFlow } from '../../../core/transport/telegramTransport.js'
import { prisma } from '../../../db/client.js'
import { bot } from '../../../lib/telegram.js'
import { PromptProvider } from '../../../PromptProvider.js'
import { getAccessControlState } from '../../access/service.js'
import { resolveDeepLinkToken } from '../../deeplinks/service.js'
import { trackEvent } from '../../events/service.js'
import { verifyTelegramLinkCode } from '../../social/service.js'
import { resolveOrCreateTelegramGuestUser } from '../../user/identity.service.js'
import {
  isExplicitWaitlistUser,
  resolveUserState as resolveCoreUserState,
  resolveLinkedUserIdFromContext,
  type UserState as CoreUserState,
} from '../core/state.service.js'
import { sendWaitlist } from '../flows/onboarding.flow.js'
import { getTelegramAppUrl, openAppKeyboard, withDevTestPaymentButton } from '../keyboards.js'
import { renderTelegramDecision } from '../renderers/decisionTelegram.js'
import {
  findLinkedUserId,
  upsertTelegramBinding,
} from '../services/linking.service.js'
import {
  resolveTelegramAccessOrchestration,
  resolveTelegramRoomLaunch,
} from '../services/product-room.service.js'
import { resolveTelegramProductSummary } from '../services/productSummary.service.js'
import {
  isAbTestStartPayload,
  renderAbTestEntry,
} from '@/products/ab-system/telegram/abTest.service.js'
import { getOrCreateFocusInviteLink } from '@/products/focus/payments/inviteLink.js'
import { absystemButtons } from '@/products/ab-system/config/absystem.content.js'

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
  lifecycleState: string | null
  testResultType: string | null
  inactivityDays?: number
  repeatedPostponedActions?: string[]
  lastGoal?: string | null
  lastAction?: string | null
}

export { resolveLinkedUserIdFromContext }

export const GENERIC_DEEPLINK_PREFIX = 'dl_'

type TelegramInlineButton =
  | { text: string; callback_data: string }
  | { text: string; url: string }
  | { text: string; web_app: { url: string } }

function getStartPayload(ctx: StartContext): string {
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

function asRecord(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return {}
  }

  return value as Record<string, unknown>
}

function asString(value: unknown): string | null {
  return typeof value === 'string' && value.trim().length > 0
    ? value.trim()
    : null
}

function normalizeText(value: string): string {
  return value.trim().replace(/\s+/g, ' ').toLowerCase()
}

function readJsonString(value: unknown, key: string): string | null {
  return asString(asRecord(value)[key])
}

function readJsonTimestamp(value: unknown, key: string): Date | null {
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

function deriveRepeatedPostponedActions(input: {
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

function resolvePrimaryProductKey(
  productAccesses: Array<{ product: string }> | undefined
): 'STANKEY' | 'FOCUS' | 'ABsystem' | null {
  const product = productAccesses?.[0]?.product
  if (product === 'stankey') return 'STANKEY'
  if (product === 'focus') return 'FOCUS'
  if (product === 'absystem') return 'ABsystem'
  return null
}

function toInactivityDays(
  updatedAt: Date,
  latestDailyCycleDate?: Date | null
): number {
  const source = latestDailyCycleDate ?? updatedAt
  const diff = Date.now() - source.getTime()
  return Number.isFinite(diff) && diff > 0 ? Math.floor(diff / 86_400_000) : 0
}

function toAgeDays(createdAt: Date, now = new Date()): number {
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

type StartContextRecord = UserContext & {
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

function isSameUtcDay(left: Date | string, right: Date | string): boolean {
  const leftDate = new Date(left)
  const rightDate = new Date(right)
  if (Number.isNaN(leftDate.getTime()) || Number.isNaN(rightDate.getTime())) {
    return false
  }

  return (
    leftDate.toISOString().slice(0, 10) === rightDate.toISOString().slice(0, 10)
  )
}

function countWheelAnswered(value: unknown): number {
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

function countCompletedGoals(value: unknown): number {
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

function countGoalsTotal(value: unknown): number {
  return Array.isArray(value) ? value.length : 0
}

function normalizeMemoryFlowContent(flow: {
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

export async function resolveStartContext(
  userId: string
): Promise<StartContextRecord | null> {
  const user = await prisma.user
    .findUnique({
      where: { id: userId },
      select: {
        lifecycleState: true,
        testResultType: true,
        settings: true,
        updatedAt: true,
        productAccesses: {
          orderBy: { createdAt: 'desc' },
          take: 1,
          select: {
            product: true,
          },
        },
        dailyCycleLogs: {
          orderBy: { date: 'desc' },
          take: 2,
          select: {
            date: true,
            aiSummary: true,
            state: true,
            choice: true,
          },
        },
        wheelAssessments: {
          orderBy: { createdAt: 'desc' },
          take: 1,
          select: {
            createdAt: true,
            scores: true,
          },
        },
        goalsSets: {
          orderBy: { createdAt: 'desc' },
          take: 1,
          select: {
            createdAt: true,
            goals: true,
          },
        },
        productSubscriptions: {
          where: {
            status: 'active',
            product: {
              code: { in: ['absystem_ai', 'absystem'] },
            },
          },
          orderBy: { createdAt: 'desc' },
          take: 1,
          select: {
            createdAt: true,
          },
        },
        weeklyReports: {
          orderBy: { createdAt: 'desc' },
          take: 3,
          select: {
            summaryText: true,
            nextWeekTasks: true,
            analysis: true,
            growthAreas: true,
            struggleAreas: true,
          },
        },
        microTasks: {
          where: { isCompleted: false },
          orderBy: { updatedAt: 'desc' },
          take: 20,
          select: {
            title: true,
            description: true,
            aiContext: true,
            status: true,
          },
        },
      },
    })
    .catch(() => null)

  if (!user) {
    return null
  }

  const settings = asRecord(user.settings)
  const repeatedPostponedActions = deriveRepeatedPostponedActions({
    weeklyReport: user.weeklyReports[0] ?? null,
    microTasks: user.microTasks,
  })
  const latestDailyCycle = user.dailyCycleLogs[0] ?? null
  const latestWheelAssessment = user.wheelAssessments[0] ?? null
  const latestGoalsSet = user.goalsSets[0] ?? null
  const latestSubscription = user.productSubscriptions[0] ?? null
  const weeklyReportSummaries = user.weeklyReports
    .map((report) => asString(report.summaryText))
    .filter((summary): summary is string => Boolean(summary))

  return {
    lifecycleState: asString(user.lifecycleState),
    testResultType: asString(user.testResultType),
    updatedAt: user.updatedAt,
    inactivityDays: toInactivityDays(
      user.updatedAt,
      latestDailyCycle?.date ?? null
    ),
    repeatedPostponedActions,
    lastGoal: readJsonString(settings, 'lastGoal'),
    lastAction: readJsonString(settings, 'lastAction'),
    referralSentAt: readJsonTimestamp(settings, 'referralSentAt'),
    primaryProductKey: resolvePrimaryProductKey(user.productAccesses),
    settings,
    latestDailyCycleDate: latestDailyCycle?.date ?? null,
    latestDailyCycleSummary: latestDailyCycle?.aiSummary ?? null,
    subscriptionCreatedAt: latestSubscription?.createdAt ?? null,
    weeklyReportSummaries,
    wheelAnsweredCount: countWheelAnswered(latestWheelAssessment?.scores),
    latestWheelAssessmentAt: latestWheelAssessment?.createdAt ?? null,
    latestGoalsSetAt: latestGoalsSet?.createdAt ?? null,
    latestGoalsCompleted: countCompletedGoals(latestGoalsSet?.goals),
    latestGoalsCount: countGoalsTotal(latestGoalsSet?.goals),
  }
}

async function loadStartContext(
  userId: string
): Promise<StartContextRecord | null> {
  return resolveStartContext(userId)
}

export function resolveComeback(input: {
  lastActivityDays: number
  lifecycleState: string | null
  primaryProductKey?: 'STANKEY' | 'FOCUS' | 'ABsystem' | null
}): ComebackScenario | null {
  if (input.primaryProductKey === 'STANKEY') {
    return null
  }

  const lifecycleState = asString(input.lifecycleState)?.toLowerCase() ?? null
  const lastActivityDays = Math.max(
    0,
    Math.floor(Number(input.lastActivityDays ?? 0))
  )

  if (lifecycleState === 'expired') {
    return lastActivityDays >= 30 ? 'GAP_30_NO_SUB' : null
  }

  if (lifecycleState !== 'platform_active') {
    return null
  }

  if (lastActivityDays >= 30) {
    return 'GAP_30_PLUS'
  }

  if (lastActivityDays >= 7) {
    return 'GAP_7_14'
  }

  if (lastActivityDays >= 4) {
    return 'GAP_4_7'
  }

  if (lastActivityDays >= 1) {
    return 'GAP_1_3'
  }

  return null
}

function resolveReferralButton(
  context: StartContextRecord,
  userId: string
): { text: string; url: string } | null {
  if (context.primaryProductKey === 'STANKEY') {
    return null
  }

  if (context.lifecycleState !== 'platform_active') {
    return null
  }

  if (!context.subscriptionCreatedAt) {
    return null
  }

  const subscriptionAgeDays = toAgeDays(context.subscriptionCreatedAt)
  if (subscriptionAgeDays < 30) {
    return null
  }

  if (context.referralSentAt) {
    return null
  }

  if (context.weeklyReportSummaries.length < 3) {
    return null
  }

  const positiveSignals = context.weeklyReportSummaries
    .slice(0, 3)
    .every((summary) => {
      const normalized = normalizeText(summary)
      return [
        'рух',
        'просун',
        'зробил',
        'викон',
        'заверш',
        'успіх',
        'стабіль',
        'ясн',
        'добре',
        'план',
        'продовж',
      ].some((token) => normalized.includes(token))
    })

  if (!positiveSignals) {
    return null
  }

  const frontendUrl = resolvePublicFrontendBaseUrl()
  return {
    text: absystemContent.REFERRAL.cta,
    url: `${frontendUrl}/ab-test?ref=${encodeURIComponent(userId)}`,
  }
}

function resolvePublicFrontendBaseUrl() {
  return resolveTelegramWebappBaseUrl()
}

function resolveInterruptionRecoveryFromContext(context: StartContextRecord): {
  type: InterruptionRecoveryType
  context: Record<string, string | number>
} | null {
  if (context.primaryProductKey === 'STANKEY') {
    return null
  }

  const now = new Date()
  const latestDailyCycle = context.latestDailyCycleDate
  if (
    latestDailyCycle &&
    isSameUtcDay(latestDailyCycle, now) &&
    !context.latestDailyCycleSummary
  ) {
    return {
      type: 'DAILY_INCOMPLETE',
      context: {},
    }
  }

  if (context.wheelAnsweredCount > 0 && context.wheelAnsweredCount < 8) {
    return {
      type: 'WHEEL_INCOMPLETE',
      context: { n: context.wheelAnsweredCount },
    }
  }

  if (
    context.latestGoalsSetAt &&
    isSameUtcDay(context.latestGoalsSetAt, now) &&
    context.latestGoalsCount > 0 &&
    context.latestGoalsCompleted < context.latestGoalsCount
  ) {
    const remaining = Math.max(
      0,
      context.latestGoalsCount - context.latestGoalsCompleted
    )
    return {
      type: 'GOALS_INCOMPLETE',
      context: {
        n: context.latestGoalsCompleted,
        remaining,
      },
    }
  }

  return null
}

export async function resolveInterruptionRecovery(
  userId: string,
  context?: StartContextRecord | null
): Promise<{
  type: InterruptionRecoveryType
  context: Record<string, string | number>
} | null> {
  const resolvedContext = context ?? (await resolveStartContext(userId))
  if (!resolvedContext) {
    return null
  }

  return resolveInterruptionRecoveryFromContext(resolvedContext)
}

async function sendMemoryFlow(
  ctx: Context,
  flow: {
    text: string
    cta: string
    ctaUrl?: string | null
    callbackData?: string | null
  },
  extraButton?: { text: string; url: string } | null
): Promise<void> {
  const buttons: Array<Array<TelegramInlineButton>> = [
    [
      flow.ctaUrl
        ? { text: flow.cta, url: flow.ctaUrl }
        : {
            text: flow.cta,
            callback_data: flow.callbackData ?? 'return_main_menu',
          },
    ],
  ]

  if (extraButton) {
    buttons.push([{ text: extraButton.text, url: extraButton.url }])
  }

  await ctx.reply(flow.text, {
    reply_markup: {
      inline_keyboard: buttons,
    },
  })
}

export async function handleMemoryAwareStartFlow(
  ctx: Context,
  context: StartContextRecord,
  userId?: string
): Promise<boolean> {
  if (context.primaryProductKey === 'STANKEY') {
    return false
  }

  const memoryFlow = resolveMemoryFlowCopy(context)
  if (!memoryFlow) {
    return false
  }

  await sendMemoryFlow(
    ctx,
    memoryFlow,
    userId ? resolveReferralButton(context, userId) : null
  )
  return true
}

function resolveMemoryFlowCopy(context: StartContextRecord): {
  text: string
  cta: string
  ctaUrl?: string | null
  callbackData?: string | null
} | null {
  const interruption = resolveInterruptionRecoveryFromContext(context)
  if (interruption) {
    if (interruption.type === 'WHEEL_INCOMPLETE') {
      return normalizeMemoryFlowContent(
        absystemContent.INTERRUPTION_RECOVERY.WHEEL_INCOMPLETE(
          Number(interruption.context.n ?? 0)
        )
      )
    }

    if (interruption.type === 'GOALS_INCOMPLETE') {
      return normalizeMemoryFlowContent(
        absystemContent.INTERRUPTION_RECOVERY.GOALS_INCOMPLETE(
          Number(interruption.context.n ?? 0),
          Number(interruption.context.remaining ?? 0)
        )
      )
    }

    return normalizeMemoryFlowContent(
      absystemContent.INTERRUPTION_RECOVERY[interruption.type]
    )
  }

  const comeback = resolveComeback({
    lastActivityDays: context.inactivityDays ?? 0,
    lifecycleState: context.lifecycleState,
    primaryProductKey: context.primaryProductKey,
  })

  if (comeback) {
    const copy = absystemContent.COMEBACK_FLOWS[comeback]
    if (typeof copy === 'function') {
      const action =
        context.lastAction ??
        context.lastGoal ??
        context.repeatedPostponedActions?.[0] ??
        ''
      return normalizeMemoryFlowContent(copy(action))
    }
    return normalizeMemoryFlowContent(copy)
  }

  if (
    context.lifecycleState === 'platform_active' &&
    (context.repeatedPostponedActions?.length ?? 0) >= 2
  ) {
    return normalizeMemoryFlowContent({
      text: absystemContent.START_FLOWS.REPEATED_ROLLBACK.text(
        context.lastAction ?? context.lastGoal ?? ''
      ),
      cta: absystemContent.START_FLOWS.REPEATED_ROLLBACK.cta,
      callbackData: 'open_platform',
    })
  }

  return null
}

export function resolveStartScenario(user: UserContext): StartScenario {
  const lifecycleState = asString(user.lifecycleState)?.toLowerCase() ?? null
  const testResultType = asString(user.testResultType)
  const inactivityDays =
    typeof user.inactivityDays === 'number' ? user.inactivityDays : 0
  const repeatedPostponedActions = user.repeatedPostponedActions ?? []

  if (!lifecycleState || lifecycleState === 'new') {
    return 'FIRST_TIME_USER'
  }

  if (
    testResultType &&
    lifecycleState !== 'focus_active' &&
    lifecycleState !== 'platform_active'
  ) {
    return 'POST_TEST'
  }

  if (lifecycleState === 'focus_active') {
    return 'FOCUS_PARTICIPANT'
  }

  if (lifecycleState === 'platform_active' && inactivityDays < 3) {
    return 'ACTIVE_PLATFORM'
  }

  if (
    lifecycleState === 'platform_active' &&
    inactivityDays >= 3 &&
    inactivityDays < 7
  ) {
    return 'DAILY_GAP'
  }

  if (
    lifecycleState === 'platform_active' &&
    inactivityDays >= 7 &&
    inactivityDays < 30
  ) {
    return 'MEDIUM_GAP'
  }

  if (lifecycleState === 'platform_active' && inactivityDays >= 30) {
    return 'LONG_GAP'
  }

  if (repeatedPostponedActions.length >= 2) {
    return 'REPEATED_ROLLBACK'
  }

  return testResultType ? 'POST_TEST' : 'FIRST_TIME_USER'
}

export async function getStateMessage(
  state: UserState,
  _name = '',
  mentor: {
    insight?: string | null
    stage?: string | null
    blocker?: string | null
  } | null = null,
  trialDay?: string,
  _nudgeCount = 0
): Promise<StateMessage> {
  const roomContext = getTelegramProductContext('stankey')
  const insight = mentor?.insight ? `\n\n${mentor.insight}` : ''

  switch (state) {
    case 'lm_started':
    case 'lm_engaged':
    case 'lm_almost_done':
    case 'lm_completed':
    case 'lm_exited':
      return {
        text: stankeyContent.telegram.product.activeLeadMagnet('', insight),
        buttons: [
          [
            {
              text: stankeyContent.telegram.buttons.continue,
              callback_data: 'lm_continue',
            },
          ],
        ],
      }
    case 'in_trial':
      return {
        text: stankeyContent.telegram.product.activeTrial(
          trialDay,
          '',
          insight
        ),
        buttons: [
          [
            {
              text: stankeyContent.telegram.buttons.continue,
              callback_data: 'continue_ai_mentor',
            },
          ],
        ],
      }
    case 'subscribed':
      return {
        text: stankeyContent.telegram.product.activeSubscription('', insight),
        buttons: [
          [
            {
              text: stankeyContent.telegram.buttons.continue,
              callback_data: 'continue_ai_mentor',
            },
          ],
        ],
      }
    case 'paused':
      return {
        text: roomContext.copy.restore.join('\n') + insight,
        buttons: withDevTestPaymentButton([
          [
            {
              text: roomContext.cta.restore,
              callback_data: 'open_paid_checkout',
            },
          ],
        ]),
      }
    case 'active':
      return {
        text: roomContext.copy.welcome.join('\n') + insight,
        buttons: [
          [
            {
              text: roomContext.cta.continue,
              callback_data: 'continue_ai_mentor',
            },
          ],
        ],
      }
    case 'new':
    default:
      return {
        text: roomContext.copy.welcome.join('\n') + insight,
        buttons: [
          [
            {
              text: roomContext.cta.activateTrial,
              callback_data: 'start_trial',
            },
          ],
        ],
      }
  }
}

export async function sendEntryOffer(ctx: Context): Promise<void> {
  await sendWaitlist(ctx)
}

function toPlatformProductId(productKey: 'FOCUS' | 'STANKEY' | 'ABsystem') {
  return productKey === 'STANKEY'
    ? 'stankey'
    : productKey === 'FOCUS'
      ? 'focus'
      : 'absystem'
}

function resolvePolicyCtaLabel(
  raw: string,
  productId: 'stankey' | 'focus' | 'absystem'
) {
  const context = getTelegramProductContext(productId)
  return raw in context.cta ? context.cta[raw as keyof typeof context.cta] : raw
}

function buildPolicyButton(
  product: Awaited<
    ReturnType<typeof resolveTelegramProductSummary>
  >['allProducts'][number]
) {
  const productId = toPlatformProductId(product.key)
  const label = resolvePolicyCtaLabel(
    String(product.behaviorPolicy.primaryCta),
    productId
  )

  if (
    product.behaviorPolicy.primaryCta === 'activateGift' ||
    product.activationState === 'gifted' ||
    product.activationState === 'bonus'
  ) {
    return { text: label, callback_data: 'restart_flow' } as const
  }

  if (product.behaviorPolicy.primaryCta === 'restore') {
    return product.paymentUrl
      ? ({ text: label, url: product.paymentUrl } as const)
      : ({ text: label, callback_data: 'open_paid_checkout' } as const)
  }

  if (product.behaviorState === 'mentor_candidate') {
    return { text: label, callback_data: 'continue_ai_mentor' } as const
  }

  if (product.behaviorPolicy.primaryCta === 'activateTrial') {
    return { text: label, callback_data: 'start_trial' } as const
  }

  if (product.behaviorPolicy.primaryCta === 'waitlist') {
    return { text: label, callback_data: 'waitlist_early_access' } as const
  }

  if (product.openUrl) {
    return { text: label, web_app: { url: product.openUrl } } as const
  }

  if (product.paymentUrl) {
    return { text: label, url: product.paymentUrl } as const
  }

  return { text: label, callback_data: 'return_main_menu' } as const
}

async function getProductPolicy(
  userId: string,
  summary?: Awaited<ReturnType<typeof resolveTelegramProductSummary>>
) {
  const resolvedSummary =
    summary ?? (await resolveTelegramProductSummary(userId))
  const primaryProduct =
    resolvedSummary.primary ?? resolvedSummary.allProducts[0] ?? null
  return {
    summary: resolvedSummary,
    product: primaryProduct,
    policy: primaryProduct?.behaviorPolicy ?? null,
  }
}

async function sendPolicyMenu(
  ctx: Context,
  userId: string,
  summary?: Awaited<ReturnType<typeof resolveTelegramProductSummary>>,
  relationship?: Awaited<ReturnType<typeof resolveRelationshipMemory>> | null
) {
  const { product, policy } = await getProductPolicy(userId, summary)
  if (!product || !policy) {
    await sendWaitlist(ctx)
    return
  }

  if (product.key === 'ABsystem') {
    const continuity = await resolveBehavioralContinuity(userId)
    await deliverTelegramFlow(ctx, buildAbsystemStartFlow(continuity), 'reply')
    return
  }

  const continuityLead =
    relationship && relationship.available
      ? buildRelationshipContinuityLead(
          resolveConversationProfile(
            product.key === 'FOCUS'
              ? 'focus'
              : product.key === 'STANKEY'
                ? 'stankey'
                : 'absystem'
          ),
          relationship
        )
      : []

  const text =
    product.behaviorState === 'low_activity' && policy.mentorMessage
      ? [
          ...continuityLead,
          '',
          policy.mentorMessage,
          ...stankeyContent.telegram.product.continueFromCurrentLesson(
            product.progressState.currentLesson
          ),
        ].join('\n')
      : product.behaviorState === 'upsell_ready' && policy.softUpsellMessage
        ? [
            ...continuityLead,
            '',
            product.lines.join('\n'),
            '',
            policy.softUpsellMessage,
          ].join('\n')
        : [
            ...continuityLead,
            ...(continuityLead.length ? [''] : []),
            product.lines.join('\n'),
          ].join('\n')

  await ctx.reply(text, {
    reply_markup: {
      inline_keyboard: withDevTestPaymentButton([[buildPolicyButton(product)]]),
    },
  })
}

export async function sendStateMenu(
  ctx: Context,
  userId: string
): Promise<void> {
  const { decision } = await resolveDecision(userId, 'menu_open')
  const firstName = ctx.from?.first_name ?? ''
  const relationship = await resolveRelationshipMemory(userId).catch(() => null)

  if (await renderTelegramDecision(ctx, decision, firstName)) {
    return
  }
  await sendPolicyMenu(ctx, userId, undefined, relationship)
}

const START_SCENARIO_CALLBACKS: Record<StartScenario, string> = {
  FIRST_TIME_USER: 'ab_test:start',
  POST_TEST: 'open_focus_portal',
  FOCUS_PARTICIPANT: 'open_platform',
  ACTIVE_PLATFORM: 'open_platform',
  DAILY_GAP: 'open_platform',
  MEDIUM_GAP: 'open_platform',
  LONG_GAP: 'open_platform',
  REPEATED_ROLLBACK: 'open_platform',
}

function resolveStartScenarioText(
  scenario: StartScenario,
  context: StartContextRecord
): string {
  switch (scenario) {
    case 'ACTIVE_PLATFORM':
      return absystemContent.START_FLOWS.ACTIVE_PLATFORM.text(
        context.lastGoal ?? context.lastAction ?? ''
      )
    case 'REPEATED_ROLLBACK':
      return absystemContent.START_FLOWS.REPEATED_ROLLBACK.text(
        context.lastAction ?? context.lastGoal ?? ''
      )
    default:
      return absystemContent.START_FLOWS[scenario].text as string
  }
}

async function sendStartScenarioMenu(
  ctx: Context,
  userId: string,
  context: StartContextRecord
): Promise<void> {
  const scenario = resolveStartScenario(context)
  const copy = absystemContent.START_FLOWS[scenario]
  const text = resolveStartScenarioText(scenario, context)
  const referralButton = resolveReferralButton(context, userId)

  const buttons: Array<Array<TelegramInlineButton>> = [
    [
      {
        text: copy.cta,
        callback_data: START_SCENARIO_CALLBACKS[scenario],
      },
    ],
  ]

  if (scenario === 'FOCUS_PARTICIPANT') {
    const inviteLink = await getOrCreateFocusInviteLink(userId).catch(() => null)
    if (inviteLink) {
      buttons.push([{ text: 'Перейти в канал ФОКУС', url: inviteLink }])
    }
  }

  if (referralButton) {
    buttons.push([referralButton])
  }

  buttons.push([{ text: 'Задати питання', callback_data: 'open_faq' }])

  await ctx.reply(text, {
    reply_markup: {
      inline_keyboard: buttons,
    },
  })
}

async function handleStankeyStart(
  ctx: Context,
  userId: string,
  payload: string,
  firstName: string
): Promise<void> {
  const rolloutEnabled = process.env.STANKEY_ROLLOUT_ENABLED !== 'false'
  const explicitWaitlist =
    !rolloutEnabled || (await isExplicitWaitlistUser(userId))
  const summary = await resolveTelegramProductSummary(userId)
  const relationship = await resolveRelationshipMemory(
    userId,
    summary.primary?.key === 'FOCUS'
      ? 'focus'
      : summary.primary?.key === 'STANKEY'
        ? 'stankey'
        : 'absystem'
  ).catch(() => null)
  const orchestration = resolveTelegramAccessOrchestration({
    summary: {
      activeProducts: summary.activeProducts,
      trialProducts: summary.trialProducts,
      pausedProducts: summary.pausedProducts,
      products: summary.products.map((product) => ({
        key: product.key,
        state: product.state,
        accessSource: product.accessSource,
      })),
      primary: summary.primary
        ? {
            key: summary.primary.key,
            state: summary.primary.state,
          }
        : null,
    },
    explicitWaitlist,
    rolloutEnabled,
    payload,
  })

  const roomLaunch = resolveTelegramRoomLaunch({
    payload,
    summary: {
      activeProducts: summary.activeProducts,
      trialProducts: summary.trialProducts,
      pausedProducts: summary.pausedProducts,
      products: summary.products.map((product) => ({
        key: product.key,
        state: product.state,
        accessSource: product.accessSource,
      })),
      primary: summary.primary
        ? {
            key: summary.primary.key,
            state: summary.primary.state,
          }
        : null,
    },
    firstName,
  })

  console.info('[STANKEY_START_FLOW]', { userId, orchestration, roomLaunch })
}

async function hasOpenStarwayAccess(userId: string | null): Promise<boolean> {
  if (!userId) return false
  try {
    const access = await getAccessControlState(userId)
    return access.hasRequiredContacts
  } catch {
    return false
  }
}

export async function syncAccessAwareChatMenuButton(
  chatId: string | number,
  userId: string | null
): Promise<void> {
  const normalizedChatId = typeof chatId === 'string' ? Number(chatId) : chatId
  if (!Number.isFinite(normalizedChatId)) return

  try {
    if (await hasOpenStarwayAccess(userId)) {
      const appUrl = getTelegramAppUrl('/miniapp?startapp=ai')
      if (!appUrl) {
        await bot.telegram.setChatMenuButton({
          chatId: normalizedChatId,
          menuButton: { type: 'default' },
        })
        return
      }

      await bot.telegram.setChatMenuButton({
        chatId: normalizedChatId,
        menuButton: {
          type: 'web_app',
          text: stankeyContent.telegram.buttons.openStarway,
          web_app: { url: appUrl },
        },
      })
      return
    }

    await bot.telegram.setChatMenuButton({
      chatId: normalizedChatId,
      menuButton: { type: 'default' },
    })
  } catch {
    // silent
  }
}

export async function syncAccessAwareChatCommands(
  chatId: string | number,
  userId: string | null
): Promise<void> {
  const normalizedChatId = typeof chatId === 'string' ? Number(chatId) : chatId
  if (!Number.isFinite(normalizedChatId)) return
  void userId

  try {
    await bot.telegram.setMyCommands(
      [{ command: 'privacy', description: absystemContent.commands.privacy }],
      {
        scope: { type: 'chat', chat_id: normalizedChatId },
      }
    )
  } catch {
    // silent
  }
}

export async function syncAccessAwareChatEntryPoints(
  chatId: string | number,
  userId: string | null
): Promise<void> {
  await Promise.all([
    syncAccessAwareChatMenuButton(chatId, userId),
    syncAccessAwareChatCommands(chatId, userId),
  ])
}

export async function getAccessAwareAppReplyMarkupForContext(
  ctx: Context
): Promise<ReturnType<typeof openAppKeyboard>['reply_markup'] | undefined> {
  const userId = await resolveLinkedUserIdFromContext(ctx)
  if (!(await hasOpenStarwayAccess(userId))) {
    return undefined
  }

  return openAppKeyboard(
    '/miniapp?startapp=ai',
    stankeyContent.telegram.buttons.openStarway
  ).reply_markup
}

async function trackLeadPayloadEntry(
  userId: string,
  payload: string,
  accessState: CoreUserState
) {
  await trackEvent({
    userId,
    type: 'telegram_lead_payload_entry',
    source: 'telegram',
    state: accessState,
    payload: {
      payload,
      source: 'sendpulse_or_external',
    },
  })
}

async function sendProductPriorityChoice(
  ctx: Context,
  userId: string,
  payload: string
) {
  await trackLeadPayloadEntry(
    userId,
    payload,
    await resolveCoreUserState(userId)
  )

  const replyMarkup = openAppKeyboard(
    '/miniapp?startapp=ai',
    stankeyContent.telegram.buttons.openStarway
  ).reply_markup

  await ctx.reply(
    stankeyContent.telegram.product.productPriorityLines.join('\n'),
    {
      reply_markup: {
        inline_keyboard: [
          ...(replyMarkup.inline_keyboard ?? []),
          [
            {
              text: stankeyContent.telegram.buttons.repeatMaterial,
              callback_data: 'lm_continue_material',
            },
          ],
        ],
      },
    }
  )
}

function buildSyncNotice(): string {
  return [
    '🔒 **Синхронізація**',
    'Прогрес тесту синхронізується між Telegram і Web, якщо ти заходиш в один і той самий акаунт (один `userId`).',
  ].join('\n')
}

export async function handleStart(ctx: StartContext) {
  const rawChatId = ctx.chat?.id
  if (!rawChatId) {
    return
  }

  const chatId = String(rawChatId)
  const payload = getStartPayload(ctx)
  const firstName = ctx.from?.first_name ?? ''
  const telegramUserId = ctx.from?.id ? String(ctx.from.id) : chatId
  const telegramUserName = ctx.from?.username ?? null

  let linkedUserId = await findLinkedUserId({
    chatId,
    telegramUserId,
    telegramUserName,
  })

  if (payload.startsWith(GENERIC_DEEPLINK_PREFIX)) {
    const resolvedDeepLink = await resolveDeepLinkToken({
      token: payload,
      consume: true,
    })
    if (resolvedDeepLink?.userId) {
      linkedUserId = resolvedDeepLink.userId
    }
  }

  const verifiedLegacyUserId = payload
    ? await verifyTelegramLinkCode(payload)
    : null
  if (verifiedLegacyUserId) {
    linkedUserId = verifiedLegacyUserId
  }

  const userId = await resolveOrCreateTelegramGuestUser({
    linkedUserId,
    telegramUserId,
    telegramUserName,
    chatId,
    firstName,
  })

  await upsertTelegramBinding({
    userId,
    chatId,
    telegramUserId,
    telegramUserName,
    firstName,
  })
  ;(ctx.state as { userId?: string }).userId = userId

  const state = await resolveCoreUserState(userId)
  ;(ctx.state as { userState?: CoreUserState }).userState = state

  await syncAccessAwareChatEntryPoints(chatId, userId)

  // 1. Load User state strictly
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { uiSettings: true, settings: true, firstName: true },
  })
  void user
  try {
    // [FIX] /start always uses AB test entry renderer (2-step intro + optional progress view)
    // Payload is passed through for explicit start/deeplink compatibility.
    await renderAbTestEntry(ctx, userId, isAbTestStartPayload(payload) ? (payload ?? null) : null)
    return
  } catch (error) {
    console.error(`[StartHandler] Prompt failed:`, error)
    await ctx.reply('Спробуй ще раз за хвилину.', {
      reply_markup: {
        inline_keyboard: [[{ text: absystemButtons.continueInChat, callback_data: 'ab_test:intro' }]],
      },
    })
    return
  }
}
