// backend/src/modules/ai-generator/routes.ts
import { Router } from 'express';
import { authRequired } from '../../modules/auth/middleware/auth.js';
import {
  buildBlueprintHandler,
  generateStepHandler,
  getWorkflowHandler,
  saveBlueprintHandler,
  saveWorkflowHandler,
  // ── Додано ──────────────────
  heroGenerateHandler,
  adTextsGenerateHandler,
} from './controller.js';

const router = Router();

router.use(authRequired);

// ── Існуючі (не змінено) ─────────────────────────────────────────────────────
router.get('/workflow',     getWorkflowHandler);
router.put('/workflow',     saveWorkflowHandler);
router.post('/step',        generateStepHandler);
router.post('/blueprint',   buildBlueprintHandler);
router.post('/save-funnel', saveBlueprintHandler);

// ── Нові: AI Producer ─────────────────────────────────────────────────────────
// POST /api/ai-generator/hero  { niche, targetAudience, utp, tone?, language? }
router.post('/hero', heroGenerateHandler);

// POST /api/ai-generator/ads   { niche, targetAudience, heroHeadline, language? }
router.post('/ads',  adTextsGenerateHandler);

export default router;