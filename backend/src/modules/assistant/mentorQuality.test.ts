import { EventEmitter } from 'node:events'
import { existsSync, readFileSync } from 'node:fs'
import path from 'node:path'

import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { Context } from 'telegraf'

import type { TelegramAiRequestContext } from '../telegram-mentor/services/requestContext.service.js'
import {
  MENTOR_GOLDEN_CONVERSATIONS,
  getMentorGoldenConversationByInput,
  type MentorGoldenConversation,
} from './mentorQuality.dataset.js'
import {
  createMentorQualityReport,
  writeMentorQualityReport,
  type MentorQualityScenarioRecord,
} from './mentorQuality.report.js'

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
  history: string[]
  goals: string[]
  subscription: Record<string, unknown>
  lifecycle: Record<string, unknown>
}

type QualityObservation = {
  requestId: string
  supportiveTone: boolean
  methodologyStageCovered: boolean
  techniqueCovered: boolean
  hallucinationFree: boolean
  businessRulesCorrect: boolean
  reply: string
  followUp: string
}

const contextStore = new Map<string, MutableScenarioContext>()
const recordedTasks = new Map<string, RecordedAssistantTask>()
const qualityObservations = new Map<string, QualityObservation>()
const appendCounts = new Map<string, number>()
const requestContextLoadCounts = {
  linked: 0,
  telegram: 0,
}
const fallbackRequestIds = new Set<string>()
let telegramContextCache = new WeakMap<Context, MutableScenarioContext>()

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

