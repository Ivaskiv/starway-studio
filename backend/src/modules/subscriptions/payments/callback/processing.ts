import { findByAmount } from '@/lib/payments/registry.js'
import type { Prisma, ZoomCommerceRequest } from '@starway/db/prisma-client'
import { markRequestPaid, resolveByPaymentReference } from '../../../zoom/commerce/zoom.commerce-request.service.js'
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
        payload: unknown
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
        | 'CHECKOUT_SESSION_INACTIVE'
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

  const battle = await input.db.$transaction(async (tx) => finalizeBattleEntryPayment(input, battleEntryMeta, tx))

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

async function finalizeBattleEntryPayment(
  input: { data: PaymentCallbackData; payRef: string; amount: number; userId: string; expertId: string },
  battleEntryMeta: NonNullable<ReturnType<typeof readBattleEntryMeta>>,
  tx: Prisma.TransactionClient,
) {
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
      payload: true,
      status: true,
      expiresAt: true,
      invalidatedAt: true,
    },
  }).catch(() => null)

  if (!checkoutSession) {
    return { ok: false, reason: 'CHECKOUT_SESSION_NOT_FOUND' }
  }

  if (
    checkoutSession.expiresAt <= new Date()
    || checkoutSession.invalidatedAt
    || ['COMPLETED', 'EXPIRED', 'INVALIDATED'].includes(checkoutSession.status)
  ) {
    return { ok: false, reason: 'CHECKOUT_SESSION_INACTIVE' }
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
      payload: checkoutSession.payload,
    },
  }
}

function readIndividualCheckoutMeta(payload: unknown): { zoomSessionId: string; userId: string } | null {
  if (!payload || typeof payload !== 'object' || Array.isArray(payload)) return null
  const value = payload as Record<string, unknown>
  if (value.paymentKind !== 'zoom_individual') return null
  const zoomSessionId = typeof value.zoomSessionId === 'string' ? value.zoomSessionId.trim() : ''
  const userId = typeof value.userId === 'string' ? value.userId.trim() : ''
  return zoomSessionId && userId ? { zoomSessionId, userId } : null
}

async function processZoomIndividualWebhook(input: {
  data: PaymentCallbackData
  payRef: string
  amount: number
  userId: string
  checkout: Extract<CheckoutVerificationResult, { ok: true }>['session']
  db: typeof prisma
}): Promise<ProcessPaymentWebhookResult> {
  const meta = readIndividualCheckoutMeta(input.checkout.payload)
  if (!meta || meta.userId !== input.userId || input.amount !== 60 || String(input.data.currency ?? '').toUpperCase() !== 'EUR') {
    return {
      duplicate: false, scope: 'zoom', productId: 'zoom_individual', planId: 'single', payRef: input.payRef, amount: input.amount,
      result: { status: 'failed', userId: input.userId, reason: 'ZOOM_INDIVIDUAL_CHECKOUT_MISMATCH' },
    }
  }

  const result = await input.db.$transaction(async (tx) => {
    await tx.$queryRaw`SELECT 1 FROM "ZoomSession" WHERE id = ${meta.zoomSessionId} FOR UPDATE`
    const session = await tx.zoomSession.findUnique({
      where: { id: meta.zoomSessionId },
      include: { _count: { select: { attendees: true } } },
    })
    if (!session || session.status === 'CANCELLED') throw new Error('ZOOM_INDIVIDUAL_SESSION_UNAVAILABLE')

    const existingPayment = await tx.paymentLog.findUnique({
      where: { orderReference: input.payRef }, select: { id: true },
    })
    if (existingPayment) return { duplicate: true, sessionId: meta.zoomSessionId }

    const existingAttendee = await tx.zoomSessionAttendee.findUnique({
      where: { sessionId_userId: { sessionId: meta.zoomSessionId, userId: input.userId } }, select: { id: true },
    })
    if (!existingAttendee && session._count.attendees >= 1) throw new Error('ZOOM_INDIVIDUAL_SLOT_FULL')

    await tx.paymentLog.create({
      data: {
        orderReference: input.payRef,
        userId: input.userId,
        expertId: session.expertId ?? (await ensureUserExpertId(input.userId)),
        amountCents: 6000,
        currency: 'EUR',
        status: 'SUCCESS',
        processedAt: new Date(),
        metadata: { scope: 'zoom', type: 'zoom_individual', zoomSessionId: meta.zoomSessionId, transactionId: input.data.transaction_id ?? null },
      },
    })
    if (!existingAttendee) {
      await tx.zoomSessionAttendee.create({ data: { sessionId: meta.zoomSessionId, userId: input.userId, attended: false } })
    }
    return { duplicate: false, sessionId: meta.zoomSessionId }
  })

  if (result.duplicate) {
    return { duplicate: true, scope: 'zoom', productId: 'zoom_individual', planId: 'single', payRef: input.payRef, amount: input.amount, result: null }
  }
  return {
    duplicate: false, scope: 'zoom', productId: 'zoom_individual', planId: 'single', payRef: input.payRef, amount: input.amount,
    result: { status: 'approved', userId: input.userId, productId: 'zoom_individual', enrollmentId: result.sessionId, expertId: null },
  }
}

