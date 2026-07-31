import { EventEmitter } from 'node:events'

import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { Context } from 'telegraf'

import type { TelegramAiRequestContext } from '../telegram-mentor/services/requestContext.service.js'

type MutableScenarioContext = TelegramAiRequestContext & {
  permissions?: string[] | null
  featureFlags?: string[] | null
}

type RecordedAssistantTask = {
  requestId: string
  selectedAgent: string
  primaryIntent: string | null
  secondaryIntent: string | null
  userState: string | null
  recommendedAction: string | null
  confidence: number | null
  profile: Record<string, unknown>
  subscription: Record<string, unknown>
  lifecycle: Record<string, unknown>
  history: string[]
  goals: string[]
  wheel: Record<string, unknown>
  permissions: string[] | null
  featureFlags: string[] | null
}

const contextStore = new Map<string, MutableScenarioContext>()
const requestContextLoadCounts = {
  linked: 0,
  telegram: 0,
}
let telegramContextCache = new WeakMap<Context, MutableScenarioContext>()
const appendCounts = new Map<string, number>()
const recordedTasks = new Map<string, RecordedAssistantTask>()
const decisionLogs: Array<Record<string, unknown>> = []
const providerFailures = new Set<string>()

function cloneContext(context: MutableScenarioContext): MutableScenarioContext {
  return {
    ...context,
    profile: { ...context.profile },
    lifecycle: context.lifecycle ? { ...context.lifecycle } : null,
    subscription: { ...context.subscription },
    focusParticipation: { ...context.focusParticipation },
    nextZoom: context.nextZoom ? { ...context.nextZoom } : null,
    unfinishedActions: context.unfinishedActions.map((item) => ({ ...item })),
    latestWheel: context.latestWheel ? { ...context.latestWheel } : null,
    recentConversation: context.recentConversation.map((item) => ({ ...item })),
    lastInteraction: context.lastInteraction ? { ...context.lastInteraction } : null,
    permissions: context.permissions ? [...context.permissions] : null,
    featureFlags: context.featureFlags ? [...context.featureFlags] : null,
  }
}

function setScenarioContext(userId: string, context: MutableScenarioContext) {
  contextStore.set(userId, cloneContext(context))
}

function getScenarioContext(userId: string | null, chatId: string): MutableScenarioContext {
  if (!userId) {
    return {
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
      permissions: null,
      featureFlags: null,
    }
  }

  const stored = contextStore.get(userId)
  if (!stored) {
    throw new Error(`missing scenario context for user '${userId}'`)
  }

  return cloneContext({
    ...stored,
    chatId,
    userId,
  })
}

vi.mock('../telegram-mentor/services/requestContext.service.js', () => ({
  getTelegramAiRequestContextForUser: vi.fn(async (userId: string | null, chatId: string) => {
    requestContextLoadCounts.linked += 1
    return getScenarioContext(userId, chatId)
  }),
  getTelegramAiRequestContext: vi.fn(async (ctx: Context) => {
    const cached = telegramContextCache.get(ctx)
    if (cached) {
      return cloneContext(cached)
    }

    requestContextLoadCounts.telegram += 1
    const state = ctx.state as { userId?: string | null }
    const context = getScenarioContext(state.userId ?? null, String(ctx.chat?.id ?? ''))
    telegramContextCache.set(ctx, cloneContext(context))
    return context
  }),
}))

