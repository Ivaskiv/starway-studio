// backend/src/modules/consultation/routes.ts
/**
 * Consultation Routes
 */

import { authRequired } from '../auth/middleware/auth.js';
import { Router } from 'express';
import { bookConsultation, checkTriggers, getMyConsultations, updateStatus } from './controller.js';

const router = Router();
router.use(authRequired);

router.get('/triggers', checkTriggers);
router.post('/book', bookConsultation);
router.get('/my', getMyConsultations);
router.patch('/:id/status', updateStatus);

export default router;
