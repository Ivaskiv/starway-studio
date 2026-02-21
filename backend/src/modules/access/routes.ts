// backend/src/modules/access/routes.ts

import { authRequired } from '@/modules/auth/middleware/auth.js';
import { Router } from 'express';
import { checkFeatureAccess, getMyAccess } from './controller.js';

const router = Router();
router.use(authRequired);

router.get('/me', getMyAccess);
router.get('/check/:feature', checkFeatureAccess);

export default router;
