import express from 'express';
const router = express.Router();

import { requireClientAccess } from '../access/guard.js';
import { authRequired } from '../../modules/auth/middleware/auth.js';
import {
  completeTask,
  getHistoryController,
  getTasks,
  getToday,
  upsertEntry
} from './controller.js';

router.use(authRequired);
router.use(requireClientAccess);

// GET today's entry
router.get('/today', getToday);

// UPSERT daily entry
router.post('/entry', upsertEntry);

// GET history
router.get('/history', getHistoryController);

// GET user micro tasks
router.get('/tasks', getTasks);

// COMPLETE micro task
router.post('/tasks/:taskId/complete', completeTask);

export default router;
