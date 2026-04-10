import { Request, Router } from 'express';
import { productOwnerGuard } from '../../middleware/productOwnerGuard.js';
import { requireClientAccess } from '../access/guard.js';
import { authRequired } from '../../modules/auth/middleware/auth.js';
import { requireGenerationQuota } from '../quota/generation.middleware.js';
import * as aiController from './controllers.js';

const router: Router = Router();
router.use(authRequired);
router.use(requireClientAccess);

// ── Існуючі роути (не змінено) ───────────────────────────────────────────────
router.get('/session/:sessionId?', aiController.getSession);
router.get('/history',             aiController.getHistory);
router.get('/context',             aiController.getContext);
router.get('/insight',             aiController.getInstantInsight);

router.get('/daily-entry',         aiController.listDailyEntries);
router.get('/daily-entry/latest',  aiController.latestDailyEntry);
router.get('/daily-entry/today',   aiController.todayEntry);
router.post('/daily-cycle',        aiController.submitDailyCycle);

router.post('/wheel',              aiController.processWheel);

router.get('/trial/status',        aiController.getTrialStatus);
router.get('/paid/status',         aiController.getPaidStatus);
router.get('/micro-tasks',         aiController.getMicroTasks);
router.post('/micro-tasks/manual', aiController.createManualMicroTask);
router.post('/micro-tasks/replace', aiController.replaceManualMicroTasks);
router.delete('/micro-tasks/:id',  aiController.deleteMicroTaskController);
router.patch('/micro-tasks/:id/complete', aiController.completeMicroTask);
router.patch('/micro-tasks/:id/skip',     aiController.skipMicroTask);
router.patch('/micro-tasks/:id/progress', aiController.updateMicroTaskProgressController);
router.patch('/micro-tasks/:id/step',     aiController.updateMicroTaskStepController);

router.get('/setup/progress',              aiController.getOnboardingStage);
router.post('/setup/wheel',                aiController.setupWheel);
router.post('/setup/questions/generate',   aiController.generateQuestions);
router.post('/setup/questions',            aiController.submitQuestions);
router.post('/setup/complete',             aiController.completeSetup);

// ── З квотою (не змінено, виправлено дублікат /chat) ─────────────────────────
router.post('/morning',        requireGenerationQuota, aiController.morningSession);
router.post('/evening',        requireGenerationQuota, aiController.eveningSession);
router.post('/chat-legacy',    requireGenerationQuota, aiController.sendMessage);
router.post('/chat', aiController.streamChat)

router.post('/wheel-analysis', requireGenerationQuota, aiController.processWheel);
router.post('/weekly',         requireGenerationQuota, aiController.weeklySession);
router.post('/pdf-report',     requireGenerationQuota, aiController.pdfReport);

// ── Новий роут (додано) ───────────────────────────────────────────────────────
// GET /api/mentor/weekly-report?productId=xxx
// Повний тижневий звіт: метрики + Hero варіанти + рекламні тексти
router.get('/weekly-report', requireGenerationQuota, productOwnerGuard, aiController.weeklyReportHandler);
router.get('/context/:userId', aiController.getContextByUserId)

export default router;
