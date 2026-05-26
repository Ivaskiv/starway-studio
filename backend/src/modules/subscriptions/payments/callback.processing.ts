import { findByAmount } from '@/lib/payments/registry.js'
import type { PaymentCallbackData } from '../types.js'
import { prisma } from '../../../db/client.js'
import { ensureUserExpertId } from '../../ai-mentor/helpers.js'
import {
  processEcosystemPayment,
  processPayment,
} from './business.js'
import { resolveWebhookPaymentTarget } from './callback.targets.js'
import type { ProcessPaymentWebhookResult } from './callback.types.js'

function extractUuidUserIdFromPayRef(payRef: string): string | null {
  const parts = String(payRef ?? '').trim().split('_')
  const uuidPart = parts.find((part) =>
    /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(part),
  )
  return uuidPart ?? null
}

export async function isProcessedPayment(
  orderReference: string,
  db: typeof prisma = prisma,
): Promise<boolean> {
  const normalized = String(orderReference ?? '').trim()
  if (!normalized) return false
  const existing = await db.paymentLog.findUnique({
    where: { orderReference: normalized },
    select: { status: true, processedAt: true },
  }).catch(() => null)
  return Boolean(existing && existing.status === 'SUCCESS' && existing.processedAt)
}

export async function processPaymentWebhook(
  data: PaymentCallbackData,
  db: typeof prisma = prisma
): Promise<ProcessPaymentWebhookResult> {
  const target = resolveWebhookPaymentTarget(data)
  if (!target) {
    return {
      duplicate: false,
      scope: 'legacy',
      productId: null,
      planId: null,
      payRef: String(data.order_reference ?? ''),
      amount: Number(data.amount),
      result: {
        status: 'failed',
        userId: '',
        reason: 'UNRESOLVED_WEBHOOK_TARGET',
      },
    }
  }

  console.log(`[WayForPay] Payment target resolved`, {
    scope: target.scope,
    payRef: target.payRef,
    productId: target.productId,
    amount: target.amount,
  })

  const payRef = target.payRef
  const amount = target.amount
  const isTestPayment = /_test1uah$/i.test(payRef)
  let resolvedUserId = target.userId ?? null

  if (resolvedUserId) {
    const exists = await db.user.findUnique({
      where: { id: resolvedUserId },
      select: { id: true },
    }).catch(() => null)
    if (!exists) {
      console.warn('[PAYMENT_LIFECYCLE] callback userId not found', {
        providedUserId: resolvedUserId,
        payRef,
        source: 'clientAccountId_or_target',
      })
      resolvedUserId = null
    }
  }

  if (!resolvedUserId) {
    const fallbackUserId = extractUuidUserIdFromPayRef(payRef)
    if (fallbackUserId) {
      const fallbackExists = await db.user.findUnique({
        where: { id: fallbackUserId },
        select: { id: true },
      }).catch(() => null)
      if (fallbackExists) {
        resolvedUserId = fallbackUserId
        console.info('[PAYMENT_LIFECYCLE] callback userId recovered from orderReference', {
          payRef,
          recoveredUserId: resolvedUserId,
        })
      }
    }
  }

  if (!resolvedUserId || !payRef || Number.isNaN(amount)) {
    console.error(`[WayForPay] ❌ MISSING_WEBHOOK_FIELDS — payment dropped`, {
      userId: resolvedUserId ?? target.userId ?? 'NULL',
      payRef: payRef || 'EMPTY',
      amount,
      scope: target.scope,
      productId: target.productId,
      note: !resolvedUserId
        ? 'Hosted button callback has no clientAccountId — cannot link to user'
        : 'payRef or amount missing',
    })
    return {
      duplicate: false,
      scope: target.scope,
      productId: target.productId,
      planId: target.planId,
      payRef,
      amount,
      result: {
        status: 'failed',
        userId: resolvedUserId ?? '',
        reason: 'MISSING_WEBHOOK_FIELDS',
      },
    }
  }

  const existingPaymentLog = await db.paymentLog
    .findUnique({
      where: { orderReference: payRef },
      select: { id: true },
    })
    .catch(() => null)

  if (existingPaymentLog) {
    console.warn('[PAYMENT_LIFECYCLE] duplicate callback detected', {
      orderReference: payRef,
      source: 'payment_log_exists',
    })
    return {
      duplicate: true,
      scope: target.scope,
      productId: target.productId,
      planId: target.planId,
      payRef,
      amount,
      result: null,
    }
  }

  const expertId = await ensureUserExpertId(resolvedUserId).catch((err) => {
    console.warn('⚠️ [PAYMENT:WEBHOOK] ensureUserExpertId failed', { userId: resolvedUserId, payRef, err })
    return null
  })

  if (!expertId) {
    console.error('❌ [PAYMENT:WEBHOOK] No expertId resolved — payment log cannot be created', { userId: resolvedUserId, payRef })
    return {
      duplicate: false,
      scope: target.scope,
      productId: target.productId,
      planId: target.planId,
      payRef,
      amount,
      result: { status: 'failed', userId: resolvedUserId, reason: 'MISSING_EXPERT_ID' },
    }
  }

  let paymentLog: { id: string }
  try {
    paymentLog = await db.paymentLog.create({
      data: {
        orderReference: payRef,
        userId: resolvedUserId,
        expertId,
        amountCents: Math.round(amount * 100),
        currency: data.currency ?? 'EUR',
        status: 'PENDING',
        metadata: {
          orderReference: payRef,
          scope: target.scope,
          productId: target.productId,
          planId: target.planId,
          amount,
          currency: data.currency ?? 'EUR',
          transactionId: data.transaction_id ?? null,
        },
      },
      select: { id: true },
    })
    const catalogMatch = findByAmount(amount)
    console.log(`[WayForPay] PaymentLog created`, {
      orderReference: payRef,
      userId: resolvedUserId,
      amount,
      currency: data.currency,
      paymentKey: catalogMatch?.paymentKey ?? 'unknown',
    })
    console.log('💳 [PAYMENT:WEBHOOK] Created pending log', {
      payRef,
      userId: target.userId,
    })
  } catch (error) {
    const isUniqueViolation = Boolean(
      error &&
        typeof error === 'object' &&
        'code' in error &&
        (error as { code?: string }).code === 'P2002'
    )

    if (isUniqueViolation) {
      console.warn('[PAYMENT_LIFECYCLE] duplicate callback detected', {
        orderReference: payRef,
        source: 'payment_log_unique_violation',
      })
      return {
        duplicate: true,
        scope: target.scope,
        productId: target.productId,
        planId: target.planId,
        payRef,
        amount,
        result: null,
      }
    }

    throw error
  }

  try {
    const result =
      target.scope === 'ecosystem' &&
      target.ecosystemProductId &&
      target.ecosystemPlanId
        ? await processEcosystemPayment(
            target.ecosystemProductId,
            target.ecosystemPlanId,
            resolvedUserId,
            {
              amount,
              currency: data.currency ?? 'UAH',
              payRef,
              orderReference: payRef,
            },
            db
          )
        : await processPayment({
            userId: resolvedUserId,
            productId: target.productId ?? '',
            amount,
            payRef,
            currency: data.currency ?? 'EUR',
          })

    console.log(`✅ [PAYMENT:WEBHOOK] Processed result: ${result.status}`, {
      payRef,
      status: result.status,
      scope: target.scope,
      productId: target.productId,
      planId: target.planId,
      userId: resolvedUserId,
    })
    if (isTestPayment && result.status === 'approved') {
      console.log('[TEST_PAYMENT_SUCCESS]', {
        payRef,
        userId: resolvedUserId,
        productId: target.productId,
        planId: target.planId,
        amount,
      })
    }

    await db.paymentLog.update({
      where: { id: paymentLog.id },
      data: {
        status: result.status === 'approved' ? 'SUCCESS' : 'FAILED',
        processedAt: new Date(),
        metadata: {
          orderReference: payRef,
          scope: target.scope,
          productId: target.productId,
          planId: target.planId,
          amount,
          currency: data.currency ?? 'EUR',
          transactionId: data.transaction_id ?? null,
          result,
        },
      },
    })

    return {
      duplicate: false,
      scope: target.scope,
      productId: target.productId,
      planId: target.planId,
      payRef,
      amount,
      result,
    }
  } catch (error) {
    await db.paymentLog
      .update({
        where: { id: paymentLog.id },
        data: {
          status: 'FAILED',
          processedAt: new Date(),
          metadata: {
            orderReference: payRef,
            scope: target.scope,
            productId: target.productId,
            planId: target.planId,
            amount,
            currency: data.currency ?? 'EUR',
            transactionId: data.transaction_id ?? null,
            error: error instanceof Error ? error.message : 'unknown_error',
          },
        },
      })
      .catch(() => undefined)

    throw error
  }
}
