import { findByAmount } from '@/lib/payments/registry.js'
import { sendOpsTelegramMessage } from '@/lib/telegram.js'
import type { PaymentCallbackData } from '../../types.js'
import { prisma } from '../../../../db/client.js'
import { ensureUserExpertId } from '../../../ai-mentor/helpers.js'
import { initiateBattle } from '../../../zoom/battle/battle.service.js'
import { confirmZoomSwapPaymentByOrderRef } from '../../../zoom/service.js'
import { resolveEcosystemProductCode } from '../business/catalog.js'
import {
  processEcosystemPayment,
  processPayment,
} from '../business/service.js'
import { resolveWebhookPaymentTarget } from './targets.js'
import type { ProcessPaymentWebhookResult } from './types.js'
import type { EcosystemPaymentProduct } from '../business/types.js'

type CheckoutVerificationResult =
  | {
      ok: true
      session: {
        amount: number
        currency: string
        userId: string
        productCode: string
      }
    }
  | {
      ok: false
      reason:
        | 'CHECKOUT_SESSION_NOT_FOUND'
        | 'CHECKOUT_USER_MISMATCH'
        | 'CHECKOUT_AMOUNT_MISMATCH'
        | 'CHECKOUT_CURRENCY_MISMATCH'
        | 'CHECKOUT_PRODUCT_MISMATCH'
    }

function extractUuidUserIdFromPayRef(payRef: string): string | null {
  const parts = String(payRef ?? '').trim().split('_')
  const uuidPart = parts.find((part) =>
    /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(part),
  )
  return uuidPart ?? null
}

function readBattleEntryMeta(payload: unknown): {
  expertId: string | null
  opponentId: string
  goalA: string | null
  goalB: string | null
  scheduledAt: string
} | null {
  if (!payload || typeof payload !== 'object' || Array.isArray(payload)) {
    return null
  }

  const raw = payload as Record<string, unknown>
  const meta = raw.battleEntryMeta
  if (!meta || typeof meta !== 'object' || Array.isArray(meta)) {
    return null
  }

  const typedMeta = meta as Record<string, unknown>
  const opponentId = typeof typedMeta.opponentId === 'string' ? typedMeta.opponentId.trim() : ''
  const scheduledAt = typeof typedMeta.scheduledAt === 'string' ? typedMeta.scheduledAt.trim() : ''
  if (!opponentId || !scheduledAt) {
    return null
  }

  return {
    expertId: typeof typedMeta.expertId === 'string' ? typedMeta.expertId : null,
    opponentId,
    goalA: typeof typedMeta.goalA === 'string' ? typedMeta.goalA : null,
    goalB: typeof typedMeta.goalB === 'string' ? typedMeta.goalB : null,
    scheduledAt,
  }
}

async function resolvePaymentLogExpertId(input: {
  db: typeof prisma
  userId: string
  scope: ProcessPaymentWebhookResult['scope']
  ecosystemProductId?: EcosystemPaymentProduct | null
  payRef: string
}): Promise<string | null> {
  const expertId = await ensureUserExpertId(input.userId).catch((err) => {
    console.warn('⚠️ [PAYMENT:WEBHOOK] ensureUserExpertId failed', {
      userId: input.userId,
      payRef: input.payRef,
      err,
    })
    return null
  })

  if (expertId) {
    return expertId
  }

  if (input.scope === 'ecosystem' && input.ecosystemProductId) {
    const product = await input.db.product.findFirst({
      where: {
        code: { in: resolveEcosystemProductCode(input.ecosystemProductId) },
      },
      select: { ownerId: true },
      orderBy: { createdAt: 'asc' },
    })

    if (product?.ownerId) {
      return product.ownerId
    }
  }

  return null
}

