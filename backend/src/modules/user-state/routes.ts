import { Router } from 'express'
import { authOrBotRequired } from '../auth/middleware/auth-or-bot.js'
import { getUserState } from './controller.js'

const router = Router()

router.get('/state', authOrBotRequired, getUserState)

export default router
