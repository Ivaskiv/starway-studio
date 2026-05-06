import { createHash } from 'node:crypto'

import { openai } from '../../lib/openai.js'
import { getWebMap } from '../../modules/web-map/web-map.service.js'

type WebMapLike = {
  id?: string
  system?: {
    graph?: {
      nodes?: unknown[]
      edges?: unknown[]
    }
  } | null
  goals?: unknown[]
  months?: unknown[]
}

type UserActivityInput = {
  completed: string[]
  skipped: string[]
  failed: string[]
  timeSpent: number
  energyLevel: 'low' | 'medium' | 'high'
}

type FeedbackInput = {
  frictionPoints: string[]
  motivationLevel: number
  notes?: string
}

export type WebMapAdaptationTrigger = 'DAY_COMPLETE' | 'SIGNIFICANT_CHANGE'

export type WebMapAdaptationInput = {
  trigger: WebMapAdaptationTrigger
  currentWebMap?: WebMapLike | null
  userActivity?: Partial<UserActivityInput> | null
  feedback?: Partial<FeedbackInput> | null
}

export type WebMapAdaptationResult = {
  skipped?: boolean
  reason?: string
  updatedNodes: unknown[]
  updatedEdges: unknown[]
  updatedDailyCycle: unknown[]
  insights: string[]
  adaptationReason: string
  confidence: number
}

type NormalizedPayload = {
  currentWebMap: WebMapLike
  userActivity: UserActivityInput
  feedback: FeedbackInput
}

const adaptationCallState = new Map<string, { dayKey: string; count: number; lastHash: string | null }>()

function getDayKey() {
  return new Date().toISOString().slice(0, 10)
}

function hashPayload(value: unknown) {
  return createHash('sha256').update(JSON.stringify(value)).digest('hex')
}

function normalizeStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) return []
  return value.filter((item): item is string => typeof item === 'string' && item.trim().length > 0)
}

function normalizeUserActivity(value: Partial<UserActivityInput> | null | undefined): UserActivityInput | null {
  if (!value) return null
  if (value.energyLevel !== 'low' && value.energyLevel !== 'medium' && value.energyLevel !== 'high') return null

  return {
    completed: normalizeStringArray(value.completed),
    skipped: normalizeStringArray(value.skipped),
    failed: normalizeStringArray(value.failed),
    timeSpent: typeof value.timeSpent === 'number' && Number.isFinite(value.timeSpent) ? value.timeSpent : 0,
    energyLevel: value.energyLevel,
  }
}

function normalizeFeedback(value: Partial<FeedbackInput> | null | undefined): FeedbackInput | null {
  if (!value) return null
  if (typeof value.motivationLevel !== 'number' || !Number.isFinite(value.motivationLevel)) return null

  return {
    frictionPoints: normalizeStringArray(value.frictionPoints),
    motivationLevel: value.motivationLevel,
    notes: typeof value.notes === 'string' ? value.notes : '',
  }
}

function hasNodes(map: WebMapLike | null | undefined) {
  const nodes = map?.system?.graph?.nodes
  return Array.isArray(nodes) && nodes.length > 0
}

export function canRunAI(input: NormalizedPayload | null | undefined) {
  return Boolean(
    input &&
      hasNodes(input.currentWebMap) &&
      Array.isArray(input.userActivity.completed) &&
      Array.isArray(input.userActivity.failed) &&
      Array.isArray(input.userActivity.skipped) &&
      input.userActivity.energyLevel &&
      input.feedback.motivationLevel !== undefined,
  )
}

function shouldThrottle(userId: string, payloadHash: string) {
  const dayKey = getDayKey()
  const current = adaptationCallState.get(userId)

  if (!current || current.dayKey !== dayKey) {
    adaptationCallState.set(userId, { dayKey, count: 0, lastHash: null })
    return { blocked: false, reason: null as string | null }
  }

  if (current.lastHash === payloadHash) {
    return { blocked: true, reason: 'SAME_INPUT' }
  }

  if (current.count >= 2) {
    return { blocked: true, reason: 'DAILY_LIMIT' }
  }

  return { blocked: false, reason: null as string | null }
}

function markAdaptationRun(userId: string, payloadHash: string) {
  const dayKey = getDayKey()
  const current = adaptationCallState.get(userId)
  if (!current || current.dayKey !== dayKey) {
    adaptationCallState.set(userId, { dayKey, count: 1, lastHash: payloadHash })
    return
  }

  adaptationCallState.set(userId, {
    dayKey,
    count: current.count + 1,
    lastHash: payloadHash,
  })
}

function buildFallbackLocalLogic(userActivity: UserActivityInput | null): WebMapAdaptationResult {
  if (!userActivity) {
    return {
      skipped: true,
      reason: 'INSUFFICIENT_DATA',
      updatedNodes: [],
      updatedEdges: [],
      updatedDailyCycle: [],
      insights: ['Missing userActivity; local fallback could not compute adaptation.'],
      adaptationReason: 'INSUFFICIENT_DATA',
      confidence: 0.05,
    }
  }

  const lowEnergy = userActivity.energyLevel === 'low'
  const repeatedSkips = userActivity.skipped.length >= 2 || userActivity.failed.length >= 2
  const stretch = userActivity.energyLevel === 'high' && userActivity.completed.length >= 2

  return {
    updatedNodes: [],
    updatedEdges: [],
    updatedDailyCycle: [
      {
        mode: lowEnergy ? 'light' : stretch ? 'stretch' : 'steady',
        maxItems: lowEnergy ? 3 : 5,
        reduceComplexity: repeatedSkips,
      },
    ],
    insights: [
      lowEnergy ? 'Low energy detected; keep today light.' : 'Energy is stable enough for base cycle.',
      repeatedSkips ? 'Repeated skips/fails detected; reduce complexity and split actions.' : 'No repeated friction pattern detected.',
      stretch ? 'Completed flow is stable; one stretch action is allowed.' : 'No stretch action added.',
    ],
    adaptationReason: repeatedSkips ? 'LOCAL_FALLBACK_COMPLEXITY_DOWN' : lowEnergy ? 'LOCAL_FALLBACK_LOW_ENERGY' : 'LOCAL_FALLBACK_STABLE',
    confidence: 0.42,
  }
}

