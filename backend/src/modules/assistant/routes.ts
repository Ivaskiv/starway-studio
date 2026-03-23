import { Router } from 'express'
import { requireClientAccess } from '../access/guard.js'
import { authenticate } from '../auth/middleware/auth.js'
import { chat } from './controller.js'

const router = Router()

router.post('/chat', authenticate, requireClientAccess, chat)

export default router
