// backend/src/modules/mentorship/routes.ts
/**
 * Mentorship Routes
 */

import { authRequired } from '@/modules/auth/middleware/auth.js';
import { Router } from 'express';
import {
  activate,
  checkEligibility,
  createOffer,
  getMyMentorship,
  getMyOffer,
  updateStatus,
} from './controller.js';

const router = Router();
router.use(authRequired);

router.get('/eligible', checkEligibility);
router.post('/offer', createOffer);
router.post('/activate', activate);
router.get('/my', getMyMentorship);
router.get('/offer', getMyOffer);
router.patch('/:id/status', updateStatus);

export default router;
