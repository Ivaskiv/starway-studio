import { Router } from 'express'
import type { Response } from 'express'
import { authRequired } from '../auth/middleware/auth.js'
import type { AuthenticatedRequest } from '../../types/globalTypes.js'
import { prisma } from '../../db/client.js'
import { getPlatformAccess } from './platform.access.js'
import { requirePlatformAccess } from './platform.guard.js'
import {
  getCycleHistory,
  getTodayCycle,
  saveEveningCycle,
  saveMorningCycle,
} from './platform.dailyCycle.service.js'
import {
  generatePlatformWeeklyReport,
  getPlatformMonthlyReport,
  getPlatformWeeklyReport,
} from './platform.reports.service.js'
import { getPlatformWheelSummary } from './platform.wheel.service.js'

const router = Router()

router.get('/access', authRequired, async (req: AuthenticatedRequest, res: Response) => {
  const userId = req.user?.id
  if (!userId) return res.status(401).json({ error: 'unauthorized' })

  const access = await getPlatformAccess(userId).catch((err: Error) => {
    if (err.message === 'User not found') return null
    throw err
  })

  if (!access) return res.status(404).json({ error: 'user_not_found' })

  return res.json(access)
})

router.post('/cycle/morning', authRequired, requirePlatformAccess, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user?.id
    if (!userId) return res.status(401).json({ error: 'unauthorized' })

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { expertId: true },
    })
    const result = await saveMorningCycle({
      ...req.body,
      userId,
      expertId: user?.expertId ?? userId,
    })
    return res.json(result)
  } catch (err) {
    console.error('[platform/morning]', err)
    return res.status(500).json({ error: 'Failed to save morning cycle' })
  }
})

router.post('/cycle/evening', authRequired, requirePlatformAccess, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user?.id
    if (!userId) return res.status(401).json({ error: 'unauthorized' })

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { expertId: true },
    })
    const result = await saveEveningCycle({
      ...req.body,
      userId,
      expertId: user?.expertId ?? userId,
    })
    return res.json(result)
  } catch (err) {
    console.error('[platform/evening]', err)
    return res.status(500).json({ error: 'Failed to save evening cycle' })
  }
})

router.get('/cycle/today', authRequired, requirePlatformAccess, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user?.id
    if (!userId) return res.status(401).json({ error: 'unauthorized' })

    const cycle = await getTodayCycle(userId)
    return res.json(cycle ?? { empty: true })
  } catch (err) {
    console.error('[platform/today]', err)
    return res.status(500).json({ error: 'Failed to get today cycle' })
  }
})

router.get('/cycle/history', authRequired, requirePlatformAccess, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user?.id
    if (!userId) return res.status(401).json({ error: 'unauthorized' })

    const days = Number(req.query.days) || 7
    const history = await getCycleHistory(userId, days)
    return res.json(history)
  } catch (err) {
    console.error('[platform/history]', err)
    return res.status(500).json({ error: 'Failed to get cycle history' })
  }
})

router.get('/wheel', authRequired, requirePlatformAccess, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user?.id
    if (!userId) return res.status(401).json({ error: 'unauthorized' })

    const wheel = await getPlatformWheelSummary(userId)
    return res.json(wheel)
  } catch (err) {
    console.error('[platform/wheel]', err)
    return res.status(500).json({ error: 'Failed to get platform wheel' })
  }
})

router.get('/reports/weekly', authRequired, requirePlatformAccess, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user?.id
    if (!userId) return res.status(401).json({ error: 'unauthorized' })

    const report = await getPlatformWeeklyReport(userId)
    return res.json(report)
  } catch (err) {
    console.error('[platform/reports/weekly]', err)
    return res.status(500).json({ error: 'Failed to get weekly report' })
  }
})

router.post('/reports/weekly/generate', authRequired, requirePlatformAccess, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user?.id
    if (!userId) return res.status(401).json({ error: 'unauthorized' })

    const report = await generatePlatformWeeklyReport(userId)
    return res.json(report)
  } catch (err) {
    console.error('[platform/reports/weekly/generate]', err)
    return res.status(500).json({ error: 'Failed to generate weekly report' })
  }
})

router.get('/reports/monthly', authRequired, requirePlatformAccess, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user?.id
    if (!userId) return res.status(401).json({ error: 'unauthorized' })

    const report = await getPlatformMonthlyReport(userId)
    return res.json(report)
  } catch (err) {
    console.error('[platform/reports/monthly]', err)
    return res.status(500).json({ error: 'Failed to get monthly report' })
  }
})

export default router
