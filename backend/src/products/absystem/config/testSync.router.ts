import { Router } from 'express';
import { authRequired } from '../../../modules/auth/middleware/auth.js';
import { TestSyncController } from './testSync.controller.js';

const router = Router();

/**
 * Omnichannel Test Sync Routes
 * Authenticated access required for state synchronization
 */

router.get('/:linkToken/state', authRequired, TestSyncController.getTestState);

router.post('/:linkToken/submit-answer', authRequired, TestSyncController.submitAnswer);
router.get('/:linkToken/payment-status', authRequired, TestSyncController.getPaymentStatus);

export default router;