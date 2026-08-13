import type { Prisma } from '@starway/db/prisma-client'

import { prisma } from '@/db/client.js'
import { autoBookAllUpcomingGroupSessions } from '@/modules/zoom/service.js'

import {
  resolveEcosystemPaymentPlan,
} from './business.catalog.js'
import {
  FOCUS_DOJIM_TIMER_IDS,
  type EcosystemPaymentPlanId,
} from './business.types.js'

export type GrantSource =
  | 'webhook_approved'
  | 'coach_manual'
  | 'admin_manual'
  | 'webhook_fallback'

export interface ActivationResult {
  success: boolean
  message: 'activated' | 'already_active' | 'user_not_found' | 'product_not_found' | 'error'
  userId: string
  source: GrantSource
}

type ActivationDbClient = Prisma.TransactionClient | typeof prisma

function resolveManualGrantBy(source: GrantSource): string | null {
  if (source === 'webhook_approved') return null
  return source
}

function resolveExpiresAt(base: Date, months: number): Date {
  const expiresAt = new Date(base)
  expiresAt.setMonth(expiresAt.getMonth() + Math.max(1, months))
  return expiresAt
}

function resolvePlanCode(productCode: string, planMonths?: number): string {
  const normalizedProductCode = String(productCode ?? '').trim().toLowerCase() || 'subscription'
  const normalizedPlanMonths = Math.max(1, planMonths ?? 1)
  return `${normalizedProductCode}_${normalizedPlanMonths}m`
}

function resolveCatalogPlanId(
  productCode: string,
  planMonths?: number,
  explicitPlanId?: EcosystemPaymentPlanId,
): EcosystemPaymentPlanId | null {
  if (explicitPlanId) return explicitPlanId

  const normalizedProductCode = String(productCode ?? '').trim().toLowerCase()
  if (normalizedProductCode !== 'focus') return null
  if (planMonths === 3) return '3month'
  if ((planMonths ?? 1) === 1) return '1month'
  return null
}

function resolveCanonicalAmount(params: {
  productCode: string
  planMonths?: number
  planId?: EcosystemPaymentPlanId
  fallbackAmount?: number
}): number {
  const catalogPlanId = resolveCatalogPlanId(
    params.productCode,
    params.planMonths,
    params.planId,
  )
  const normalizedProductCode = String(params.productCode ?? '').trim().toLowerCase()

  if (normalizedProductCode === 'focus' && catalogPlanId) {
    const plan = resolveEcosystemPaymentPlan('focus', catalogPlanId)
    if (plan) return plan.amount
  }

  return typeof params.fallbackAmount === 'number' ? params.fallbackAmount : 0
}

