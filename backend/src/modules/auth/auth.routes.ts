// backend/src/modules/auth/auth.routes.ts

import { Router } from 'express'
import { authRequired } from '../../middleware/auth.js'
import { register, login, socialAuth, getMe } from './auth.controller.js'

const router = Router()

router.post('/register', register)
router.post('/login', login)
router.post('/social', socialAuth)
router.get('/me', authRequired, getMe);

export default router
