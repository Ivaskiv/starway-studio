import { prisma } from '../../../db/client.js'
import { resolveUserLifecycle } from '../../flow-control/service.js'
import { getUserSubscriptionInfo } from '../../subscriptions/service.js'
import { STRICT_KNOWLEDGE_BASE } from '../../telegram-mentor/services/strict-system.js'
import { getTelegramConversationHistory } from '../../telegram-mentor/services/context/intelligence.js'
import { type CanonicalGatewayAgentRegistration } from '../agentRegistry.js'
import { resolveAssistantDecisionSafely } from './helpers.js'
import type {
AssistantTaskInput,
BuiltAssistantTaskInput,
TelegramAgentGatewayRequest,
} from './types.js'
export async function buildAssistantTaskInput(
  input: TelegramAgentGatewayRequest,
  registration: CanonicalGatewayAgentRegistration,
  delegated: boolean,
  selectedAgent: string
): Promise<BuiltAssistantTaskInput> {
  if (input.requestContext) {
    const decisionResolution = resolveAssistantDecisionSafely({
      message: input.message,
      messageType: input.messageType ?? null,
      userState: input.requestContext.userState,
      lifecycleState: input.requestContext.lifecycle?.state ?? null,
      subscription: {
        status: input.requestContext.subscription.status,
        daysLeft: input.requestContext.subscription.daysLeft,
      },
      focusParticipation: input.requestContext.focusParticipation,
      primaryGoal: input.requestContext.primaryGoal,
      unfinishedActions: input.requestContext.unfinishedActions,
      nextZoom: input.requestContext.nextZoom,
      latestWheel: input.requestContext.latestWheel
        ? {
            weakestSphere: input.requestContext.latestWheel.weakestSphere,
            focusSphere: input.requestContext.latestWheel.focusSphere,
          }
        : null,
      recentConversation: input.requestContext.recentConversation,
      lastInteraction: input.requestContext.lastInteraction,
    })
    const taskInput: AssistantTaskInput = {
      userMessage: input.message,
      userContext: {
        profile: {
          userId: input.requestContext.userId,
          firstName: input.requestContext.profile.firstName,
          telegramUserName: input.requestContext.profile.telegramUserName,
          chatId: input.requestContext.chatId,
          userState: input.requestContext.userState,
          focusParticipation: input.requestContext.focusParticipation,
        },
        subscription: {
          status: input.requestContext.subscription.status,
          endsAt: input.requestContext.subscription.endsAt,
          daysLeft: input.requestContext.subscription.daysLeft,
          canFillWheel: input.requestContext.subscription.canFillWheel,
          wheelCooldownDaysLeft:
            input.requestContext.subscription.wheelCooldownDaysLeft,
        },
        lifecycle: {
          state: input.requestContext.lifecycle?.state ?? null,
          flow: input.requestContext.lifecycle?.flow ?? null,
          subscriptionStatus:
            input.requestContext.lifecycle?.subscriptionStatus ?? null,
          legacyLifecycleState: input.requestContext.profile.lifecycleState,
          nextZoom: input.requestContext.nextZoom,
          unfinishedActions: input.requestContext.unfinishedActions,
          lastInteraction: input.requestContext.lastInteraction,
          currentIntent: input.intent,
          messageType: input.messageType ?? null,
        },
      },
      conversationContext: {
        history: input.requestContext.recentConversation.map(
          (message) => `${message.role}: ${message.content}`
        ),
        journal: [],
      },
      goals: input.requestContext.primaryGoal
        ? [input.requestContext.primaryGoal]
        : [],
      wheel: input.requestContext.latestWheel ?? {},
      knowledgeBase: STRICT_KNOWLEDGE_BASE,
      decision: decisionResolution.decision,
      orchestration: {
        selectedAgent,
        delegated,
        specialistInstructions: registration.specialistInstructions ?? null,
        capability: registration.runtime.capability,
      },
    }

    return {
      input: taskInput,
      decisionDurationMs: decisionResolution.durationMs,
    }
  }

  const [userRecord, subscriptionInfo, lifecycle, history] = await Promise.all([
    input.userId
      ? prisma.user
          .findUnique({
            where: { id: input.userId },
            select: {
              id: true,
              firstName: true,
              telegramUserName: true,
              lifecycleState: true,
              currentState: true,
            },
          })
          .catch(() => null)
      : Promise.resolve(null),
    input.userId
      ? getUserSubscriptionInfo(input.userId).catch(() => null)
      : Promise.resolve(null),
    input.userId
      ? resolveUserLifecycle(input.userId).catch(() => null)
      : Promise.resolve(null),
    input.userId
      ? getTelegramConversationHistory(input.userId, 6).catch(() => [])
      : Promise.resolve([]),
  ])
  const decisionResolution = resolveAssistantDecisionSafely({
    message: input.message,
    messageType: input.messageType ?? null,
    userState: userRecord?.currentState ?? null,
    lifecycleState: lifecycle?.state ?? null,
    subscription: {
      status: subscriptionInfo?.subscription.status ?? 'inactive',
      daysLeft: subscriptionInfo?.subscription.daysLeft ?? null,
    },
    focusParticipation: {
      isActive: lifecycle?.state === 'paid' || lifecycle?.state === 'trial',
      status:
        lifecycle?.state === 'paid'
          ? 'active'
          : lifecycle?.state === 'trial'
            ? 'trial'
            : 'inactive',
    },
    primaryGoal: null,
    unfinishedActions: [],
    nextZoom: null,
    latestWheel: null,
    recentConversation: history,
    lastInteraction: history.at(-1) ?? null,
  })

  const taskInput: AssistantTaskInput = {
    userMessage: input.message,
    userContext: {
      profile: {
        userId: input.userId ?? null,
        firstName: userRecord?.firstName ?? null,
        telegramUserName: userRecord?.telegramUserName ?? null,
        chatId: input.chatId,
      },
      subscription: {
        status: subscriptionInfo?.subscription.status ?? 'inactive',
        endsAt: subscriptionInfo?.subscription.endsAt ?? null,
        daysLeft: subscriptionInfo?.subscription.daysLeft ?? null,
        canFillWheel: subscriptionInfo?.cooldown.canFill ?? null,
        wheelCooldownDaysLeft: subscriptionInfo?.cooldown.daysLeft ?? null,
      },
      lifecycle: {
        state: lifecycle?.state ?? null,
        flow: lifecycle?.flow ?? null,
        subscriptionStatus: lifecycle?.subscriptionStatus ?? null,
        legacyLifecycleState: userRecord?.lifecycleState ?? null,
      },
    },
    conversationContext: {
      history: history.map((message) => `${message.role}: ${message.content}`),
      journal: [],
    },
    goals: [],
    wheel: {},
    knowledgeBase: STRICT_KNOWLEDGE_BASE,
    decision: decisionResolution.decision,
    orchestration: {
      selectedAgent,
      delegated,
      specialistInstructions: registration.specialistInstructions ?? null,
      capability: registration.runtime.capability,
    },
  }

  return {
    input: taskInput,
    decisionDurationMs: decisionResolution.durationMs,
  }
}
