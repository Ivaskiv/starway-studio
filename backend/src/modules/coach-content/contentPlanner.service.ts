import { getCostTier, type AiCostTelemetry } from '@starway/ai/providers/pricing'
import { Prisma, ZoomStatus } from '@starway/db/prisma-client'

import { prisma } from '../../db/client.js'
import { coachContent, buildPlannerUserPrompt, buildZoomListMessage } from '../../bot/content/coachContent.content.js'
import { getTelegramAgentGateway } from '../ai/gateway/index.js'
import { extractRuntimeTelemetry } from '../ai/gateway/helpers.js'
import { resolveGatewayPromptRead } from '../ai/gateway/runtime.js'
import { parseZoomPostReport } from '../zoom/reports/zoomPostReport.types.js'
import { hashCacheParts, rememberResultCache, resultCache } from '../sales-assistant/sales-assistant.helpers.js'

export type ContentPlanMode = 'WEEKLY_PLAN' | 'MONTHLY_PLAN' | 'REELS_IDEAS' | 'FULL_CONTENT'
export type ContentPlanScope = 'WEEKLY' | 'MONTHLY'

export interface CoachZoomContextItem {
  scheduledAt: Date
  topic: string
  type: string
  transcript: string
}

export interface CoachPlannerDraft {
  mode: ContentPlanMode
  planScope: ContentPlanScope
  periodStart: Date
  periodEnd: Date
  periodRange: string
  topic: string | null
  content: string
  zooms: CoachZoomContextItem[]
  notes: string[]
}

export interface PlannerWeekWindow {
  planScope: ContentPlanScope
  periodStart: Date
  periodEnd: Date
  periodRange: string
}

const COACH_NOTE_SOURCE = 'coach_content_flow'
const COACH_PLANNER_CONTEXT_CACHE_TTL_MS = 60_000
const CONTENT_AGENT_KEY = 'content'
const CONTENT_AGENT_PROMPT_ID = 'content-agent-prompt'

type PlannerContextCacheValue = {
  expiresAt: number
  value: {
    period: PlannerWeekWindow
    zooms: CoachZoomContextItem[]
    notes: string[]
  }
}

const plannerContextCache = new Map<string, PlannerContextCacheValue>()

function startOfWeekMonday(input = new Date()): Date {
  const kyivNow = new Date(input.toLocaleString('en-US', { timeZone: 'Europe/Kyiv' }))
  const date = new Date(kyivNow)
  const day = date.getDay()
  const diff = day === 0 ? -6 : 1 - day
  date.setDate(date.getDate() + diff)
  date.setHours(0, 0, 0, 0)
  return date
}

function endOfWeekSunday(weekStart: Date): Date {
  const date = new Date(weekStart)
  date.setDate(date.getDate() + 6)
  date.setHours(23, 59, 59, 999)
  return date
}

function getMonthLabel(date: Date): string {
  return date.toLocaleDateString('uk-UA', {
    month: 'long',
    year: 'numeric',
    timeZone: 'Europe/Kyiv',
  })
}

export function getPlannerWeekWindow(now = new Date()): PlannerWeekWindow {
  const periodStart = startOfWeekMonday(now)
  const periodEnd = endOfWeekSunday(periodStart)
  const periodRange = `${formatShortDate(periodStart)}–${formatShortDate(periodEnd)}`
  return { planScope: 'WEEKLY', periodStart, periodEnd, periodRange }
}

export function getMonthRange(now = new Date()): PlannerWeekWindow {
  const kyivNow = new Date(now.toLocaleString('en-US', { timeZone: 'Europe/Kyiv' }))
  const periodStart = new Date(kyivNow.getFullYear(), kyivNow.getMonth(), 1, 0, 0, 0, 0)
  const periodEnd = new Date(kyivNow.getFullYear(), kyivNow.getMonth() + 1, 0, 23, 59, 59, 999)
  const periodRange = getMonthLabel(periodStart)
  return { planScope: 'MONTHLY', periodStart, periodEnd, periodRange }
}

