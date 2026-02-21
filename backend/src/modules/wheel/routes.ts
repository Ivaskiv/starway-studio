// backend/src/modules/wheel/wheel.routes.ts
import { authRequired } from '@/modules/auth/middleware/auth.js';
import { Router } from 'express';
import {
  createWheelAssessment,
  generateWheelPDFHandler,
  getLatestWheelHandler,
  getWheelAnalyticsHandler,
  getWheelCooldownHandler,
  getWheelHistoryHandler,
  sendWheelTelegramReminderHandler,
} from './controller.js';

const router = Router();

// POST /api/wheel - Створити нове колесо балансу
router.post('/', authRequired, createWheelAssessment);

// GET /api/wheel/cooldown - Статус cooldown
router.get('/cooldown', authRequired, getWheelCooldownHandler);

// GET /api/wheel/history?limit=10 - Історія колес
router.get('/history', authRequired, getWheelHistoryHandler);

// GET /api/wheel/latest - Останнє колесо
router.get('/latest', authRequired, getLatestWheelHandler);

// GET /api/wheel/analytics - Аналітика
router.get('/analytics', authRequired, getWheelAnalyticsHandler);

// GET /api/wheel/:id/pdf - Завантажити PDF
router.get('/:id/pdf', authRequired, generateWheelPDFHandler);

// POST /api/wheel/:id/remind-telegram - Надіслати нагадування в Telegram
router.post('/:id/remind-telegram', authRequired, sendWheelTelegramReminderHandler);

export default router;
