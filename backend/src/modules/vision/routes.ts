// backend/src/modules/vision/routes.ts
/**
 * Vision Routes
 */

import { authRequired } from '../auth/middleware/auth.js';
import { requireClientAccess } from '../access/guard.js';
import { Router } from 'express';
import { createVision, getVision, updateVision } from './controller.js';

const router = Router();
router.use(authRequired);
router.use(requireClientAccess);

router.post('/', createVision);
router.get('/', getVision);
router.put('/', updateVision);

export default router;
