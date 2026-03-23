// backend/src/modules/goals/routes.ts
/**
 * Goals Routes
 */

import { authRequired } from '../../modules/auth/middleware/auth.js';
import { requireClientAccess } from '../access/guard.js';
import { Router } from 'express';
import { checkAlignment, createGoals, getGoals, getPrimary } from './controller.js';

const router = Router();
router.use(authRequired);
router.use(requireClientAccess);

router.post('/', createGoals);
router.get('/', getGoals);
router.get('/primary', getPrimary);
router.post('/check-alignment', checkAlignment);

export default router;