vi.mock('../telegram-mentor/services/intelligence.service.js', () => ({
  detectTelegramIntelligenceMessageType: vi.fn((text: string) => {
    const normalized = text.trim().toLowerCase()
    if (/^(а далі|і далі|що далі|ок|окей|ага|так)\??$/.test(normalized)) return 'FOLLOWUP'
    if (/(застряг|не можу|страх|тривог|боюсь)/.test(normalized)) return 'PERSONAL_SITUATION'
    if (/(фокус|focus|absystem|урок)/.test(normalized)) return 'FOCUS_RELATED'
    if (normalized === 'привіт') return 'SMALL_TALK'
    return 'QUESTION'
  }),
  appendTelegramConversationTurn: vi.fn(async (
    userId: string,
    userMessage: string,
    assistantMessage: string,
  ) => {
    appendCounts.set(userId, (appendCounts.get(userId) ?? 0) + 1)
    const context = contextStore.get(userId)
    if (!context) return

    const now = new Date().toISOString()
    const updatedConversation = [
      ...context.recentConversation,
      { role: 'user' as const, content: userMessage, createdAt: now },
      { role: 'assistant' as const, content: assistantMessage, createdAt: now },
    ].slice(-8)

    context.recentConversation = updatedConversation
    context.lastInteraction = updatedConversation.at(-1) ?? null
    context.lastAssistantMessage = assistantMessage
  }),
  getTelegramConversationHistory: vi.fn(async (userId: string) => {
    return contextStore.get(userId)?.recentConversation ?? []
  }),
  resolveTelegramSupportUrl: vi.fn(() => 'https://t.me/test_support'),
}))

vi.mock('../events/service.js', () => ({
  trackEvent: vi.fn(async () => undefined),
  trackQuestionEvent: vi.fn(async () => undefined),
}))

vi.mock('@/products/ab-system/telegram/abTest.service.js', () => ({
  detectStateInstability: vi.fn(async () => null),
  sendStateCourseOffer: vi.fn(async () => undefined),
}))

vi.mock('../telegram-mentor/handlers/start.js', () => ({
  resolveUserState: vi.fn(async () => 'ACTIVE'),
}))

vi.mock('../ai/agentGateway.js', async () => {
  const actual = await vi.importActual<typeof import('../ai/agentGateway.js')>('../ai/agentGateway.js')

  const aiProvider = {
    execute: vi.fn(async ({ task }: { task: { metadata?: Record<string, unknown> } }) => {
      const metadata = task.metadata ?? {}
      const requestId = String(metadata.requestId ?? '')
      const input = metadata.input as {
        decision?: {
          primaryIntent?: string
          secondaryIntent?: string | null
          userState?: string
          recommendedAction?: string
          confidence?: number
        } | null
        orchestration?: {
          selectedAgent?: string
        }
        userContext?: {
          profile?: Record<string, unknown>
          subscription?: Record<string, unknown>
          lifecycle?: Record<string, unknown>
        }
        conversationContext?: {
          history?: string[]
        }
        goals?: string[]
        wheel?: Record<string, unknown>
      }

      recordedTasks.set(requestId, {
        requestId,
        selectedAgent: input.orchestration?.selectedAgent ?? 'assistant',
        primaryIntent: input.decision?.primaryIntent ?? null,
        secondaryIntent: input.decision?.secondaryIntent ?? null,
        userState: input.decision?.userState ?? null,
        recommendedAction: input.decision?.recommendedAction ?? null,
        confidence: typeof input.decision?.confidence === 'number' ? input.decision.confidence : null,
        profile: input.userContext?.profile ?? {},
        subscription: input.userContext?.subscription ?? {},
        lifecycle: input.userContext?.lifecycle ?? {},
        history: input.conversationContext?.history ?? [],
        goals: input.goals ?? [],
        wheel: input.wheel ?? {},
        permissions: Array.isArray((input.userContext?.profile as { permissions?: unknown })?.permissions)
          ? ((input.userContext?.profile as { permissions?: string[] }).permissions ?? null)
          : null,
        featureFlags: Array.isArray((input.userContext?.profile as { featureFlags?: unknown })?.featureFlags)
          ? ((input.userContext?.profile as { featureFlags?: string[] }).featureFlags ?? null)
          : null,
      })

      if (providerFailures.has(requestId)) {
        throw new Error('provider_unavailable')
      }

      const primaryIntent = input.decision?.primaryIntent ?? 'unknown'
      const recommendedAction = input.decision?.recommendedAction ?? 'none'
      const selectedAgent = input.orchestration?.selectedAgent ?? 'assistant'

      return {
        content: `intent=${primaryIntent};action=${recommendedAction};agent=${selectedAgent}`,
        structuredOutput: {
          response: `intent=${primaryIntent};action=${recommendedAction};agent=${selectedAgent}`,
          followUp: recommendedAction !== 'none' ? `next=${recommendedAction}` : '',
          suggestions: [],
        },
        metadata: {
          provider: 'test-provider',
          model: 'test-model',
          tokenUsage: {
            totalTokens: 12,
          },
        },
      }
    }),
  }

  const singleton = new actual.TelegramAgentGateway({
    aiProvider,
    logger: {
      debug: vi.fn(),
      info: vi.fn(),
      warn: vi.fn(),
      error: vi.fn(),
    },
  })

  return {
    ...actual,
    getTelegramAgentGateway: () => singleton,
  }
})

