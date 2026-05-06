import { prisma } from '../../db/client.js'
import type { Response } from 'express'
import { trackEvent } from '../events/service.js'
import { resolveUserState } from '../telegram-mentor/handlers/start.js'
import { createWheelPDF } from './pdf.js'
import {
  executeWheelWorkflow,
  findFocus,
  findWeakest,
  getLatestWheel,
  getWheelAnalytics,
  getWheelCooldown,
  getWheelHistory,
  scoresFromMap,
} from './service.js'
import {
  generateWheelInsights,
} from './ai.js'
import { sendWheelNotification } from './telegram.js'
import type { WheelPDFData, WheelScore, WheelNotificationPayload } from './types.js'
import { AuthenticatedRequest } from '../../types/globalTypes.js'
import { WHEEL_CONFIG } from './types.js'

const SYSTEM_EXPERT_EMAIL = process.env.SYSTEM_EXPERT_EMAIL ?? 'system@starway.ai'

async function findFallbackExpertId(): Promise<string | null> {
  let expert = await prisma.expert.findFirst({
    where: { deletedAt: null, isActive: true },
    orderBy: { createdAt: 'asc' },
    select: { id: true },
  })
  if (expert?.id) return expert.id

  expert = await prisma.expert.findFirst({
    where: { deletedAt: null },
    orderBy: { createdAt: 'asc' },
    select: { id: true },
  })
  if (expert?.id) return expert.id

  const existingSystem = await prisma.expert.findUnique({ where: { email: SYSTEM_EXPERT_EMAIL } })
  if (existingSystem) return existingSystem.id

  const created = await prisma.expert.create({
    data: {
      email: SYSTEM_EXPERT_EMAIL,
      displayName: 'Starway System',
    },
  })
  return created.id
}

async function ensureBalanceConfig(expertId: string) {
  const existing = await prisma.balanceWheelConfig.findFirst({
    where: { expertId, deletedAt: null },
    orderBy: [{ isDefault: 'desc' }, { createdAt: 'asc' }],
  })
  if (existing) return existing

  const spheres = WHEEL_CONFIG.map(s => ({ key: s.id, label: s.label }))
  return prisma.balanceWheelConfig.create({
    data: {
      expertId,
      name: 'Default 8 Sphere Wheel',
      isDefault: true,
      version: 1,
      spheres,
    },
  })
}

async function resolveWheelContext(userId: string) {
  const user = await prisma.user.findUnique({ where: { id: userId }, select: { expertId: true } })

  let expertId = user?.expertId ?? null
  if (!expertId) expertId = await findFallbackExpertId()

  if (!expertId) throw new Error('balance_config_not_found')

  const config = await ensureBalanceConfig(expertId)
  if (!config?.id) throw new Error('balance_config_not_found')

  return { expertId, balanceConfigId: config.id }
}

const SCORE_ERROR_DETAILS = {
  wheel_invalid_spheres_count: 'Потрібно 8 сфер з оцінками',
  wheel_invalid_spheres_set: 'Склад сфер не співпадає з вимогами',
  wheel_invalid_sphere_missing: 'Відсутній score або comment для сфери',
} as const

const summarizeScores = (scores: unknown) => {
  if (!Array.isArray(scores)) return { count: 0 }
  return {
    count: scores.length,
    categories: scores.map((item: any) => String(item?.categoryId ?? '')),
  }
}

