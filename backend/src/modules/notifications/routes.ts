import { Router } from 'express'

import { authRequired } from '../auth/middleware/auth.js'
import {
  deleteNotificationHandler,
  getNotificationDiagnosticsCatalogHandler,
  getNotificationDiagnosticsStatusHandler,
  getMyNotificationsHandler,
  getNotificationsHandler,
  markAllNotificationsReadHandler,
  markNotificationReadHandler,
  sendSessionHandoffHandler,
  sendDayFlowDiagnosticsHandler,
  sendEveningDiagnosticHandler,
  sendMorningDiagnosticHandler,
  sendNotificationDiagnosticHandler,
  sendTrialExpiredFlowDiagnosticsHandler,
} from './controller.js'

const router = Router()

router.get('/diagnostics/catalog', authRequired, getNotificationDiagnosticsCatalogHandler)
router.get('/diagnostics/status', authRequired, getNotificationDiagnosticsStatusHandler)
router.post('/session-handoff', authRequired, sendSessionHandoffHandler)
router.post('/diagnostics/morning', authRequired, sendMorningDiagnosticHandler)
router.post('/diagnostics/evening', authRequired, sendEveningDiagnosticHandler)
router.post('/diagnostics/event', authRequired, sendNotificationDiagnosticHandler)
router.post('/diagnostics/day-flow', authRequired, sendDayFlowDiagnosticsHandler)
router.post('/diagnostics/trial-expired-flow', authRequired, sendTrialExpiredFlowDiagnosticsHandler)

router.get('/me', authRequired, getMyNotificationsHandler)
router.put('/me/read-all', authRequired, markAllNotificationsReadHandler)
router.get('/:userId', authRequired, getNotificationsHandler)
router.put('/:id/read', authRequired, markNotificationReadHandler)
router.put('/:userId/read-all', authRequired, markAllNotificationsReadHandler)
router.delete('/:id', authRequired, deleteNotificationHandler)

export default router
