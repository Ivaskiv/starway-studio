import type { Prisma } from '@starway/db/prisma-client'
import { prisma } from '../../db/client.js'
import type { CanonicalCoachMetrics, CanonicalRevenueMetrics, InsightCount, Period, RevenueCurrencyStat, RevenueProductStat } from './types.js'
import { countDistinctUserIds, getPeriodRange, isObject, safeRate } from './shared.js'

const CANONICAL_REVENUE_CACHE_TTL_MS = 30_000
const canonicalRevenueCache = new Map<string, { expiresAt: number; promise: Promise<CanonicalRevenueMetrics> }>()

function cleanupCanonicalRevenueCache(nowTs = Date.now()): void {
  for (const [key, entry] of canonicalRevenueCache.entries()) {
    if (entry.expiresAt <= nowTs) {
      canonicalRevenueCache.delete(key)
    }
  }
}

function resolveRevenueCacheKey(input?: Period | { start: Date; end: Date }): string {
  if (!input) return 'period:30d'
  if (typeof input === 'string') return `period:${input}`
  return `range:${input.start.toISOString()}|${input.end.toISOString()}`
}

function getStringField(payload: Prisma.JsonValue | null, key: string): string | null {
  if (!isObject(payload)) {
    return null
  }

  const value = payload[key]
  return typeof value === 'string' ? value : null
}

function getTrackingPayload(payload: Prisma.JsonValue | null): Prisma.JsonObject | null {
  if (!isObject(payload)) {
    return null
  }

  const tracking = 'tracking' in payload ? payload.tracking : null
  return isObject(tracking ?? null) ? (tracking as Prisma.JsonObject) : null
}

function getTrackingIdentity(payload: Prisma.JsonValue | null): string | null {
  const tracking = getTrackingPayload(payload)
  const directEmail = getStringField(payload, 'email')
  const trackingEmail = tracking ? getStringField(tracking as Prisma.JsonValue, 'email') : null
  const identity = String(directEmail ?? trackingEmail ?? '').trim().toLowerCase()
  return identity || null
}

function getDistinctUserCount(values: Array<string | null | undefined>): number {
  return new Set(values.filter((value): value is string => Boolean(value))).size
}

function normalizePaymentReference(value: unknown): string | null {
  const reference = String(value ?? '').trim()
  return reference || null
}

function extractPaymentReference(payload: Prisma.JsonValue | null): string | null {
  if (!isObject(payload)) {
    return null
  }

  return normalizePaymentReference(
    payload.payRef
    ?? payload.orderReference
    ?? payload.order_reference
    ?? payload.paymentId
    ?? payload.payment_id
    ?? payload.transactionId
    ?? payload.transaction_id
  )
}

function extractRevenueKind(metadata: Prisma.JsonValue | null): string | null {
  if (!isObject(metadata)) {
    return null
  }

  const value = metadata.kind ?? metadata.scope ?? metadata.type
  return typeof value === 'string' ? value.trim().toLowerCase() || null : null
}

function extractRevenueProductCode(row: {
  productId: string | null
  product?: { code: string; name: string } | null
  metadata: Prisma.JsonValue | null
}): string {
  if (row.product?.code) {
    return row.product.code
  }

  if (row.productId) {
    return row.productId
  }

  if (isObject(row.metadata)) {
    const candidate = row.metadata.productId ?? row.metadata.planCode ?? row.metadata.productCode ?? row.metadata.product_code
    if (typeof candidate === 'string' && candidate.trim()) {
      return candidate.trim()
    }
  }

  return 'unknown'
}

function extractRevenueProductName(row: {
  productId: string | null
  product?: { code: string; name: string } | null
  metadata: Prisma.JsonValue | null
}): string {
  if (row.product?.name) {
    return row.product.name
  }

  const code = extractRevenueProductCode(row)
  return code === 'unknown' ? 'Unknown product' : code
}

function extractRevenueAmountCents(value: Prisma.JsonValue | null): number | null {
  if (!isObject(value)) {
    return null
  }

  if (typeof value.amountCents === 'number' && Number.isFinite(value.amountCents)) {
    return Math.round(value.amountCents)
  }

  if (typeof value.amount === 'number' && Number.isFinite(value.amount)) {
    return Math.round(value.amount * 100)
  }

  return null
}

