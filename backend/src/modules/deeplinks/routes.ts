import { Router } from 'express'
import { authRequired } from '../auth/middleware/auth.js'
import {
  generateDeepLinkHandler,
  generateTelegramBindingHandler,
  resolveDeepLinkHandler,
  resolveDeepLinkSessionHandler,
} from './controller.js'

const router = Router()

router.post('/generate', authRequired, generateDeepLinkHandler)
router.get('/telegram', authRequired, generateTelegramBindingHandler)
router.post('/resolve', resolveDeepLinkHandler)
router.post('/resolve-session', resolveDeepLinkSessionHandler)

export default router
