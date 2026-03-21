import { Router } from 'express'
import { authRequired } from '../auth/middleware/auth.js'
import {
  generateDeepLinkHandler,
  generateTelegramBindingHandler,
  resolveDeepLinkHandler,
} from './controller.js'

const router = Router()

router.post('/generate', authRequired, generateDeepLinkHandler)
router.get('/telegram', authRequired, generateTelegramBindingHandler)
router.post('/resolve', resolveDeepLinkHandler)

export default router