export async function createWheelAssessment(req: AuthenticatedRequest, res: Response) {
  const userId = req.user?.id
  const { scores } = (req.body as { scores?: WheelScore[] }) ?? {}
  const payloadSummary = summarizeScores(scores)

  if (!userId) {
    return res.status(401).json({ error: 'unauthorized' })
  }

  if (!Array.isArray(scores) || scores.length !== 8) {
    console.error('❌ createWheelAssessment invalid payload', payloadSummary)
    return res.status(400).json({
      error: 'wheel_invalid_spheres_count',
      detail: SCORE_ERROR_DETAILS.wheel_invalid_spheres_count
    })
  }

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      firstName: true,
      email: true,
      role: true,
      expertId: true
    }
  })

  if (!user) {
    return res.status(404).json({ error: 'user_not_found' })
  }

  const userContext = {
    name: user.firstName ?? user.email ?? 'Користувач',
    email: user.email ?? null,
    phone: null,
    age: null,
  }

  try {
    const { expertId, balanceConfigId } = await resolveWheelContext(userId)

    // ─────────────────────────────────────────
    // ADMIN / EXPERT BYPASS
    // ─────────────────────────────────────────

    const isSuperAdmin = user.role === 'SUPERADMIN'
    const isExpertOwner = user.expertId === expertId

    const bypassCooldown = isSuperAdmin || isExpertOwner

    if (!bypassCooldown) {
      const cooldown = await getWheelCooldown(userId)

      if (!cooldown.canFill && cooldown.regenLeft <= 0) {
        console.warn('quota soft-limit', { userId })
      }
    }

    // ─────────────────────────────────────────
    // EXECUTE WORKFLOW
    // ─────────────────────────────────────────

    const result = await executeWheelWorkflow({
      userId,
      expertId,
      balanceConfigId,
      scores,
      userContext,
      bypassCooldown,
    })

    const state = await resolveUserState(userId).catch(() => null)
    await trackEvent({
      userId,
      type: 'web_wheel_completed',
      source: 'web',
      state,
      payload: {
        wheelId: result.entry.id,
        weakestSphere: result.analytics.mostCommonWeakest ?? null,
        focusSphere: result.analytics.mostCommonFocus ?? null,
      },
    })

    return res.status(201).json({
      success: true,
      wheel: result.entry,
      insights: result.insights,
      analytics: result.analytics,
      pdfUrl: result.pdfUrl,
      gamification: result.gamification,
      meta: {
        cooldownApplied: !bypassCooldown
      }
    })

  } catch (error: any) {
    const message = error?.message

    if (message === 'balance_config_not_found') {
      console.error('❌ createWheelAssessment missing balance config', {
        userId,
        payload: payloadSummary
      })

      return res.status(400).json({
        error: message,
        detail: 'Неможливо знайти конфігурацію колеса'
      })
    }
    if (message?.startsWith('wheel_invalid')) {
      const detail =
        SCORE_ERROR_DETAILS[message as keyof typeof SCORE_ERROR_DETAILS] ??
        'Некоректні оцінки'

      console.error('❌ createWheelAssessment validation failed', {
        userId,
        payload: payloadSummary,
        message
      })

      return res.status(400).json({ error: message, detail })
    }

    console.error('❌ createWheelAssessment', error, {
      userId,
      payload: payloadSummary
    })

    return res.status(500).json({ error: 'server_error' })
  }
}

export async function getWheelCooldownHandler(req: AuthenticatedRequest, res: Response) {
  try {
    const userId = req.user?.id
    if (!userId) return res.status(401).json({ error: 'Unauthorized' })
    const status = await getWheelCooldown(userId)
    const state = await resolveUserState(userId).catch(() => null)
    await trackEvent({
      userId,
      type: 'web_wheel_cooldown_viewed',
      source: 'web',
      state,
      payload: { ...status },
    })
    return res.json(status)
  } catch (error) {
    console.error('❌ getWheelCooldown', error)
    return res.status(500).json({ error: 'server_error' })
  }
}

export async function getWheelHistoryHandler(req: AuthenticatedRequest, res: Response) {
  try {
    const userId = req.user!.id
    const limit = Math.min(parseInt(req.query.limit as string) || 10, 100)
    const wheels = await getWheelHistory(userId, limit)
    const state = await resolveUserState(userId).catch(() => null)
    await trackEvent({
      userId,
      type: 'web_wheel_history_viewed',
      source: 'web',
      state,
      payload: {
        limit,
        count: wheels.length,
      },
    })
    return res.json({ success: true, count: wheels.length, wheels })
  } catch (error) {
    console.error('❌ getWheelHistory', error)
    return res.status(500).json({ error: 'server_error' })
  }
}

