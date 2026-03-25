import { Router } from 'express'
import { authRequired } from '../auth/middleware/auth.js'
import { getJournalEventsHandler } from './controller.js'

const router = Router()

router.get('/range', authRequired, getJournalEventsHandler)
router.get('/', authRequired, getJournalEventsHandler)

export default router
