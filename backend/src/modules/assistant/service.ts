import { prisma } from "../../db/client.js"
import { openai } from '../../lib/openai.js'
import { suggestNextProduct as suggestNextProductEngine } from './recommendation.js'
import { runRegisteredAiTask } from '../../services/aiTaskRunner.service.js'
import { stableHash } from '../../services/aiGuard.service.js'
import { resolveAiModel } from '../../platform/ai.registry.js'
import { humanizeUpgradeLabel } from '../../core/state-machine/conversationPresentation.js'
import { getEngagementSignals } from '../../core/engagement/engagement.service.js'
import { resolveUserLifecycle } from '../flow-control/service.js'
import { getPrimaryGoal } from '../goals/service.js'
import {
  resolveAssistantDecision,
  type AssistantDecision as CanonicalAssistantDecision,
} from './decision-engine.js'
import { pickBestTask, type Task as PriorityTask } from '../telegram-mentor/services/engagement/task-priority.js'
import { getTelegramAgentGateway, type IAgentGateway } from '../ai/gateway/index.js'
import { resolveIntelligenceConversationResponse } from '../telegram-mentor/conversation/engine/intelligenceScenario.js'
import { getTelegramAiRequestContextForUser } from '../telegram-mentor/services/context/request.js'
import { detectTelegramIntelligenceMessageType } from '../telegram-mentor/services/context/intelligence.js'

const ASSISTANT_CONVERSATION_TITLE = 'Starway Assistant'

export type CanonicalAssistantPlatform = 'telegram' | 'miniapp' | 'website' | 'web' | 'backend'

export type CanonicalAssistantChatResult = {
  message: string
  reply: string
  mentorMessage: {
    content: string
  }
  meta: {
    platform: CanonicalAssistantPlatform
    requestId: string
    scenario: string
    provider: string | null
    lifecycle: string | null
    subscription: string | null
    decision: string | null
    recommendedAction: string | null
    confidence: number | null
    selectedAgent: string | null
    delegated: boolean
    fallbackActivated: boolean
    durationMs: number
  }
}

type AssistantTaskSummary = {
  id: string
  title: string
  why: string | null
  type: PriorityTask['type']
  createdAt: Date
  overdueHours: number
}

type AssistantContextSnapshot = {
  profile: Awaited<ReturnType<typeof buildUserProfile>>
  nextProduct: { productId: string; name: string; reason: string } | null
  weeklyInsight: Record<string, unknown>
  lifecycle: Awaited<ReturnType<typeof resolveUserLifecycle>>
  engagement: Awaited<ReturnType<typeof getEngagementSignals>>
  primaryGoal: string | null
  activeTasks: AssistantTaskSummary[]
  bestTask: AssistantTaskSummary | null
  latestWheel: {
    weakestSphere: string | null
    focusSphere: string | null
    analysis: string | null
    createdAt: Date
  } | null
  nextZoom: {
    scheduledAt: Date
    topic: string
  } | null
  recentConversation: Array<{
    role: 'USER' | 'ASSISTANT'
    content: string
  }>
}

type AssistantDecision = {
  situation: string | null
  unfinishedWork: string | null
  recommendedAction: string
  supportingContext: string[]
}

export function logCanonicalAiRequest(input: {
  decision: string | null
  confidence: number | null
  recommendedAction: string | null
  selectedAgent?: string | null
  durationMs: number
}): void {
  console.info('[platform-ai-decision]', input)
}

