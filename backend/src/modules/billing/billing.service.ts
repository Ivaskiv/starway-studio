import { prisma } from '../../db/client.js'
import { processPayment } from '../subscriptions/payments/business.js'
import { verifySignature } from '../subscriptions/payments/crypto.js'
import { buildPaymentRequest } from '../subscriptions/payments/wayforpay.js'
import type { PaymentCallbackData } from '../subscriptions/types.js'

import type { BillingPlan, UserSubscription } from './subscription.entity.js'

const BILLING_CATALOG: Record<BillingPlan, { amount: number; durationDays: number; label: string }> = {
  monthly: { amount: 299, durationDays: 30, label: 'Starway Monthly' },
  yearly: { amount: 199, durationDays: 365, label: 'Starway Yearly' },
}

type BillingWebhookResult = {
  ok: boolean
  subscription?: UserSubscription
  duplicate?: boolean
}

function toSubscription(userId: string, plan: BillingPlan, expiresAt: Date): UserSubscription {
  return {
    userId,
    plan,
    isPaid: true,
    expiresAt,
    provider: 'wayforpay',
  }
}

async function hasProcessedOrderReference(orderReference: string) {
  const rows = await prisma.$queryRawUnsafe<Array<{ id: string }>>(
    'SELECT id FROM "PurchaseHistory" WHERE metadata->>\'payRef\' = $1 LIMIT 1',
    orderReference,
  )
  return rows.length > 0
}

async function storeRawWebhookEvent(input: {
  userId: string
  plan: BillingPlan
  amount: number
  orderReference: string
  payload: PaymentCallbackData
}) {
  await prisma.purchaseHistory.create({
    data: {
      userId: input.userId,
      amountCents: Math.round(input.amount * 100),
      currency: input.payload.currency ?? 'EUR',
      metadata: {
        kind: 'billing_webhook',
        provider: 'wayforpay',
        plan: input.plan,
        payRef: input.orderReference,
        payload: input.payload,
      },
    },
  })
}

export async function createPayment(userId: string, plan: BillingPlan, variant: 'A' | 'B' = 'A') {
  const selectedPlan = BILLING_CATALOG[plan]
  const orderReference = `billing_${plan}_${variant}_${userId}_${Date.now()}`
  const payment = buildPaymentRequest({
    userId,
    productId: plan,
    amount: selectedPlan.amount,
    currency: 'EUR',
    payRef: orderReference,
    product_name: [selectedPlan.label],
  })

  return {
    paymentUrl: 'https://secure.wayforpay.com/pay',
    payment,
    orderReference,
    plan,
    variant,
  }
}

export async function handleBillingWebhook(data: PaymentCallbackData): Promise<BillingWebhookResult> {
  if (!verifySignature(data)) {
    return { ok: false }
  }

  if (data.transaction_status !== 'Approved') {
    return { ok: true }
  }

  const userId = data.clientAccountId
  const plan = data.product_name?.[0] as BillingPlan | undefined
  const orderReference = data.order_reference
  const amount = Number(data.amount)

  if (!userId || !plan || !(plan in BILLING_CATALOG) || !orderReference || Number.isNaN(amount)) {
    return { ok: false }
  }

  if (await hasProcessedOrderReference(orderReference)) {
    const subscription = await prisma.subscription.findFirst({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      select: { currentPeriodEnd: true, planCode: true },
    })

    return subscription?.currentPeriodEnd
      ? {
          ok: true,
          duplicate: true,
          subscription: toSubscription(userId, plan, subscription.currentPeriodEnd),
        }
      : { ok: true, duplicate: true }
  }

  await processPayment({
    userId,
    productId: plan,
    amount,
    payRef: orderReference,
    currency: data.currency ?? 'EUR',
    product_name: data.product_name,
    product_count: data.product_count,
    product_price: data.product_price,
  })

  await storeRawWebhookEvent({
    userId,
    plan,
    amount,
    orderReference,
    payload: data,
  })

  const expiresAt = new Date(Date.now() + BILLING_CATALOG[plan].durationDays * 86400000)

  return {
    ok: true,
    subscription: toSubscription(userId, plan, expiresAt),
  }
}