async function processZoomSwapWebhook(input: {
  data: PaymentCallbackData
  payRef: string
  amount: number
  userId: string
  db: typeof prisma
}): Promise<ProcessPaymentWebhookResult> {
  const result = await confirmZoomSwapPaymentByOrderRef(input.payRef, {
    amount: input.amount,
    currency: input.data.currency ?? 'UAH',
    transactionId: input.data.transaction_id ?? null,
  })

  if ('duplicate' in result && result.duplicate) {
    return {
      duplicate: true,
      scope: 'zoom',
      productId: 'zoom_swap',
      planId: null,
      payRef: input.payRef,
      amount: input.amount,
      result: null,
    }
  }

  if (!result.updated) {
    return {
      duplicate: false,
      scope: 'zoom',
      productId: 'zoom_swap',
      planId: null,
      payRef: input.payRef,
      amount: input.amount,
      result: {
        status: 'failed',
        userId: input.userId,
        reason: result.error ?? 'ZOOM_SWAP_NOT_UPDATED',
      },
    }
  }

  return {
    duplicate: false,
    scope: 'zoom',
    productId: 'zoom_swap',
    planId: null,
    payRef: input.payRef,
    amount: input.amount,
    result: {
      status: 'approved',
      userId: input.userId,
      productId: 'zoom_swap',
      enrollmentId: result.swapId ?? null,
      expertId: null,
    },
  }
}