export async function assistantChat(
  userId: string,
  message: string,
  options: {
    platform?: CanonicalAssistantPlatform
    requestId?: string
    gateway?: IAgentGateway
  } = {},
): Promise<CanonicalAssistantChatResult> {
  const startedAt = Date.now()
  const platform = options.platform ?? 'web'
  const requestId = options.requestId ?? `${platform}:${userId}:${Date.now()}`
  const gateway = options.gateway ?? getTelegramAgentGateway()
  const chatId = `${platform}:${userId}`
  const requestContext = await getTelegramAiRequestContextForUser(userId, chatId)
  const messageType = detectTelegramIntelligenceMessageType(message)
  const response = await resolveIntelligenceConversationResponse({
    chatId,
    userId,
    message,
    messageType,
    gateway,
    requestContext,
    requestId,
  })
  const reply = [
    response.text,
    ...response.cards.map((card) => card.text),
  ].find((value): value is string => typeof value === 'string' && value.trim().length > 0) ?? ''

  const result: CanonicalAssistantChatResult = {
    message: reply,
    reply,
    mentorMessage: {
      content: reply,
    },
    meta: {
      platform,
      requestId,
      scenario: String(response.telemetry.scenario ?? messageType.toLowerCase()),
      provider: typeof response.telemetry.provider === 'string' ? response.telemetry.provider : null,
      lifecycle: requestContext.lifecycle?.state ?? null,
      subscription: requestContext.subscription.status ?? null,
      decision: typeof response.telemetry.decision === 'string' ? response.telemetry.decision : null,
      recommendedAction: typeof response.telemetry.recommendedAction === 'string'
        ? response.telemetry.recommendedAction
        : null,
      confidence: typeof response.telemetry.confidence === 'number' ? response.telemetry.confidence : null,
      selectedAgent:
        typeof response.telemetry.selectedAgent === 'string' ? response.telemetry.selectedAgent : null,
      delegated: response.telemetry.delegated === true,
      fallbackActivated: response.telemetry.fallbackActivated === true,
      durationMs: Date.now() - startedAt,
    },
  }

  logCanonicalAiRequest({
    decision: result.meta.decision,
    confidence: result.meta.confidence,
    recommendedAction: result.meta.recommendedAction,
    selectedAgent: result.meta.selectedAgent,
    durationMs: result.meta.durationMs,
  })

  return result
}

