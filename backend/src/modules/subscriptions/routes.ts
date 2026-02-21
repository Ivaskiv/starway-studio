// backend/src/modules/subscriptions/routes.ts
import { Router } from 'express';
import { wayForPayCallback } from './payments/callback.js';

const router = Router();

// WayForPay callback
router.post('/wayforpay/callback', wayForPayCallback);

export default router;
