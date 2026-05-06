import { Router } from 'express'
import { testMentor } from './mentor.debug.controller.js'
import { testOrchestrator } from './orchestrator.debug.controller.js'

const router = Router()

router.post('/mentor', testMentor)
router.post('/orchestrator', testOrchestrator)

export default router
