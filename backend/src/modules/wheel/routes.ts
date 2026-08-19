// backend/src/modules/wheel/wheel.routes.ts

import { Router } from 'express'
import { requireClientAccess } from '../access/guard.js'
import { authRequired } from '../auth/middleware/auth.js'
import { requireBehavioralReadAccess } from '../../core/access/behavioralAccess.js'

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
router.use(authRequired)

/**
 * Create wheel
 * POST /api/wheel
 */
router.post('/', requireClientAccess, createWheelAssessment)

/**
 * Cooldown status
 * GET /api/wheel/cooldown
 */
router.get('/cooldown', requireBehavioralReadAccess('wheel_cooldown'), getWheelCooldownHandler)

/**
 * Wheel history
 * GET /api/wheel/history?limit=10
 */
router.get('/history', requireBehavioralReadAccess('wheel_history'), getWheelHistoryHandler)

/**
 * Latest wheel
 * GET /api/wheel/latest
 */
router.get('/latest', requireBehavioralReadAccess('wheel_latest'), getLatestWheelHandler)

/**
 * Analytics
 * GET /api/wheel/analytics
 */
router.get('/analytics', requireBehavioralReadAccess('wheel_analytics'), getWheelAnalyticsHandler)

/**
 * Telegram reminder
 * POST /api/wheel/:id/telegram-reminder
 */
router.post('/:id/telegram-reminder', requireClientAccess, sendWheelTelegramReminderHandler)

/**
 * Download PDF report
 * GET /api/wheel/:id/pdf
 */
router.get('/:id/pdf', requireClientAccess, generateWheelPDFHandler)

export default router
