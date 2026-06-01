import { Router } from 'express'

import { broadcastBlock9, dbAudit, fastForwardNotificationJobs, resetChannelPost, resetTestProgress } from './db.audit.controller.js'

const router = Router()

router.get('/db-audit', dbAudit)
router.post('/fast-forward', fastForwardNotificationJobs)
router.post('/broadcast-block9', broadcastBlock9)
router.post('/reset-channel-post', resetChannelPost)
router.post('/reset-test-progress', resetTestProgress)

export default router
