import type { Context } from 'telegraf'

import { prisma } from '../../../db/client.js'
import {
  resolveWheelCooldownFromSnapshot,
  toSubscriptionInfo,
} from '../../subscriptions/service.js'
import {
  resolveUserLifecycleFromRecord,
  type LifecycleResolutionUserRecord,
} from '../../flow-control/service.js'
import { getPrimaryGoalTextFromGoals } from '../../goals/service.js'
import {
  resolveUserStateFromSnapshot,
  type UserState,
} from '../core/state.service.js'
import { telegramContentRegistry } from '../content/contentRegistry.js'
import type { UserLifecycleSnapshot } from '../../flow-control/types.js'
import { mapTelegramConversationHistory } from './intelligence.service.js'
import { getUserAccessState } from '../../subscriptions/payments/focus.access.js'

type RequestContextState = {
  userId?: string | null
  userState?: UserState
  telegramAiRequestContext?: TelegramAiRequestContext
}

type RecentConversationMessage = Readonly<{
  role: 'user' | 'assistant'
  content: string
  createdAt: string
}>

export type TelegramAiRequestContext = Readonly<{
  chatId: string
  userId: string | null
  isAnonymous: boolean
  userState: UserState | null
  profile: Readonly<{
    firstName: string | null
    telegramUserName: string | null
    lifecycleState: string | null
    currentState: string | null
    currentStep: string | null
  }>
  lifecycle: UserLifecycleSnapshot | null
  subscription: Readonly<{
    status: string
    endsAt: string | null
    daysLeft: number | null
    canFillWheel: boolean | null
    wheelCooldownDaysLeft: number | null
  }>
  focusParticipation: Readonly<{
    isActive: boolean
    status: 'active' | 'trial' | 'inactive'
  }>
  nextZoom: Readonly<{
    scheduledAt: string
    topic: string
  }> | null
  unfinishedActions: ReadonlyArray<Readonly<{
    id: string
    title: string
    why: string | null
    status: string
    createdAt: string
  }>>
  primaryGoal: string | null
  latestWheel: Readonly<{
    weakestSphere: string | null
    focusSphere: string | null
    analysis: string | null
    createdAt: string
  }> | null
  recentConversation: ReadonlyArray<RecentConversationMessage>
  lastInteraction: RecentConversationMessage | null
  lastAssistantMessage: string | null
}>

const requestContextCache = new WeakMap<Context, Promise<TelegramAiRequestContext>>()

function logContextLoadFailure(
  scope: string,
  payload: Record<string, unknown>,
  error: unknown,
): void {
  console.warn('[telegram-ai-context] load failure', {
    scope,
    ...payload,
    error: error instanceof Error ? error.message : String(error),
  })
}

function freezeContext<T>(value: T): T {
  if (!value || typeof value !== 'object') {
    return value
  }

  if (Array.isArray(value)) {
    for (const item of value) {
      freezeContext(item)
    }
    return Object.freeze(value)
  }

  for (const nested of Object.values(value as Record<string, unknown>)) {
    freezeContext(nested)
  }

  return Object.freeze(value)
}

function resolveChatId(ctx: Context): string {
  const chatId = ctx.chat?.id
  return typeof chatId === 'string' || typeof chatId === 'number'
    ? String(chatId)
    : ''
}

function buildAnonymousRequestContextFromChatId(
  chatId: string,
): TelegramAiRequestContext {
  return freezeContext({
    chatId,
    userId: null,
    isAnonymous: true,
    userState: null,
    profile: {
      firstName: null,
      telegramUserName: null,
      lifecycleState: null,
      currentState: null,
      currentStep: null,
    },
    lifecycle: null,
    subscription: {
      status: 'inactive',
      endsAt: null,
      daysLeft: null,
      canFillWheel: null,
      wheelCooldownDaysLeft: null,
    },
    focusParticipation: {
      isActive: false,
      status: 'inactive',
    },
    nextZoom: null,
    unfinishedActions: [],
    primaryGoal: null,
    latestWheel: null,
    recentConversation: [],
    lastInteraction: null,
    lastAssistantMessage: null,
  })
}