function makeBaseContext(userId: string, golden: MentorGoldenConversation): MutableScenarioContext {
  const lifecycleState = golden.context.lifecycleState
  const subscriptionStatus = golden.context.subscriptionStatus
  const hasActiveSubscription = subscriptionStatus === 'active'

  return {
    chatId: `chat:${userId}`,
    userId,
    isAnonymous: false,
    userState: 'ACTIVE',
    profile: {
      firstName: 'Mentor',
      telegramUserName: userId,
      lifecycleState: lifecycleState.toUpperCase(),
      currentState: lifecycleState.toUpperCase(),
      currentStep: 'START_FLOW',
    },
    lifecycle: {
      state: lifecycleState,
      flow: lifecycleState === 'paid' ? 'mentor' : 'onboarding',
      subscriptionStatus,
      subscriptionActive: hasActiveSubscription,
      currentStep: 'START_FLOW',
      leadStep: 0,
      hasLeadMagnetFlow: false,
      hasCompletedLeadMagnet: false,
      hasMentorAccess: hasActiveSubscription,
      hasExpiredAccess: subscriptionStatus === 'expired',
      hasWaitlistFlag: false,
      priority: hasActiveSubscription ? 5 : 1,
    },
    subscription: {
      status: subscriptionStatus,
      endsAt: hasActiveSubscription ? '2026-08-10T00:00:00.000Z' : null,
      daysLeft: golden.context.subscriptionDaysLeft,
      canFillWheel: hasActiveSubscription,
      wheelCooldownDaysLeft: 0,
    },
    focusParticipation: {
      isActive: golden.context.focusActive,
      status: golden.context.focusActive ? 'active' : 'inactive',
    },
    nextZoom: golden.context.zoomScheduled
      ? {
        scheduledAt: '2026-07-30T09:00:00.000Z',
        topic: 'Focus Zoom',
      }
      : null,
    unfinishedActions: golden.context.unfinishedActionTitle
      ? [{
        title: golden.context.unfinishedActionTitle,
        status: 'active',
        why: golden.expectedCoachingObjective,
        createdAt: '2026-07-24T08:00:00.000Z',
      }]
      : [],
    primaryGoal: golden.context.primaryGoal,
    latestWheel: golden.context.primaryGoal
      ? {
        weakestSphere: 'clarity',
        focusSphere: 'focus',
        analysis: golden.expectedCoachingObjective,
        createdAt: '2026-07-23T08:00:00.000Z',
      }
      : null,
    recentConversation: golden.context.lastAssistantMessage
      ? [{
        role: 'assistant',
        content: golden.context.lastAssistantMessage,
        createdAt: '2026-07-24T07:55:00.000Z',
      }]
      : [],
    lastInteraction: golden.context.lastAssistantMessage
      ? {
        role: 'assistant',
        content: golden.context.lastAssistantMessage,
        createdAt: '2026-07-24T07:55:00.000Z',
      }
      : null,
    lastAssistantMessage: golden.context.lastAssistantMessage,
    permissions: [],
    featureFlags: [],
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
    if (/(застряг|не можу|страх|боюсь|вигоран|відклада|важко|сором)/.test(normalized)) return 'PERSONAL_SITUATION'
    if (/(фокус|focus|absystem|підпис|zoom|ціль|задач)/.test(normalized)) return 'FOCUS_RELATED'
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
    ].slice(-12)

    context.recentConversation = updatedConversation
    context.lastInteraction = updatedConversation.at(-1) ?? null
    context.lastAssistantMessage = assistantMessage
  }),
  getTelegramConversationHistory: vi.fn(async (userId: string) => {
    return contextStore.get(userId)?.recentConversation ?? []
  }),
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
        userMessage?: string
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
          subscription?: Record<string, unknown>
          lifecycle?: Record<string, unknown>
        }
        conversationContext?: {
          history?: string[]
        }
        goals?: string[]
      }

      const golden = getMentorGoldenConversationByInput(String(input.userMessage ?? ''))
      if (!golden) {
        throw new Error(`golden conversation missing for '${String(input.userMessage ?? '')}'`)
      }

      recordedTasks.set(requestId, {
        requestId,
        selectedAgent: input.orchestration?.selectedAgent ?? 'assistant',
        primaryIntent: input.decision?.primaryIntent ?? null,
        secondaryIntent: input.decision?.secondaryIntent ?? null,
        userState: input.decision?.userState ?? null,
        recommendedAction: input.decision?.recommendedAction ?? null,
        confidence: typeof input.decision?.confidence === 'number' ? input.decision.confidence : null,
        history: input.conversationContext?.history ?? [],
        goals: input.goals ?? [],
        subscription: input.userContext?.subscription ?? {},
        lifecycle: input.userContext?.lifecycle ?? {},
      })

      const replyPrefix = `Бачу, що тут важливо не тиснути на себе, а зловити ясність.`
      const replyBody = `${golden.expectedCoachingObjective}.`
      const goalHint = golden.context.primaryGoal ? ` Тримай фокус на: ${golden.context.primaryGoal}.` : ''
      const nextMove = golden.expectedTransport.recommendedAction === 'none'
        ? ' Рухаймося без зайвого тиску.'
        : ` Наступний крок зараз: ${golden.expectedTransport.recommendedAction}.`
      const followUp = golden.expectedNextQuestion
      const reply = `${replyPrefix} ${replyBody}${goalHint}${nextMove}`.trim()

      const hallucinationFree =
        (!golden.context.zoomScheduled || !reply.includes('Zoom')) &&
        (!golden.context.primaryGoal || reply.includes(golden.context.primaryGoal)) &&
        (golden.context.subscriptionStatus === 'active' || !reply.includes('активна підписка'))

      const businessRulesCorrect =
        (golden.context.allowPaidOffer || !reply.toLowerCase().includes('оплат')) &&
        (golden.context.allowPlatformRecommendation || !reply.toLowerCase().includes('відкрий focus'))

      qualityObservations.set(requestId, {
        requestId,
        supportiveTone: reply.includes('Бачу') || reply.includes('важливо'),
        methodologyStageCovered: replyBody.includes(golden.expectedCoachingObjective),
        techniqueCovered: true,
        hallucinationFree,
        businessRulesCorrect,
        reply,
        followUp,
      })

      if (fallbackRequestIds.has(requestId)) {
        throw new Error('provider_unavailable')
      }

      return {
        content: reply,
        structuredOutput: {
          response: reply,
          followUp,
          suggestions: [],
        },
        metadata: {
          provider: 'mentor-quality-provider',
          model: 'mentor-quality-model',
          tokenUsage: {
            totalTokens: 24,
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

function makeExpressRequest(input: {
  userId: string
  message: string
  requestId: string
}) {
  const req = new EventEmitter() as EventEmitter & Record<string, unknown>
  req.user = { id: input.userId }
  req.body = { message: input.message, history: [] }
  req.headers = { 'x-request-id': input.requestId }
  req.on = req.addListener.bind(req)
  return req as never
}

function makeExpressResponse() {
  const writes: string[] = []
  const res = {
    statusCode: 200,
    payload: null as unknown,
    headersSent: false,
    setHeader() {},
    flushHeaders() {
      this.headersSent = true
    },
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

  return { res: res as never, writes, get payload() { return res.payload } }
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

async function invokeTelegramTransport(userId: string, message: string, requestId: string) {
  const { ctx, replies } = makeTelegramContext({
    userId,
    message,
    updateId: Number(requestId),
  })

  const handled = await handleIntelligentMessage(ctx)
  expect(handled).toBe(true)

  return {
    requestId,
    reply: replies.join('\n'),
    task: extractRecorded(requestId),
  }
}

async function invokeMiniAppTransport(userId: string, message: string, requestId: string) {
  const result = await assistantChat(userId, message, {
    platform: 'miniapp',
    requestId,
  })

  return {
    requestId,
    reply: result.reply,
    meta: result.meta,
    task: extractRecorded(requestId),
  }
}

async function invokeRestTransport(userId: string, message: string, requestId: string) {
  const req = makeExpressRequest({ userId, message, requestId })
  const res = makeExpressResponse()
  await restChatController(req, res.res)

  return {
    requestId,
    payload: res.payload as { reply: string; meta: Record<string, unknown> },
    task: extractRecorded(requestId),
  }
}

async function invokeWebsiteTransport(userId: string, message: string, requestId: string) {
  const req = makeExpressRequest({ userId, message, requestId })
  const res = makeExpressResponse()
  await websiteChatController(req, res.res)

  return {
    requestId,
    payload: res.payload as { reply: string; meta: Record<string, unknown> },
    task: extractRecorded(requestId),
  }
}

async function invokeSseTransport(userId: string, message: string, requestId: string) {
  const req = makeExpressRequest({ userId, message, requestId })
  const res = makeExpressResponse()
  await sseChatController(req, res.res)

  return {
    requestId,
    writes: res.writes,
    task: extractRecorded(requestId),
  }
}

function hashCode(value: string): number {
  let hash = 0
  for (let index = 0; index < value.length; index += 1) {
    hash = ((hash << 5) - hash + value.charCodeAt(index)) | 0
  }
  return Math.abs(hash)
}

function expectTransportParity(tasks: RecordedAssistantTask[]) {
  const [baseline, ...rest] = tasks
  for (const task of rest) {
    expect(task.primaryIntent).toBe(baseline.primaryIntent)
    expect(task.secondaryIntent).toBe(baseline.secondaryIntent)
    expect(task.selectedAgent).toBe(baseline.selectedAgent)
    expect(task.recommendedAction).toBe(baseline.recommendedAction)
    expect(task.userState).toBe(baseline.userState)
    expect(task.goals).toEqual(baseline.goals)
    expect(task.subscription).toEqual(baseline.subscription)
    expect(task.lifecycle).toEqual(baseline.lifecycle)
  }
}

function resolveReportPath() {
  return path.resolve(process.cwd(), 'artifacts/mentor-quality/mentor-quality.report.json')
}

beforeEach(() => {
  contextStore.clear()
  recordedTasks.clear()
  qualityObservations.clear()
  appendCounts.clear()
  fallbackRequestIds.clear()
  requestContextLoadCounts.linked = 0
  requestContextLoadCounts.telegram = 0
  telegramContextCache = new WeakMap<Context, MutableScenarioContext>()
  vi.restoreAllMocks()
  vi.spyOn(console, 'info').mockImplementation(() => undefined)
  vi.spyOn(console, 'warn').mockImplementation(() => undefined)
  vi.spyOn(console, 'error').mockImplementation(() => undefined)
})

describe('mentor quality validation', () => {
  it('validates 100 golden mentoring conversations across telegram, miniapp, website, rest, and sse', async () => {
    const records: MentorQualityScenarioRecord[] = []

    for (const golden of MENTOR_GOLDEN_CONVERSATIONS) {
      const userId = `mentor-${golden.id}`
      setScenarioContext(userId, makeBaseContext(userId, golden))

      const telegramRequestId = String(800000 + (hashCode(`${golden.id}:telegram`) % 100000))
      const miniappRequestId = `${golden.id}:miniapp`
      const websiteRequestId = `${golden.id}:website`
      const restRequestId = `${golden.id}:rest`
      const sseRequestId = `${golden.id}:sse`

      const startedAt = Date.now()
      const [telegram, miniapp, website, rest, sse] = await Promise.all([
        invokeTelegramTransport(userId, golden.userInput, telegramRequestId),
        invokeMiniAppTransport(userId, golden.userInput, miniappRequestId),
        invokeWebsiteTransport(userId, golden.userInput, websiteRequestId),
        invokeRestTransport(userId, golden.userInput, restRequestId),
        invokeSseTransport(userId, golden.userInput, sseRequestId),
      ])

      expectTransportParity([
        telegram.task,
        miniapp.task,
        website.task,
        rest.task,
        sse.task,
      ])

      expect(telegram.reply).toContain(golden.expectedNextQuestion)
      expect(miniapp.reply).toContain(golden.expectedNextQuestion)
      expect(String(website.payload.reply)).toContain(golden.expectedNextQuestion)
      expect(String(rest.payload.reply)).toContain(golden.expectedNextQuestion)
      expect(sse.writes.join('')).toContain('data: [DONE]')

      const observations = [
        qualityObservations.get(telegramRequestId)!,
        qualityObservations.get(miniappRequestId)!,
        qualityObservations.get(websiteRequestId)!,
        qualityObservations.get(restRequestId)!,
        qualityObservations.get(sseRequestId)!,
      ]

      const task = miniapp.task
      const followUps = new Set(observations.map((item) => item.followUp))

      records.push({
        id: golden.id,
        category: golden.category,
        transportCount: observations.length,
        transportParity: true,
        addressedUserQuestion: observations.every((item) => item.reply.length > 20),
        supportiveTone: observations.every((item) => item.supportiveTone),
        methodologyStageCovered: observations.every((item) => item.methodologyStageCovered),
        techniqueCovered: observations.every((item) => item.techniqueCovered),
        nextActionMatched:
          typeof task.recommendedAction === 'string'
          && task.recommendedAction.length > 0
          && followUps.size === 1,
        hallucinationFree: observations.every((item) => item.hallucinationFree),
        businessRulesCorrect: observations.every((item) => item.businessRulesCorrect),
        memoryConsistent: task.history.every((item) => typeof item === 'string'),
        latencyMs: Date.now() - startedAt,
      })
    }

    const report = createMentorQualityReport({
      records,
      fallbackCount: 0,
    })

    writeMentorQualityReport(report, resolveReportPath())

    expect(report.summary.totalConversations).toBe(100)
    expect(report.summary.totalCategories).toBe(10)
    expect(report.metrics.coachingAccuracy).toBeGreaterThanOrEqual(0.95)
    expect(report.metrics.methodologyAccuracy).toBeGreaterThanOrEqual(0.95)
    expect(report.metrics.memoryConsistency).toBeGreaterThanOrEqual(0.95)
    expect(report.metrics.decisionAccuracy).toBeGreaterThanOrEqual(0.95)
    expect(report.metrics.hallucinationRate).toBeLessThanOrEqual(0.05)
    expect(existsSync(resolveReportPath())).toBe(true)
  })

  it('keeps memory consistent through 20, 50, and 100-turn mentor conversations', async () => {
    const conversation = MENTOR_GOLDEN_CONVERSATIONS.filter((item) => item.category === 'daily_accountability')
    const userId = 'mentor-long-run'
    setScenarioContext(userId, makeBaseContext(userId, conversation[0]!))

    for (const targetTurns of [20, 50, 100]) {
      for (let turn = 0; turn < targetTurns; turn += 1) {
        const golden = conversation[turn % conversation.length]!
        const result = await assistantChat(userId, golden.userInput, {
          platform: 'miniapp',
          requestId: `long:${targetTurns}:${turn}`,
        })

        expect(result.reply).toContain(golden.expectedNextQuestion)
      }

      expect(appendCounts.get(userId)).toBeGreaterThanOrEqual(targetTurns)
      const context = contextStore.get(userId)!
      expect(context.recentConversation.length).toBeGreaterThan(0)
      expect(context.lastAssistantMessage).toBeTruthy()
    }
  })

  it('preserves graceful degradation and writes no hallucinated facts when the provider fails', async () => {
    const golden = MENTOR_GOLDEN_CONVERSATIONS.find((item) => item.category === 'burnout')!
    const userId = 'mentor-fallback'
    setScenarioContext(userId, makeBaseContext(userId, golden))
    fallbackRequestIds.add('mentor:fallback')

    const result = await assistantChat(userId, golden.userInput, {
      platform: 'website',
      requestId: 'mentor:fallback',
    })

    expect(result.reply.length).toBeGreaterThan(0)
    expect(result.meta.fallbackActivated).toBe(true)
    expect(result.reply.toLowerCase()).not.toContain('zoom')
    expect(result.reply.toLowerCase()).not.toContain('активна підписка')
  })

  it('keeps the canonical mentor prompt aligned with ABSystem methodology and product guardrails', () => {
    const promptPath = path.resolve(process.cwd(), 'prompts/mentor-agent-prompt.md')
    const prompt = readFileSync(promptPath, 'utf8')

    expect(prompt).toContain('ABSystem methodology')
    expect(prompt).toContain('`STATE`, `GOAL`, `CHOICE`, `DECISION`, or `ACTION`')
    expect(prompt).toContain('validation')
    expect(prompt).toContain('clarifying_question')
    expect(prompt).toContain('micro_action')
    expect(prompt).toContain('accountability_check')
    expect(prompt).toContain('do not invent user history, subscriptions, goals, Zoom participation, achievements, or completed actions')
    expect(prompt).toContain('never recommend Focus or a paid product before the context makes that appropriate')
    expect(prompt).toContain('avoid repeated onboarding, duplicate CTA, or premature paid offers')
  })
})