function isRecurringRevenueKind(kind: string | null): boolean {
  if (!kind) {
    return false
  }

  return kind.includes('subscription') || kind.includes('renewal')
}

const RECURRING_REVENUE_PRODUCT_CODES = new Set([
  'focus',
  'stankey',
  'absystem',
  'absystem_ai',
])

function getRecurringFamilyKey(row: {
  userId: string
  productId: string | null
  product?: { code: string; name: string } | null
  metadata: Prisma.JsonValue | null
}): string | null {
  if (!isObject(row.metadata)) {
    return null
  }

  const kind = extractRevenueKind(row.metadata)
  const productCode = extractRevenueProductCode(row)
  const planCode = typeof row.metadata.planCode === 'string' ? row.metadata.planCode.trim() : ''
  const paymentProduct = typeof row.metadata.productId === 'string' ? row.metadata.productId.trim() : ''
  const normalizedProductCode = productCode.trim().toLowerCase()

  if (!isRecurringRevenueKind(kind) && !planCode && !paymentProduct && !RECURRING_REVENUE_PRODUCT_CODES.has(normalizedProductCode)) {
    return null
  }

  const family = planCode || paymentProduct || (RECURRING_REVENUE_PRODUCT_CODES.has(normalizedProductCode) ? normalizedProductCode : '') || kind || 'subscription'
  return `${row.userId}:${family}`
}

function isBetterRevenueRow(
  candidate: {
    amountCents: number
    kind: string | null
    createdAt: Date
    source: 'purchaseHistory' | 'paymentEvent'
  },
  current: {
    amountCents: number
    kind: string | null
    createdAt: Date
    source: 'purchaseHistory' | 'paymentEvent'
  } | null,
): boolean {
  if (!current) {
    return true
  }

  const candidatePriority = candidate.source === 'purchaseHistory' ? 2 : 1
  const currentPriority = current.source === 'purchaseHistory' ? 2 : 1
  if (candidatePriority !== currentPriority) {
    return candidatePriority > currentPriority
  }

  const candidateIsBillingWebhook = candidate.kind === 'billing_webhook'
  const currentIsBillingWebhook = current.kind === 'billing_webhook'
  if (candidateIsBillingWebhook !== currentIsBillingWebhook) {
    return !candidateIsBillingWebhook
  }

  if (candidate.amountCents !== current.amountCents) {
    return candidate.amountCents > current.amountCents
  }

  return candidate.createdAt > current.createdAt
}

