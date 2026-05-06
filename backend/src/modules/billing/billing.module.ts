import { Router } from 'express'

import { authRequired } from '../auth/middleware/auth.js'

import { createBillingPaymentHandler } from './billing.controller.js'
import { billingWebhookHandler } from './webhook.handler.js'

const router = Router()

router.post('/pay', authRequired, createBillingPaymentHandler)
router.post('/webhook', billingWebhookHandler)

export default router
