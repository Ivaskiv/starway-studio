import { Router } from 'express'
import { authRequired } from '../auth/middleware/auth.js'
import { getProfileHandler, getStreakSummaryHandler } from './controller.js'

const router = Router()
router.get('/profile', authRequired, getProfileHandler)
router.get('/streak', authRequired, getStreakSummaryHandler)
export default router
