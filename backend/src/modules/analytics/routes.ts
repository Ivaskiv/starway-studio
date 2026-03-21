import { Router } from 'express'
import { authRequired } from '../auth/middleware/auth.js'
import { productOwnerGuard } from '../../middleware/productOwnerGuard.js'
import {
  generateBannerGenerations,
  getBannerGenerations,
  getDashboardStats,
  getFunnel,
  getInsights,
  getJourney,
  getLive,
  getOverview,
  getQuestions,
  getRetention,
} from './controller.js'

const router = Router()

router.get('/stats', authRequired, productOwnerGuard, getDashboardStats)
router.get('/overview', authRequired, getOverview)
router.get('/funnel', authRequired, getFunnel)
router.get('/questions', authRequired, getQuestions)
router.get('/retention', authRequired, getRetention)
router.get('/insights', authRequired, getInsights)
router.get('/live', authRequired, getLive)
router.get('/journey/:userId', authRequired, getJourney)
router.get('/banners', authRequired, getBannerGenerations)
router.post('/banners/generate', authRequired, generateBannerGenerations)

export default router