function formatShortDate(date: Date): string {
  return date.toLocaleDateString('uk-UA', {
    day: '2-digit',
    month: '2-digit',
    timeZone: 'Europe/Kyiv',
  })
}

function formatShortDateTime(date: Date): string {
  return date.toLocaleString('uk-UA', {
    day: '2-digit',
    month: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    timeZone: 'Europe/Kyiv',
  })
}

function normalizeText(value: unknown): string {
  return String(value ?? '').replace(/\s+/g, ' ').trim()
}

function extractTranscript(postSessionReport: unknown): string {
  const parsed = parseZoomPostReport(postSessionReport)
  return normalizeText(parsed?.transcript)
}

function clip(text: string, limit = 900): string {
  const normalized = normalizeText(text)
  if (normalized.length <= limit) return normalized
  return `${normalized.slice(0, limit)}…`
}

function formatZoomDigestItem(item: CoachZoomContextItem): string {
  return [
    `• ${formatShortDateTime(item.scheduledAt)} — ${item.topic} (${item.type})`,
    clip(item.transcript, 700),
  ].join('\n')
}

function formatNotesDigest(notes: string[]): string {
  if (notes.length === 0) return ''
  return notes.map((note, index) => `• ${index + 1}. ${clip(note, 700)}`).join('\n')
}

function getPlannerContextCacheKey(userId: string, scope: ContentPlanScope, period: PlannerWeekWindow): string {
  return hashCacheParts([
    'coach-planner-context',
    userId,
    scope,
    period.periodStart.toISOString(),
    period.periodEnd.toISOString(),
  ])
}

function cleanupPlannerContextCache(): void {
  const now = Date.now()
  for (const [key, entry] of plannerContextCache.entries()) {
    if (entry.expiresAt <= now) plannerContextCache.delete(key)
  }
}

function dedupeCoachZoomItems(items: CoachZoomContextItem[]): CoachZoomContextItem[] {
  const seen = new Set<string>()
  const deduped: CoachZoomContextItem[] = []
  for (const item of items) {
    const key = [
      item.scheduledAt.toISOString(),
      item.topic,
      item.type,
      item.transcript,
    ].join('|')
    if (seen.has(key)) continue
    seen.add(key)
    deduped.push(item)
  }
  return deduped
}

function dedupeStrings(values: string[]): string[] {
  return Array.from(new Set(values.map((value) => normalizeText(value)).filter(Boolean)))
}

export async function loadPlannerContext(userId: string): Promise<{
  period: PlannerWeekWindow
  zooms: CoachZoomContextItem[]
  notes: string[]
}> {
  return loadPlannerContextByScope(userId, 'WEEKLY')
}

export async function loadPlannerContextByScope(userId: string, scope: ContentPlanScope): Promise<{
  period: PlannerWeekWindow
  zooms: CoachZoomContextItem[]
  notes: string[]
}> {
  const period = scope === 'MONTHLY' ? getMonthRange() : getPlannerWeekWindow()
  const cacheKey = getPlannerContextCacheKey(userId, scope, period)
  cleanupPlannerContextCache()
  const cached = plannerContextCache.get(cacheKey)
  if (cached && cached.expiresAt > Date.now()) {
    return cached.value
  }

  const [zooms, notes] = await Promise.all([
    prisma.zoomSession.findMany({
      where: {
        expertId: userId,
        scheduledAt: { gte: period.periodStart, lte: period.periodEnd },
        status: { not: ZoomStatus.CANCELLED },
        postSessionReport: { not: Prisma.JsonNull },
      },
      ...(scope === 'WEEKLY' ? { take: 3 } : {}),
      orderBy: [{ scheduledAt: 'desc' }],
      select: {
        topic: true,
        type: true,
        scheduledAt: true,
        postSessionReport: true,
      },
    }),
    prisma.note.findMany({
      where: {
        userId,
        createdAt: { gte: period.periodStart, lte: period.periodEnd },
      },
      orderBy: [{ createdAt: 'desc' }],
      select: { content: true },
    }),
  ])

  const zoomItems = dedupeCoachZoomItems(
    zooms
    .map((zoom) => ({
      scheduledAt: zoom.scheduledAt,
      topic: normalizeText(zoom.topic),
      type: normalizeText(zoom.type),
      transcript: extractTranscript(zoom.postSessionReport),
    }))
    .filter((item) => Boolean(item.transcript))
  )

  const value = {
    period,
    zooms: zoomItems,
    notes: dedupeStrings(notes.map((note) => note.content)),
  }
  plannerContextCache.set(cacheKey, {
    expiresAt: Date.now() + COACH_PLANNER_CONTEXT_CACHE_TTL_MS,
    value,
  })

  return value
}

