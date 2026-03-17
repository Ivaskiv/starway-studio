import { Router } from 'express'
import { authRequired } from '../auth/middleware/auth.js'
import {
  getOrCreateQuota,
  purchaseQuota,
  checkQuota,
  getAvailableQuota,
} from './service.js'

const router = Router()
router.use(authRequired)

router.get('/me', async (req, res) => {
  const userId = req.user?.id
  if (!userId) {
    return res.status(401).json({ error: 'unauthorized' })
  }
  const quota = await getOrCreateQuota(userId)
  res.json({
    available: getAvailableQuota(quota),
    used: quota.used,
    purchased: quota.purchased,
    periodStart: quota.periodStart,
    baseLimit: quota.baseLimit,
  })
})

router.post('/purchase', async (req, res) => {
  const userId = req.user?.id
  if (!userId) {
    return res.status(401).json({ error: 'unauthorized' })
  }
  const { amount, costUsd } = req.body
  const purchase = await purchaseQuota(userId, amount, costUsd)
  res.json({
    available: getAvailableQuota(purchase),
    purchased: purchase.purchased,
  })
})

export default router
