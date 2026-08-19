// backend/src/modules/progress/progress.routes.ts
import { authRequired } from '../auth/middleware/auth.js';
import { requireClientAccess } from '../access/guard.js';
import { requireBehavioralReadAccess } from '../../core/access/behavioralAccess.js';
import { Router } from 'express';
import { getMyProgress, getUserProgress, updateMyProgress } from './controller.js';

const router = Router();
router.use(authRequired);

router.get('/', requireBehavioralReadAccess('progress'), getMyProgress);
router.get('/:userId', requireClientAccess, getUserProgress);
router.put('/', requireClientAccess, updateMyProgress);

export default router;
