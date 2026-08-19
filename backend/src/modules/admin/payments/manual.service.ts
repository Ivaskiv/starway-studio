import { prisma } from '../../../db/client.js'

export interface ManualApprovalResult {
  success: boolean
  userId: string
  message: string
}

/**
 * Викликається коли:
 * а) WayForPay callback прийшов але не розпарсився
 * б) Транзакція Declined але коуч хоче дати доступ вручну
 * в) Будь-яка інша ситуація де потрібен ручний override
 */
export async function grantFocusAccessManually(
  userId: string,
  grantedBy: 'coach' | 'admin' | 'webhook_fallback',
  orderReference?: string,
): Promise<ManualApprovalResult> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { id: true, focusPaid: true },
  })

  if (!user) return { success: false, userId, message: 'user_not_found' }
  if (user.focusPaid) return { success: true, userId, message: 'already_paid' }

  const focusProduct = await prisma.product.findFirst({
    where: { code: { in: ['focus', 'FOCUS'] } },
    select: { id: true },
  })
  if (!focusProduct?.id) {
    return { success: false, userId, message: 'focus_product_not_found' }
  }

  await prisma.$transaction(async (tx) => {
    await tx.user.update({
      where: { id: userId },
      data: { focusPaid: true },
    })

    await tx.productSubscription.upsert({
      where: { userId_productId: { userId, productId: focusProduct.id } },
      create: {
        userId,
        productId: focusProduct.id,
        status: 'active',
        paidAt: new Date(),
        amount: 0,
      },
      update: {
        status: 'active',
        paidAt: new Date(),
      },
    })

    await tx.notificationJob.updateMany({
      where: {
        payload: { path: ['userId'], equals: userId },
        status: 'PENDING',
      },
      data: { status: 'DONE' },
    })
  })

  console.info('[MANUAL_PAYMENT_GRANT]', { userId, grantedBy, orderReference: orderReference ?? null })
  return { success: true, userId, message: 'access_granted' }
}
