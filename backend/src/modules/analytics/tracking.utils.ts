import type { Prisma } from '@starway/db/prisma-client'
import { isObject } from './shared.js'

export function getStringField(payload: Prisma.JsonValue | null, key: string): string | null {
  if (!isObject(payload)) {
    return null
  }

  const value = payload[key]
  return typeof value === 'string' ? value : null
}

export function getTrackingPayload(payload: Prisma.JsonValue | null): Prisma.JsonObject | null {
  if (!isObject(payload)) {
    return null
  }

  const tracking = 'tracking' in payload ? payload.tracking : null
  return isObject(tracking ?? null) ? (tracking as Prisma.JsonObject) : null
}

export function getTrackingIdentity(payload: Prisma.JsonValue | null): string | null {
  const tracking = getTrackingPayload(payload)
  const directEmail = getStringField(payload, 'email')
  const trackingEmail = tracking ? getStringField(tracking as Prisma.JsonValue, 'email') : null
  const identity = String(directEmail ?? trackingEmail ?? '').trim().toLowerCase()
  return identity || null
}

export function getDistinctUserCount(values: Array<string | null | undefined>): number {
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
