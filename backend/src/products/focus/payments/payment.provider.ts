import { EcosystemPaymentPlanId } from '../../../modules/subscriptions/payments/business/service.js'

export interface CheckoutSession {
  checkoutUrl: string
  payRef: string
}

export interface ProductPaymentProvider {
  productId: string

  /** Створює посилання на оплату для конкретного плану */
  createCheckout(
    userId: string,
    planId: EcosystemPaymentPlanId
  ): Promise<CheckoutSession>

  /** Обробка успішної оплати (викликається з вебхука) */
  onPaymentSuccess(
    userId: string,
    planId: EcosystemPaymentPlanId
  ): Promise<void>
}
