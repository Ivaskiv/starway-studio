import type { Request, Response } from 'express'

import { trackEvent } from '../events/service.js'
import type { PaymentCallbackData } from '../subscriptions/types.js'

import { handleBillingWebhook } from './billing.service.js'

export async function billingWebhookHandler(req: Request, res: Response) {
  try {
    const payload = req.body as PaymentCallbackData
    const result = await handleBillingWebhook(payload)
    const variantMatch = typeof payload.order_reference === 'string'
      ? payload.order_reference.match(/^billing_(monthly|yearly)_([AB])_/)
      : null
    const variant = variantMatch?.[2] ?? null

    if (!result.ok) {
      await trackEvent({
        userId: typeof payload.clientAccountId === 'string' ? payload.clientAccountId : null,
        type: 'billing_webhook_invalid',
        source: 'web',
        state: payload.transaction_status ?? null,
        payload: {
          orderReference: payload.order_reference ?? null,
        },
      })
      return res.status(400).send('FAIL')
    }

    if (result.subscription) {
      await trackEvent({
        userId: result.subscription.userId,
        type: 'payment_success',
        source: 'web',
        state: result.subscription.plan,
        payload: {
          provider: result.subscription.provider,
          duplicate: result.duplicate ?? false,
          expiresAt: result.subscription.expiresAt.toISOString(),
          variant,
        },
      })
    }

    return res.status(200).send('OK')
  } catch (error) {
    console.error('❌ billingWebhookHandler error', error)
    return res.status(500).send('FAIL')
  }
}
