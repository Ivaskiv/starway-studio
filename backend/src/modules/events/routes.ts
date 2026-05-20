import { Router } from 'express'
import { bindVerifiedMiniAppUser } from '../auth/middleware/telegram-miniapp-auth.js'
import { ingestEvent } from './controller.js'

const router = Router()

router.post('/track', bindVerifiedMiniAppUser, ingestEvent)

export default router
