import { prisma } from '@/db/client.js'
import { autoBookAllUpcomingGroupSessions } from '@/modules/zoom/service.js'

import { FOCUS_DOJIM_TIMER_IDS } from './business.types.js'

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

export async function activateProductSubscription(params: {
  userId: string
  productCode: string
  source: GrantSource
  orderReference?: string
  amount?: number
  planMonths?: number
  manualNote?: string
}): Promise<ActivationResult> {
  const {
    userId,
    productCode,
    source,
    orderReference,
    amount,
    planMonths,
    manualNote,
  } = params

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { id: true },
  })

  if (!user) {
    return { success: false, message: 'user_not_found', userId, source }
  }

  const product = await prisma.product.findFirst({
    where: { code: { equals: productCode, mode: 'insensitive' } },
    select: { id: true, code: true },
  })

  if (!product) {
    return { success: false, message: 'product_not_found', userId, source }
  }

  const existing = await prisma.productSubscription.findUnique({
    where: { userId_productId: { userId, productId: product.id } },
    select: { status: true, paidAt: true },
  })

  if (existing?.status.toLowerCase() === 'active' && existing.paidAt) {
    return { success: true, message: 'already_active', userId, source }
  }

  const paidAt = new Date()
  const expiresAt = resolveExpiresAt(paidAt, planMonths ?? 1)
  const manualBy = resolveManualGrantBy(source)
  const planCode = resolvePlanCode(product.code, planMonths)

  try {
    await prisma.$transaction(async (tx) => {
      await tx.productSubscription.upsert({
        where: { userId_productId: { userId, productId: product.id } },
        create: {
          userId,
          productId: product.id,
          status: 'active',
          paidAt,
          expiresAt,
          amount: typeof amount === 'number' ? amount : 0,
          manuallyGrantedBy: manualBy,
          manualGrantNote: manualNote ?? null,
        },
        update: {
          status: 'active',
          paidAt,
          expiresAt,
          amount: typeof amount === 'number' ? amount : undefined,
          manuallyGrantedBy: manualBy,
          manualGrantNote: manualNote ?? null,
        },
      })

      const canonicalSubscription = await tx.subscription.findFirst({
        where: { userId, productId: product.id },
        orderBy: { createdAt: 'desc' },
        select: { id: true },
      })

      if (canonicalSubscription) {
        await tx.subscription.update({
          where: { id: canonicalSubscription.id },
          data: {
            status: 'ACTIVE',
            startsAt: paidAt,
            currentPeriodEnd: expiresAt,
            planCode,
          },
        })
      } else {
        await tx.subscription.create({
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
        await tx.user.update({
          where: { id: userId },
          data: {
            focusPaid: true,
            funnelStage: 'PAID',
            funnelUpdatedAt: new Date(),
          },
        })
      }

      if (orderReference) {
        await tx.checkoutSession.updateMany({
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

      await tx.notificationJob.updateMany({
        where: {
          payload: { path: ['userId'], equals: userId },
          status: 'PENDING',
        },
        data: { status: 'DONE' },
      })

      await tx.runtimeOutbox.updateMany({
        where: {
          userId,
          status: 'PENDING',
          type: { in: [...FOCUS_DOJIM_TIMER_IDS] },
        },
        data: { status: 'DONE' },
      })

      await tx.runtimeOutbox.updateMany({
        where: {
          userId,
          status: 'PENDING',
          dedupeKey: { startsWith: `dojim:${userId}:` },
        },
        data: { status: 'DONE' },
      })
    })

    if (product.code.toLowerCase() === 'focus') {
      await autoBookAllUpcomingGroupSessions(userId)
    }

    return { success: true, message: 'activated', userId, source }
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
