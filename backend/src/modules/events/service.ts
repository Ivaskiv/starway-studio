import type { Prisma } from '@prisma/client'
import { prisma } from '../../db/client.js'

export type EventSource = 'telegram' | 'web' | 'miniapp'

export interface TrackEventInput {
  userId?: string | null
  type: string
  source: EventSource
  state?: string | null
  payload?: Prisma.InputJsonValue
}

export interface TrackQuestionEventInput {
  userId?: string | null
  source: EventSource
  state?: string | null
  text: string
  detectedIntent: string
  productContext: 'lead_magnet' | 'trial' | 'subscription' | 'general'
  category: 'general' | 'product' | 'lead_magnet' | 'objection' | 'off_topic' | 'unknown'
}

export interface RecentUserEvent {
  type: string
  source: string
  state: string | null
  createdAt: string
  payload: Prisma.JsonValue
}

let hasWarnedAboutMissingEventTable = false

function isPrismaKnownError(error: unknown): error is { code?: string; meta?: unknown } {
  return typeof error === 'object' && error !== null
}

function isMissingEventTableError(error: unknown): boolean {
  if (!isPrismaKnownError(error) || error.code !== 'P2021') {
    return false
  }

  const table = typeof error.meta === 'object' && error.meta !== null && 'table' in error.meta
    ? String(error.meta.table)
    : ''

  return table.includes('Event')
}

export async function trackEvent(input: TrackEventInput): Promise<void> {
  try {
    await prisma.event.create({
      data: {
        ...(input.userId ? { userId: input.userId } : {}),
        type: input.type,
        source: input.source,
        ...(input.state ? { state: input.state } : {}),
        ...(input.payload !== undefined ? { payload: input.payload } : {}),
      },
    })
  } catch (error) {
    if (isMissingEventTableError(error)) {
      if (!hasWarnedAboutMissingEventTable) {
        hasWarnedAboutMissingEventTable = true
        console.warn('[trackEvent] Event table is missing; skipping event writes until migration is applied')
      }
      return
    }

    console.error('[trackEvent]', error)
  }
}

export async function trackQuestionEvent(input: TrackQuestionEventInput): Promise<void> {
  await trackEvent({
    userId: input.userId,
    type: 'user_question',
    source: input.source,
    state: input.state,
    payload: {
      text: input.text,
      detectedIntent: input.detectedIntent,
      productContext: input.productContext,
      category: input.category,
    } satisfies Prisma.JsonObject,
  })
}

export async function getRecentUserEvents(userId: string, limit = 8): Promise<RecentUserEvent[]> {
  try {
    const events = await prisma.event.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      take: limit,
      select: {
        type: true,
        source: true,
        state: true,
        createdAt: true,
        payload: true,
      },
    })

    return events.map(event => ({
      type: event.type,
      source: event.source,
      state: event.state,
      createdAt: event.createdAt.toISOString(),
      payload: event.payload,
    }))
  } catch (error) {
    if (isMissingEventTableError(error)) {
      return []
    }

    throw error
  }
}
