import { anthropic } from '@starway/ai/providers'
import { Prisma, ZoomStatus } from '@starway/db/prisma-client'

import { prisma } from '../../db/client.js'
import { coachContent, buildPlannerUserPrompt, buildZoomListMessage } from '../../bot/content/coachContent.content.js'
import { parseZoomPostReport } from '../zoom/zoomPostReport.types.js'

export type ContentPlanMode = 'WEEKLY_PLAN' | 'REELS_IDEAS' | 'FULL_CONTENT'

export interface CoachZoomContextItem {
  scheduledAt: Date
  topic: string
  type: string
  transcript: string
}

export interface CoachPlannerDraft {
  mode: ContentPlanMode
  weekStart: Date
  weekEnd: Date
  weekRange: string
  topic: string | null
  content: string
  zooms: CoachZoomContextItem[]
  notes: string[]
}

export interface PlannerWeekWindow {
  weekStart: Date
  weekEnd: Date
  weekRange: string
}

const COACH_NOTE_SOURCE = 'coach_content_flow'

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

export function getPlannerWeekWindow(now = new Date()): PlannerWeekWindow {
  const weekStart = startOfWeekMonday(now)
  const weekEnd = endOfWeekSunday(weekStart)
  const weekRange = `${formatShortDate(weekStart)}–${formatShortDate(weekEnd)}`
  return { weekStart, weekEnd, weekRange }
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
  return String(value ?? '').trim()
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

export async function loadPlannerContext(userId: string): Promise<{
  week: PlannerWeekWindow
  zooms: CoachZoomContextItem[]
  notes: string[]
}> {
  const week = getPlannerWeekWindow()

  const [zooms, notes] = await Promise.all([
    prisma.zoomSession.findMany({
      where: {
        expertId: userId,
        scheduledAt: { gte: week.weekStart, lte: week.weekEnd },
        status: { not: ZoomStatus.CANCELLED },
        postSessionReport: { not: Prisma.JsonNull },
      },
      orderBy: [{ scheduledAt: 'desc' }],
      take: 3,
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
        createdAt: { gte: week.weekStart, lte: week.weekEnd },
      },
      orderBy: [{ createdAt: 'desc' }],
      select: { content: true },
    }),
  ])

  const zoomItems = zooms
    .map((zoom) => ({
      scheduledAt: zoom.scheduledAt,
      topic: normalizeText(zoom.topic),
      type: normalizeText(zoom.type),
      transcript: extractTranscript(zoom.postSessionReport),
    }))
    .filter((item) => Boolean(item.transcript))

  return {
    week,
    zooms: zoomItems,
    notes: notes.map((note) => normalizeText(note.content)).filter(Boolean),
  }
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
  topic?: string | null
}): Promise<CoachPlannerDraft> {
  ensureAnthropicConfigured()

  const context = await loadPlannerContext(input.userId)
  const prompt = buildPlannerUserPrompt({
    mode: input.mode,
    weekRange: context.week.weekRange,
    topic: normalizeText(input.topic) || null,
    zoomDigest: context.zooms.map(formatZoomDigestItem).join('\n\n'),
    noteDigest: formatNotesDigest(context.notes),
  })

  const response = await anthropic.messages.create({
    model: normalizeText(process.env.ANTHROPIC_MODEL) || 'claude-sonnet-4-20250514',
    max_tokens: 2000,
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

  return {
    mode: input.mode,
    weekStart: context.week.weekStart,
    weekEnd: context.week.weekEnd,
    weekRange: context.week.weekRange,
    topic: normalizeText(input.topic) || null,
    content: text,
    zooms: context.zooms,
    notes: context.notes,
  }
}

export async function saveContentPlan(input: {
  expertId: string
  weekStart: Date
  mode: ContentPlanMode
  content: string
}): Promise<void> {
  await prisma.contentPlan.upsert({
    where: {
      expertId_weekStart_type: {
        expertId: input.expertId,
        weekStart: input.weekStart,
        type: input.mode,
      },
    },
    update: {
      content: input.content,
      status: 'CONFIRMED',
    },
    create: {
      expertId: input.expertId,
      weekStart: input.weekStart,
      type: input.mode,
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
  const week = getPlannerWeekWindow()
  const sessions = await prisma.zoomSession.findMany({
    where: {
      expertId: userId,
      scheduledAt: { gte: week.weekStart, lte: week.weekEnd },
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
  const week = getPlannerWeekWindow()
  return buildZoomListMessage(week.weekRange, sessions)
}
