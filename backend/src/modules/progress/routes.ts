// backend/src/modules/progress/progress.routes.ts
import { authRequired } from '../../modules/auth/middleware/auth.js';
import { requireClientAccess } from '../access/guard.js';
import { Router } from 'express';
import { getMyProgress, getUserProgress, updateMyProgress } from './controller.js';

const router = Router();
router.use(authRequired);
router.use(requireClientAccess);

router.get('/', getMyProgress);
router.get('/:userId', getUserProgress);
router.put('/', updateMyProgress);

export default router;