async function buildAssistantContext(userId: string): Promise<AssistantContextSnapshot> {
  const now = new Date()
  const [profile, nextProduct, weeklyInsight, lifecycle, engagement, primaryGoal, activeTasks, latestWheel, nextZoom, recentConversation] = await Promise.all([
    buildUserProfile(userId),
    suggestNextProductEngine(userId),
    generateWeeklyInsight(userId),
    resolveUserLifecycle(userId),
    getEngagementSignals(userId),
    getPrimaryGoal(userId).catch(() => null),
    prisma.microTask.findMany({
      where: {
        userId,
        isCompleted: false,
        status: { in: ['active', 'pending'] },
      },
      orderBy: [{ dueAt: 'asc' }, { createdAt: 'desc' }],
      take: 5,
      select: {
        id: true,
        title: true,
        why: true,
        createdAt: true,
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
    prisma.zoomSession.findFirst({
      where: {
        scheduledAt: { gte: now },
        status: 'SCHEDULED',
        attendees: { some: { userId } },
      },
      orderBy: { scheduledAt: 'asc' },
      select: {
        scheduledAt: true,
        topic: true,
      },
    }),
    getRecentAssistantConversation(userId),
  ])

  const taskCandidates: AssistantTaskSummary[] = activeTasks.map((task) => ({
    id: task.id,
    title: task.title,
    why: task.why ?? null,
    type: inferTaskType(task.title, task.why),
    createdAt: task.createdAt,
    overdueHours: Math.max(0, Math.floor((now.getTime() - task.createdAt.getTime()) / 3600000)),
  }))

  const bestTask = taskCandidates.length
    ? await pickBestTask(
      taskCandidates as PriorityTask[],
      {
        state: profile.mentorState ?? lifecycle.state,
        lastActivityHours: contextHoursSince(engagement.lastActivity),
      },
    ).then((task) => taskCandidates.find((candidate) => candidate.id === task.id) ?? taskCandidates[0])
    : null

  return {
    profile,
    nextProduct,
    weeklyInsight,
    lifecycle,
    engagement,
    primaryGoal: primaryGoal?.text ?? null,
    activeTasks: taskCandidates,
    bestTask,
    latestWheel: latestWheel
      ? {
        weakestSphere: latestWheel.weakestSphere ?? null,
        focusSphere: latestWheel.focusSphere ?? null,
        analysis: latestWheel.analysis ?? null,
        createdAt: latestWheel.createdAt,
      }
      : null,
    nextZoom: nextZoom
      ? {
        scheduledAt: nextZoom.scheduledAt,
        topic: nextZoom.topic,
      }
      : null,
    recentConversation,
  }
}

function buildAssistantMessage(
  message: string,
  context: AssistantContextSnapshot,
  decision: AssistantDecision,
) {
  const normalized = message.trim().toLowerCase()
  const summary = typeof context.weeklyInsight.summary === 'string' ? context.weeklyInsight.summary : null
  const nextOffer = typeof context.weeklyInsight.nextOffer === 'string' ? context.weeklyInsight.nextOffer : null

  if (normalized.includes('контент') || normalized.includes('продаж') || normalized.includes('cta')) {
    return 'Бачу, що ти про продажний контур. Тут найсильніший маршрут зараз: hook → довіра → CTA → розмова → тест → оплата. Рекомендую обрати один CTA і прив’язати його до конкретної дії в DM або trial.'
  }

  if (normalized.includes('підпис') || normalized.includes('доступ') || normalized.includes('оплат')) {
    if (context.lifecycle.state === 'paid') {
      return 'Доступ у тебе активний. Найкраще зараз не шукати новий інструмент, а повернутися в робочий ритм через один конкретний крок у продукті.'
    }
    if (context.lifecycle.state === 'trial') {
      return 'Зараз ти в пробному доступі, тож найвища цінність не в перегляді всього одразу, а в одному завершеному кроці. Рекомендую закрити одну активну задачу або пройти ключовий сценарій до кінця сьогодні.'
    }
    return 'Зараз доступ не виглядає активним. Рекомендую повернути собі ритм через один наступний крок у продукті або відновлення доступу, якщо хочеш рухатися далі без паузи.'
  }

  const opening = decision.situation
    ? `Бачу твою ситуацію: ${decision.situation}.`
    : 'Бачу, де ти зараз у русі.'
  const work = decision.unfinishedWork
    ? ` Незавершене зараз: ${decision.unfinishedWork}.`
    : ''
  const support = decision.supportingContext.length
    ? ` ${decision.supportingContext.join(' ')}`
    : summary
      ? ` ${summary}`
      : nextOffer
        ? ` Зараз варто врахувати: ${humanizeUpgradeLabel(nextOffer)}.`
        : ''

  return `${opening}${work} Рекомендую зараз ${decision.recommendedAction}.${support}`.trim()
}

export function buildAssistantDecision(
  message: string,
  context: AssistantContextSnapshot,
): AssistantDecision {
  const normalized = message.trim().toLowerCase()
  const asksWeakness = /(слаб|проблем|застряг|блок|не так)/.test(normalized)
  const asksProgress = /(прогрес|рух|йду|просува|результат)/.test(normalized)
  const situation = resolveSituation(context)
  const unfinishedWork = resolveUnfinishedWork(context)
  const supportingContext = collectRelevantContext(context, { asksWeakness, asksProgress })
  const canonicalDecision = resolveAssistantDecisionFromContext(message, context)

  return {
    situation,
    unfinishedWork,
    recommendedAction: describeRecommendedAction(canonicalDecision, context),
    supportingContext,
  }
}

function resolveAssistantDecisionFromContext(
  message: string,
  context: AssistantContextSnapshot,
): CanonicalAssistantDecision {
  return resolveAssistantDecision({
    message,
    userState: context.profile.mentorState ?? null,
    lifecycleState: context.lifecycle.state ?? null,
    subscription: {
      status: context.lifecycle.subscriptionActive ? 'active' : context.lifecycle.subscriptionStatus ?? 'inactive',
      daysLeft: null,
    },
    focusParticipation: {
      isActive: context.lifecycle.state === 'paid' || context.lifecycle.state === 'trial',
      status: context.lifecycle.state === 'paid'
        ? 'active'
        : context.lifecycle.state === 'trial'
          ? 'trial'
          : 'inactive',
    },
    primaryGoal: context.primaryGoal,
    unfinishedActions: context.activeTasks.map((task) => ({
      title: task.title,
      status: 'active',
      why: task.why,
      createdAt: task.createdAt.toISOString(),
    })),
    nextZoom: context.nextZoom
      ? {
          scheduledAt: context.nextZoom.scheduledAt.toISOString(),
          topic: context.nextZoom.topic,
        }
      : null,
    latestWheel: context.latestWheel
      ? {
          weakestSphere: context.latestWheel.weakestSphere,
          focusSphere: context.latestWheel.focusSphere,
        }
      : null,
    recentConversation: context.recentConversation.map((item) => ({
      role: item.role,
      content: item.content,
    })),
    lastInteraction: context.recentConversation.at(-1)
      ? {
          role: context.recentConversation.at(-1)!.role,
          content: context.recentConversation.at(-1)!.content,
        }
      : null,
  }).decision
}

function describeRecommendedAction(
  decision: CanonicalAssistantDecision,
  context: AssistantContextSnapshot,
): string {
  switch (decision.recommendedAction) {
    case 'resume_goal':
      if (context.bestTask) {
        return `закрити задачу "${context.bestTask.title}"`
      }
      if (context.nextProduct && (context.lifecycle.state === 'expired' || context.lifecycle.state === 'onboarding')) {
        return `повернутися в ${humanizeUpgradeLabel(context.nextProduct.name)} і пройти один ключовий крок до кінця`
      }
      return defaultAction(context)
    case 'show_progress':
      if (context.latestWheel?.focusSphere) {
        return `відкрити колесо балансу і зробити один крок по сфері "${context.latestWheel.focusSphere}"`
      }
      return 'подивитися прогрес і вибрати один наступний крок'
    case 'book_zoom':
      return context.nextZoom
        ? `підготуватися до Zoom "${context.nextZoom.topic}" ${formatFutureDate(context.nextZoom.scheduledAt)}`
        : 'забронювати Zoom і винести туди головний блокер'
    case 'open_focus':
      return 'відкрити Focus і продовжити з одного конкретного кроку'
    case 'recommend_lesson':
      return 'відкрити потрібний урок у Focus і дійти до одного завершеного результату'
    case 'recommend_mentor':
      return 'винести головний блокер до ментора і розблокувати один наступний крок'
    case 'recommend_subscription':
      return context.nextProduct
        ? `відкрити ${humanizeUpgradeLabel(context.nextProduct.name)}`
        : 'повернути доступ до продукту, якщо хочеш рухатися без паузи'
    case 'ask_clarification':
      return 'уточнити, який саме результат або блокер для тебе зараз головний'
    case 'continue_conversation':
      return 'продовжити розмову від поточного запиту без зайвих стрибків'
    case 'none':
    default:
      return context.nextProduct
        ? `відкрити ${humanizeUpgradeLabel(context.nextProduct.name)}`
        : defaultAction(context)
  }
}

function collectRelevantContext(
  context: AssistantContextSnapshot,
  flags: { asksWeakness: boolean; asksProgress: boolean },
): string[] {
  const items: string[] = []

  if (flags.asksWeakness && context.latestWheel?.weakestSphere) {
    items.push(`Найбільше уваги зараз просить сфера "${context.latestWheel.weakestSphere}".`)
  }

  if (flags.asksProgress && context.primaryGoal) {
    items.push(`Твоя головна ціль зараз: ${context.primaryGoal}.`)
  }

  if (context.engagement.streak > 0) {
    items.push(`Ти вже тримаєш ритм ${context.engagement.streak} дн.`)
  }

  if (context.engagement.repeatedPatterns && context.engagement.memoryProfile.repeatedBlockers[0]) {
    items.push(`Я бачу повторюваний стопер: ${context.engagement.memoryProfile.repeatedBlockers[0]}.`)
  }

  const lastUserTurn = [...context.recentConversation]
    .reverse()
    .find((item) => item.role === 'USER' && item.content.trim().length > 0)

  if (!items.length && lastUserTurn) {
    items.push(`У попередньому діалозі ти вже повертався до теми "${lastUserTurn.content.trim().slice(0, 80)}".`)
  }

  if (!items.length && context.profile.focus) {
    items.push(`Твій актуальний фокус: ${context.profile.focus}.`)
  }

  return items.slice(0, 2)
}

function resolveSituation(context: AssistantContextSnapshot): string | null {
  if (context.primaryGoal && context.engagement.unfinishedSteps > 0) {
    return `ти рухаєшся до "${context.primaryGoal}", але маєш незавершені кроки`
  }
  if (context.lifecycle.state === 'trial') {
    return 'ти ще в етапі пробного доступу, де важливо швидко дійти до відчутного результату'
  }
  if (context.lifecycle.state === 'expired') {
    return 'ритм уже був, але зараз він просів і його треба м’яко відновити'
  }
  if (context.latestWheel?.focusSphere) {
    return `зараз найбільший потенціал руху в сфері "${context.latestWheel.focusSphere}"`
  }
  if (context.profile.realGoal) {
    return `у тебе вже є сформований напрямок: ${context.profile.realGoal}`
  }
  return null
}

function resolveUnfinishedWork(context: AssistantContextSnapshot): string | null {
  if (context.bestTask) {
    return context.bestTask.title
  }
  if (context.engagement.unfinishedSteps > 1) {
    return `${context.engagement.unfinishedSteps} активні кроки в роботі`
  }
  if (context.primaryGoal) {
    return `головна ціль "${context.primaryGoal}" ще не закрита конкретною дією`
  }
  return null
}

function defaultAction(context: AssistantContextSnapshot): string {
  if (context.primaryGoal) {
    return `зафіксувати одну реальну дію під ціль "${context.primaryGoal}"`
  }
  if (context.latestWheel?.focusSphere) {
    return `повернутися до сфери "${context.latestWheel.focusSphere}" і зробити один малий крок`
  }
  return 'відкрити той продукт Starway, де ти зможеш зробити один завершений крок уже зараз'
}

function inferTaskType(title: string, why: string | null): PriorityTask['type'] {
  const combined = `${title} ${why ?? ''}`.toLowerCase()
  if (combined.includes('рефлекс') || combined.includes('journal') || combined.includes('щоден')) return 'reflection'
  if (combined.includes('ціл') || combined.includes('goal')) return 'goal'
  if (combined.includes('я ') || combined.includes('identity') || combined.includes('роль')) return 'identity'
  return 'action'
}

function contextHoursSince(date: Date | null): number {
  if (!date) return 24
  return Math.max(0, Math.floor((Date.now() - date.getTime()) / 3600000))
}

function formatFutureDate(date: Date): string {
  return `(${date.toLocaleString('uk-UA', {
    day: '2-digit',
    month: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  })})`
}

async function getRecentAssistantConversation(userId: string) {
  const conversation = await prisma.aiConversation.findFirst({
    where: {
      userId,
      title: ASSISTANT_CONVERSATION_TITLE,
    },
    orderBy: { updatedAt: 'desc' },
    select: {
      messages: {
        orderBy: { createdAt: 'desc' },
        take: 6,
        select: {
          role: true,
          content: true,
        },
      },
    },
  })

  return (conversation?.messages ?? [])
    .map((item) => ({
      role: item.role === 'USER' ? 'USER' as const : 'ASSISTANT' as const,
      content: item.content,
    }))
    .reverse()
}

async function getOrCreateAssistantConversation(userId: string) {
  const existing = await prisma.aiConversation.findFirst({
    where: { userId, title: ASSISTANT_CONVERSATION_TITLE },
    orderBy: { updatedAt: 'desc' },
    select: { id: true },
  })

  if (existing) return existing.id

  const created = await prisma.aiConversation.create({
    data: {
      userId,
      title: ASSISTANT_CONVERSATION_TITLE,
      context: {
        source: 'web_assistant',
      },
    },
    select: { id: true },
  })

  return created.id
}

async function appendAssistantConversation(
  userId: string,
  userMessage: string,
  assistantMessage: string,
  decision: AssistantDecision,
) {
  const conversationId = await getOrCreateAssistantConversation(userId)

  await prisma.aiMessage.createMany({
    data: [
      { conversationId, role: 'USER', content: userMessage },
      { conversationId, role: 'ASSISTANT', content: assistantMessage },
    ],
  })

  await prisma.aiConversation.update({
    where: { id: conversationId },
    data: {
      context: {
        source: 'web_assistant',
        lastRecommendedAction: decision.recommendedAction,
        updatedAt: new Date().toISOString(),
      },
    },
  })
}

export async function buildUserProfile(userId: string) {
  const [mentor, leads, subscription, streak, wheel] =
    await Promise.all([
      prisma.userAiMentor.findFirst({
        where: { userId },
        select: {
          currentState: true,
          stage: true,
          clarityLevel: true,
          behaviorPattern: true,
          insight: true,
          blocker: true,
          realGoal: true,
          recommendedFocus: true,
          lastAnalyzedAt: true,
        },
      }),
      prisma.funnelLead.findMany({
        where: { userId },
        orderBy: { createdAt: 'desc' },
        take: 5,
      }),
      prisma.subscription.findFirst({
        where: { userId },
        orderBy: { createdAt: 'desc' },
        select: { status: true, trialEndsAt: true },
      }),
      prisma.streak.findFirst({
        where: { userId },
        select: { current: true },
      }),
      prisma.wheelAssessment.findFirst({
        where: { userId },
        orderBy: { createdAt: 'desc' },
        select: { createdAt: true },
      }),
    ])

  const inTrial = subscription?.status === 'TRIAL'
    && Boolean(subscription.trialEndsAt && subscription.trialEndsAt.getTime() > Date.now())

  return {
    mentorState: mentor?.currentState ?? null,
    stage: mentor?.stage ?? null,
    clarity: mentor?.clarityLevel ?? null,
    pattern: mentor?.behaviorPattern ?? null,
    insight: mentor?.insight ?? null,
    blocker: mentor?.blocker ?? null,
    realGoal: mentor?.realGoal ?? null,
    focus: mentor?.recommendedFocus ?? null,
    subscribed: subscription?.status === 'ACTIVE',
    inTrial,
    streak: streak?.current ?? 0,
    hasWheel: !!wheel,
    leadCount: leads.length,
    lastAnalyzed: mentor?.lastAnalyzedAt ?? null,
  }
}

export async function suggestNextProduct(
  userId: string,
): Promise<string | null> {
  const profile = await buildUserProfile(userId)

  if (!profile.subscribed && profile.streak >= 5 && profile.streak <= 21) {
    if (profile.pattern?.includes('avoidance') || profile.stage === 'CONFLICT') {
      return '5points'
    }
    return 'trial'
  }

  if (profile.subscribed && profile.streak >= 30) {
    return 'mentorship'
  }

  if (!profile.subscribed && profile.inTrial === false && profile.streak >= 3) {
    return 'subscription'
  }

  return null
}

export async function buildUserProfileSnapshot(userId: string) {
  return buildUserProfile(userId)
}

export async function generateWeeklyInsight(userId: string) {
  const userMentor = await prisma.userAiMentor.findFirst({
    where: { userId },
    orderBy: { updatedAt: 'desc' },
    select: {
      context: true,
      currentState: true,
      behaviorPattern: true,
      stage: true,
      blocker: true,
    },
  })

  const context = userMentor?.context
  const stateHistory = context && typeof context === 'object' && !Array.isArray(context) && Array.isArray((context as Record<string, unknown>).stateHistory)
    ? ((context as Record<string, unknown>).stateHistory as unknown[])
    : []

  const last7States = stateHistory
    .filter((item): item is Record<string, unknown> => Boolean(item) && typeof item === 'object' && !Array.isArray(item))
    .slice(-7)
    .map(item => ({
      analyzedAt: typeof item.analyzedAt === 'string' ? item.analyzedAt : null,
      currentState: typeof item.currentState === 'string' ? item.currentState : null,
      behaviorPattern: typeof item.behaviorPattern === 'string' ? item.behaviorPattern : null,
      stage: typeof item.stage === 'string' ? item.stage : null,
    }))

  return runRegisteredAiTask(
    'assistant_weekly_insight',
    {
      userId,
      source: 'assistant-weekly-insight',
      label: 'assistant-weekly-insight',
      payloadHash: stableHash({
        currentState: userMentor?.currentState ?? null,
        behaviorPattern: userMentor?.behaviorPattern ?? null,
        stage: userMentor?.stage ?? null,
        blocker: userMentor?.blocker ?? null,
        last7States,
      }),
      payload: {
        currentState: userMentor?.currentState ?? null,
        behaviorPattern: userMentor?.behaviorPattern ?? null,
        stage: userMentor?.stage ?? null,
        blocker: userMentor?.blocker ?? null,
        stateHistoryHash: stableHash(last7States),
      },
    },
    async () => {
      const completion = await openai.chat.completions.create({
        model: resolveAiModel('assistant_weekly_insight'),
        temperature: 0.3,
        response_format: { type: 'json_object' },
        messages: [
          {
            role: 'system',
            content: 'Ти — аналітичний meta-layer Starway. Поверни JSON тижневого звіту: { "summary": "string", "risk": "LOW|MEDIUM|HIGH", "pattern": "string", "nextOffer": "string" }. Тільки українська.',
          },
          {
            role: 'user',
            content: JSON.stringify({
              currentState: userMentor?.currentState ?? null,
              behaviorPattern: userMentor?.behaviorPattern ?? null,
              stage: userMentor?.stage ?? null,
              blocker: userMentor?.blocker ?? null,
              last7States,
            }),
          },
        ],
        max_tokens: 400,
      })

      return JSON.parse(completion.choices[0]?.message?.content ?? '{}') as Record<string, unknown>
    },
    () => ({}),
  )
}
