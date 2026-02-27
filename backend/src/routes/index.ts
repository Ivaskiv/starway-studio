// backend/src/routes/index.ts
import accessRoutes from '@/modules/access/routes.js'
import authRoutes from '@/modules/auth/auth.routes.js'
import progressRoutes from '@/modules/progress/routes.js'
import wheelRoutes from '@/modules/wheel/routes.js'
import { Router } from 'express'

const router = Router()

router.use('/auth', authRoutes)
router.use('/access', accessRoutes)
router.use('/progress', progressRoutes)
router.use('/wheel', wheelRoutes)

export default router
