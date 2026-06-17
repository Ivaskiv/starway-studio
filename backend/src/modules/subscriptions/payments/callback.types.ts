import type { processEcosystemPayment, processPayment } from './business.js'
import type { EcosystemPaymentPlanId, EcosystemPaymentProduct } from './business.js'

export type WebhookPaymentScope = 'stankey' | 'ecosystem' | 'zoom' | 'legacy'

export type ResolvedWebhookTarget = {
  scope: WebhookPaymentScope
  userId: string | null
  productId: string | null
  planId: string | null
  amount: number
  payRef: string
  ecosystemProductId?: EcosystemPaymentProduct
  ecosystemPlanId?: EcosystemPaymentPlanId
}

export type ProcessPaymentWebhookResult = {
  duplicate: boolean
  scope: WebhookPaymentScope
  productId: string | null
  planId: string | null
  payRef: string
  amount: number
  result:
    | Awaited<ReturnType<typeof processPayment>>
    | Awaited<ReturnType<typeof processEcosystemPayment>>
    | null
}