import { assistantChat } from './service.js'
import { chat as restChatController } from './controller.js'
import { sendMessage as websiteChatController, streamChat as sseChatController } from '../ai-mentor/controllers.js'
import { handleIntelligentMessage } from '../telegram-mentor/handlers/intelligence.handler.js'

type ScenarioExpectation = {
  primaryIntent: string
  selectedAgent: string
  recommendedAction: string
  userState: string
}

type ScenarioDefinition = {
  id: string
  userId: string
  message: string
  context: MutableScenarioContext
  expected: ScenarioExpectation
}

function makeBaseContext(userId: string): MutableScenarioContext {
  return {
    chatId: `chat:${userId}`,
    userId,
    isAnonymous: false,
    userState: 'ACTIVE',
    profile: {
      firstName: 'Test',
      telegramUserName: 'test_user',
      lifecycleState: 'ACTIVE',
      currentState: 'ACTIVE',
      currentStep: 'START_FLOW',
    },
    lifecycle: {
      state: 'onboarding',
      flow: 'onboarding',
      subscriptionStatus: 'inactive',
      subscriptionActive: false,
      currentStep: 'START_FLOW',
      leadStep: 0,
      hasLeadMagnetFlow: false,
      hasCompletedLeadMagnet: false,
      hasMentorAccess: false,
      hasExpiredAccess: false,
      hasWaitlistFlag: false,
      priority: 1,
    },
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
    permissions: [],
    featureFlags: [],
  }
}

