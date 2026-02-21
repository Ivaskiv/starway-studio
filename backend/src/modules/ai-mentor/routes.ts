// backend/src/modules/ai-mentor/routes.ts

import { authRequired } from '@/modules/auth/middleware/auth.js';
import { Router } from 'express';

// Import controllers
import {
  affirmationController,
  chatController,
  dailyController,
  setupController,
} from './controllers/index.js';

const router = Router();
router.use(authRequired);

// ==========================================
// SETUP WIZARD
// ==========================================
router.get('/setup/progress', setupController.getProgress);
router.post('/setup/wheel', setupController.setupWheel);
router.post('/setup/questions/generate', setupController.generateQuestions);
router.post('/setup/questions', setupController.setupQuestions);
router.post('/setup/complete', setupController.finishSetup);

// ==========================================
// CHAT
// ==========================================
router.post('/chat', chatController.sendMessage);
router.get('/session/:sessionId?', chatController.getSession);
router.get('/history', chatController.getChatHistory);

// ==========================================
// DAILY SESSIONS
// ==========================================
router.post('/morning-session', affirmationController.generateMorningSession);
router.post('/evening-session', affirmationController.generateEveningSession);
router.post('/affirmation', affirmationController.generateAffirmation);

// ==========================================
// DAILY CYCLE
// ==========================================
router.post('/daily-cycle', dailyController.submitDailyCycle);
router.post('/daily-entry', dailyController.submitDailyEntry);
router.get('/daily-entries', dailyController.getDailyEntriesHandler);
router.get('/daily-entry/latest', dailyController.getLatestDailyEntryHandler);
router.get('/daily-entry/today', dailyController.checkTodayEntry);

export default router;