export async function getCanonicalRevenueMetrics(
  input?: Period | { start: Date; end: Date },
): Promise<CanonicalRevenueMetrics> {
  const cacheKey = resolveRevenueCacheKey(input)
  const nowTs = Date.now()
  cleanupCanonicalRevenueCache(nowTs)
  const cached = canonicalRevenueCache.get(cacheKey)
  if (cached && cached.expiresAt > nowTs) {
    return cached.promise
  }
  if (cached) {
    canonicalRevenueCache.delete(cacheKey)
  }

  const { start, now: end } = input
    ? typeof input === 'string'
      ? getPeriodRange(input)
      : { start: input.start, now: input.end }
      : getPeriodRange('30d')

  const promise = (async (): Promise<CanonicalRevenueMetrics> => {
    const [purchaseRows, successEvents] = await Promise.all([
      prisma.purchaseHistory.findMany({
        where: {
          createdAt: { gte: start, lte: end },
          amountCents: { gt: 0 },
          user: { deletedAt: null },
        },
        select: {
          id: true,
          userId: true,
          productId: true,
          amountCents: true,
          currency: true,
          createdAt: true,
          metadata: true,
          product: {
            select: {
              code: true,
              name: true,
            },
          },
        },
      }),
      prisma.event.findMany({
        where: {
          createdAt: { gte: start, lte: end },
          type: { in: ['payment_success', 'subscription_activated'] },
        },
        select: {
          userId: true,
          type: true,
          createdAt: true,
          payload: true,
        },
      }),
    ])

    const revenueLedger = new Map<string, {
      userId: string
      amountCents: number
      currency: string
      productCode: string
      productName: string
      kind: string | null
      createdAt: Date
      source: 'purchaseHistory' | 'paymentEvent'
    }>()
    const successfulEventKeys = new Set<string>()

    for (const event of successEvents) {
      const paymentRef = extractPaymentReference(event.payload)
      if (paymentRef) {
        successfulEventKeys.add(paymentRef)
      }

      const amountCents = extractRevenueAmountCents(event.payload)
      const userId = event.userId ?? null
      if (!paymentRef || !userId || !amountCents || amountCents <= 0) {
        continue
      }

      const currency = isObject(event.payload) && typeof event.payload.currency === 'string'
        ? event.payload.currency.trim() || 'EUR'
        : 'EUR'
      const productCode = isObject(event.payload)
        ? normalizePaymentReference(event.payload.productId ?? event.payload.planId ?? event.payload.productCode ?? event.payload.scope) ?? 'unknown'
        : 'unknown'
      const kind = event.type.toLowerCase()

      const candidate = {
        userId,
        amountCents,
        currency,
        productCode,
        productName: productCode === 'unknown' ? 'Unknown product' : productCode,
        kind,
        createdAt: event.createdAt,
        source: 'paymentEvent' as const,
      }

      const current = revenueLedger.get(paymentRef) ?? null
      if (isBetterRevenueRow(candidate, current)) {
        revenueLedger.set(paymentRef, candidate)
      }
    }

    for (const row of purchaseRows) {
      const metadata = isObject(row.metadata) ? row.metadata : null
      const paymentRef = normalizePaymentReference(
        metadata?.payRef
        ?? metadata?.orderReference
        ?? metadata?.order_reference
        ?? metadata?.paymentId
        ?? metadata?.payment_id
        ?? metadata?.transactionId
        ?? metadata?.transaction_id
      ) ?? `purchase:${row.id}`

      const candidate = {
        userId: row.userId,
        amountCents: row.amountCents,
        currency: row.currency,
        productCode: extractRevenueProductCode(row),
        productName: extractRevenueProductName(row),
        kind: extractRevenueKind(metadata),
        createdAt: row.createdAt,
        source: 'purchaseHistory' as const,
      }

      const current = revenueLedger.get(paymentRef) ?? null
      if (isBetterRevenueRow(candidate, current)) {
        revenueLedger.set(paymentRef, candidate)
      }
    }

    const ledger = [...revenueLedger.entries()]
      .map(([paymentRef, entry]) => ({ paymentRef, ...entry }))
      .filter((entry) => entry.amountCents > 0)

    const revenueCents = ledger.reduce((sum, entry) => sum + entry.amountCents, 0)
    const paymentCount = ledger.length
    const paidUsers = getDistinctUserCount(ledger.map((entry) => entry.userId))

    const revenueByCurrencyMap = new Map<string, RevenueCurrencyStat>()
    const revenueByProductMap = new Map<string, RevenueProductStat>()
    const paidUsersByProductMap = new Map<string, Set<string>>()
    const familyCountMap = new Map<string, number>()
    const recurringFamilyLatestMap = new Map<string, { amountCents: number; createdAt: Date }>()

    for (const entry of ledger) {
      const currencyBucket = revenueByCurrencyMap.get(entry.currency) ?? {
        currency: entry.currency,
        count: 0,
        sumCents: 0,
      }
      currencyBucket.count += 1
      currencyBucket.sumCents += entry.amountCents
      revenueByCurrencyMap.set(entry.currency, currencyBucket)

      const productKey = `${entry.productCode}:${entry.currency}`
      const productBucket = revenueByProductMap.get(productKey) ?? {
        code: entry.productCode,
        name: entry.productName,
        currency: entry.currency,
        count: 0,
        sumCents: 0,
      }
      productBucket.count += 1
      productBucket.sumCents += entry.amountCents
      revenueByProductMap.set(productKey, productBucket)

      const normalizedProductCode = entry.productCode.trim().toLowerCase()
      const usersBucket = paidUsersByProductMap.get(normalizedProductCode) ?? new Set<string>()
      usersBucket.add(entry.userId)
      paidUsersByProductMap.set(normalizedProductCode, usersBucket)

      const familyKey = getRecurringFamilyKey({
        userId: entry.userId,
        productId: null,
        product: null,
        metadata: {
          kind: entry.kind ?? '',
          productId: RECURRING_REVENUE_PRODUCT_CODES.has(normalizedProductCode) ? entry.productCode : null,
          planCode: RECURRING_REVENUE_PRODUCT_CODES.has(normalizedProductCode) ? entry.productCode : null,
        } as Prisma.JsonObject,
      })

      if (familyKey) {
        familyCountMap.set(familyKey, (familyCountMap.get(familyKey) ?? 0) + 1)
        const currentLatest = recurringFamilyLatestMap.get(familyKey)
        if (!currentLatest || entry.createdAt > currentLatest.createdAt) {
          recurringFamilyLatestMap.set(familyKey, {
            amountCents: entry.amountCents,
            createdAt: entry.createdAt,
          })
        }
      }
    }

    const renewals = [...familyCountMap.values()].reduce((sum, count) => sum + Math.max(0, count - 1), 0)
    const mrrCents = [...recurringFamilyLatestMap.values()].reduce((sum, value) => sum + value.amountCents, 0)
    const arpuCents = paidUsers > 0 ? Math.round(revenueCents / paidUsers) : 0
    const successfulPaymentEvents = successEvents.length
    const matchedPaymentEvents = [...successfulEventKeys].filter((paymentRef) => revenueLedger.has(paymentRef)).length

    return {
      periodStart: start,
      periodEnd: end,
      revenueCents,
      paymentCount,
      paidUsers,
      paidUsersByProduct: [...paidUsersByProductMap.entries()]
        .map(([code, users]) => ({ code, users: users.size }))
        .sort((left, right) => right.users - left.users || left.code.localeCompare(right.code)),
      renewals,
      mrrCents,
      arpuCents,
      revenueByCurrency: [...revenueByCurrencyMap.values()].sort((left, right) => right.sumCents - left.sumCents),
      revenueByProduct: [...revenueByProductMap.values()].sort((left, right) => right.sumCents - left.sumCents),
      successfulPaymentEvents,
      matchedPaymentEvents,
      unmatchedPaymentEvents: Math.max(0, successfulPaymentEvents - matchedPaymentEvents),
    }
  })()

  canonicalRevenueCache.set(cacheKey, {
    expiresAt: nowTs + CANONICAL_REVENUE_CACHE_TTL_MS,
    promise,
  })

  try {
    return await promise
  } catch (error) {
    const current = canonicalRevenueCache.get(cacheKey)
    if (current?.promise === promise) {
      canonicalRevenueCache.delete(cacheKey)
    }
    throw error
  }
}