const SCENARIOS: ScenarioDefinition[] = [
  {
    id: '001_new_user',
    userId: 'user-new',
    message: 'Привіт',
    context: makeBaseContext('user-new'),
    expected: {
      primaryIntent: 'general_support',
      selectedAgent: 'assistant',
      recommendedAction: 'none',
      userState: 'exploring',
    },
  },
  {
    id: '002_returning_user',
    userId: 'user-returning',
    message: 'Що далі?',
    context: {
      ...makeBaseContext('user-returning'),
      primaryGoal: 'Повернути клієнтський ритм',
      recentConversation: [
        { role: 'user', content: 'Я зупинився на воронці', createdAt: '2026-07-20T10:00:00.000Z' },
        { role: 'assistant', content: 'Тримай один короткий крок по воронці', createdAt: '2026-07-20T10:01:00.000Z' },
      ],
      lastInteraction: { role: 'assistant', content: 'Тримай один короткий крок по воронці', createdAt: '2026-07-20T10:01:00.000Z' },
      lastAssistantMessage: 'Тримай один короткий крок по воронці',
    },
    expected: {
      primaryIntent: 'follow_up',
      selectedAgent: 'mentor',
      recommendedAction: 'resume_goal',
      userState: 'planning',
    },
  },
  {
    id: '003_active_subscription',
    userId: 'user-active',
    message: 'Покажи статус моєї підписки',
    context: {
      ...makeBaseContext('user-active'),
      lifecycle: {
        ...makeBaseContext('user-active').lifecycle!,
        state: 'paid',
        flow: 'mentor',
        subscriptionStatus: 'active',
        subscriptionActive: true,
        hasMentorAccess: true,
      },
      subscription: {
        status: 'active',
        endsAt: '2026-08-10T00:00:00.000Z',
        daysLeft: 17,
        canFillWheel: true,
        wheelCooldownDaysLeft: 0,
      },
      focusParticipation: {
        isActive: true,
        status: 'active',
      },
    },
    expected: {
      primaryIntent: 'subscription_status',
      selectedAgent: 'mentor',
      recommendedAction: 'none',
      userState: 'active_focus_member',
    },
  },
  {
    id: '004_without_subscription',
    userId: 'user-no-sub',
    message: 'Покажи статус моєї підписки',
    context: makeBaseContext('user-no-sub'),
    expected: {
      primaryIntent: 'subscription_status',
      selectedAgent: 'mentor',
      recommendedAction: 'recommend_subscription',
      userState: 'buying',
    },
  },
  {
    id: '005_after_onboarding',
    userId: 'user-onboarding',
    message: 'Куди мені повернутися?',
    context: {
      ...makeBaseContext('user-onboarding'),
      primaryGoal: 'Завершити перший крок після онбордингу',
      lifecycle: {
        ...makeBaseContext('user-onboarding').lifecycle!,
        state: 'onboarding',
      },
    },
    expected: {
      primaryIntent: 'next_step_guidance',
      selectedAgent: 'assistant',
      recommendedAction: 'resume_goal',
      userState: 'planning',
    },
  },
  {
    id: '006_after_focus_purchase',
    userId: 'user-focus',
    message: 'Що мені відкрити у Фокусі?',
    context: {
      ...makeBaseContext('user-focus'),
      lifecycle: {
        ...makeBaseContext('user-focus').lifecycle!,
        state: 'paid',
        flow: 'mentor',
        subscriptionStatus: 'active',
        subscriptionActive: true,
      },
      subscription: {
        status: 'active',
        endsAt: '2026-08-05T00:00:00.000Z',
        daysLeft: 12,
        canFillWheel: true,
        wheelCooldownDaysLeft: 0,
      },
      focusParticipation: {
        isActive: true,
        status: 'active',
      },
    },
    expected: {
      primaryIntent: 'focus_guidance',
      selectedAgent: 'mentor',
      recommendedAction: 'open_focus',
      userState: 'active_focus_member',
    },
  },
  {
    id: '007_user_asks_mentor',
    userId: 'user-mentor',
    message: 'Я застряг і не можу рухатись далі',
    context: {
      ...makeBaseContext('user-mentor'),
      lifecycle: {
        ...makeBaseContext('user-mentor').lifecycle!,
        state: 'paid',
        flow: 'mentor',
        subscriptionStatus: 'active',
        subscriptionActive: true,
      },
      subscription: {
        status: 'active',
        endsAt: '2026-08-15T00:00:00.000Z',
        daysLeft: 22,
        canFillWheel: true,
        wheelCooldownDaysLeft: 0,
      },
    },
    expected: {
      primaryIntent: 'emotional_support',
      selectedAgent: 'coach',
      recommendedAction: 'recommend_mentor',
      userState: 'blocked',
    },
  },
  {
    id: '008_continue_previous_conversation',
    userId: 'user-memory',
    message: 'А далі?',
    context: {
      ...makeBaseContext('user-memory'),
      primaryGoal: 'Підняти продажі в DM',
      recentConversation: [
        { role: 'user', content: 'Мій головний блокер зараз продажі', createdAt: '2026-07-22T09:00:00.000Z' },
        { role: 'assistant', content: 'Звузь CTA до однієї короткої дії', createdAt: '2026-07-22T09:01:00.000Z' },
      ],
      lastInteraction: { role: 'assistant', content: 'Звузь CTA до однієї короткої дії', createdAt: '2026-07-22T09:01:00.000Z' },
      lastAssistantMessage: 'Звузь CTA до однієї короткої дії',
    },
    expected: {
      primaryIntent: 'follow_up',
      selectedAgent: 'mentor',
      recommendedAction: 'resume_goal',
      userState: 'planning',
    },
  },
  {
    id: '009_expired_subscription',
    userId: 'user-expired',
    message: 'У мене закінчилась підписка',
    context: {
      ...makeBaseContext('user-expired'),
      lifecycle: {
        ...makeBaseContext('user-expired').lifecycle!,
        state: 'expired',
        subscriptionStatus: 'expired',
      },
    },
    expected: {
      primaryIntent: 'subscription_status',
      selectedAgent: 'mentor',
      recommendedAction: 'recommend_subscription',
      userState: 'buying',
    },
  },
  {
    id: '010_missing_optional_context',
    userId: 'user-missing',
    message: 'Що робити?',
    context: {
      ...makeBaseContext('user-missing'),
      permissions: null,
      featureFlags: null,
    },
    expected: {
      primaryIntent: 'next_step_guidance',
      selectedAgent: 'assistant',
      recommendedAction: 'resume_goal',
      userState: 'planning',
    },
  },
]

