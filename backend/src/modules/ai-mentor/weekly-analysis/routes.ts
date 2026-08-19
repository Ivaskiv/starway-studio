// backend/src/modules/ai-mentor/routes.ts

import { Router, type Response }     from 'express'
// import type { AuthenticatedRequest } from '../../types/globalTypes.js'
import { runWeeklyAnalysis }         from './index.js'
import { AuthenticatedRequest } from '../../../types/globalTypes.js'
import { Role } from '@starway/db/prisma-client'
import { authRequired } from '../../auth/middleware/auth.js'
import { prisma } from '../../../db/client.js'
import {
  getCachedLatestWeeklyReport,
  getCachedWeeklyReportById,
  getCachedWeeklyReports,
} from '../../../lib/db/weeklyReportCache.js'
import { serverError } from '../../../utils/serverError.js'

const router = Router()
const MONTH_WINDOW_DAYS = 30
const TOP_THEME_LIMIT = 5
const RECENT_CONVERSATION_LIMIT = 3

const isAdmin = (role?: string) =>
  role === Role.SUPERADMIN || role === Role.ADMIN

const guardAdmin = (req: AuthenticatedRequest, res: Response): boolean => {
  if (!req.user)               { res.status(401).json({ error: 'unauthorized' }); return true }
  if (!isAdmin(req.user.role)) { res.status(403).json({ error: 'forbidden' });    return true }
  return false
}

const UK_STOP_WORDS = new Set([
  'і', 'й', 'та', 'але', 'аби', 'або', 'що', 'щоб', 'це', 'ця', 'цей', 'ці', 'для', 'про',
  'без', 'над', 'під', 'після', 'перед', 'так', 'як', 'коли', 'де', 'бо', 'чи', 'вже', 'дуже',
  'мене', 'мені', 'тебе', 'тобі', 'собі', 'його', 'її', 'їх', 'воно', 'вони', 'ми', 'ви', 'ти',
  'є', 'бути', 'було', 'була', 'був', 'буде', 'ще', 'ось', 'там', 'тут', 'свій', 'своя', 'своє',
  'після', 'через', 'знову', 'іноді', 'тому', 'тоді', 'саме', 'коли', 'куди', 'зараз', 'сьогодні',
  'завтра', 'вчора', 'теж', 'тільки', 'поки', 'раз', 'два', 'один', 'одна', 'одне', 'була',
])

function extractTopThemes(messages: string[]): string[] {
  const counts = new Map<string, number>()

  for (const content of messages) {
    const words = content
      .toLowerCase()
      .replace(/https?:\/\/\S+/g, ' ')
      .replace(/[^\p{L}\p{N}\s-]/gu, ' ')
      .split(/\s+/)
      .map(word => word.trim())
      .filter(word => word.length >= 4 && !UK_STOP_WORDS.has(word))

    for (const word of words) {
      counts.set(word, (counts.get(word) ?? 0) + 1)
    }
  }

  return Array.from(counts.entries())
    .sort((left, right) => right[1] - left[1])
    .slice(0, TOP_THEME_LIMIT)
    .map(([word]) => word)
}

// ─── GET /api/mentor/my-report ────────────────────────────────

router.get('/my-report', authRequired, async (req: AuthenticatedRequest, res: Response) => {
  try {
    if (!req.user) return res.status(401).json({ error: 'unauthorized' })

    let report = await getCachedLatestWeeklyReport(req.user.id)

    if (!report) {
      await runWeeklyAnalysis(req.user.id)
      report = await getCachedLatestWeeklyReport(req.user.id)
    }

    return res.json({ report: report ?? null })
  } catch (err) {
    serverError(res, 'weekly-analysis/my-report', err)
  }
})

// ─── GET /api/mentor/my-reports ───────────────────────────────

router.get('/my-reports', authRequired, async (req: AuthenticatedRequest, res: Response) => {
  try {
    if (!req.user) return res.status(401).json({ error: 'unauthorized' })

    const reports = await getCachedWeeklyReports(req.user.id)
    return res.json({ reports })
  } catch (err) {
    serverError(res, 'weekly-analysis/my-reports', err)
  }
})