function buildPlannerDraft(input: {
  mode: ContentPlanMode
  topic?: string | null
  context: Awaited<ReturnType<typeof loadPlannerContextByScope>>
  content: string
}): CoachPlannerDraft {
  return {
    mode: input.mode,
    planScope: input.context.period.planScope,
    periodStart: input.context.period.periodStart,
    periodEnd: input.context.period.periodEnd,
    periodRange: input.context.period.periodRange,
    topic: normalizeText(input.topic) || null,
    content: input.content,
    zooms: input.context.zooms,
    notes: input.context.notes,
  }
}

function mapPlannerGatewayUsage(input: {
  metadata: Record<string, unknown> | undefined
  provider?: unknown
  model?: unknown
  tokensUsed?: unknown
}): AiCostTelemetry {
  const telemetry = extractRuntimeTelemetry(input.metadata)
  if (telemetry) {
    const totalTokens = telemetry.promptTokens + telemetry.completionTokens
    const effectiveCost = telemetry.actualCost || telemetry.estimatedCost || 0

    return {
      provider: telemetry.provider,
      model: telemetry.model,
      inputTokens: telemetry.promptTokens,
      outputTokens: telemetry.completionTokens,
      totalTokens,
      estimatedCostUsd: telemetry.estimatedCost,
      actualCostUsd: telemetry.actualCost,
      costTier: getCostTier(effectiveCost),
    }
  }

  const totalTokens =
    typeof input.tokensUsed === 'number' && Number.isFinite(input.tokensUsed)
      ? input.tokensUsed
      : 0

  return {
    provider:
      typeof input.provider === 'string' && input.provider.trim().length > 0
        ? input.provider
        : 'unknown',
    model:
      typeof input.model === 'string' && input.model.trim().length > 0
        ? input.model
        : 'unknown',
    inputTokens: 0,
    outputTokens: totalTokens,
    totalTokens,
    estimatedCostUsd: 0,
    actualCostUsd: 0,
    costTier: getCostTier(0),
  }
}

function normalizePlannerGatewayError(error: unknown): never {
  if (
    error instanceof Error &&
    /not configured/i.test(error.message)
  ) {
    throw new Error('ai_not_configured')
  }

  throw error
}

async function runCanonicalContentAgent(input: {
  userId: string
  prompt: string
}): Promise<{ content: string; usage: AiCostTelemetry }> {
  try {
    const result = await getTelegramAgentGateway().executeTargetedAgentTest({
      key: CONTENT_AGENT_KEY,
      bot: 'coach',
      chatId: input.userId,
      userId: input.userId,
      message: input.prompt,
      requestId: `coach-content:${input.userId}:${Date.now()}`,
    })

    const payload = result.artifact.payload as {
      response?: unknown
      provider?: unknown
      model?: unknown
      tokensUsed?: unknown
    }
    const content = typeof payload.response === 'string'
      ? payload.response.trim()
      : ''

    if (!content) {
      throw new Error('empty_content_agent_response')
    }

    return {
      content,
      usage: mapPlannerGatewayUsage({
        metadata: result.artifact.metadata,
        provider: payload.provider,
        model: payload.model,
        tokensUsed: payload.tokensUsed,
      }),
    }
  } catch (error) {
    normalizePlannerGatewayError(error)
  }
}

