//backend/src/modules/subscriptions/payments/wayforpay.checkout.ts
import { stankeyManifest } from '@/products/stankey/product.manifest.js'
import type { Prisma } from '@starway/db/prisma-client'
import { randomUUID } from 'node:crypto'
import { prisma } from '../../../../db/client.js'
import { getWayForPayCallbackUrl } from '../callback-url.js'
import { buildPaymentRequest } from './service.js'
import { buildWayForPayReturnUrl } from '../business/checkout.js'

export type StankeyPlanId = (typeof stankeyManifest.pricing.plans)[number]['id']

export type StankeyCheckoutInput = {
  user: {
    id: string
    email?: string | null
  }
  product?: {
    id?: string
    title?: string
  }
  plan: StankeyPlanId
}

export type StankeyCheckoutPayload = {
  merchantAccount: string
  orderReference: string
  amount: number
  currency: string
  productName: string[]
  signature: string | null
  returnUrl: string | null
  serviceUrl: string | null
}

export type StankeyCheckoutResult = {
  checkoutUrl: string
  formHtml: null
  orderReference: string
  productId: string
  planId: StankeyPlanId
  amount: number
  currency: string
  payment: Record<string, unknown>
  payload: StankeyCheckoutPayload
}

const CHECKOUT_URL = 'https://secure.wayforpay.com/pay'

function getPlan(planId: StankeyPlanId) {
  return stankeyManifest.pricing.plans.find(plan => plan.id === planId) ?? null
}

function getFrontendBaseUrl() {
  return (
    process.env.TELEGRAM_PUBLIC_FRONTEND_URL?.trim()
    || process.env.PUBLIC_FRONTEND_URL?.trim()
    || process.env.MINIAPP_URL?.trim()
    || process.env.FRONTEND_URL?.trim()
    || null
  )?.replace(/\/$/, '') ?? null
}

function getBackendBaseUrl() {
  return (
    process.env.PUBLIC_API_URL?.trim()
    || process.env.APP_URL?.trim()
    || process.env.TELEGRAM_WEBHOOK_URL?.trim()
    || process.env.INTERNAL_API_URL?.trim()?.replace(/\/api$/, '')
    || (process.env.PORT ? `http://127.0.0.1:${process.env.PORT}` : 'http://127.0.0.1:3001')
  ).replace(/\/$/, '')
}

export function encodeCheckoutPayload(payload: Record<string, unknown>) {
  return Buffer.from(JSON.stringify(payload), 'utf8').toString('base64url')
}

export async function buildShortWayForPayCheckoutUrl(
  backendBaseUrl: string,
  payload: Record<string, unknown>,
  query?: Record<string, string>,
) {
  const token = randomUUID().replace(/-/g, '')
  const encodedPayload = encodeCheckoutPayload(payload)
  await saveCheckoutSession(token, encodedPayload)

  // FIX 2026-05-25 UX1: keep Telegram URL short (tokenized link only, no payload blob in query).
  const params = new URLSearchParams(query)
  const queryString = params.toString()
  return `${backendBaseUrl.replace(/\/$/, '')}/api/payments/wayforpay/checkout/${token}${queryString ? `?${queryString}` : ''}`
}

// Legacy sync helper for flows that cannot await during render composition.
// Persists token asynchronously; strict runtime flows should prefer async helper above.
export function buildShortWayForPayCheckoutUrlSync(
  backendBaseUrl: string,
  payload: Record<string, unknown>,
  query?: Record<string, string>,
) {
  const token = randomUUID().replace(/-/g, '')
  const encodedPayload = encodeCheckoutPayload(payload)
  void saveCheckoutSession(token, encodedPayload).catch((error) => {
    console.error('[CHECKOUT_TRACE] async_persist_failed', {
      token,
      reason: error instanceof Error ? error.message : String(error),
    })
  })
  // FIX 2026-05-25 UX2: keep legacy sync checkout URL short for Telegram dialogs.
  const params = new URLSearchParams(query)
  const queryString = params.toString()
  return `${backendBaseUrl.replace(/\/$/, '')}/api/payments/wayforpay/checkout/${token}${queryString ? `?${queryString}` : ''}`
}

export function buildStankeyOrderReference(userId: string, planId: StankeyPlanId) {
  return `${stankeyManifest.productId}_${planId}_${userId}_${Date.now()}`
}

export function parseStankeyOrderReference(orderReference: string): {
  productId: string
  planId: StankeyPlanId
  userId: string
} | null {
  const match = orderReference.match(/^([a-z0-9_-]+)_([a-z0-9_-]+)_([a-z0-9-]+)_\d+$/i)
  if (!match) {
    return null
  }

  const [, productId, planId, userId] = match
  if (productId !== stankeyManifest.productId) {
    return null
  }

  if (!getPlan(planId as StankeyPlanId)) {
    return null
  }

  return {
    productId,
    planId: planId as StankeyPlanId,
    userId,
  }
}

