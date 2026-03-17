import { Router } from 'express'
import { authenticate } from '../auth/middleware/auth.js'
import { chat } from './controller.js'

const router = Router()

router.post('/chat', authenticate, chat)

export default router