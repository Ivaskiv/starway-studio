import { Router } from 'express'
import { authRequired } from '../auth/middleware/auth.js'
import { getUserState } from './controller.js'

const router = Router()

router.get('/state', authRequired, getUserState)

export default router
