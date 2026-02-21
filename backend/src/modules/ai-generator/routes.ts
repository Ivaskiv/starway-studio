// backend/src/modules/ai-generator/routes.ts
import { Router } from 'express';
import { authRequired } from '@/modules/auth/middleware/auth.js';
import {
  buildBlueprintHandler,
  generateStepHandler,
  getWorkflowHandler,
  saveBlueprintHandler,
  saveWorkflowHandler,
} from './controller.js';

const router = Router();

// fix code_x: full AI Producer flow endpoints used by frontend RTK Query.
router.use(authRequired);
router.get('/workflow', getWorkflowHandler);
router.put('/workflow', saveWorkflowHandler);
router.post('/step', generateStepHandler);
router.post('/blueprint', buildBlueprintHandler);
router.post('/save-funnel', saveBlueprintHandler);

export default router;
