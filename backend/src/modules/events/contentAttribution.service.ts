import type { Prisma } from '@starway/db/prisma-client'

import { prisma } from '../../db/client.js'
import { trackEvent, type EventSource } from './service.js'

const CONTENT_PAYLOAD_PATTERN = /^(reel|reels|ad|ads|post|podcast|story|stories|dm|banner)_(sale|traffic|warmup)_(\d{1,3})$/i
const CONTENT_ATTRIBUTION_WINDOW_HOURS = 72

type ContentGoal = 'sale' | 'traffic' | 'warmup'

export type ContentAttribution = {
  payload: string
  contentType: string
  goal: ContentGoal
  variant: number
  source: EventSource
  createdAt: string
}

function normalizeContentType(value: string): string {
  const normalized = value.toLowerCase()
  if (normalized === 'reels') return 'reel'
  if (normalized === 'ads') return 'ad'
  if (normalized === 'stories') return 'story'
  return normalized
}

function asJsonObject(value: Prisma.JsonValue | null | undefined): Prisma.JsonObject | null {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return null
  }

  return value as Prisma.JsonObject
}

export function isContentMachinePayload(payload: string | null | undefined): boolean {
  return Boolean(payload && CONTENT_PAYLOAD_PATTERN.test(payload.trim()))
}

export function parseContentMachinePayload(payload: string): Omit<ContentAttribution, 'source' | 'createdAt'> | null {
  const match = payload.trim().match(CONTENT_PAYLOAD_PATTERN)
  if (!match) {
    return null
  }

  return {
    payload: payload.trim(),
    contentType: normalizeContentType(match[1]),
    goal: match[2].toLowerCase() as ContentGoal,
    variant: Number(match[3]),
  }
}

export async function trackContentPayloadEntry(
  userId: string,
  payload: string,
  source: EventSource,
  state?: string | null,
): Promise<void> {
  const parsed = parseContentMachinePayload(payload)
  if (!parsed) {
    return
  }

  const recentEntry = await prisma.event.findFirst({
    where: {
      userId,
      type: 'content_payload_entry',
      createdAt: {
        gte: new Date(Date.now() - 30 * 60 * 1000),
      },
    },
    orderBy: { createdAt: 'desc' },
    select: {
      payload: true,
    },
  }).catch(() => null)

  const recentPayload = asJsonObject(recentEntry?.payload)?.payload
  if (typeof recentPayload === 'string' && recentPayload === parsed.payload) {
    return
  }

  await trackEvent({
    userId,
    type: 'content_payload_entry',
    source,
    state,
    payload: parsed satisfies Prisma.JsonObject,
  })
}

export async function getLatestContentAttribution(
  userId: string,
  withinHours = CONTENT_ATTRIBUTION_WINDOW_HOURS,
): Promise<ContentAttribution | null> {
  const event = await prisma.event.findFirst({
    where: {
      userId,
      type: 'content_payload_entry',
      createdAt: {
        gte: new Date(Date.now() - withinHours * 60 * 60 * 1000),
      },
    },
    orderBy: { createdAt: 'desc' },
    select: {
      source: true,
      createdAt: true,
      payload: true,
    },
  }).catch(() => null)

  const payloadObject = asJsonObject(event?.payload)
  const payloadValue = typeof payloadObject?.payload === 'string' ? payloadObject.payload : null
  if (!event || !payloadValue) {
    return null
  }

  const parsed = parseContentMachinePayload(payloadValue)
  if (!parsed) {
    return null
  }

  return {
    ...parsed,
    source: event.source as EventSource,
    createdAt: event.createdAt.toISOString(),
  }
}

export async function trackDmStartFromContent(
  userId: string,
  text: string,
  source: EventSource,
  state?: string | null,
): Promise<void> {
  const attribution = await getLatestContentAttribution(userId)
  if (!attribution) {
    return
  }

  const recentDmStart = await prisma.event.findFirst({
    where: {
      userId,
      type: 'content_dm_start',
      createdAt: {
        gte: new Date(Date.now() - 24 * 60 * 60 * 1000),
      },
    },
    orderBy: { createdAt: 'desc' },
    select: {
      payload: true,
    },
  }).catch(() => null)

  const recentPayload = asJsonObject(recentDmStart?.payload)?.payload
  if (typeof recentPayload === 'string' && recentPayload === attribution.payload) {
    return
  }

  await trackEvent({
    userId,
    type: 'content_dm_start',
    source,
    state,
    payload: {
      payload: attribution.payload,
      contentType: attribution.contentType,
      goal: attribution.goal,
      variant: attribution.variant,
      textPreview: text.trim().slice(0, 140),
    } satisfies Prisma.JsonObject,
  })
}

export async function getContentAttributionEventPayload(
  userId: string,
  withinHours = CONTENT_ATTRIBUTION_WINDOW_HOURS,
): Promise<Prisma.JsonObject | undefined> {
  const attribution = await getLatestContentAttribution(userId, withinHours)
  if (!attribution) {
    return undefined
  }

  return {
    contentAttribution: {
      payload: attribution.payload,
      contentType: attribution.contentType,
      goal: attribution.goal,
      variant: attribution.variant,
      source: attribution.source,
      createdAt: attribution.createdAt,
    },
  } satisfies Prisma.JsonObject
}