function makeExpressRequest(input: {
  userId: string
  message: string
  requestId: string
  history?: Array<{ role: string; content: string }>
}) {
  const req = new EventEmitter() as EventEmitter & Record<string, unknown>
  req.user = { id: input.userId }
  req.body = { message: input.message, history: input.history ?? [] }
  req.headers = { 'x-request-id': input.requestId }
  req.on = req.addListener.bind(req)
  return req as never
}

function makeExpressResponse() {
  const writes: string[] = []
  const headers = new Map<string, string>()
  const res = {
    statusCode: 200,
    payload: null as unknown,
    setHeader(name: string, value: string) {
      headers.set(name, value)
    },
    flushHeaders() {},
    write(chunk: string) {
      writes.push(chunk)
      return true
    },
    end() {
      return undefined
    },
    status(code: number) {
      this.statusCode = code
      return this
    },
    json(payload: unknown) {
      this.payload = payload
      return payload
    },
  }

  return { res: res as never, writes, headers, get payload() { return res.payload } }
}

function makeTelegramContext(input: { userId: string; message: string; updateId: number }) {
  const replies: string[] = []
  const ctx = {
    message: { text: input.message, message_id: input.updateId },
    chat: { id: Number(input.userId.replace(/\D/g, '').slice(-6) || '1') },
    from: { id: Number(input.userId.replace(/\D/g, '').slice(-6) || '1'), username: input.userId },
    state: { userId: input.userId },
    update: { update_id: input.updateId },
    sendChatAction: vi.fn(async () => true),
    reply: vi.fn(async (message: string) => {
      replies.push(message)
      return { message_id: 1, text: message }
    }),
  } as unknown as Context

  return { ctx, replies }
}

function extractRecorded(requestId: string) {
  const task = recordedTasks.get(requestId)
  expect(task).toBeDefined()
  return task!
}

async function invokeTelegramTransport(scenario: ScenarioDefinition) {
  const requestId = Number(`9${String(Math.abs(hashCode(`${scenario.id}:telegram`))).slice(0, 6)}`)
  const { ctx, replies } = makeTelegramContext({
    userId: scenario.userId,
    message: scenario.message,
    updateId: requestId,
  })

  const handled = await handleIntelligentMessage(ctx)
  expect(handled).toBe(true)

  return {
    transport: 'telegram',
    requestId: String(requestId),
    reply: replies.join('\n'),
    task: extractRecorded(String(requestId)),
  }
}

async function invokeMiniAppTransport(scenario: ScenarioDefinition) {
  const requestId = `${scenario.id}:miniapp`
  const result = await assistantChat(scenario.userId, scenario.message, {
    platform: 'miniapp',
    requestId,
  })

  return {
    transport: 'miniapp',
    requestId,
    reply: result.reply,
    meta: result.meta,
    task: extractRecorded(requestId),
  }
}

