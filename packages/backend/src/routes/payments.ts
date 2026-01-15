// packages/backend/src/routes/payments.ts
import { Router } from 'express';
import { wayForPayCallback } from '../payments/callback.js';

const router = Router();

// WayForPay callback
router.post('/wayforpay/callback', wayForPayCallback);

export default router;
