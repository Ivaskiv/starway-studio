// backend/src/modules/progress/progress.routes.ts
import { authRequired } from '@/modules/auth/middleware/auth.js';
import { Router } from 'express';
import { addPoints, getMyProgress, getUserProgress, updateMyProgress } from './controller.js';

const router = Router();

router.get('/', authRequired, getMyProgress);
router.get('/:userId', authRequired, getUserProgress);
router.put('/', authRequired, updateMyProgress);
router.post('/points', authRequired, addPoints);

export default router;
