// backend/src/modules/goals/routes.ts
/**
 * Goals Routes
 */

import { authRequired } from '../auth/middleware/auth.js';
import { requireClientAccess } from '../access/guard.js';
import { requireBehavioralReadAccess } from '../../core/access/behavioralAccess.js';
import { Router } from 'express';
import { checkAlignment, createGoals, getGoals, getPrimary } from './controller.js';

const router = Router();
router.use(authRequired);

router.post('/', requireClientAccess, createGoals);
router.get('/', requireBehavioralReadAccess('goals'), getGoals);
router.get('/primary', requireBehavioralReadAccess('goals_primary'), getPrimary);
router.post('/check-alignment', requireBehavioralReadAccess('goals'), checkAlignment);

export default router;