export async function generateContentPlannerDraft(input: {
  userId: string
  mode: ContentPlanMode
  scope?: ContentPlanScope
  topic?: string | null
}): Promise<CoachPlannerDraft> {
  const scope = input.scope ?? (input.mode === 'MONTHLY_PLAN' ? 'MONTHLY' : 'WEEKLY')
  const context = await loadPlannerContextByScope(input.userId, scope)
  const prompt = buildPlannerUserPrompt({
    mode: input.mode,
    scope,
    periodRange: context.period.periodRange,
    topic: normalizeText(input.topic) || null,
    zoomDigest: context.zooms.map(formatZoomDigestItem).join('\n\n'),
    noteDigest: formatNotesDigest(context.notes),
  })
  const maxTokens = 1600
  const promptTrace = await resolveGatewayPromptRead(CONTENT_AGENT_PROMPT_ID)
  const cacheKey = hashCacheParts([
    'coach-planner-draft',
    CONTENT_AGENT_KEY,
    CONTENT_AGENT_PROMPT_ID,
    promptTrace?.source ?? 'unknown',
    promptTrace?.version ?? null,
    prompt,
    maxTokens,
  ])
  const cached = resultCache.get(cacheKey)
  if (cached) {
    return buildPlannerDraft({
      mode: input.mode,
      topic: input.topic,
      context,
      content: cached.content,
    })
  }

  const generated = await runCanonicalContentAgent({
    userId: input.userId,
    prompt,
  })
  rememberResultCache(cacheKey, { content: generated.content, usage: generated.usage })

  return buildPlannerDraft({
    mode: input.mode,
    topic: input.topic,
    context,
    content: generated.content,
  })
}

export async function saveContentPlan(input: {
  expertId: string
  periodStart: Date
  periodEnd: Date
  planScope: ContentPlanScope
  mode: ContentPlanMode
  content: string
}): Promise<void> {
  await prisma.contentPlan.upsert({
    where: {
      expertId_weekStart_type: {
        expertId: input.expertId,
        weekStart: input.periodStart,
        type: input.mode,
      },
    },
    update: {
      content: input.content,
      status: 'CONFIRMED',
      planScope: input.planScope,
      periodStart: input.periodStart,
      periodEnd: input.periodEnd,
    },
    create: {
      expertId: input.expertId,
      weekStart: input.periodStart,
      type: input.mode,
      planScope: input.planScope,
      periodStart: input.periodStart,
      periodEnd: input.periodEnd,
      content: input.content,
      status: 'CONFIRMED',
    },
  })
}

export async function saveCoachNote(input: {
  userId: string
  content: string
  source?: string
}): Promise<void> {
  await prisma.note.create({
    data: {
      userId: input.userId,
      content: input.content,
      source: input.source ?? COACH_NOTE_SOURCE,
    },
  })
}

export async function listCoachZoomSessions(userId: string): Promise<Array<{
  scheduledAt: Date
  topic: string
  type: string
  status: string
}>> {
  const period = getPlannerWeekWindow()
  const sessions = await prisma.zoomSession.findMany({
    where: {
      expertId: userId,
      scheduledAt: { gte: period.periodStart, lte: period.periodEnd },
      status: { not: ZoomStatus.CANCELLED },
    },
    orderBy: [{ scheduledAt: 'asc' }],
    select: {
      scheduledAt: true,
      topic: true,
      type: true,
      status: true,
    },
  })

  return sessions.map((session) => ({
    scheduledAt: session.scheduledAt,
    topic: normalizeText(session.topic),
    type: normalizeText(session.type),
    status: normalizeText(session.status),
  }))
}

export function formatZoomListMessage(sessions: Array<{
  scheduledAt: Date
  topic: string
  type: string
  status: string
}>): string {
  const period = getPlannerWeekWindow()
  return buildZoomListMessage(period.periodRange, sessions)
}
