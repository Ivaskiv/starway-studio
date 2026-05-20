import { Router } from 'express'
import { authRequired } from '../auth/middleware/auth.js'
import { productOwnerGuard } from '../../middleware/productOwnerGuard.js'
import {
  getFeatureFlags,
  generateBannerGenerations,
  getBannerGenerations,
  getDashboardStats,
  getBehavioral,
  getFunnel,
  getLaunchGovernance,
  getFounder,
  getInsights,
  getOperatorGovernance,
  getJourney,
  getProductIntelligenceView,
  getLive,
  getOverview,
  getQuestions,
  getRetention,
  getReleaseGovernance,
  getProductionActivation,
} from './controller.js'

const router = Router()

router.get('/stats', authRequired, productOwnerGuard, getDashboardStats)
router.get('/overview', authRequired, getOverview)
router.get('/behavioral', authRequired, getBehavioral)
router.get('/funnel', authRequired, getFunnel)
router.get('/founder', authRequired, getFounder)
router.get('/questions', authRequired, getQuestions)
router.get('/retention', authRequired, getRetention)
router.get('/insights', authRequired, getInsights)
router.get('/live', authRequired, getLive)
router.get('/journey/:userId', authRequired, getJourney)
router.get('/intelligence', authRequired, getProductIntelligenceView)
router.get('/intelligence/product/:productId', authRequired, productOwnerGuard, getProductIntelligenceView)
router.get('/governance', authRequired, getOperatorGovernance)
router.get('/launch', authRequired, getLaunchGovernance)
router.get('/release', authRequired, getReleaseGovernance)
router.get('/activation', authRequired, getProductionActivation)
router.get('/feature-flags', authRequired, getFeatureFlags)
router.get('/banners', authRequired, getBannerGenerations)
router.post('/banners/generate', authRequired, generateBannerGenerations)

export default router
