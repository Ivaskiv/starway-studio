// backend/src/modules/daily-cycle/daily.routes.ts
import { authRequired } from '@/modules/auth/middleware/auth.js';
import {
  completeMicroTask,
  getHistory,
  getMicroTasks,
  getTodayEntry,
  upsertEntry,
} from '@/modules/daily-cycle/controller.js';
import { Router } from 'express';

const router = Router();

// 🔐 Всі маршрути під авторизацією
router.use(authRequired);

// ==========================
// Daily Entries
// ==========================
router.get('/today', getTodayEntry);
router.post('/entry', upsertEntry);
router.get('/history', getHistory);

// ==========================
// Micro Tasks
// ==========================
router.get('/tasks', getMicroTasks);
router.post('/tasks/:taskId/complete', completeMicroTask);

export default router;
