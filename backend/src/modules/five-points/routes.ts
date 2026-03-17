// backend/src/modules/five-points/routes.ts
import { Router } from 'express';
import { authRequired } from '../../modules/auth/middleware/auth.js';
import { getEnrollmentHandler, enrollHandler, progressHandler } from './controller.js';

const router = Router();

router.get('/enrollment', authRequired, getEnrollmentHandler);
router.post('/enroll', authRequired, enrollHandler);
router.patch('/progress', authRequired, progressHandler);

export default router;