async function processBattleEntryWebhook(input: {
  data: PaymentCallbackData
  payRef: string
  amount: number
  userId: string
  expertId: string
  db: typeof prisma
}): Promise<ProcessPaymentWebhookResult> {
  const existingPaymentLog = await input.db.paymentLog.findUnique({
    where: { orderReference: input.payRef },
    select: { id: true },
  }).catch(() => null)

  if (existingPaymentLog) {
    return {
      duplicate: true,
      scope: 'zoom',
      productId: 'battle_entry',
      planId: 'single',
      payRef: input.payRef,
      amount: input.amount,
      result: null,
    }
  }

  const checkoutSession = await input.db.checkoutSession.findFirst({
    where: { orderReference: input.payRef },
    orderBy: { createdAt: 'desc' },
    select: {
      payload: true,
    },
  })

  const battleEntryMeta = readBattleEntryMeta(checkoutSession?.payload ?? null)
  if (!battleEntryMeta) {
    return {
      duplicate: false,
      scope: 'zoom',
      productId: 'battle_entry',
      planId: 'single',
      payRef: input.payRef,
      amount: input.amount,
      result: {
        status: 'failed',
        userId: input.userId,
        reason: 'BATTLE_ENTRY_METADATA_NOT_FOUND',
      },
    }
  }

  const battle = await input.db.$transaction(async (tx) => {
    const paymentLog = await tx.paymentLog.create({
      data: {
        orderReference: input.payRef,
        userId: input.userId,
        expertId: battleEntryMeta.expertId ?? input.expertId,
        amountCents: Math.round(input.amount * 100),
        currency: input.data.currency ?? 'UAH',
        status: 'SUCCESS',
        processedAt: new Date(),
        metadata: {
          scope: 'zoom',
          type: 'battle_entry',
          orderReference: input.payRef,
          amount: input.amount,
          currency: input.data.currency ?? 'UAH',
          transactionId: input.data.transaction_id ?? null,
        },
      },
      select: { id: true },
    })

    const createdBattle = await initiateBattle({
      expertId: battleEntryMeta.expertId ?? input.expertId,
      challengerId: input.userId,
      opponentId: battleEntryMeta.opponentId,
      goalA: battleEntryMeta.goalA ?? undefined,
      goalB: battleEntryMeta.goalB ?? undefined,
      entryFee: input.amount,
      scheduledAt: new Date(battleEntryMeta.scheduledAt),
      paymentOrderReference: input.payRef,
      dbClient: tx,
    })

    await tx.paymentLog.update({
      where: { id: paymentLog.id },
      data: {
        metadata: {
          scope: 'zoom',
          type: 'battle_entry',
          orderReference: input.payRef,
          amount: input.amount,
          currency: input.data.currency ?? 'UAH',
          transactionId: input.data.transaction_id ?? null,
          battleId: createdBattle.id,
        },
      },
    })

    return createdBattle
  })

  return {
    duplicate: false,
    scope: 'zoom',
    productId: 'battle_entry',
    planId: 'single',
    payRef: input.payRef,
    amount: input.amount,
    result: {
      status: 'approved',
      userId: input.userId,
      productId: 'battle_entry',
      enrollmentId: battle.id,
      expertId: battle.expertId ?? input.expertId,
    },
  }
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

async function verifyCheckoutSessionContract(input: {
  db: typeof prisma
  payRef: string
  amount: number
  currency: string
  userId: string
  productId: string | null
}): Promise<CheckoutVerificationResult> {
  const checkoutSession = await input.db.checkoutSession.findFirst({
    where: { orderReference: input.payRef },
    orderBy: { createdAt: 'desc' },
    select: {
      amount: true,
      currency: true,
      userId: true,
      productCode: true,
    },
  }).catch(() => null)

  if (!checkoutSession) {
    return { ok: false, reason: 'CHECKOUT_SESSION_NOT_FOUND' }
  }

  if (checkoutSession.userId !== input.userId) {
    return { ok: false, reason: 'CHECKOUT_USER_MISMATCH' }
  }

  if (Number(checkoutSession.amount) !== Number(input.amount)) {
    return { ok: false, reason: 'CHECKOUT_AMOUNT_MISMATCH' }
  }

  if (String(checkoutSession.currency ?? '').trim().toUpperCase() !== String(input.currency).trim().toUpperCase()) {
    return { ok: false, reason: 'CHECKOUT_CURRENCY_MISMATCH' }
  }

  if (
    input.productId &&
    String(checkoutSession.productCode ?? '').trim().toLowerCase() !==
      String(input.productId).trim().toLowerCase()
  ) {
    return { ok: false, reason: 'CHECKOUT_PRODUCT_MISMATCH' }
  }

  return {
    ok: true,
    session: {
      amount: Number(checkoutSession.amount),
      currency: String(checkoutSession.currency),
      userId: String(checkoutSession.userId),
      productCode: String(checkoutSession.productCode),
    },
  }
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
      ecosystemPlanId: undefined,
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
      ecosystemPlanId: target.ecosystemPlanId,
      payRef,
      amount,
      result: {
        status: 'failed',
        userId: resolvedUserId ?? '',
        reason: 'MISSING_WEBHOOK_FIELDS',
      },
    }
  }

  if (target.scope === 'zoom' && target.productId === 'zoom_swap') {
    return processZoomSwapWebhook({
      data,
      payRef,
      amount,
      userId: resolvedUserId,
      db,
    })
  }

  const checkoutVerification = await verifyCheckoutSessionContract({
    db,
    payRef,
    amount,
    currency: data.currency ?? 'UAH',
    userId: resolvedUserId,
    productId: target.productId,
  })

  if (!checkoutVerification.ok) {
    console.warn('[PAYMENT_LIFECYCLE] checkout_verification_failed', {
      orderReference: payRef,
      userId: resolvedUserId,
      productId: target.productId,
      reason: checkoutVerification.reason,
      callbackAmount: amount,
      callbackCurrency: data.currency ?? 'UAH',
    })
    return {
      duplicate: false,
      scope: target.scope,
      productId: target.productId,
      planId: target.planId,
      ecosystemPlanId: target.ecosystemPlanId,
      payRef,
      amount,
      result: {
        status: 'failed',
        userId: resolvedUserId,
        reason: checkoutVerification.reason,
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
      ecosystemPlanId: target.ecosystemPlanId,
      payRef,
      amount,
      result: null,
    }
  }

  const expertId = await resolvePaymentLogExpertId({
    db,
    userId: resolvedUserId,
    scope: target.scope,
    ecosystemProductId: target.ecosystemProductId,
    payRef,
  })

  if (!expertId) {
    console.error('❌ [PAYMENT:WEBHOOK] No expertId resolved — payment log cannot be created', { userId: resolvedUserId, payRef })
    return {
      duplicate: false,
      scope: target.scope,
      productId: target.productId,
      planId: target.planId,
      ecosystemPlanId: target.ecosystemPlanId,
      payRef,
      amount,
      result: { status: 'failed', userId: resolvedUserId, reason: 'MISSING_EXPERT_ID' },
    }
  }

  if (target.scope === 'zoom' && target.productId === 'battle_entry') {
    return processBattleEntryWebhook({
      data,
      payRef,
      amount,
      userId: resolvedUserId,
      expertId,
      db,
    })
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
        ecosystemPlanId: target.ecosystemPlanId,
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

    if (result.status === 'approved' && resolvedUserId) {
      const opsEvent =
        target.productId === 'trial_zoom'
          ? 'TRIAL_ZOOM_PAID'
          : target.productId === 'focus'
            ? 'FOCUS_PAID'
            : null

      if (opsEvent) {
        void sendOpsTelegramMessage(
          `✅ ${opsEvent} | User: ${resolvedUserId} | Plan: ${target.planId} | Amount: €${amount}`,
        )
      }
    }

    return {
      duplicate: false,
      scope: target.scope,
      productId: target.productId,
      planId: target.planId,
      ecosystemPlanId: target.ecosystemPlanId,
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