async function resolveCurrentWebMap(userId: string, inputMap?: WebMapLike | null) {
  if (hasNodes(inputMap)) return inputMap as WebMapLike

  const dbMap = await getWebMap(userId).catch(() => null)
  if (dbMap && hasNodes(dbMap as WebMapLike)) return dbMap as WebMapLike

  return inputMap ?? null
}

async function buildPayload(userId: string, input: WebMapAdaptationInput): Promise<NormalizedPayload | null> {
  const currentWebMap = await resolveCurrentWebMap(userId, input.currentWebMap)
  const userActivity = normalizeUserActivity(input.userActivity)
  const feedback = normalizeFeedback(input.feedback)

  if (!currentWebMap || !userActivity || !feedback) return null

  return {
    currentWebMap,
    userActivity,
    feedback,
  }
}

async function runAI(payload: NormalizedPayload): Promise<WebMapAdaptationResult> {
  const prompt = `
Ти — адаптивний AI-оркестратор.
Онови currentWebMap на основі поведінки.
Працюй тільки від реальних даних.
Diff update only. ≤30% змін. Не ламай структуру.
Якщо даних недостатньо — не вигадуй.
Поверни тільки JSON:
{
  "updatedNodes": [],
  "updatedEdges": [],
  "updatedDailyCycle": [],
  "insights": [],
  "adaptationReason": "string",
  "confidence": 0.0
}

Вхід:
${JSON.stringify(payload)}
`.trim()

  const completion = await openai.chat.completions.create({
    model: 'gpt-4o-mini',
    temperature: 0.2,
    max_tokens: 1200,
    messages: [{ role: 'user', content: prompt }],
  })

  const raw = completion.choices[0]?.message?.content?.trim() ?? ''
  const parsed = JSON.parse(raw) as Partial<WebMapAdaptationResult>

  return {
    updatedNodes: Array.isArray(parsed.updatedNodes) ? parsed.updatedNodes : [],
    updatedEdges: Array.isArray(parsed.updatedEdges) ? parsed.updatedEdges : [],
    updatedDailyCycle: Array.isArray(parsed.updatedDailyCycle) ? parsed.updatedDailyCycle : [],
    insights: Array.isArray(parsed.insights) ? parsed.insights.filter((item): item is string => typeof item === 'string') : [],
    adaptationReason: typeof parsed.adaptationReason === 'string' ? parsed.adaptationReason : 'AI_ADAPTATION',
    confidence: typeof parsed.confidence === 'number' ? parsed.confidence : 0.55,
  }
}

export async function runWebMapAdaptationIfEligible(
  userId: string,
  input: WebMapAdaptationInput | null | undefined,
): Promise<WebMapAdaptationResult> {
  if (!input) {
    return {
      skipped: true,
      reason: 'INSUFFICIENT_DATA',
      updatedNodes: [],
      updatedEdges: [],
      updatedDailyCycle: [],
      insights: ['Missing adaptation payload.'],
      adaptationReason: 'INSUFFICIENT_DATA',
      confidence: 0.02,
    }
  }

  if (input.trigger !== 'DAY_COMPLETE' && input.trigger !== 'SIGNIFICANT_CHANGE') {
    return {
      skipped: true,
      reason: 'UNSUPPORTED_TRIGGER',
      updatedNodes: [],
      updatedEdges: [],
      updatedDailyCycle: [],
      insights: ['Adaptation runs only on DAY_COMPLETE or SIGNIFICANT_CHANGE.'],
      adaptationReason: 'UNSUPPORTED_TRIGGER',
      confidence: 0.02,
    }
  }

  const payload = await buildPayload(userId, input)
  if (!canRunAI(payload)) {
    return buildFallbackLocalLogic(payload?.userActivity ?? normalizeUserActivity(input.userActivity))
  }
  const safePayload = payload

  const payloadHash = hashPayload(safePayload)
  const throttle = shouldThrottle(userId, payloadHash)
  if (throttle.blocked) {
    return {
      skipped: true,
      reason: throttle.reason ?? 'THROTTLED',
      updatedNodes: [],
      updatedEdges: [],
      updatedDailyCycle: [],
      insights: [throttle.reason === 'SAME_INPUT' ? 'Same input detected; adaptation skipped.' : 'Daily limit reached; adaptation skipped.'],
      adaptationReason: throttle.reason ?? 'THROTTLED',
      confidence: 0.01,
    }
  }

  try {
    const result = await runAI(safePayload)
    markAdaptationRun(userId, payloadHash)
    return result
  } catch (error) {
    console.warn('[web-map-adaptation] ai_failed', {
      userId,
      reason: error instanceof Error ? error.message : 'unknown_error',
    })
    markAdaptationRun(userId, payloadHash)
    return buildFallbackLocalLogic(safePayload.userActivity)
  }
}
