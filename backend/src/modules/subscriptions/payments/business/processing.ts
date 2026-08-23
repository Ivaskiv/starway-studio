import { stankeyManifest } from '@/products/stankey/product.manifest.js'
import { prisma } from '../../../../db/client.js'
import { invalidateFunnelStage } from '../../../../lib/funnel/getUserFunnelStage.js'
import { syncLifecycleForUser } from '../../../flow-control/service.js'
import type { PaymentData, PaymentResult } from '../../types.js'
import {
  CORE_SUBSCRIPTION_DURATIONS,
  STANKEY_SUBSCRIPTION_DURATIONS,
  type EcosystemPaymentPlanId,
  type EcosystemPaymentProduct,
} from './types.js'
import {
  resolveEcosystemPaymentPlan,
  resolveEcosystemProductCode,
} from './catalog.js'

async function resolveProductByCodeCandidates(
  db: typeof prisma,
  productCodes: readonly string[]
) {
  for (const code of productCodes) {
    const product = await db.product.findUnique({
      where: { code },
      select: { id: true, code: true, durationDays: true },
    })

    if (product) {
      return product
    }
  }

  return null
}

async function upsertLegacySubscription(
  db: typeof prisma,
  input: {
    userId: string
    productId: string
    planCode: string
    expiresAt: Date
  }
) {
  const now = new Date()
  const existing = await db.subscription.findFirst({
    where: {
      userId: input.userId,
      productId: input.productId,
    },
    orderBy: { createdAt: 'desc' },
    select: { id: true },
  })

  if (existing) {
    await db.subscription.update({
      where: { id: existing.id },
      data: {
        status: 'ACTIVE',
        planCode: input.planCode,
        startsAt: now,
        currentPeriodEnd: input.expiresAt,
        autoRenew: true,
        productId: input.productId,
        trialEndsAt: null,
      },
    })
    return
  }

  await db.subscription.create({
    data: {
      userId: input.userId,
      productId: input.productId,
      status: 'ACTIVE',
      planCode: input.planCode,
      startsAt: now,
      currentPeriodEnd: input.expiresAt,
      autoRenew: true,
    },
  })
}

export const KYIV_TIME_ZONE = 'Europe/Kyiv'

function getKyivDateParts(date: Date): { year: number; month: number; day: number; weekday: number } {
  const formatter = new Intl.DateTimeFormat('en-CA', {
    timeZone: KYIV_TIME_ZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    weekday: 'short',
  })

  const parts = formatter.formatToParts(date)
  const lookup = Object.fromEntries(parts.map((part) => [part.type, part.value]))
  const weekdayMap: Record<string, number> = {
    Mon: 1,
    Tue: 2,
    Wed: 3,
    Thu: 4,
    Fri: 5,
    Sat: 6,
    Sun: 0,
  }

  return {
    year: Number(lookup.year),
    month: Number(lookup.month),
    day: Number(lookup.day),
    weekday: weekdayMap[lookup.weekday] ?? 0,
  }
}

function buildUtcDateFromKyivParts(parts: { year: number; month: number; day: number }, hour = 0, minute = 0, second = 0, millisecond = 0) {
  return new Date(Date.UTC(parts.year, parts.month - 1, parts.day, hour, minute, second, millisecond))
}

export function resolveStrictNextKyivMonday(date: Date): Date {
  const parts = getKyivDateParts(date)
  const daysUntilNextMonday = parts.weekday === 1 ? 7 : ((8 - parts.weekday) % 7 || 7)
  const baseUtc = buildUtcDateFromKyivParts(parts)
  baseUtc.setUTCDate(baseUtc.getUTCDate() + daysUntilNextMonday)
  return baseUtc
}

export function resolveTrialZoomExpiryDate(paidAt: Date, durationDays = 7): Date {
  return new Date(paidAt.getTime() + Math.max(1, durationDays) * 86400000)
}