export async function processPaymentWebhook(
  data: PaymentCallbackData,
  db: typeof prisma = prisma
): Promise<ProcessPaymentWebhookResult> {
  const target = resolveWebhookPaymentTarget(data)
  if (target?.payRef.startsWith('zoom_commerce_')) {
    const request = await resolveByPaymentReference(target.payRef, db)
    if (!request || data.transaction_status !== 'Approved') throw new Error('COMMERCE_PAYMENT_NOT_APPROVED')
    const checkout = request.kind === 'BATTLE'
      ? await db.checkoutSession.findFirst({ where: { orderReference: target.payRef }, select: { payload: true } })
      : null
    const battleMeta = request.kind === 'BATTLE' ? readBattleEntryMeta(checkout?.payload ?? null) : null
    if (request.kind === 'BATTLE' && !battleMeta) throw new Error('BATTLE_ENTRY_METADATA_NOT_FOUND')
    const paid = await markRequestPaid({
      orderReference: target.payRef, userId: data.clientAccountId ?? request.requesterUserId,
      zoomSessionId: request.zoomSessionId, paymentKind: target.productId!,
      amount: Number(data.amount), currency: data.currency ?? '',
    }, db, battleMeta ? async (tx, locked: ZoomCommerceRequest) => {
      await finalizeBattleEntryPayment({
        data, payRef: target.payRef, amount: Number(data.amount),
        userId: locked.requesterUserId, expertId: locked.expertId,
      }, battleMeta, tx)
    } : undefined)
    return { duplicate: paid.duplicate, scope: 'zoom', productId: target.productId,
      planId: 'single', payRef: target.payRef, amount: Number(data.amount),
      result: { status: 'approved', userId: request.requesterUserId,
        productId: target.productId!,
        enrollmentId: request.kind === 'INDIVIDUAL' && !paid.duplicate ? request.zoomSessionId : null,
        expertId: request.expertId } }
  }
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

  if (target.scope === 'zoom' && target.productId === 'zoom_individual') {
    return processZoomIndividualWebhook({
      data,
      payRef,
      amount,
      userId: resolvedUserId,
      checkout: checkoutVerification.session,
      db,
    })
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
      if (target.productId === 'focus') {
        const focusSubscription = await db.productSubscription.findFirst({
          where: {
            userId: resolvedUserId,
            product: {
              is: {
                code: {
                  in: ['focus', 'FOCUS', 'stankey', 'STANKEY'],
                },
              },
            },
          },
          orderBy: { updatedAt: 'desc' },
          select: { expiresAt: true },
        }).catch(() => null)

        const canonicalSubscription = await db.subscription.findFirst({
          where: {
            userId: resolvedUserId,
            status: 'ACTIVE',
            product: {
              is: {
                code: {
                  in: ['focus', 'FOCUS', 'stankey', 'STANKEY'],
                },
              },
            },
          },
          orderBy: { currentPeriodEnd: 'desc' },
          select: { currentPeriodEnd: true },
        }).catch(() => null)

        const finalExpiresAt = canonicalSubscription?.currentPeriodEnd ?? focusSubscription?.expiresAt ?? null
        void sendOpsTelegramMessage(
          [
            '✅ Оплату ФОКУС підтверджено',
            '',
            `User: ${resolvedUserId}`,
            `Plan: ${target.planId}`,
            `Amount: ${amount} ${data.currency ?? 'UAH'}`,
            `Order: ${payRef}`,
            `Access active until: ${finalExpiresAt ? finalExpiresAt.toISOString() : 'unknown'}`,
          ].join('\n'),
        )
      } else if (target.productId === 'trial_zoom') {
        void sendOpsTelegramMessage(
          `✅ TRIAL_ZOOM_PAID | User: ${resolvedUserId} | Plan: ${target.planId} | Amount: €${amount}`,
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
