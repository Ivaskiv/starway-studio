// backend/src/routes/index.ts
import accessRoutes from '../modules/access/routes.js'
import analyticsRoutes from '../modules/analytics/routes.js'
import authRoutes from '../modules/auth/auth.routes.js'
import progressRoutes from '../modules/progress/routes.js'
import startFlowRoutes from '../modules/start-flow/routes.js'
import userStateRoutes from '../modules/user-state/routes.js'
import wheelRoutes from '../modules/wheel/routes.js'
import gamificationRoutes from '../modules/gamification/routes.js'
import { Router } from 'express'

const router = Router()

router.use('/auth', authRoutes)
router.use('/access', accessRoutes)
router.use('/analytics', analyticsRoutes)
router.use('/progress', progressRoutes)
router.use('/start-flow', startFlowRoutes)
router.use('/user', userStateRoutes)
router.use('/wheel', wheelRoutes)
router.use('/gamification', gamificationRoutes)

export default router