async function invokeRestTransport(scenario: ScenarioDefinition) {
  const requestId = `${scenario.id}:rest`
  const req = makeExpressRequest({
    userId: scenario.userId,
    message: scenario.message,
    requestId,
  })
  const res = makeExpressResponse()
  await restChatController(req, res.res)

  return {
    transport: 'rest',
    requestId,
    payload: res.payload as { meta: Record<string, unknown>; reply: string },
    task: extractRecorded(requestId),
  }
}

async function invokeWebsiteTransport(scenario: ScenarioDefinition) {
  const requestId = `${scenario.id}:website`
  const req = makeExpressRequest({
    userId: scenario.userId,
    message: scenario.message,
    requestId,
  })
  const res = makeExpressResponse()
  await websiteChatController(req, res.res)

  return {
    transport: 'website',
    requestId,
    payload: res.payload as { meta: Record<string, unknown>; reply: string },
    task: extractRecorded(requestId),
  }
}

async function invokeSseTransport(scenario: ScenarioDefinition) {
  const requestId = `${scenario.id}:sse`
  const req = makeExpressRequest({
    userId: scenario.userId,
    message: scenario.message,
    requestId,
  })
  const res = makeExpressResponse()
  await sseChatController(req, res.res)

  return {
    transport: 'sse',
    requestId,
    writes: res.writes,
    task: extractRecorded(requestId),
  }
}

function expectBusinessParity(
  scenario: ScenarioDefinition,
  results: Array<{
    task: RecordedAssistantTask
  }>,
) {
  const [baseline, ...rest] = results
  expect(baseline.task.primaryIntent).toBe(scenario.expected.primaryIntent)
  expect(baseline.task.selectedAgent).toBe(scenario.expected.selectedAgent)
  expect(baseline.task.recommendedAction).toBe(scenario.expected.recommendedAction)
  expect(baseline.task.userState).toBe(scenario.expected.userState)

  for (const result of rest) {
    expect(result.task.primaryIntent).toBe(baseline.task.primaryIntent)
    expect(result.task.secondaryIntent).toBe(baseline.task.secondaryIntent)
    expect(result.task.selectedAgent).toBe(baseline.task.selectedAgent)
    expect(result.task.recommendedAction).toBe(baseline.task.recommendedAction)
    expect(result.task.userState).toBe(baseline.task.userState)
    expect(result.task.subscription).toEqual(baseline.task.subscription)
    expect(result.task.lifecycle).toEqual(baseline.task.lifecycle)
    expect(result.task.goals).toEqual(baseline.task.goals)
    expect(result.task.wheel).toEqual(baseline.task.wheel)
    expect(result.task.history).toEqual(baseline.task.history)
  }
}

function hashCode(value: string): number {
  let hash = 0
  for (let index = 0; index < value.length; index += 1) {
    hash = ((hash << 5) - hash + value.charCodeAt(index)) | 0
  }
  return hash
}

beforeEach(() => {
  contextStore.clear()
  recordedTasks.clear()
  providerFailures.clear()
  decisionLogs.length = 0
  appendCounts.clear()
  requestContextLoadCounts.linked = 0
  requestContextLoadCounts.telegram = 0
  telegramContextCache = new WeakMap<Context, MutableScenarioContext>()
  vi.restoreAllMocks()
  vi.spyOn(console, 'info').mockImplementation((message?: unknown, payload?: unknown) => {
    if (message === '[platform-ai-decision]' && payload && typeof payload === 'object') {
      decisionLogs.push(payload as Record<string, unknown>)
    }
  })
  vi.spyOn(console, 'warn').mockImplementation(() => undefined)
  vi.spyOn(console, 'error').mockImplementation(() => undefined)
})

