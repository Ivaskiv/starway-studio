//backend/src/modules/subscriptions/payments/wayforpay.checkout.ts
import { stankeyManifest } from '@/products/stankey/product.manifest.js'
import { randomUUID } from 'node:crypto'
import { getWayForPayCallbackUrl } from './callbackUrl.js'
import { buildPaymentRequest } from './wayforpay.js'

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

export function buildShortWayForPayCheckoutUrl(
  backendBaseUrl: string,
  payload: Record<string, unknown>,
  query?: Record<string, string>
) {
  const token = randomUUID().replace(/-/g, '')
  saveCheckoutSession(token, encodeCheckoutPayload(payload))

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

export function createWayForPayCheckout(input: StankeyCheckoutInput): StankeyCheckoutResult {
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

  const checkoutUrl = buildShortWayForPayCheckoutUrl(getBackendBaseUrl(), payment)

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

const CHECKOUT_SESSION_TTL_MS = 30 * 60 * 1000
const checkoutSessions = new Map<string, { payload: string; expiresAt: number }>()
const MAX_CHECKOUT_SESSIONS = 200

function pruneCheckoutSessions() {
  const now = Date.now()

  for (const [key, value] of checkoutSessions.entries()) {
    if (value.expiresAt <= now) {
      checkoutSessions.delete(key)
    }
  }

  while (checkoutSessions.size > MAX_CHECKOUT_SESSIONS) {
    const oldestKey = checkoutSessions.keys().next().value
    if (!oldestKey) return
    checkoutSessions.delete(oldestKey)
  }
}

export function saveCheckoutSession(
  token: string,
  payload: string,
) {
  pruneCheckoutSessions()
  checkoutSessions.set(token, {
    payload,
    expiresAt: Date.now() + CHECKOUT_SESSION_TTL_MS,
  })
}

export function getCheckoutSession(token: string) {
  pruneCheckoutSessions()
  const session = checkoutSessions.get(token)
  if (!session) return null

  if (session.expiresAt <= Date.now()) {
    checkoutSessions.delete(token)
    return null
  }

  return session.payload
}

export function deleteCheckoutSession(token: string) {
  checkoutSessions.delete(token)
}