export async function activateProductSubscription(params: {
  userId: string
  productCode: string
  source: GrantSource
  orderReference?: string
  amount?: number
  planMonths?: number
  manualNote?: string
  paidAtOverride?: Date
  expiresAtOverride?: Date
  tx?: Prisma.TransactionClient
  autoBookGroupSessions?: boolean
  catalogPlanId?: EcosystemPaymentPlanId
}): Promise<ActivationResult> {
  const {
    userId,
    productCode,
    source,
    orderReference,
    amount,
    planMonths,
    manualNote,
    paidAtOverride,
    expiresAtOverride,
    tx,
    autoBookGroupSessions = true,
    catalogPlanId,
  } = params

  const applyActivation = async (db: ActivationDbClient): Promise<ActivationResult> => {
    const user = await db.user.findUnique({
      where: { id: userId },
      select: { id: true, focusPaid: true },
    })

    if (!user) {
      return { success: false, message: 'user_not_found', userId, source }
    }

    const product = await db.product.findFirst({
      where: { code: { equals: productCode, mode: 'insensitive' } },
      select: { id: true, code: true },
    })

    if (!product) {
      return { success: false, message: 'product_not_found', userId, source }
    }

    const existing = await db.productSubscription.findUnique({
      where: { userId_productId: { userId, productId: product.id } },
      select: { status: true, paidAt: true, amount: true, expiresAt: true },
    })

    const canonicalAmount = resolveCanonicalAmount({
      productCode: product.code,
      planMonths,
      planId: catalogPlanId,
      fallbackAmount: amount,
    })
    const manualBy = resolveManualGrantBy(source)

    if (existing?.status.toLowerCase() === 'active' && existing.paidAt) {
      const shouldSyncExpiry =
        expiresAtOverride instanceof Date &&
        Number.isFinite(expiresAtOverride.getTime()) &&
        (existing.expiresAt?.getTime() ?? null) !== expiresAtOverride.getTime()
      const shouldSyncAmount = existing.amount !== canonicalAmount

      if (shouldSyncAmount || shouldSyncExpiry) {
        await db.productSubscription.update({
          where: { userId_productId: { userId, productId: product.id } },
          data: {
            amount: canonicalAmount,
            ...(shouldSyncExpiry ? { expiresAt: expiresAtOverride } : {}),
            manuallyGrantedBy: manualBy,
            manualGrantNote: manualNote ?? null,
          },
        })

        const canonicalSubscription = await db.subscription.findFirst({
          where: { userId, productId: product.id },
          orderBy: { createdAt: 'desc' },
          select: { id: true },
        })

        if (canonicalSubscription && shouldSyncExpiry) {
          await db.subscription.update({
            where: { id: canonicalSubscription.id },
            data: {
              status: 'ACTIVE',
              startsAt: existing.paidAt,
              currentPeriodEnd: expiresAtOverride,
              planCode: resolvePlanCode(product.code, planMonths),
            },
          })
        }
      }
      if (product.code.toLowerCase() === 'focus' && !user.focusPaid) {
        await db.user.update({
          where: { id: userId },
          data: {
            focusPaid: true,
            funnelStage: 'PAID',
            funnelUpdatedAt: new Date(),
          },
        })
      }
      return {
        success: true,
        message: shouldSyncAmount || shouldSyncExpiry ? 'activated' : 'already_active',
        userId,
        source,
      }
    }

    const paidAt = paidAtOverride ?? new Date()
    const expiresAt = expiresAtOverride ?? resolveExpiresAt(paidAt, planMonths ?? 1)
    const planCode = resolvePlanCode(product.code, planMonths)

    await db.productSubscription.upsert({
      where: { userId_productId: { userId, productId: product.id } },
      create: {
        userId,
        productId: product.id,
        status: 'active',
        paidAt,
        expiresAt,
        amount: canonicalAmount,
        manuallyGrantedBy: manualBy,
        manualGrantNote: manualNote ?? null,
      },
      update: {
        status: 'active',
        paidAt,
        expiresAt,
        amount: canonicalAmount,
        manuallyGrantedBy: manualBy,
        manualGrantNote: manualNote ?? null,
      },
    })

    const canonicalSubscription = await db.subscription.findFirst({
      where: { userId, productId: product.id },
      orderBy: { createdAt: 'desc' },
      select: { id: true },
    })

    if (canonicalSubscription) {
      await db.subscription.update({
        where: { id: canonicalSubscription.id },
        data: {
          status: 'ACTIVE',
          startsAt: paidAt,
          currentPeriodEnd: expiresAt,
          planCode,
        },
      })
    } else {
      await db.subscription.create({
        data: {
          userId,
          productId: product.id,
          startsAt: paidAt,
          status: 'ACTIVE',
          planCode,
          currentPeriodEnd: expiresAt,
        },
      })
    }

    if (product.code.toLowerCase() === 'focus') {
      await db.user.update({
        where: { id: userId },
        data: {
          focusPaid: true,
          funnelStage: 'PAID',
          funnelUpdatedAt: new Date(),
        },
      })
    }

    if (orderReference) {
      await db.checkoutSession.updateMany({
        where: {
          userId,
          orderReference,
          status: { in: ['CREATED', 'OPENED', 'PROCESSING'] },
        },
        data: {
          status: 'COMPLETED',
          completedAt: new Date(),
        },
      })
    }

    await db.notificationJob.updateMany({
      where: {
        payload: { path: ['userId'], equals: userId },
        status: 'PENDING',
      },
      data: { status: 'DONE' },
    })

    await db.runtimeOutbox.updateMany({
      where: {
        userId,
        status: 'PENDING',
        type: { in: [...FOCUS_DOJIM_TIMER_IDS] },
      },
      data: { status: 'DONE' },
    })

    await db.runtimeOutbox.updateMany({
      where: {
        userId,
        status: 'PENDING',
        dedupeKey: { startsWith: `dojim:${userId}:` },
      },
      data: { status: 'DONE' },
    })

    return { success: true, message: 'activated', userId, source }
  }

  try {
    const result = tx
      ? await applyActivation(tx)
      : await prisma.$transaction(async (innerTx) => applyActivation(innerTx))

    if (
      result.success &&
      result.message === 'activated' &&
      autoBookGroupSessions &&
      productCode.trim().toLowerCase() === 'focus'
    ) {
      await autoBookAllUpcomingGroupSessions(userId)
    }

    return result
  } catch (error) {
    console.error('[ACTIVATE_PRODUCT_SUBSCRIPTION] failed', {
      userId,
      productCode,
      source,
      orderReference: orderReference ?? null,
      error,
    })
    return { success: false, message: 'error', userId, source }
  }
}
