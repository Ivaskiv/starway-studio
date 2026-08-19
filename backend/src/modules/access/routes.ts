import { Router } from 'express'
import { authRequired } from '../auth/middleware/auth.js'
import {
  getMyAccess,
  getMySystemState,
  getUserProductAccess,
  grantUserProductAccess,
  revokeUserProductAccess,
} from './controller.js'

const router = Router()

// ✅ НОВИЙ: /access/me - abilities
router.get('/me', authRequired, getMyAccess)

// ✅ НОВИЙ: /access/state - повний стан
router.get('/state', authRequired, getMySystemState)
router.get('/user/:userId', authRequired, getUserProductAccess)
router.post('/grant', authRequired, grantUserProductAccess)
router.post('/revoke', authRequired, revokeUserProductAccess)

export default router
