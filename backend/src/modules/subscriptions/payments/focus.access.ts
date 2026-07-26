import { prisma } from '../../../db/client.js'

export const FOCUS_PRODUCT_CODES = ['focus', 'FOCUS'] as const
export const EXCHANGE_PRICE = 200

export type UserAccessState = {
  state: 'FOCUS_ACTIVE' | 'NO_ACCESS'
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

/**
 * Canonical FOCUS entitlement resolver.
 *
 * ProductSubscription is the only source of truth for paid access.
 * User.focusPaid, lifecycleState, funnelStage and the legacy Subscription table
 * are projections only and must never grant or deny access.
 */
export async function getUserAccessState(userId: string): Promise<UserAccessState> {
  const now = new Date()

  const subscription = await prisma.productSubscription.findFirst({
    where: {
      userId,
      product: {
        code: { equals: 'focus', mode: 'insensitive' },
      },
    },
    select: {
      status: true,
      expiresAt: true,
      trialEndsAt: true,
    },
    orderBy: { createdAt: 'desc' },
  })

  if (!subscription) return noAccess()

  const status = String(subscription.status ?? '').trim().toLowerCase()

  if (status === 'trial') {
    if (!subscription.trialEndsAt) return noAccess()
    return subscription.trialEndsAt.getTime() > now.getTime()
      ? focusActive(subscription.trialEndsAt)
      : noAccess(subscription.trialEndsAt)
  }

  if (status !== 'active' && status !== 'paid') {
    return noAccess(subscription.expiresAt ?? null)
  }

  if (subscription.expiresAt && subscription.expiresAt.getTime() <= now.getTime()) {
    return noAccess(subscription.expiresAt)
  }

  return focusActive(subscription.expiresAt ?? null)
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
