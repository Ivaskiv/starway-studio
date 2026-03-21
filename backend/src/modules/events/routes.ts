import { Router } from 'express'
import { ingestEvent } from './controller.js'

const router = Router()

router.post('/track', ingestEvent)

export default router
