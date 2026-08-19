import type { Prisma } from '@starway/db/prisma-client'
import { prisma } from '../../db/client.js'
import type { BehavioralAnalyticsSnapshot } from '../../modules/analytics/behavioral.js'
import type { PathRankingItem, Period, ProductIntelligenceSnapshot, RankedItem } from './productIntelligence.js'

type PeriodRange = {
  start: Date
  now: Date
}


type EventLike = {
  userId: string | null
  type: string
  state: string | null
  source: string
  payload: Prisma.JsonValue | null
  createdAt: Date
}

type RankedBucket = {
  count: number
  success: number
}

export function getPeriodRange(period: Period = '30d'): PeriodRange {
  const now = new Date()
  const days = period === '7d' ? 7 : period === '90d' ? 90 : 30
  return {
    now,
    start: new Date(now.getTime() - days * 24 * 60 * 60 * 1000),
  }
}

function isJsonObject(value: unknown): value is Prisma.JsonObject {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value)
}

function getField(payload: Prisma.JsonValue | null, key: string): unknown {
  return isJsonObject(payload) ? payload[key] : undefined
}

export function getStringField(
  payload: Prisma.JsonValue | null,
  keys: string[]
): string | null {
  for (const key of keys) {
    const value = getField(payload, key)
    if (typeof value === 'string' && value.trim()) {
      return value.trim()
    }
  }
  return null
}

function getBooleanField(
  payload: Prisma.JsonValue | null,
  keys: string[]
): boolean | null {
  for (const key of keys) {
    const value = getField(payload, key)
    if (typeof value === 'boolean') {
      return value
    }
  }
  return null
}

function getNumberField(
  payload: Prisma.JsonValue | null,
  keys: string[]
): number | null {
  for (const key of keys) {
    const value = getField(payload, key)
    if (typeof value === 'number' && Number.isFinite(value)) {
      return value
    }
  }
  return null
}

export function normalizeText(value: unknown): string | null {
  return typeof value === 'string' && value.trim() ? value.trim() : null
}

export function asNumber(value: unknown): number {
  return typeof value === 'number' && Number.isFinite(value) ? value : 0
}

function extractProductId(payload: Prisma.JsonValue | null): string | null {
  return getStringField(payload, [
    'productId',
    'product_id',
    'product',
    'productKey',
  ])
}

function matchesProductScope(
  event: EventLike,
  productId: string | null
): boolean {
  if (!productId) return true
  const payload = isJsonObject(event.payload) ? event.payload : null
  const payloadProductId = extractProductId(payload)
  const sourceProduct = getStringField(payload, [
    'source_product_id',
    'sourceProductId',
  ])
  return (
    payloadProductId === productId ||
    sourceProduct === productId ||
    event.source === productId
  )
}

function bucketSuccess(
  buckets: Map<string, RankedBucket>,
  key: string | null,
  success = false
): void {
  if (!key) return
  const entry = buckets.get(key) ?? { count: 0, success: 0 }
  entry.count += 1
  entry.success += success ? 1 : 0
  buckets.set(key, entry)
}

function rankBuckets(
  buckets: Map<string, RankedBucket>,
  limit = 10
): RankedItem[] {
  return [...buckets.entries()]
    .map(([key, value]) => ({
      key,
      count: value.count,
      success_count: value.success,
      success_rate:
        value.count > 0
          ? Math.round((value.success / value.count) * 1000) / 10
          : 0,
    }))
    .sort(
      (left, right) =>
        right.success_rate - left.success_rate || right.count - left.count
    )
    .slice(0, limit)
}

function buildPathSignature(
  events: EventLike[],
  markers: string[]
): string | null {
  const ordered = events
    .map((event) => {
      const canonical = normalizeText(
        getStringField(event.payload, ['canonical_event', 'canonicalEvent'])
      )
      return canonical ?? event.type
    })
    .filter(Boolean)

  const found: string[] = []
  let cursor = 0
  for (const marker of markers) {
    const index = ordered.findIndex(
      (value, idx) => idx >= cursor && value === marker
    )
    if (index === -1) {
      return null
    }
    found.push(marker)
    cursor = index + 1
  }

  return found.join('>')
}

