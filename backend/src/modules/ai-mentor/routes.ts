import { Router } from 'express';
import { productOwnerGuard } from '../../middleware/productOwnerGuard.js';
import { requireClientAccess } from '../access/guard.js';
import { authRequired } from '../auth/middleware/auth.js';
import { requireGenerationQuota } from '../quota/generation.middleware.js';
import { requireBehavioralReadAccess } from '../../core/access/behavioralAccess.js';
import * as aiController from './controllers.js';

const router: Router = Router();
router.use(authRequired);

// ── Існуючі роути (не змінено) ───────────────────────────────────────────────
router.get('/session/:sessionId?', requireBehavioralReadAccess('continuity_artifacts'), aiController.getSession);
router.get('/history',             requireBehavioralReadAccess('continuity_artifacts'), aiController.getHistory);
router.get('/context',             requireBehavioralReadAccess('continuity_artifacts'), aiController.getContext);
router.get('/insight',             requireBehavioralReadAccess('continuity_artifacts'), aiController.getInstantInsight);

router.get('/daily-entry',         requireBehavioralReadAccess('daily_history'), aiController.listDailyEntries);
router.get('/daily-entry/latest',  requireBehavioralReadAccess('daily_history'), aiController.latestDailyEntry);
router.get('/daily-entry/today',    requireBehavioralReadAccess('daily_today'), aiController.todayEntry);
router.post('/daily-cycle',        requireClientAccess, aiController.submitDailyCycle);

router.post('/wheel',              requireClientAccess, aiController.processWheel);

router.get('/trial/status',        requireBehavioralReadAccess('continuity_artifacts'), aiController.getTrialStatus);
router.get('/paid/status',         requireBehavioralReadAccess('continuity_artifacts'), aiController.getPaidStatus);
router.get('/micro-tasks',         requireBehavioralReadAccess('continuity_artifacts'), aiController.getMicroTasks);
router.post('/micro-tasks/manual', requireClientAccess, aiController.createManualMicroTask);
router.post('/micro-tasks/replace', requireClientAccess, aiController.replaceManualMicroTasks);
router.delete('/micro-tasks/:id',  requireClientAccess, aiController.deleteMicroTaskController);
router.patch('/micro-tasks/:id/complete', requireClientAccess, aiController.completeMicroTask);
router.patch('/micro-tasks/:id/skip',     requireClientAccess, aiController.skipMicroTask);
router.patch('/micro-tasks/:id/progress', requireClientAccess, aiController.updateMicroTaskProgressController);
router.patch('/micro-tasks/:id/step',     requireClientAccess, aiController.updateMicroTaskStepController);

router.get('/setup/progress',              requireBehavioralReadAccess('continuity_artifacts'), aiController.getOnboardingStage);
router.post('/setup/wheel',                requireClientAccess, aiController.setupWheel);
router.post('/setup/questions/generate',   requireClientAccess, aiController.generateQuestions);
router.post('/setup/questions',            requireClientAccess, aiController.submitQuestions);
router.post('/setup/complete',             requireClientAccess, aiController.completeSetup);

// ── З квотою (не змінено, виправлено дублікат /chat) ─────────────────────────
router.post('/morning',        requireClientAccess, requireGenerationQuota, aiController.morningSession);
router.post('/evening',        requireClientAccess, requireGenerationQuota, aiController.eveningSession);
router.post('/chat-legacy',    requireClientAccess, requireGenerationQuota, aiController.sendMessage);
router.post('/chat', requireClientAccess, aiController.streamChat)

router.post('/wheel-analysis', requireClientAccess, requireGenerationQuota, aiController.processWheel);
router.post('/weekly',         requireClientAccess, requireGenerationQuota, aiController.weeklySession);
router.post('/pdf-report',     requireClientAccess, requireGenerationQuota, aiController.pdfReport);

// ── Новий роут (додано) ───────────────────────────────────────────────────────
// GET /api/mentor/weekly-report?productId=xxx
// Повний тижневий звіт: метрики + Hero варіанти + рекламні тексти
router.get('/weekly-report', requireClientAccess, requireGenerationQuota, productOwnerGuard, aiController.weeklyReportHandler);
router.get('/context/:userId', requireClientAccess, aiController.getContextByUserId)

export default router;