router.get('/my-reports/:reportId', authRequired, async (req: AuthenticatedRequest, res: Response) => {
  try {
    if (!req.user) return res.status(401).json({ error: 'unauthorized' })

    const report = await getCachedWeeklyReportById(req.user.id, req.params.reportId)

    if (!report) return res.status(404).json({ error: 'report_not_found' })
    return res.json({ report })
  } catch (err) {
    serverError(res, 'weekly-analysis/my-reports/:reportId', err)
  }
})

router.get('/monthly-context', authRequired, async (req: AuthenticatedRequest, res: Response) => {
  try {
    if (!req.user) return res.status(401).json({ error: 'unauthorized' })

    const windowStart = new Date()
    windowStart.setHours(0, 0, 0, 0)
    windowStart.setDate(windowStart.getDate() - (MONTH_WINDOW_DAYS - 1))

    const [conversations, goalsSet, subscription, zoomAttendances] = await Promise.all([
      prisma.aiConversation.findMany({
      where: {
        userId: req.user.id,
        updatedAt: { gte: windowStart },
      },
      orderBy: { updatedAt: 'desc' },
      include: {
        messages: {
          orderBy: { createdAt: 'desc' },
          take: 12,
        },
      },
      }),
      prisma.goalsSet.findFirst({
        where: { userId: req.user.id },
        orderBy: { createdAt: 'desc' },
      }),
      prisma.subscription.findFirst({
        where: { userId: req.user.id },
        orderBy: { createdAt: 'desc' },
        select: {
          status: true,
          planCode: true,
          trialEndsAt: true,
          currentPeriodEnd: true,
          autoRenew: true,
        },
      }),
      prisma.zoomSessionAttendee.findMany({
        where: {
          userId: req.user.id,
          createdAt: { gte: windowStart },
        },
        orderBy: { createdAt: 'desc' },
        take: 4,
        include: {
          session: {
            select: {
              topic: true,
              scheduledAt: true,
              status: true,
              postSessionReport: true,
            },
          },
        },
      }),
    ])

    const flattenedMessages = conversations.flatMap(conversation => conversation.messages)
    const userMessages = flattenedMessages.filter(message => message.role === 'USER')
    const assistantMessages = flattenedMessages.filter(message => message.role === 'ASSISTANT')
    const topThemes = extractTopThemes(userMessages.map(message => message.content))

    const recentHighlights = conversations
      .slice(0, RECENT_CONVERSATION_LIMIT)
      .map(conversation => {
        const previewSource = conversation.messages.find(message => message.role === 'ASSISTANT')
          ?? conversation.messages.find(message => message.role === 'USER')

        return {
          id: conversation.id,
          title: conversation.title?.trim() || 'Діалог із асистентом',
          updatedAt: conversation.updatedAt,
          preview: previewSource?.content?.trim().slice(0, 180) ?? '',
          messageCount: conversation.messages.length,
        }
      })

    const goals = Array.isArray(goalsSet?.goals)
      ? goalsSet?.goals
      : []

    const normalizedGoals = goals
      .map((goal: unknown) => {
        if (!goal || typeof goal !== 'object') return null
        const record = goal as Record<string, unknown>
        return {
          text: String(record.text ?? '').trim(),
          isPrimary: Boolean(record.isPrimary),
        }
      })
      .filter((goal): goal is { text: string; isPrimary: boolean } => Boolean(goal?.text))

    const zoomSummary = zoomAttendances.map(item => ({
      topic: item.session.topic,
      scheduledAt: item.session.scheduledAt,
      status: item.session.status,
      attended: item.attended,
      note: item.session.postSessionReport,
    }))

    return res.json({
      summary: {
        totalConversations: conversations.length,
        totalMessages: flattenedMessages.length,
        userMessages: userMessages.length,
        assistantMessages: assistantMessages.length,
        topThemes,
        recentHighlights,
        goals: normalizedGoals,
        subscription: subscription
          ? {
              status: subscription.status,
              planCode: subscription.planCode,
              trialEndsAt: subscription.trialEndsAt,
              currentPeriodEnd: subscription.currentPeriodEnd,
              autoRenew: subscription.autoRenew,
            }
          : null,
        zoomSummary,
      },
    })
  } catch (err) {
    serverError(res, 'weekly-analysis/monthly-context', err)
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
        include: { user: { select: { id: true, email: true, firstName: true, lastName: true } } },
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