describe('assistant canonical e2e validation', () => {
  it('validates canonical parity for every minimum scenario across telegram, miniapp, website, rest, and sse', async () => {
    for (const scenario of SCENARIOS) {
      setScenarioContext(scenario.userId, scenario.context)

      const results = await Promise.all([
        invokeTelegramTransport(scenario),
        invokeMiniAppTransport(scenario),
        invokeWebsiteTransport(scenario),
        invokeRestTransport(scenario),
        invokeSseTransport(scenario),
      ])

      expectBusinessParity(scenario, results)

      const sseResult = results.find((result) => result.transport === 'sse') as Awaited<ReturnType<typeof invokeSseTransport>>
      expect(sseResult.writes.join('')).toContain('data: [DONE]')

      const latestLog = decisionLogs.at(-1)
      expect(latestLog).toMatchObject({
        decision: scenario.expected.primaryIntent,
        recommendedAction: scenario.expected.recommendedAction,
        selectedAgent: scenario.expected.selectedAgent,
      })
    }
  })

  it('verifies memory continuity, single write pipeline, and context restoration across multiple turns', async () => {
    const scenario = SCENARIOS.find((item) => item.id === '008_continue_previous_conversation')!
    setScenarioContext(scenario.userId, scenario.context)

    const first = await assistantChat(scenario.userId, 'Мій головний блокер зараз продажі', {
      platform: 'miniapp',
      requestId: 'memory:first',
    })
    expect(first.meta.decision).toBe('sales_guidance')

    const writesAfterFirstTurn = appendCounts.get(scenario.userId) ?? 0
    expect(writesAfterFirstTurn).toBe(1)

    const second = await assistantChat(scenario.userId, 'А далі?', {
      platform: 'miniapp',
      requestId: 'memory:second',
    })
    const secondTask = extractRecorded('memory:second')

    expect(second.meta.decision).toBe('follow_up')
    expect(secondTask.history.join(' ')).toContain('Мій головний блокер зараз продажі')
    expect(secondTask.history.join(' ')).toContain('assistant:')
    expect(appendCounts.get(scenario.userId)).toBe(2)
  })

  it('gracefully degrades when the provider is unavailable and when optional context is missing', async () => {
    const scenario = SCENARIOS.find((item) => item.id === '010_missing_optional_context')!
    setScenarioContext(scenario.userId, scenario.context)
    providerFailures.add('fallback:provider')

    const result = await assistantChat(scenario.userId, scenario.message, {
      platform: 'backend',
      requestId: 'fallback:provider',
    })

    expect(result.reply.length).toBeGreaterThan(0)
    expect(result.meta.fallbackActivated).toBe(true)
    expect(extractRecorded('fallback:provider').recommendedAction).toBe('resume_goal')
  })

  it('sustains concurrent assistant validation without duplicated context loading or duplicated ai execution', async () => {
    const scenario = SCENARIOS.find((item) => item.id === '006_after_focus_purchase')!
    setScenarioContext(scenario.userId, scenario.context)

    const assistantRequests = Array.from({ length: 20 }, (_, index) =>
      assistantChat(scenario.userId, scenario.message, {
        platform: 'miniapp',
        requestId: `perf:assistant:${index}`,
      }),
    )

    const telegramRequests = Array.from({ length: 50 }, (_, index) => {
      const { ctx } = makeTelegramContext({
        userId: scenario.userId,
        message: scenario.message,
        updateId: 700000 + index,
      })
      return handleIntelligentMessage(ctx)
    })

    const restRequests = Array.from({ length: 20 }, (_, index) => {
      const req = makeExpressRequest({
        userId: scenario.userId,
        message: scenario.message,
        requestId: `perf:rest:${index}`,
      })
      const res = makeExpressResponse()
      return restChatController(req, res.res)
    })

    await Promise.all([
      ...assistantRequests,
      ...telegramRequests,
      ...restRequests,
    ])

    expect(requestContextLoadCounts.linked).toBe(40)
    expect(requestContextLoadCounts.telegram).toBe(50)
    expect(recordedTasks.size).toBe(90)
  })
})