export function rankPaths(
  events: EventLike[],
  templates: string[][],
  successPredicate: (events: EventLike[]) => boolean
): PathRankingItem[] {
  const perUser = new Map<string, EventLike[]>()
  for (const event of events) {
    if (!event.userId) continue
    const bucket = perUser.get(event.userId) ?? []
    bucket.push(event)
    perUser.set(event.userId, bucket)
  }

  const counts = new Map<string, RankedBucket>()
  for (const userEvents of perUser.values()) {
    for (const template of templates) {
      const signature = buildPathSignature(userEvents, template)
      if (!signature) continue
      bucketSuccess(counts, signature, successPredicate(userEvents))
    }
  }

  return rankBuckets(counts, 10).map((item) => ({
    path: item.key.split('>'),
    count: item.count,
    success_rate: item.success_rate,
  }))
}

export function buildReadinessDistribution(
  events: EventLike[]
): ProductIntelligenceSnapshot['readiness_distribution'] {
  const midpoint =
    events.length > 0
      ? (events[Math.floor(events.length / 2)]?.createdAt.getTime() ??
        Date.now())
      : Date.now()
  const buckets = { low: 0, medium: 0, high: 0 }
  const firstHalf = { low: 0, medium: 0, high: 0 }
  const secondHalf = { low: 0, medium: 0, high: 0 }

  for (const event of events) {
    const readiness = isJsonObject(event.payload)
      ? event.payload.readiness
      : null
    const level = normalizeText(
      isJsonObject(readiness) ? readiness.level : null
    )
    if (level === 'low' || level === 'medium' || level === 'high') {
      buckets[level] += 1
      if (event.createdAt.getTime() <= midpoint) {
        firstHalf[level] += 1
      } else {
        secondHalf[level] += 1
      }
    }
  }

  const firstScore = firstHalf.high * 2 + firstHalf.medium
  const secondScore = secondHalf.high * 2 + secondHalf.medium
  const trend =
    secondScore > firstScore
      ? 'up'
      : secondScore < firstScore
        ? 'down'
        : 'stable'

  return {
    ...buckets,
    trend,
  }
}

export function buildChurnSignals(
  snapshot: BehavioralAnalyticsSnapshot,
  funnelDropOffs: Array<{
    from: string
    to: string
    dropOffRate: number
    lostUsers: number
  }>
) {
  const churnRiskScore = Math.round(
    Math.min(100, asNumber(snapshot.metrics.retention_risk_score))
  )
  const topSignals: string[] = []

  if ((snapshot.retentionMarkers.abandoned_payment ?? 0) > 0)
    topSignals.push('abandoned_payment')
  if ((snapshot.retentionMarkers.missed_zoom_count ?? 0) > 0)
    topSignals.push('missed_zoom')
  if ((snapshot.retentionMarkers.no_reply_streak ?? 0) > 0)
    topSignals.push('no_reply_streak')
  if (asNumber(snapshot.metrics.payment_abandonment_rate) > 0)
    topSignals.push('payment_abandonment')

  const bottlenecks = funnelDropOffs
    .slice()
    .sort((left, right) => right.dropOffRate - left.dropOffRate)
    .slice(0, 3)
    .map((item) => `${item.from}->${item.to}`)

  return {
    churn_risk_score: churnRiskScore,
    top_signals: topSignals,
    bottlenecks,
  }
}

