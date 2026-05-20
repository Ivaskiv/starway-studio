import express from 'express';
const router = express.Router();

import { requireClientAccess } from '../access/guard.js';
import { requireBehavioralReadAccess } from '../../core/access/behavioralAccess.js';
import { authOrBotRequired } from '../../modules/auth/middleware/auth-or-bot.js';
import {
  completeTask,
  getHistoryController,
  getTasks,
  getToday,
  saveMorningAnswer,
  saveSessionAnswer,
  skipPreviousDay,
  upsertEntry
} from './controller.js';

router.use(authOrBotRequired);

// GET today's entry
router.get('/today', requireBehavioralReadAccess('daily_today'), getToday);

// UPSERT daily entry
router.post('/entry', requireClientAccess, upsertEntry);

// AUTOSAVE morning answer
router.patch('/morning/answer', requireClientAccess, saveMorningAnswer);

// AUTOSAVE session answer by step
router.patch('/session/:entryId/answer', requireClientAccess, saveSessionAnswer);

// SKIP yesterday recovery
router.post('/skip', requireClientAccess, skipPreviousDay);

// GET history
router.get('/history', requireBehavioralReadAccess('daily_history'), getHistoryController);

// GET user micro tasks
router.get('/tasks', requireBehavioralReadAccess('daily_history'), getTasks);

// COMPLETE micro task
router.post('/tasks/:taskId/complete', requireClientAccess, completeTask);

export default router;
