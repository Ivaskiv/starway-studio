// backend/src/modules/vision/routes.ts
/**
 * Vision Routes
 */

import { authRequired } from '@/modules/auth/middleware/auth.js';
import { Router } from 'express';
import { createVision, getVision, updateVision } from './controller.js';

const router = Router();
router.use(authRequired);

router.post('/', createVision);
router.get('/', getVision);
router.put('/', updateVision);

export default router;