export async function getLatestWheelHandler(req: AuthenticatedRequest, res: Response) {
  try {
    const userId = req.user?.id
    if (!userId) return res.status(401).json({ error: 'unauthorized' })
    const wheel = await getLatestWheel(userId)
    const state = await resolveUserState(userId).catch(() => null)
    await trackEvent({
      userId,
      type: 'web_wheel_latest_viewed',
      source: 'web',
      state,
      payload: {
        hasWheel: Boolean(wheel),
      },
    })
    return res.json({ success: true, wheel: wheel ?? null })
  } catch (error) {
    console.error('❌ getLatestWheel', error)
    return res.json({ success: true, wheel: null })
  }
}

export async function getWheelAnalyticsHandler(req: AuthenticatedRequest, res: Response) {
  try {
    const userId = req.user!.id
    const analytics = await getWheelAnalytics(userId)
    const state = await resolveUserState(userId).catch(() => null)
    await trackEvent({
      userId,
      type: 'web_wheel_analytics_viewed',
      source: 'web',
      state,
      payload: {
        balanceIndex: analytics.balanceIndex,
        trend: analytics.trend,
      },
    })
    return res.json({ success: true, analytics })
  } catch (error) {
    console.error('❌ getWheelAnalytics', error)
    return res.status(500).json({ error: 'server_error' })
  }
}

export async function generateWheelPDFHandler(req: AuthenticatedRequest, res: Response) {
  try {
    const userId = req.user!.id
    const { id } = req.params
    const entry = await prisma.userBalanceEntry.findFirst({
      where: { id, userId },
      include: { user: true },
    })
    if (!entry) return res.status(404).json({ error: 'Колесо не знайдено' })

    const scores = scoresFromMap(entry.scores)
    const weakest = findWeakest(scores)
    const focus = findFocus(scores, weakest)
    const insights = await generateWheelInsights(userId, scores, weakest, focus)

    const pdfData: WheelPDFData = {
      userName: entry.user.firstName ?? entry.user.email ?? 'Користувач',
      scores,
      weakestSphere: weakest.categoryId,
      focusSphere: focus.categoryId,
      insights,
      createdAt: entry.createdAt.toISOString(),
    }

    const buffer = await createWheelPDF(pdfData)
    const state = await resolveUserState(userId).catch(() => null)
    await trackEvent({
      userId,
      type: 'web_wheel_pdf_generated',
      source: 'web',
      state,
      payload: {
        wheelId: id,
      },
    })
    res.setHeader('Content-Type', 'application/pdf')
    res.setHeader('Content-Disposition', `attachment; filename="wheel-${id}.pdf"`)
    return res.send(buffer)
  } catch (error) {
    console.error('❌ generateWheelPDF', error)
    return res.status(500).json({ error: 'server_error' })
  }
}

export async function sendWheelTelegramReminderHandler(req: AuthenticatedRequest, res: Response) {
  try {
    const userId = req.user!.id
    const { id } = req.params
    const entry = await prisma.userBalanceEntry.findFirst({
      where: { id, userId },
    })
    if (!entry) return res.status(404).json({ error: 'Колесо не знайдено' })

    const scores = scoresFromMap(entry.scores)
    const weakest = findWeakest(scores)
    const focus = findFocus(scores, weakest)
    const insights = await generateWheelInsights(userId, scores, weakest, focus)

    const pdfUrl = `${process.env.FRONTEND_URL ?? 'http://localhost:5173'}/api/wheel/${id}/pdf`
    const payload: WheelNotificationPayload = {
      insights,
      weakestSphere: weakest.categoryId,
      focusSphere: focus.categoryId,
      scores,
      pdfUrl,
    }
    const result = await sendWheelNotification(userId, id, payload)
    if (!result.ok) {
      const status = result.code?.startsWith('telegram_') ? 409 : 400
      return res.status(status).json({
        error: result.code ?? 'telegram_send_failed',
        message: result.reason,
        action: result.action,
        botLink: result.botLink,
      })
    }
    const state = await resolveUserState(userId).catch(() => null)
    await trackEvent({
      userId,
      type: 'web_wheel_telegram_reminder_sent',
      source: 'web',
      state,
      payload: {
        wheelId: id,
      },
    })
    return res.json({ success: true, message: 'Нагадування надіслано' })
  } catch (error) {
    console.error('❌ sendWheelTelegramReminder', error)
    return res.status(500).json({ error: 'server_error' })
  }
}
