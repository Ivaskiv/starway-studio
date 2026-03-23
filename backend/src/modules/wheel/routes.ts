// backend/src/modules/wheel/wheel.routes.ts

import { Router } from 'express'
import { requireClientAccess } from '../access/guard.js'
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
router.use(authRequired)
router.use(requireClientAccess)

/**
 * Create wheel
 * POST /api/wheel
 */
router.post('/', createWheelAssessment)

/**
 * Cooldown status
 * GET /api/wheel/cooldown
 */
router.get('/cooldown', getWheelCooldownHandler)

/**
 * Wheel history
 * GET /api/wheel/history?limit=10
 */
router.get('/history', getWheelHistoryHandler)

/**
 * Latest wheel
 * GET /api/wheel/latest
 */
router.get('/latest', getLatestWheelHandler)

/**
 * Analytics
 * GET /api/wheel/analytics
 */
router.get('/analytics', getWheelAnalyticsHandler)

/**
 * Telegram reminder
 * POST /api/wheel/:id/telegram-reminder
 */
router.post('/:id/telegram-reminder', sendWheelTelegramReminderHandler)

/**
 * Download PDF report
 * GET /api/wheel/:id/pdf
 */
router.get('/:id/pdf', generateWheelPDFHandler)

export default router
