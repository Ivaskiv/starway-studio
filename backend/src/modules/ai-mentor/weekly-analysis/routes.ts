// backend/src/modules/ai-mentor/routes.ts

import { Router, type Response }     from 'express'
// import type { AuthenticatedRequest } from '../../types/globalTypes.js'
import { runWeeklyAnalysis }         from './service.js'
import { AuthenticatedRequest } from '../../../types/globalTypes.js'
import { Role } from '@starway/db/prisma-client'
import { authRequired } from '../../auth/middleware/auth.js'
import { prisma } from '../../../db/client.js'
import { serverError } from '../../../utils/serverError.js'

const router = Router()

const isAdmin = (role?: string) =>
  role === Role.SUPERADMIN || role === Role.ADMIN

const guardAdmin = (req: AuthenticatedRequest, res: Response): boolean => {
  if (!req.user)               { res.status(401).json({ error: 'unauthorized' }); return true }
  if (!isAdmin(req.user.role)) { res.status(403).json({ error: 'forbidden' });    return true }
  return false
}

// ─── GET /api/mentor/my-report ────────────────────────────────

router.get('/my-report', authRequired, async (req: AuthenticatedRequest, res: Response) => {
  try {
    if (!req.user) return res.status(401).json({ error: 'unauthorized' })

    const report = await prisma.weeklyReport.findFirst({
      where:   { userId: req.user.id },
      orderBy: { weekStart: 'desc' },
    })
    return res.json({ report: report ?? null })
  } catch (err) {
    serverError(res, 'weekly-analysis/my-report', err)
  }
})

// ─── GET /api/mentor/my-reports ───────────────────────────────

router.get('/my-reports', authRequired, async (req: AuthenticatedRequest, res: Response) => {
  try {
    if (!req.user) return res.status(401).json({ error: 'unauthorized' })

    const reports = await prisma.weeklyReport.findMany({
      where:   { userId: req.user.id },
      orderBy: { weekStart: 'desc' },
      take:    12,
      select: {
        id: true, weekStart: true, weekEnd: true,
        overallScore: true, completionRate: true,
        streakDays: true, nextWeekFocus: true, pdfUrl: true,
      },
    })
    return res.json({ reports })
  } catch (err) {
    serverError(res, 'weekly-analysis/my-reports', err)
  }
})

// ─── GET /api/mentor/admin/profiles ──────────────────────────

router.get('/admin/profiles', authRequired, async (req: AuthenticatedRequest, res: Response) => {
  try {
    if (guardAdmin(req, res)) return

    const {
      risk, upsell,
      page  = '1',
      limit = '20',
    } = req.query as Record<string, string>

    const where: Record<string, unknown> = {}
    if (risk === 'high')   where.retentionRisk = { lte: 4 }
    if (risk === 'medium') where.retentionRisk = { gte: 5, lte: 7 }
    if (risk === 'low')    where.retentionRisk = { gte: 8 }
    if (upsell === 'true') where.upsellReady   = true

    const [profiles, total] = await Promise.all([
      prisma.mentorWeeklyProfile.findMany({
        where,
        orderBy: [{ retentionRisk: 'asc' }, { createdAt: 'desc' }],
        take:    Number(limit),
        skip:    (Number(page) - 1) * Number(limit),
        include: { user: { select: { id: true, email: true, name: true } } },
      }),
      prisma.mentorWeeklyProfile.count({ where }),
    ])

    return res.json({ profiles, total, page: Number(page) })
  } catch (err) {
    serverError(res, 'weekly-analysis/admin/profiles', err)
  }
})

// ─── GET /api/mentor/admin/profiles/:userId ───────────────────

router.get('/admin/profiles/:userId', authRequired, async (req: AuthenticatedRequest, res: Response) => {
  try {
    if (guardAdmin(req, res)) return

    const { userId } = req.params

    const [profiles, reports] = await Promise.all([
      prisma.mentorWeeklyProfile.findMany({
        where: { userId }, orderBy: { weekStart: 'desc' }, take: 8,
      }),
      prisma.weeklyReport.findMany({
        where: { userId }, orderBy: { weekStart: 'desc' }, take: 8,
      }),
    ])

    return res.json({ profiles, reports })
  } catch (err) {
    serverError(res, 'weekly-analysis/admin/profiles/:userId', err)
  }
})

// ─── POST /api/mentor/admin/run/:userId ───────────────────────

router.post('/admin/run/:userId', authRequired, async (req: AuthenticatedRequest, res: Response) => {
  try {
    if (guardAdmin(req, res)) return

    const result = await runWeeklyAnalysis(req.params.userId)
    if (!result) return res.status(400).json({ message: 'Недостатньо даних для аналізу' })

    return res.json({ ok: true, retentionRisk: result.mentorProfile.retentionRisk })
  } catch (err) {
    serverError(res, 'weekly-analysis/admin/run', err)
  }
})

// ─── PATCH /api/mentor/admin/profiles/:profileId/offer-shown ─

router.patch('/admin/profiles/:profileId/offer-shown', authRequired, async (req: AuthenticatedRequest, res: Response) => {
  try {
    if (guardAdmin(req, res)) return

    await prisma.mentorWeeklyProfile.update({
      where: { id: req.params.profileId },
      data:  { offerShownAt: new Date() },
    })
    return res.json({ ok: true })
  } catch (err) {
    serverError(res, 'weekly-analysis/admin/offer-shown', err)
  }
})

export default router