export async function createWayForPayCheckout(input: StankeyCheckoutInput): Promise<StankeyCheckoutResult> {
  const plan = getPlan(input.plan)
  if (!plan) {
    throw new Error('invalid_stankey_plan')
  }

  const orderReference = buildStankeyOrderReference(input.user.id, plan.id)
  const frontendBaseUrl = getFrontendBaseUrl()
  const returnUrl = frontendBaseUrl
    ? `${frontendBaseUrl}/miniapp?startapp=billing-success`
    : null

  let serviceUrl: string | null
  try {
    serviceUrl = getWayForPayCallbackUrl()
  } catch {
    serviceUrl = null
  }

  const payment = buildPaymentRequest({
    userId: input.user.id,
    productId: `${stankeyManifest.productId}:${plan.id}`,
    amount: plan.price,
    currency: stankeyManifest.pricing.currency,
    payRef: orderReference,
    product_name: [`${stankeyManifest.title} — ${plan.title}`],
    product_count: [1],
    product_price: [plan.price],
  })
  payment.returnUrl = buildWayForPayReturnUrl(getBackendBaseUrl(), frontendBaseUrl ?? undefined)

  const checkoutUrl = await buildShortWayForPayCheckoutUrl(getBackendBaseUrl(), payment)

  return {
    checkoutUrl,
    formHtml: null,
    orderReference,
    productId: stankeyManifest.productId,
    planId: plan.id,
    amount: plan.price,
    currency: stankeyManifest.pricing.currency,
    payment,
    payload: {
      merchantAccount: String(payment.merchantAccount ?? ''),
      orderReference,
      amount: plan.price,
      currency: stankeyManifest.pricing.currency,
      productName: [`${stankeyManifest.title} — ${plan.title}`],
      signature: typeof payment.merchantSignature === 'string' ? payment.merchantSignature : null,
      returnUrl,
      serviceUrl,
    },
  }
}
// FIX(18.05.2026): controller aligned with linear payment flow — Codex

const CHECKOUT_SESSION_TTL_MS =
  process.env.NODE_ENV === 'production' ? 15 * 60 * 1000 : 30 * 60 * 1000

function resolveSessionMetadata(payload: Record<string, unknown>) {
  const orderReference = String(payload.orderReference ?? '').trim()
  const amount = Number(payload.amount ?? 0)
  const currency = String(payload.currency ?? 'UAH').trim() || 'UAH'
  const productName = Array.isArray(payload.productName) ? String(payload.productName[0] ?? '') : ''
  const normalizedProductName = productName.toLowerCase()
  const productCode =
    normalizedProductName.includes('пробний zoom') || orderReference.startsWith('trial_zoom_')
      ? 'trial_zoom'
      : normalizedProductName.includes('focus')
        ? 'focus'
        : 'absystem_ai'
  const orderUserMatch = orderReference.match(/^[a-z0-9_-]+_[a-z0-9_-]+_([a-z0-9-]+)_\d+/i)
  const userId = String(payload.clientAccountId ?? orderUserMatch?.[1] ?? '').trim()
  return {
    orderReference,
    amount,
    currency,
    productCode,
    userId,
  }
}

export async function saveCheckoutSession(
  token: string,
  payload: string,
) {
  const decoded = JSON.parse(Buffer.from(payload, 'base64url').toString('utf8')) as Record<string, unknown>
  const meta = resolveSessionMetadata(decoded)
  if (!meta.userId || !meta.orderReference || !Number.isFinite(meta.amount) || meta.amount <= 0) {
    throw new Error('CHECKOUT_SESSION_INVALID_PAYLOAD')
  }
  const expiresAt = new Date(Date.now() + CHECKOUT_SESSION_TTL_MS)
  await prisma.checkoutSession.upsert({
    where: { token },
    update: {
      payload: decoded as Prisma.InputJsonValue,
      orderReference: meta.orderReference,
      amount: meta.amount,
      currency: meta.currency,
      productCode: meta.productCode,
      userId: meta.userId,
      status: 'CREATED',
      expiresAt,
      invalidatedAt: null,
    },
    create: {
      token,
      payload: decoded as Prisma.InputJsonValue,
      orderReference: meta.orderReference,
      amount: meta.amount,
      currency: meta.currency,
      productCode: meta.productCode,
      userId: meta.userId,
      status: 'CREATED',
      expiresAt,
    },
  })
}

