import { Router } from 'express'
import { authRequired } from '../auth/middleware/auth.js'
import { productOwnerGuard } from '../../middleware/productOwnerGuard.js'
import { getDashboardStats } from './controller.js'

const router = Router()

router.get('/stats', authRequired, productOwnerGuard, getDashboardStats)

export default router
