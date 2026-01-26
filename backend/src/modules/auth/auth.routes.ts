// backend/src/modules/auth/auth.routes.ts

import { Router } from 'express'
import { register, login, socialAuth, getMe } from './auth.controller'
import { authRequired } from '../../middleware/auth'

const router = Router()

router.post('/register', register)
router.post('/login', login)
router.post('/social', socialAuth)

router.get('/me', authRequired, getMe);


export default router