export async function getCheckoutSession(token: string) {
  const session = await prisma.checkoutSession.findUnique({
    where: { token },
    select: {
      payload: true,
      status: true,
      createdAt: true,
      openedAt: true,
      completedAt: true,
      expiresAt: true,
      invalidatedAt: true,
      usageCount: true,
      lastOpenedAt: true,
    },
  })
  if (!session) return null
  const now = new Date()
  if (session.expiresAt <= now) {
    await prisma.checkoutSession.update({
      where: { token },
      data: {
        status: 'EXPIRED',
        invalidatedAt: session.invalidatedAt ?? now,
      },
    }).catch(() => undefined)
    return null
  }

  if (session.status === 'INVALIDATED' || session.status === 'COMPLETED' || session.status === 'EXPIRED') {
    return null
  }

  await prisma.checkoutSession.update({
    where: { token },
    data: {
      status: session.status === 'CREATED' ? 'OPENED' : session.status,
      openedAt: session.openedAt ?? now,
      usageCount: { increment: 1 },
      lastOpenedAt: now,
    },
  })

  const openDelayMs = now.getTime() - session.createdAt.getTime()
  console.log('[CHECKOUT_TRACE]', {
    token,
    status: session.status,
    usageCount: session.usageCount + 1,
    createdAt: session.createdAt.toISOString(),
    openedAt: session.openedAt?.toISOString() ?? now.toISOString(),
    completedAt: session.completedAt?.toISOString() ?? null,
    expiresAt: session.expiresAt.toISOString(),
    invalidatedAt: session.invalidatedAt?.toISOString() ?? null,
    openDelayMs,
    paymentDelayMs: null,
  })

  return Buffer.from(JSON.stringify(session.payload), 'utf8').toString('base64url')
}

export async function refreshCheckoutSessionPayload(
  token: string,
  payload: Record<string, unknown>,
) {
  const meta = resolveSessionMetadata(payload)
  if (!meta.userId || !meta.orderReference || !Number.isFinite(meta.amount) || meta.amount <= 0) {
    throw new Error('CHECKOUT_SESSION_INVALID_PAYLOAD')
  }

  await prisma.checkoutSession.update({
    where: { token },
    data: {
      payload: payload as Prisma.InputJsonValue,
      orderReference: meta.orderReference,
      amount: meta.amount,
      currency: meta.currency,
      productCode: meta.productCode,
      userId: meta.userId,
    },
  })
}

export async function deleteCheckoutSession(token: string) {
  await prisma.checkoutSession.update({
    where: { token },
    data: {
      status: 'INVALIDATED',
      invalidatedAt: new Date(),
    },
  }).catch(() => undefined)
}

export async function markCheckoutSessionCompleted(
  orderReference: string,
  tx?: Prisma.TransactionClient // fix with kimi 2026-05-28: optional tx for atomic post-payment orchestration
) {
  const client = tx ?? prisma
  const now = new Date()
  const session = await client.checkoutSession.findFirst({
    where: {
      orderReference,
      status: { in: ['CREATED', 'OPENED', 'PROCESSING'] },
    },
    orderBy: { createdAt: 'desc' },
    select: {
      token: true,
      createdAt: true,
      openedAt: true,
      usageCount: true,
      expiresAt: true,
      invalidatedAt: true,
    },
  })
  if (!session) return
  await client.checkoutSession.update({
    where: { token: session.token },
    data: {
      status: 'COMPLETED',
      completedAt: now,
      invalidatedAt: now,
    },
  })
  const paymentDelayMs = now.getTime() - (session.openedAt?.getTime() ?? session.createdAt.getTime())
  console.log('[CHECKOUT_TRACE]', {
    token: session.token,
    status: 'COMPLETED',
    usageCount: session.usageCount,
    createdAt: session.createdAt.toISOString(),
    openedAt: session.openedAt?.toISOString() ?? null,
    completedAt: now.toISOString(),
    expiresAt: session.expiresAt.toISOString(),
    invalidatedAt: now.toISOString(),
    openDelayMs: session.openedAt ? session.openedAt.getTime() - session.createdAt.getTime() : null,
    paymentDelayMs,
  })
}

export async function markCheckoutSessionProcessing(
  orderReference: string,
  tx?: Prisma.TransactionClient // fix with kimi 2026-05-28: optional tx for atomic post-payment orchestration
) {
  const client = tx ?? prisma
  const now = new Date()
  await client.checkoutSession.updateMany({
    where: {
      orderReference,
      status: { in: ['CREATED', 'OPENED'] },
      completedAt: null,
      invalidatedAt: null,
    },
    data: {
      status: 'PROCESSING',
    },
  })
  const session = await client.checkoutSession.findFirst({
    where: { orderReference },
    orderBy: { createdAt: 'desc' },
    select: {
      token: true,
      status: true,
      usageCount: true,
      createdAt: true,
      openedAt: true,
      completedAt: true,
      expiresAt: true,
      invalidatedAt: true,
    },
  })
  if (!session) return
  console.log('[CHECKOUT_TRACE]', {
    token: session.token,
    status: 'PROCESSING',
    usageCount: session.usageCount,
    createdAt: session.createdAt.toISOString(),
    openedAt: session.openedAt?.toISOString() ?? null,
    completedAt: session.completedAt?.toISOString() ?? null,
    expiresAt: session.expiresAt.toISOString(),
    invalidatedAt: session.invalidatedAt?.toISOString() ?? null,
    openDelayMs: session.openedAt ? session.openedAt.getTime() - session.createdAt.getTime() : null,
    paymentDelayMs: session.openedAt ? now.getTime() - session.openedAt.getTime() : null,
  })
}
