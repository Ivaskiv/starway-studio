import { Router } from 'express'

import { requireClientAccess } from '../access/guard.js'
import { authOrBotRequired } from '../auth/middleware/auth-or-bot.js'
import * as aiController from '../ai-mentor/controllers.js'

const router = Router()

router.use(authOrBotRequired)

router.post('/chat', requireClientAccess, aiController.sendMessage)
router.post('/actions/morning', requireClientAccess, aiController.morningSession)
router.post('/actions/evening', requireClientAccess, aiController.eveningSession)

export default router