export async function getCanonicalCoachMetrics(): Promise<CanonicalCoachMetrics> {
  const revenue = await getCanonicalRevenueMetrics()
  const [
    totalUsers,
    testInProgress,
    testCompleted,
    activePaidSubscriptions,
    zoomAttendees,
  ] = await Promise.all([
    prisma.user.count({
      where: { deletedAt: null },
    }),
    prisma.user.count({
      where: {
        deletedAt: null,
        testStartedAt: { not: null },
        testCompletedAt: null,
      },
    }),
    prisma.user.count({
      where: {
        deletedAt: null,
        testCompletedAt: { not: null },
      },
    }),
    prisma.productSubscription.findMany({
      where: {
        status: { equals: 'active', mode: 'insensitive' },
        paidAt: { not: null },
        product: {
          code: {
            in: ['focus', 'absystem', 'absystem_ai'],
          },
        },
      },
      select: {
        userId: true,
        product: {
          select: {
            code: true,
          },
        },
      },
    }),
    prisma.zoomSessionAttendee.findMany({
      where: {
        attended: true,
        user: {
          deletedAt: null,
        },
      },
      select: {
        userId: true,
      },
    }),
  ])

  const focusPaid = countDistinctUserIds(activePaidSubscriptions.filter((row) => row.product.code.toLowerCase() === 'focus'))
  const activeZoomUsers = countDistinctUserIds(zoomAttendees)
  const abSystemUpgrades = countDistinctUserIds(activePaidSubscriptions.filter((row) => {
    const code = row.product.code.toLowerCase()
    return code === 'absystem' || code === 'absystem_ai'
  }))
  const revenueCents = revenue.revenueCents
  const mrr = revenue.mrrCents / 100

  return {
    totalUsers,
    testInProgress,
    testCompleted,
    focusPaid,
    activeZoomUsers,
    testToFocusConversion: safeRate(focusPaid, testCompleted),
    abSystemUpgrades,
    revenueCents,
    mrr,
  }
}
