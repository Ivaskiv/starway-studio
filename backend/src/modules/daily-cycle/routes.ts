import express from 'express';
const router = express.Router();

import { requireClientAccess } from '../access/guard.js';
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
router.use(requireClientAccess);

// GET today's entry
router.get('/today', getToday);

// UPSERT daily entry
router.post('/entry', upsertEntry);

// AUTOSAVE morning answer
router.patch('/morning/answer', saveMorningAnswer);

// AUTOSAVE session answer by step
router.patch('/session/:entryId/answer', saveSessionAnswer);

// SKIP yesterday recovery
router.post('/skip', skipPreviousDay);

// GET history
router.get('/history', getHistoryController);

// GET user micro tasks
router.get('/tasks', getTasks);

// COMPLETE micro task
router.post('/tasks/:taskId/complete', completeTask);

export default router;
