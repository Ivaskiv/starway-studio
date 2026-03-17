import { Router } from 'express'
import { authRequired } from '../../modules/auth/middleware/auth.js'
import { getMyAccess, getMySystemState } from './controller.js'

const router = Router()

// ✅ НОВИЙ: /access/me - abilities
router.get('/me', authRequired, getMyAccess)

// ✅ НОВИЙ: /access/state - повний стан
router.get('/state', authRequired, getMySystemState)

export default router