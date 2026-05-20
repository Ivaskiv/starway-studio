// backend/src/modules/subscriptions/routes.ts
// Роути підписок + WayForPay callback — authRequired для захищених ендпоінтів
// Приклад: router.get('/status', authRequired, getSubscriptionStatus)

import { authRequired } from '../../modules/auth/middleware/auth.js';
import { Router } from 'express';
import {
  activateSubscriptionGrantHandler,
  activateSuperadminPaymentTestHandler,
  getSubscriptionStatus,
  initiateSubscriptionPaymentHandler,
  listSubscriptions,
  renderWayForPayCheckoutPageHandler,
  startSuperadminTrialTestHandler,
} from './controller.js';
import { wayForPayCallback } from './payments/callback.js';

const router = Router();

// Публічний webhook — WayForPay не передає Bearer token
router.post('/payments/wayforpay/callback', wayForPayCallback);
router.get('/payments/wayforpay/checkout/:token', renderWayForPayCheckoutPageHandler);

router.get('/status', authRequired, getSubscriptionStatus);
router.get('/',       authRequired, listSubscriptions);
router.post('/grants/activate', authRequired, activateSubscriptionGrantHandler);
router.post('/payments/wayforpay/initiate', authRequired, initiateSubscriptionPaymentHandler);
router.post('/test/superadmin/trial', authRequired, startSuperadminTrialTestHandler);
router.post('/test/superadmin/payment', authRequired, activateSuperadminPaymentTestHandler);

export default router;
