import { anthropic } from '@starway/ai/providers'
import { calculateAiCostUsd, getCostTier, type AiCostTelemetry } from '@starway/ai/providers/pricing'
import { Prisma, ZoomStatus } from '@starway/db/prisma-client'

import { prisma } from '../../db/client.js'
import { coachContent, buildPlannerUserPrompt, buildZoomListMessage } from '../../bot/content/coachContent.content.js'
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

function ensureAnthropicConfigured(): void {
  const apiKey = normalizeText(process.env.ANTHROPIC_API_KEY)
  if (!apiKey || apiKey === 'SET') {
    throw new Error('ai_not_configured')
  }
}

export async function generateContentPlannerDraft(input: {
  userId: string
  mode: ContentPlanMode
  scope?: ContentPlanScope
  topic?: string | null
}): Promise<CoachPlannerDraft> {
  ensureAnthropicConfigured()

  const scope = input.scope ?? (input.mode === 'MONTHLY_PLAN' ? 'MONTHLY' : 'WEEKLY')
  const context = await loadPlannerContextByScope(input.userId, scope)
  const model = normalizeText(process.env.ANTHROPIC_MODEL) || 'claude-sonnet-4-20250514'
  const prompt = buildPlannerUserPrompt({
    mode: input.mode,
    scope,
    periodRange: context.period.periodRange,
    topic: normalizeText(input.topic) || null,
    zoomDigest: context.zooms.map(formatZoomDigestItem).join('\n\n'),
    noteDigest: formatNotesDigest(context.notes),
  })
  const maxTokens = 1600
  const cacheKey = hashCacheParts([
    'coach-planner-draft',
    model,
    coachContent.prompts.system,
    prompt,
    maxTokens,
  ])
  const cached = resultCache.get(cacheKey)
  if (cached) {
    return {
      mode: input.mode,
      planScope: context.period.planScope,
      periodStart: context.period.periodStart,
      periodEnd: context.period.periodEnd,
      periodRange: context.period.periodRange,
      topic: normalizeText(input.topic) || null,
      content: cached.content,
      zooms: context.zooms,
      notes: context.notes,
    }
  }

  const response = await anthropic.messages.create({
    model,
    max_tokens: maxTokens,
    system: coachContent.prompts.system,
    messages: [{ role: 'user', content: prompt }],
  })

  const text = response.content
    .map((part) => ('text' in part ? part.text : ''))
    .join('\n')
    .trim()

  if (!text) {
    throw new Error('empty_claude_response')
  }

  const inputTokens = response.usage?.input_tokens ?? 0
  const outputTokens = response.usage?.output_tokens ?? 0
  const actualCostUsd = calculateAiCostUsd(model, inputTokens, outputTokens)
  const usage: AiCostTelemetry = {
    provider: 'claude',
    model,
    inputTokens,
    outputTokens,
    totalTokens: inputTokens + outputTokens,
    estimatedCostUsd: actualCostUsd,
    actualCostUsd,
    costTier: getCostTier(actualCostUsd),
  }
  rememberResultCache(cacheKey, { content: text, usage })

  return {
    mode: input.mode,
    planScope: context.period.planScope,
    periodStart: context.period.periodStart,
    periodEnd: context.period.periodEnd,
    periodRange: context.period.periodRange,
    topic: normalizeText(input.topic) || null,
    content: text,
    zooms: context.zooms,
    notes: context.notes,
  }
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
