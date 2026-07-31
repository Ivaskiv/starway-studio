import { prisma } from '../../../db/client.js'

export const FOCUS_PRODUCT_CODES = ['focus', 'FOCUS'] as const
export const EXCHANGE_PRICE = 200

export type UserAccessState = {
  state: 'FOCUS_ACTIVE' | 'PREMIUM' | 'NO_ACCESS'
  isActive: boolean
  hasFocus: boolean
  expiresAt: Date | null
}

export type ZoomExchangeAccessPolicy = {
  state: 'FOCUS_ACTIVE' | 'NO_ACCESS'
  isFree: boolean
  price: number | null
  message: string
  promo: {
    title: string
    body: string
    benefits: string[]
  }
}

export async function getConfiguredFocusProduct() {
  return prisma.product.findFirst({
    where: {
      code: { equals: 'focus', mode: 'insensitive' },
    },
    select: { id: true, code: true },
  })
}

export async function hasActiveFocusSubscription(userId: string): Promise<boolean> {
  const accessState = await getUserAccessState(userId)
  return accessState.hasFocus
}

function noAccess(expiresAt: Date | null = null): UserAccessState {
  return {
    state: 'NO_ACCESS',
    isActive: false,
    hasFocus: false,
    expiresAt,
  }
}

function focusActive(expiresAt: Date | null): UserAccessState {
  return {
    state: 'FOCUS_ACTIVE',
    isActive: true,
    hasFocus: true,
    expiresAt,
  }
}

function trialZoomActive(expiresAt: Date): UserAccessState {
  return {
    state: 'PREMIUM',
    isActive: false,
    hasFocus: false,
    expiresAt,
  }
}

/**
 * Canonical FOCUS entitlement resolver.
 *
 * ProductSubscription is the only source of truth for paid access.
 * User.focusPaid, lifecycleState, funnelStage and the legacy Subscription table
 * are projections only and must never grant or deny access.
 */
export async function getUserAccessState(userId: string): Promise<UserAccessState> {
  const now = new Date()
  const relevantProductFilter = {
    userId,
    OR: [
      {
        product: {
          code: { equals: 'focus', mode: 'insensitive' as const },
        },
      },
      {
        product: {
          code: { equals: 'trial_zoom', mode: 'insensitive' as const },
        },
      },
    ],
  }
  const focusProductFilter = {
    userId,
    product: {
      code: { equals: 'focus', mode: 'insensitive' as const },
    },
  }
  const trialZoomProductFilter = {
    userId,
    product: {
      code: { equals: 'trial_zoom', mode: 'insensitive' as const },
    },
  }

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      telegramUserId: true,
      telegramChatId: true,
    },
  })

  const activeSubscription = await prisma.productSubscription.findFirst({
    where: {
      ...focusProductFilter,
      OR: [
        {
          status: { in: ['active', 'paid'] },
          OR: [{ expiresAt: null }, { expiresAt: { gt: now } }],
        },
        {
          status: 'trial',
          trialEndsAt: { gt: now },
        },
      ],
    },
    select: {
      status: true,
      paidAt: true,
      expiresAt: true,
      trialEndsAt: true,
      product: {
        select: {
          code: true,
        },
      },
    },
    orderBy: { createdAt: 'desc' },
  })

  const activeTrialZoomSubscription = await prisma.productSubscription.findFirst({
    where: {
      ...trialZoomProductFilter,
      status: 'trial',
      trialEndsAt: { gt: now },
    },
    select: {
      status: true,
      paidAt: true,
      expiresAt: true,
      trialEndsAt: true,
      product: {
        select: {
          code: true,
        },
      },
    },
    orderBy: { createdAt: 'desc' },
  })

  const subscription =
    activeSubscription ??
    activeTrialZoomSubscription ??
    (await prisma.productSubscription.findFirst({
      where: relevantProductFilter,
      select: {
        status: true,
        paidAt: true,
        expiresAt: true,
        trialEndsAt: true,
        product: {
          select: {
            code: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    }))

  const subscriptionRows = await prisma.productSubscription.findMany({
    where: relevantProductFilter,
    select: {
      status: true,
      paidAt: true,
      expiresAt: true,
      trialEndsAt: true,
      product: {
        select: {
          code: true,
        },
      },
    },
    orderBy: { createdAt: 'desc' },
  })

  const logResult = (result: UserAccessState) => {
    console.info('[ZOOM_ACCESS_REFRESH_BACKEND]', {
      telegramUserId: user?.telegramUserId ?? null,
      telegramChatId: user?.telegramChatId ?? null,
      resolvedUserId: userId,
      productSubscriptions: subscriptionRows.map((row) => ({
        productCode: row.product.code,
        status: row.status,
        paidAt: row.paidAt,
        expiresAt: row.expiresAt,
        trialEndsAt: row.trialEndsAt,
      })),
      calculatedHasFocus: result.hasFocus,
      responseBody: result,
    })
    return result
  }

  if (!subscription) return logResult(noAccess())

  const status = String(subscription.status ?? '').trim().toLowerCase()
  const productCode = String(subscription.product.code ?? '').trim().toLowerCase()

  if (status === 'trial') {
    if (!subscription.trialEndsAt) return logResult(noAccess())
    if (productCode === 'trial_zoom') {
      return logResult(
        subscription.trialEndsAt.getTime() > now.getTime()
          ? trialZoomActive(subscription.trialEndsAt)
          : noAccess(subscription.trialEndsAt),
      )
    }
    return logResult(
      subscription.trialEndsAt.getTime() > now.getTime()
        ? focusActive(subscription.trialEndsAt)
        : noAccess(subscription.trialEndsAt),
    )
  }

  if (status !== 'active' && status !== 'paid') {
    return logResult(noAccess(subscription.expiresAt ?? null))
  }

  if (subscription.expiresAt && subscription.expiresAt.getTime() <= now.getTime()) {
    return logResult(noAccess(subscription.expiresAt))
  }

  return logResult(focusActive(subscription.expiresAt ?? null))
}

export async function getZoomExchangeAccessPolicy(userId: string): Promise<ZoomExchangeAccessPolicy> {
  const access = await getUserAccessState(userId)
  const promo = {
    title: 'Ти можеш зробити це безкоштовно у ФОКУС',
    body: 'І отримати:',
    benefits: [
      'всі Zoom-практики',
      'нагадування',
      'підтримку',
    ],
  }

  if (access.state === 'FOCUS_ACTIVE') {
    return {
      state: access.state,
      isFree: true,
      price: null,
      message: 'Обмін доступний безкоштовно для учасників ФОКУС',
      promo,
    }
  }

  return {
    state: 'NO_ACCESS',
    isFree: false,
    price: EXCHANGE_PRICE,
    message: 'Обмін доступний для учасників ФОКУС або за оплату',
    promo,
  }
}
