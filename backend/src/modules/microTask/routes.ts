// backend/src/modules/microTask/routes.ts
import {
  completeResponseHandler,
  completeTask,
  createFromAI,
  createResponseHandler,
  getActive,
  getResponses,
  getStats,
} from './controller.js'
import { Router } from 'express'

const router = Router()

router.post('/ai', createFromAI)
router.get('/active/:userId', getActive)
router.post('/complete/:taskId', completeTask)
router.get('/stats/:userId', getStats)

router.post('/response', createResponseHandler)
router.get('/response/:userId', getResponses)
router.post('/response/complete/:responseId', completeResponseHandler)

export default router;