export async function processEcosystemPayment(
  productId: EcosystemPaymentProduct,
  planId: EcosystemPaymentPlanId,
  userId: string,
  input: {
    amount?: number
    currency?: string
    payRef?: string
    orderReference?: string
  } = {},
  db: typeof prisma = prisma
): Promise<PaymentResult> {
  const plan = resolveEcosystemPaymentPlan(productId, planId)
  if (!plan) {
    return { status: 'failed', userId, reason: 'INVALID_ECOSYSTEM_PLAN' }
  }

  const user = await db.user.findUnique({
    where: { id: userId },
    select: {
      expertId: true,
      currentState: true,
      currentStep: true,
      funnelStage: true,
      createdAt: true,
    },
  })

  if (!user) {
    return { status: 'failed', userId, reason: 'USER_NOT_FOUND' }
  }

  let product = await resolveProductByCodeCandidates(
    db,
    resolveEcosystemProductCode(productId)
  )
  if (!product) {
    // FIX 2025-05-25: resolve valid ownerId before product upsert
    const validOwner = await db.user.findFirst({
      where: { id: userId },
      select: { id: true },
    })

    if (!validOwner) {
      console.error('[PAYMENT] ownerId not found', { userId })
      return { status: 'failed', userId, reason: 'OWNER_NOT_FOUND' }
    }
    const productCode = resolveEcosystemProductCode(productId)[0]
    product = await db.product.upsert({
      where: { code: productCode },
      update: {},
      create: {
        code: productCode,
        name: productId === 'focus' ? 'FOCUS' : productId,
        ownerId: validOwner.id,
        priceCents: Math.round(plan.amount * 100),
        durationDays: plan.durationDays,
      },
      select: { id: true, code: true, durationDays: true },
    })
    console.log('[PAYMENT:ECOSYSTEM] Product auto-created', {
      code: productCode,
      productId,
      ownerId: validOwner.id,
    })
  }

  const now = new Date()
  const currentProductSubscription = await db.productSubscription.findFirst({
    where: {
      userId,
      productId: product.id,
      status: 'active',
    },
    orderBy: { updatedAt: 'desc' },
    select: {
      expiresAt: true,
    },
  })

  const nextExpiresAtBase =
    currentProductSubscription?.expiresAt &&
    currentProductSubscription.expiresAt > now
      ? currentProductSubscription.expiresAt
      : now
  const focusProduct =
    productId === 'absystem_ai'
      ? await resolveProductByCodeCandidates(db, ['focus'])
      : null
  const focusSubscription = focusProduct
    ? await db.productSubscription.findFirst({
        where: {
          userId,
          productId: focusProduct.id,
          status: 'active',
        },
        orderBy: { updatedAt: 'desc' },
        select: {
          expiresAt: true,
        },
      })
    : null

  const focusCarryOverMs =
    productId === 'absystem_ai' &&
    focusSubscription?.expiresAt &&
    focusSubscription.expiresAt > now
      ? focusSubscription.expiresAt.getTime() - now.getTime()
      : 0
  const expiresAt = new Date(
    nextExpiresAtBase.getTime() + plan.durationDays * 86400000 + focusCarryOverMs
  )
  const amount = input.amount ?? plan.amount
  const planCode = `${productId}:${planId}`
  const isTrialZoom = productId === 'trial_zoom'
  const trialZoomExpiresAt = isTrialZoom
    ? resolveTrialZoomExpiryDate(now, plan.durationDays)
    : null

  await db.productSubscription.upsert({
    where: {
      userId_productId: {
        userId,
        productId: product.id,
      },
    },
    update: {
      status: isTrialZoom ? 'trial' : 'active',
      expiresAt: isTrialZoom ? null : expiresAt,
      trialEndsAt: isTrialZoom ? trialZoomExpiresAt : null,
      paidAt: now,
      amount,
    },
    create: {
      userId,
      productId: product.id,
      status: isTrialZoom ? 'trial' : 'active',
      expiresAt: isTrialZoom ? null : expiresAt,
      trialEndsAt: isTrialZoom ? trialZoomExpiresAt : null,
      paidAt: now,
      amount,
    },
  })

  console.log('📝 [PAYMENT:ECOSYSTEM] Subscription updated', {
    userId,
    productId,
    expiresAt,
  })

  await upsertLegacySubscription(db, {
    userId,
    productId: product.id,
    planCode,
    expiresAt: trialZoomExpiresAt ?? expiresAt,
  })

  if (productId === 'focus') {
    await db.user.update({
      where: { id: userId },
      data: {
        focusPaid: true,
        funnelStage: 'PAID',
        funnelUpdatedAt: now,
      },
    })
  }

  await syncLifecycleForUser(userId, db)
  await invalidateFunnelStage(userId)

  console.log('[ACCESS] Subscription activated', {
    userId,
    productId,
    planId,
    expiresAt,
    lifecycle: 'synced_from_unified_runtime',
    durationDays: plan.durationDays,
  })

  return {
    status: 'approved',
    userId,
    productId,
    enrollmentId: null,
    expertId: user.expertId ?? null,
  }
}

