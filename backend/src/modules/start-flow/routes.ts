import { Router } from 'express'
import { authRequired } from '../auth/middleware/auth.js'
import { startFlowController } from './controller.js'

const router = Router()

router.post('/', authRequired, startFlowController)

export default router
