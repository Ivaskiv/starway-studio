import type { Prisma } from '@starway/db/prisma-client'
import { prisma } from '../../db/client.js'

export type EventSource = 'telegram' | 'web' | 'miniapp'

export interface TrackEventInput {
  userId?: string | null
  type: string
  source: EventSource
  state?: string | null
  payload?: Prisma.InputJsonValue
  email?: string | null
  utmSource?: string | null
  utmCampaign?: string | null
  productId?: string | null
  upsertUser?: boolean
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

function normalizeEmail(value: string | null | undefined): string | null {
  const email = String(value ?? '').trim().toLowerCase()
  return email || null
}

function buildTrackingPayload(input: TrackEventInput): Prisma.InputJsonValue | undefined {
  const tracking: Prisma.JsonObject = {
    ...(input.email ? { email: normalizeEmail(input.email) } : {}),
    ...(input.utmSource ? { utmSource: input.utmSource } : {}),
    ...(input.utmCampaign ? { utmCampaign: input.utmCampaign } : {}),
    ...(input.productId ? { productId: input.productId } : {}),
  }

  const hasTrackingFields = Object.keys(tracking).length > 0

  if (!hasTrackingFields && input.payload === undefined) {
    return undefined
  }

  const payload = typeof input.payload === 'object' && input.payload !== null && !Array.isArray(input.payload)
    ? { ...(input.payload as Prisma.JsonObject) }
    : {}

  if (hasTrackingFields) {
    payload.tracking = tracking
  }

  return payload as Prisma.InputJsonValue
}

async function resolveTrackingUserId(input: TrackEventInput): Promise<string | null> {
  if (input.userId) return input.userId

  const normalizedEmail = normalizeEmail(input.email)
  if (!normalizedEmail || !input.upsertUser) return null

  const existing = await prisma.user.findUnique({
    where: { email: normalizedEmail },
    select: { id: true },
  }).catch(() => null)

  if (existing?.id) {
    return existing.id
  }

  const created = await prisma.user.create({
    data: {
      email: normalizedEmail,
      name: normalizedEmail.split('@')[0] || 'Lead user',
      passwordHash: `lead-${Date.now().toString(36)}`,
      onboardingStage: 'lead_magnet',
      settings: {
        tracking: {
          utmSource: input.utmSource ?? null,
          utmCampaign: input.utmCampaign ?? null,
          productId: input.productId ?? null,
        },
      },
    },
    select: { id: true },
  }).catch(() => null)

  return created?.id ?? null
}

export async function trackLeadEnteredApp(input: TrackEventInput): Promise<void> {
  const userId = await resolveTrackingUserId({ ...input, upsertUser: true })
  await trackEvent({
    ...input,
    userId,
    type: 'lead_entered_app',
  })
}

export async function trackEvent(input: TrackEventInput): Promise<void> {
  try {
    const payload = buildTrackingPayload(input)
    await prisma.event.create({
      data: {
        ...(input.userId ? { userId: input.userId } : {}),
        type: input.type,
        source: input.source,
        ...(input.state ? { state: input.state } : {}),
        ...(payload !== undefined ? { payload } : {}),
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
