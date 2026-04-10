import { Router } from 'express'
import { authenticate } from '../auth/middleware/auth.js'
import {
  generateWebMapHandler,
  getDailyQuestionHandler,
  getWebMapHandler,
  runMonthlyAnalysisHandler,
  updateGoalProgressHandler,
} from './web-map.controller.js'

const router = Router()

router.use(authenticate)

router.get('/', getWebMapHandler)
router.post('/generate', generateWebMapHandler)
router.put('/goals/:id', updateGoalProgressHandler)
router.post('/analysis', runMonthlyAnalysisHandler)
router.get('/daily-question', getDailyQuestionHandler)

export default router