export function buildEffectivenessRankings(events: EventLike[]) {
  const byUser = new Map<string, EventLike[]>()
  for (const event of events) {
    if (!event.userId) continue
    const bucket = byUser.get(event.userId) ?? []
    bucket.push(event)
    byUser.set(event.userId, bucket)
  }

  const ctaBuckets = new Map<string, RankedBucket>()
  const messageBuckets = new Map<string, RankedBucket>()
  const resultBuckets = new Map<string, RankedBucket>()

  for (const userEvents of byUser.values()) {
    const sorted = userEvents
      .slice()
      .sort(
        (left, right) => left.createdAt.getTime() - right.createdAt.getTime()
      )
    const didConvert = (predicates: Array<(event: EventLike) => boolean>) =>
      predicates.some((predicate) => sorted.some(predicate))
    const lastWasRetained = sorted.some((event) => {
      const canonical =
        normalizeText(
          getStringField(event.payload, ['canonical_event', 'canonicalEvent'])
        ) ?? event.type
      return (
        canonical === 'FLOW_COMPLETED' ||
        canonical === 'payment_success' ||
        canonical === 'PAYMENT_SUCCESS' ||
        canonical === 'ZOOM_ATTENDED'
      )
    })

    for (const event of sorted) {
      const canonical =
        normalizeText(
          getStringField(event.payload, ['canonical_event', 'canonicalEvent'])
        ) ?? event.type
      if (canonical === 'CTA_CLICKED') {
        const ctaId = getStringField(event.payload, ['cta_id', 'ctaId'])
        bucketSuccess(
          ctaBuckets,
          ctaId,
          didConvert([
            (item) =>
              item.createdAt.getTime() >= event.createdAt.getTime() &&
              [
                'PAYMENT_SUCCESS',
                'payment_success',
                'ZOOM_ATTENDED',
                'FLOW_COMPLETED',
                'subscription_activated',
              ].includes(
                normalizeText(
                  getStringField(item.payload, [
                    'canonical_event',
                    'canonicalEvent',
                  ])
                ) ?? item.type
              ),
          ])
        )
      }

      if (canonical === 'MESSAGE_OPENED') {
        const messageKey = getStringField(event.payload, [
          'message_key',
          'messageKey',
        ])
        bucketSuccess(
          messageBuckets,
          messageKey,
          didConvert([
            (item) =>
              item.createdAt.getTime() >= event.createdAt.getTime() &&
              (normalizeText(
                getStringField(item.payload, ['cta_id', 'ctaId'])
              ) !== null ||
                ['CTA_CLICKED', 'FLOW_TRIGGERED', 'FLOW_COMPLETED'].includes(
                  normalizeText(
                    getStringField(item.payload, [
                      'canonical_event',
                      'canonicalEvent',
                    ])
                  ) ?? item.type
                )),
          ])
        )
      }

      if (canonical === 'TEST_COMPLETED' || canonical === 'RESULT_OPENED') {
        const resultType =
          getStringField(event.payload, ['result_type', 'resultType']) ??
          'default'
        bucketSuccess(
          resultBuckets,
          resultType,
          didConvert([
            (item) =>
              item.createdAt.getTime() >= event.createdAt.getTime() &&
              ['CTA_CLICKED', 'PAYMENT_STARTED', 'PAYMENT_SUCCESS'].includes(
                normalizeText(
                  getStringField(item.payload, [
                    'canonical_event',
                    'canonicalEvent',
                  ])
                ) ?? item.type
              ),
          ])
        )
      }
    }

    if (lastWasRetained) {
      bucketSuccess(resultBuckets, 'retained_path', true)
    }
  }

  return {
    ctaEffectiveness: rankBuckets(ctaBuckets, 10),
    messageEffectiveness: rankBuckets(messageBuckets, 10),
    resultEffectiveness: rankBuckets(resultBuckets, 10),
  }
}

export async function loadEvents(
  period: Period,
  productId: string | null
): Promise<EventLike[]> {
  const { start } = getPeriodRange(period)
  const events = await prisma.event.findMany({
    where: { createdAt: { gte: start } },
    orderBy: { createdAt: 'asc' },
    select: {
      userId: true,
      type: true,
      state: true,
      source: true,
      payload: true,
      createdAt: true,
    },
  })

  return events.filter((event) => matchesProductScope(event, productId))
}
