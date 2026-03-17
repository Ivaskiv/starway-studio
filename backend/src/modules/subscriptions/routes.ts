// backend/src/modules/subscriptions/routes.ts
// Роути підписок + WayForPay callback — authRequired для захищених ендпоінтів
// Приклад: router.get('/status', authRequired, getSubscriptionStatus)

import { authRequired } from '../../modules/auth/middleware/auth.js';
import { Router } from 'express';
import { getSubscriptionStatus, listSubscriptions } from './controller.js';
import { wayForPayCallback } from './payments/callback.js';

const router = Router();

// Публічний webhook — WayForPay не передає Bearer token
router.post('/payments/wayforpay/callback', wayForPayCallback);

router.get('/status', authRequired, getSubscriptionStatus);
router.get('/',       authRequired, listSubscriptions);

export default router;