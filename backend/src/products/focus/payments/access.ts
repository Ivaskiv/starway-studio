import { prisma } from '../../../db/client.js'
import { FOCUS_PRODUCT_CODES } from '../../../modules/subscriptions/payments/focus.access.js'

/**
 * Перевіряє, чи має користувач активну підписку на Focus.
 */
export async function hasFocusAccess(userId: string): Promise<boolean> {
  const subscription = await prisma.productSubscription.findFirst({
    where: {
      userId,
      product: { is: { code: { in: [...FOCUS_PRODUCT_CODES] } } },
      status: 'active',
      expiresAt: { gt: new Date() },
    },
    select: { id: true },
  })

  return !!subscription
}

/**
 * Логіка для визначення, чи може користувач бачити кнопку оплати.
 * Наприклад: не показувати, якщо вже оплачено.
 */
export async function canPurchaseFocus(userId: string): Promise<boolean> {
  const active = await hasFocusAccess(userId)
  return !active
}