export async function processPayment({
  userId,
  productId,
  amount,
  payRef,
  currency,
}: PaymentData): Promise<PaymentResult> {
  if (productId.startsWith(`${stankeyManifest.productId}:`)) {
    const planCode = productId.slice(`${stankeyManifest.productId}:`.length)
    if (!(planCode in STANKEY_SUBSCRIPTION_DURATIONS)) {
      return { status: 'failed', userId, reason: 'INVALID_STANKEY_PLAN' }
    }

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { expertId: true },
    })
    if (!user) return { status: 'failed', userId, reason: 'USER_NOT_FOUND' }

    const now = new Date()
    const durationDays = STANKEY_SUBSCRIPTION_DURATIONS[planCode]
    const periodEnd =
      typeof durationDays === 'number'
        ? new Date(now.getTime() + durationDays * 86400000)
        : null
    const existingSub = await prisma.subscription.findFirst({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      select: { id: true },
    })

    if (existingSub) {
      await prisma.subscription.update({
        where: { id: existingSub.id },
        data: {
          status: 'ACTIVE',
          planCode,
          startsAt: now,
          trialEndsAt: null,
          currentPeriodEnd: periodEnd,
          autoRenew: false,
          expertId: user.expertId ?? undefined,
          productId: stankeyManifest.productId,
        },
      })
    } else {
      await prisma.subscription.create({
        data: {
          userId,
          expertId: user.expertId ?? undefined,
          productId: stankeyManifest.productId,
          status: 'ACTIVE',
          planCode,
          startsAt: now,
          currentPeriodEnd: periodEnd,
          autoRenew: false,
        },
      })
    }

    await prisma.purchaseHistory.create({
      data: {
        userId,
        expertId: user.expertId ?? undefined,
        amountCents: Math.round(amount * 100),
        currency: currency ?? stankeyManifest.pricing.currency,
        metadata: {
          kind: 'stankey_subscription',
          provider: 'wayforpay',
          productId: stankeyManifest.productId,
          planCode,
          payRef,
        },
      },
    })

    await syncLifecycleForUser(userId)
    await invalidateFunnelStage(userId)

    return {
      status: 'approved',
      userId,
      productId: stankeyManifest.productId,
      enrollmentId: null,
      expertId: user.expertId ?? null,
    }
  }

  if (productId in CORE_SUBSCRIPTION_DURATIONS) {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { expertId: true },
    })

    if (!user) return { status: 'failed', userId, reason: 'USER_NOT_FOUND' }

    const now = new Date()
    const periodEnd = new Date(
      now.getTime() + CORE_SUBSCRIPTION_DURATIONS[productId] * 86400000
    )
    const existingSub = await prisma.subscription.findFirst({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      select: { id: true },
    })

    if (existingSub) {
      await prisma.subscription.update({
        where: { id: existingSub.id },
        data: {
          status: 'ACTIVE',
          planCode: productId,
          startsAt: now,
          trialEndsAt: null,
          currentPeriodEnd: periodEnd,
          autoRenew: true,
          expertId: user.expertId ?? undefined,
          productId: null,
        },
      })
    } else {
      await prisma.subscription.create({
        data: {
          userId,
          expertId: user.expertId ?? undefined,
          status: 'ACTIVE',
          planCode: productId,
          startsAt: now,
          currentPeriodEnd: periodEnd,
          autoRenew: true,
        },
      })
    }

    await prisma.purchaseHistory.create({
      data: {
        userId,
        expertId: user.expertId ?? undefined,
        amountCents: Math.round(amount * 100),
        currency: 'EUR',
        metadata: {
          kind: 'core_subscription',
          planCode: productId,
          payRef,
        },
      },
    })

    await syncLifecycleForUser(userId)
    await invalidateFunnelStage(userId)

    return {
      status: 'approved',
      userId,
      productId,
      enrollmentId: null,
      expertId: user.expertId ?? null,
    }
  }

  const product = await prisma.product.findUnique({
    where: { id: productId },
    select: { id: true, durationDays: true, ownerId: true },
  })
  if (!product) return { status: 'failed', userId, reason: 'PRODUCT_NOT_FOUND' }

  const enrollment = await prisma.enrollment.upsert({
    where: { userId_productId: { userId, productId } },
    update: { purchased: true },
    create: { userId, productId, purchased: true },
    select: { id: true, enrolledAt: true, trialEnd: true },
  })

  const existingSub = await prisma.subscription.findFirst({
    where: { userId, expertId: product.ownerId },
    orderBy: { createdAt: 'desc' },
    select: { id: true },
  })

  const now = new Date()
  const periodEnd = new Date(now.getTime() + product.durationDays * 86400000)

  if (existingSub) {
    await prisma.subscription.update({
      where: { id: existingSub.id },
      data: { status: 'ACTIVE', currentPeriodEnd: periodEnd },
    })
  } else {
    await prisma.subscription.create({
      data: {
        expertId: product.ownerId,
        userId,
        status: 'ACTIVE',
        planCode: payRef,
        currentPeriodEnd: periodEnd,
        startsAt: now,
      },
    })
  }

  await syncLifecycleForUser(userId)
  await invalidateFunnelStage(userId)

  return {
    status: 'approved',
    userId,
    productId,
    enrollmentId: enrollment.id,
    expertId: product.ownerId,
  }
}
