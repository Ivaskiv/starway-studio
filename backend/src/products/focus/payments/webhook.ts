import { EcosystemPaymentPlanId } from '../../../modules/subscriptions/payments/business.js'
import { processPaymentWebhook } from '../../../modules/subscriptions/payments/callback.js'
import { PaymentCallbackData } from '../../../modules/subscriptions/types.js'
import { FocusWayForPayProvider } from './wayforpay.js'

/**
 * Викликається, коли приходить POST на /api/payments/wayforpay/callback
 */
export async function handleFocusWebhook(data: PaymentCallbackData) {
  // Використовуємо основний сервіс обробки (idempotency, logging, signature check)
  const result = await processPaymentWebhook(data)

  if (
    result.result?.status === 'approved' &&
    result.scope === 'ecosystem' &&
    result.productId === 'focus'
  ) {
    const userId = result.result.userId
    const planId = result.planId as EcosystemPaymentPlanId

    if (userId && planId) {
      // Викликаємо наш провайдер для специфічних дій Focus
      await FocusWayForPayProvider.onPaymentSuccess(userId, planId)
      return { success: true, userId, planId }
    }
  }

  return { success: false }
}
