import { Router } from 'express'
import { bindVerifiedMiniAppUser } from '../auth/middleware/telegram-miniapp.js'
import { ingestEvent } from './controller.js'

const router = Router()

router.post('/track', bindVerifiedMiniAppUser, ingestEvent)

export default router
