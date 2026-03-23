// backend/src/modules/five-points/routes.ts
import { Router } from 'express';
import { requireLeadAccess } from '../access/guard.js';
import { authRequired } from '../../modules/auth/middleware/auth.js';
import { getEnrollmentHandler, enrollHandler, progressHandler } from './controller.js';

const router = Router();

router.get('/enrollment', authRequired, requireLeadAccess({ allowStart: true }), getEnrollmentHandler);
router.post('/enroll', authRequired, requireLeadAccess({ allowStart: true }), enrollHandler);
router.patch('/progress', authRequired, requireLeadAccess(), progressHandler);

export default router;