async function buildLinkedRequestContext(
  chatId: string,
  userId: string,
): Promise<TelegramAiRequestContext> {
  const now = new Date()
  const userRecord = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      firstName: true,
      telegramUserName: true,
      lifecycleState: true,
      currentState: true,
      currentStep: true,
      focusPaid: true,
      onboardingStartedAt: true,
      trialStartsAt: true,
      trialEndsAt: true,
      subscriptions: {
        orderBy: { createdAt: 'desc' },
        take: 1,
        select: {
          status: true,
          trialEndsAt: true,
          currentPeriodEnd: true,
          createdAt: true,
        },
      },
      fivePointsEnrollment: {
        orderBy: { createdAt: 'desc' },
        take: 1,
        select: {
          createdAt: true,
          progress: true,
          completedAt: true,
        },
      },
      funnelLeads: {
        orderBy: { updatedAt: 'desc' },
        take: 1,
        select: {
          status: true,
          updatedAt: true,
        },
      },
      balanceEntries: {
        orderBy: { createdAt: 'desc' },
        take: 1,
        select: {
          createdAt: true,
        },
      },
    },
  }).catch((error) => {
    logContextLoadFailure('user_core', { chatId, userId }, error)
    return null
  })

  const [
    goalsResult,
    wheelResult,
    tasksResult,
    historyResult,
    zoomResult,
  ] = await Promise.allSettled([
    prisma.goalsSet.findFirst({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      select: {
        goals: true,
      },
    }),
    prisma.wheelAssessment.findFirst({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      select: {
        weakestSphere: true,
        focusSphere: true,
        analysis: true,
        createdAt: true,
      },
    }),
    prisma.microTask.findMany({
      where: {
        userId,
        isCompleted: false,
        status: { in: ['active', 'pending'] },
      },
      orderBy: [{ dueAt: 'asc' }, { createdAt: 'desc' }],
      take: 3,
      select: {
        id: true,
        title: true,
        why: true,
        status: true,
        createdAt: true,
      },
    }),
    prisma.aiConversation.findFirst({
      where: {
        userId,
        title: telegramContentRegistry.system.telegramIntelligenceConversationTitle,
      },
      orderBy: { updatedAt: 'desc' },
      select: {
        messages: {
          orderBy: { createdAt: 'desc' },
          take: 6,
          select: {
            role: true,
            content: true,
            createdAt: true,
          },
        },
      },
    }),
    prisma.zoomSession.findFirst({
      where: {
        scheduledAt: { gt: now },
        status: 'SCHEDULED',
        attendees: { some: { userId } },
      },
      orderBy: { scheduledAt: 'asc' },
      select: {
        scheduledAt: true,
        topic: true,
      },
    }),
  ])

  if (!userRecord) {
    return freezeContext({
      chatId,
      userId: null,
      isAnonymous: true,
      userState: null,
      profile: {
        firstName: null,
        telegramUserName: null,
        lifecycleState: null,
        currentState: null,
        currentStep: null,
      },
      lifecycle: null,
      subscription: {
        status: 'inactive',
        endsAt: null,
        daysLeft: null,
        canFillWheel: null,
        wheelCooldownDaysLeft: null,
      },
      focusParticipation: {
        isActive: false,
        status: 'inactive',
      },
      nextZoom: null,
      unfinishedActions: [],
      primaryGoal: null,
      latestWheel: null,
      recentConversation: [],
      lastInteraction: null,
      lastAssistantMessage: null,
    })
  }

  const lifecycleInput: LifecycleResolutionUserRecord = {
    focusPaid: userRecord.focusPaid,
    onboardingStartedAt: userRecord.onboardingStartedAt,
    currentStep: userRecord.currentStep,
    trialStartsAt: userRecord.trialStartsAt,
    trialEndsAt: userRecord.trialEndsAt,
    fivePointsEnrollment: userRecord.fivePointsEnrollment,
    subscriptions: userRecord.subscriptions,
    funnelLeads: userRecord.funnelLeads,
  }
  const accessState = await getUserAccessState(userId).catch(() => null)
  const lifecycle = resolveUserLifecycleFromRecord(lifecycleInput, now, accessState)
  const userState = resolveUserStateFromSnapshot({
    currentState: userRecord.currentState,
    currentStep: userRecord.currentStep,
    lifecycle,
  })
  const latestSubscription = userRecord.subscriptions[0] ?? null
  const subscriptionInfo = latestSubscription
    ? toSubscriptionInfo(latestSubscription)
    : { status: 'inactive' as const }
  const wheelCooldown = resolveWheelCooldownFromSnapshot(
    latestSubscription,
    userRecord.balanceEntries[0]?.createdAt ?? null,
    now,
  )
  const goalsSet = goalsResult.status === 'fulfilled'
    ? goalsResult.value
    : (logContextLoadFailure('goals', { chatId, userId }, goalsResult.reason), null)
  const latestWheel = wheelResult.status === 'fulfilled'
    ? wheelResult.value
    : (logContextLoadFailure('wheel', { chatId, userId }, wheelResult.reason), null)
  const unfinishedTasks = tasksResult.status === 'fulfilled'
    ? tasksResult.value
    : (logContextLoadFailure('tasks', { chatId, userId }, tasksResult.reason), [])
  const latestConversation = historyResult.status === 'fulfilled'
    ? historyResult.value
    : (logContextLoadFailure('history', { chatId, userId }, historyResult.reason), null)
  const nextZoom = zoomResult.status === 'fulfilled'
    ? zoomResult.value
    : (logContextLoadFailure('zoom', { chatId, userId }, zoomResult.reason), null)
  const recentConversation = mapTelegramConversationHistory(
    latestConversation?.messages ?? [],
  )
  const lastInteraction = recentConversation.at(-1) ?? null
  const lastAssistantMessage = [...recentConversation]
    .reverse()
    .find((message) => message.role === 'assistant')
    ?.content ?? null
  const canonicalFocusAccess = accessState?.state === 'FOCUS_ACTIVE' || accessState?.hasFocus === true

  return freezeContext({
    chatId,
    userId,
    isAnonymous: false,
    userState,
    profile: {
      firstName: userRecord.firstName ?? null,
      telegramUserName: userRecord.telegramUserName ?? null,
      lifecycleState: userRecord.lifecycleState ?? null,
      currentState: userRecord.currentState ?? null,
      currentStep: userRecord.currentStep ?? null,
    },
    lifecycle,
    subscription: {
      status: subscriptionInfo.status,
      endsAt: subscriptionInfo.endsAt ?? null,
      daysLeft: typeof subscriptionInfo.daysLeft === 'number' ? subscriptionInfo.daysLeft : null,
      canFillWheel: wheelCooldown.canFill,
      wheelCooldownDaysLeft: wheelCooldown.daysLeft,
    },
    focusParticipation: {
      isActive: canonicalFocusAccess || userRecord.focusPaid,
      status: canonicalFocusAccess
        ? 'active'
        : lifecycle.state === 'trial'
          ? 'trial'
          : 'inactive',
    },
    nextZoom: nextZoom
      ? {
        scheduledAt: nextZoom.scheduledAt.toISOString(),
        topic: nextZoom.topic,
      }
      : null,
    unfinishedActions: unfinishedTasks.map((task) => ({
      id: task.id,
      title: task.title,
      why: task.why ?? null,
      status: task.status,
      createdAt: task.createdAt.toISOString(),
    })),
    primaryGoal: getPrimaryGoalTextFromGoals(goalsSet?.goals),
    latestWheel: latestWheel
      ? {
        weakestSphere: latestWheel.weakestSphere ?? null,
        focusSphere: latestWheel.focusSphere ?? null,
        analysis: latestWheel.analysis ?? null,
        createdAt: latestWheel.createdAt.toISOString(),
      }
      : null,
    recentConversation,
    lastInteraction,
    lastAssistantMessage,
  })
}

