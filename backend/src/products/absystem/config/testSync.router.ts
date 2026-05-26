import { Router } from 'express';
import { authOrBotRequired } from '../../../modules/auth/middleware/auth-or-bot.js';
import { TestSyncController } from './testSync.controller.js';

const router = Router();

router.get('/:linkToken/state', authOrBotRequired, TestSyncController.getTestState);

router.post('/:linkToken/submit-answer', authOrBotRequired, TestSyncController.submitAnswer);
router.get('/:linkToken/payment-status', authOrBotRequired, TestSyncController.getPaymentStatus);

export default router;