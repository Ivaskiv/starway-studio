import { prisma } from '../../../db/client.js'

export const FOCUS_PRODUCT_CODES = ['focus', 'FOCUS'] as const
const FOCUS_PRODUCT_ID = '68c3e55a-4b70-4680-a26c-15fdd607fd59'

export async function getConfiguredFocusProduct() {
  return prisma.product.findFirst({
    where: {
      code: { in: [...FOCUS_PRODUCT_CODES] },
    },
    select: { id: true, code: true },
  })
}

export async function hasActiveFocusSubscription(userId: string): Promise<boolean> {
  const now = new Date()
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { focusPaid: true },
  })

  if (user?.focusPaid) {
    return true
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
  })

  if (!subscription) {
    return false
  }

  const status = String(subscription.status ?? '').trim().toLowerCase()
  const activeStatuses = new Set(['active', 'paid', 'trial'])
  if (activeStatuses.has(status)) {
    if (status === 'trial' && subscription.trialEndsAt) {
      return subscription.trialEndsAt.getTime() > now.getTime()
    }
    return true
  }

  if (subscription.paidAt) {
    if (subscription.expiresAt && subscription.expiresAt.getTime() <= now.getTime()) {
      return false
    }
    return true
  }

  return false
}
