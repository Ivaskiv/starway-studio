// backend/src/modules/trial/routes.ts
/**
 * Trial Routes
 */

import { authRequired } from '../../modules/auth/middleware/auth.js';
import { Router } from 'express';
import { generateMirrorHandler, getTrialStatusHandler, startTrialHandler } from './controller.js';

const router = Router();
router.use(authRequired);

router.post('/start', startTrialHandler);
router.get('/status', getTrialStatusHandler);
router.post('/mirror', generateMirrorHandler);

export default router;
