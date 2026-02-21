// backend/src/modules/microTask/routes.ts
import { microTaskController } from '@/modules/microTask/controller.js'
import { Router } from 'express'

const router = Router();

// MicroTask endpoints
router.post('/ai', microTaskController.createFromAI)
router.get('/active/:userId', microTaskController.getActive)
router.post('/complete/:taskId', microTaskController.completeTask)

// MicroTaskResponse endpoints
router.post('/response', microTaskController.createResponse)
router.get('/response/:userId', microTaskController.getResponses)
router.post('/response/complete/:responseId', microTaskController.completeResponse)

export default router;