function buildAnonymousRequestContext(
  ctx: Context,
): TelegramAiRequestContext {
  return buildAnonymousRequestContextFromChatId(resolveChatId(ctx))
}

export async function getTelegramAiRequestContextForUser(
  userId: string | null,
  chatId: string,
): Promise<TelegramAiRequestContext> {
  if (!userId || !chatId) {
    return buildAnonymousRequestContextFromChatId(chatId)
  }

  return buildLinkedRequestContext(chatId, userId).catch((error) => {
    logContextLoadFailure('request_context', { chatId, userId }, error)
    return buildAnonymousRequestContextFromChatId(chatId)
  })
}

export async function getTelegramAiRequestContext(
  ctx: Context,
): Promise<TelegramAiRequestContext> {
  const cached = requestContextCache.get(ctx)
  if (cached) {
    return cached
  }

  const state = ctx.state as RequestContextState
  const userId = state.userId ?? null
  const chatId = resolveChatId(ctx)

  const promise = userId && chatId
    ? getTelegramAiRequestContextForUser(userId, chatId)
    : Promise.resolve(buildAnonymousRequestContext(ctx))

  requestContextCache.set(ctx, promise)

  const context = await promise
  state.telegramAiRequestContext = context
  if (context.userState) {
    state.userState = context.userState
  }
  return context
}
