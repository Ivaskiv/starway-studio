import { prisma } from '../../../db/client.js'

export const FOCUS_PRODUCT_CODES = ['focus', 'FOCUS'] as const

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
  const subscription = await prisma.productSubscription.findFirst({
    where: {
      userId,
      status: 'active',
      product: { is: { code: { in: [...FOCUS_PRODUCT_CODES] } } },
      OR: [
        { expiresAt: null },
        { expiresAt: { gt: now } },
      ],
    },
    select: { id: true },
  })

  return Boolean(subscription)
}
