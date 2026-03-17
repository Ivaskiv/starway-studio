// backend/src/modules/wheel/wheel.routes.ts

import { Router } from 'express'
import { authRequired } from '../../modules/auth/middleware/auth.js'

import {
  createWheelAssessment,
  generateWheelPDFHandler,
  getLatestWheelHandler,
  getWheelAnalyticsHandler,
  getWheelCooldownHandler,
  getWheelHistoryHandler,
  sendWheelTelegramReminderHandler
} from './controller.js'

const router = Router()

/**
 * Create wheel
 * POST /api/wheel
 */
router.post('/', authRequired, createWheelAssessment)

/**
 * Cooldown status
 * GET /api/wheel/cooldown
 */
router.get('/cooldown', authRequired, getWheelCooldownHandler)

/**
 * Wheel history
 * GET /api/wheel/history?limit=10
 */
router.get('/history', authRequired, getWheelHistoryHandler)

/**
 * Latest wheel
 * GET /api/wheel/latest
 */
router.get('/latest', authRequired, getLatestWheelHandler)

/**
 * Analytics
 * GET /api/wheel/analytics
 */
router.get('/analytics', authRequired, getWheelAnalyticsHandler)

/**
 * Telegram reminder
 * POST /api/wheel/:id/telegram-reminder
 */
router.post('/:id/telegram-reminder', authRequired, sendWheelTelegramReminderHandler)

/**
 * Download PDF report
 * GET /api/wheel/:id/pdf
 */
router.get('/:id/pdf', authRequired, generateWheelPDFHandler)

export default router