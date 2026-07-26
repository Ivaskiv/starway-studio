import { prisma } from '../../../db/client.js'

export const FOCUS_PRODUCT_CODES = ['focus', 'FOCUS'] as const
const FOCUS_PRODUCT_ID = '68c3e55a-4b70-4680-a26c-15fdd607fd59'
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
      code: { in: [...FOCUS_PRODUCT_CODES] },
    },
    select: { id: true, code: true },
  })
}

export async function hasActiveFocusSubscription(userId: string): Promise<boolean> {
  const accessState = await getUserAccessState(userId)
  return accessState.hasFocus
}

export async function getUserAccessState(userId: string): Promise<UserAccessState> {
  const now = new Date()
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { focusPaid: true },
  })

  if (user?.focusPaid) {
    return {
      state: 'FOCUS_ACTIVE',
      isActive: true,
      hasFocus: true,
      expiresAt: null,
    }
  }

  const subscription = await prisma.productSubscription.findFirst({
    where: {
      userId,
      productId: FOCUS_PRODUCT_ID,
    },
    select: {
      status: true,
      paidAt: true,
      expiresAt: true,
      trialEndsAt: true,
    },
    orderBy: { createdAt: 'desc' },
  })

  if (!subscription) {
    return {
      state: 'NO_ACCESS',
      isActive: false,
      hasFocus: false,
      expiresAt: null,
    }
  }

  const status = String(subscription.status ?? '').trim().toLowerCase()
  const activeStatuses = new Set(['active', 'paid', 'trial'])
  if (activeStatuses.has(status)) {
    if (status === 'trial' && subscription.trialEndsAt) {
      const isActive = subscription.trialEndsAt.getTime() > now.getTime()
      return {
        state: isActive ? 'FOCUS_ACTIVE' : 'NO_ACCESS',
        isActive,
        hasFocus: isActive,
        expiresAt: subscription.trialEndsAt,
      }
    }
    return {
      state: 'FOCUS_ACTIVE',
      isActive: true,
      hasFocus: true,
      expiresAt: subscription.expiresAt ?? null,
    }
  }

  if (subscription.paidAt) {
    if (subscription.expiresAt && subscription.expiresAt.getTime() <= now.getTime()) {
      return {
        state: 'NO_ACCESS',
        isActive: false,
        hasFocus: false,
        expiresAt: subscription.expiresAt,
      }
    }
    return {
      state: 'FOCUS_ACTIVE',
      isActive: true,
      hasFocus: true,
      expiresAt: subscription.expiresAt ?? null,
    }
  }

  return {
    state: 'NO_ACCESS',
    isActive: false,
    hasFocus: false,
    expiresAt: subscription.expiresAt ?? null,
  }
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
