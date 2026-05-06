import type { Response } from 'express'

import type { AuthenticatedRequest } from '../../types/globalTypes.js'
import { trackEvent } from '../events/service.js'

import { createPayment } from './billing.service.js'
import type { BillingPlan } from './subscription.entity.js'

export async function createBillingPaymentHandler(req: AuthenticatedRequest, res: Response) {
  try {
    const userId = req.user?.id
    if (!userId) return res.status(401).json({ error: 'unauthorized' })

    const plan = typeof req.body?.plan === 'string' ? req.body.plan.trim() as BillingPlan : null
    if (plan !== 'monthly' && plan !== 'yearly') {
      return res.status(400).json({ error: 'invalid_plan' })
    }

    const variant = req.body?.variant === 'B' ? 'B' : 'A'
    const result = await createPayment(userId, plan, variant)

    await trackEvent({
      userId,
      type: 'billing_payment_initiated',
      source: 'web',
      state: plan,
      payload: {
        plan,
        orderReference: result.orderReference,
        variant,
      },
    })

    return res.json(result)
  } catch (error) {
    console.error('❌ createBillingPaymentHandler error', error)
    return res.status(500).json({ error: 'server_error' })
  }
}
