import { Router } from 'express'

import { dbAudit } from './db.audit.controller.js'

const router = Router()

router.get('/db-audit', dbAudit)

export default router
