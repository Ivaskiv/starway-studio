import { Router } from 'express'
import { authOrBotRequired } from '../auth/middleware/auth-or-bot.js'
import { getProfileHandler, getStreakSummaryHandler, getSummaryHandler, postEventHandler } from './controller.js'

const router = Router()
router.get('/profile', authOrBotRequired, getProfileHandler)
router.get('/streak', authOrBotRequired, getStreakSummaryHandler)
router.get('/summary', authOrBotRequired, getSummaryHandler)
router.post('/events', authOrBotRequired, postEventHandler)
export default router
