import { Router } from 'express'

import { dbAudit, fastForwardNotificationJobs } from './db.audit.controller.js'

const router = Router()

router.get('/db-audit', dbAudit)
router.post('/fast-forward', fastForwardNotificationJobs)

export default router
