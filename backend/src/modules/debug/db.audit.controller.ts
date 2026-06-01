import type { Request, Response } from 'express'
import type { Prisma } from '@starway/db/prisma-client'
import { prisma } from '../../db/client.js'
import { bot } from '../../lib/telegram.js'
import { broadcastBlock9Update } from '../../products/ab-system/telegram/abTest.service.js'
import { resolveNotificationType } from '../../services/notifications/domain/notificationPolicy.js'
import { NotificationEvent } from '../../services/notifications/NotificationEvent.js'

export const dbAudit = async (_req: Request, res: Response) => {
  try {
    return res.json({
      success: true,
      message: 'DB audit route works',
    })
  } catch (e) {
    const error = e instanceof Error ? e.message : 'Unknown error'

    return res.status(500).json({
      success: false,
      error,
    })
  }
}

// FIX 2025-05-25 P18: dev-only fast-forward for notification jobs (runAt shift).
export const fastForwardNotificationJobs = async (req: Request, res: Response) => {
  try {
    if (process.env.NODE_ENV === 'production') {
      return res.status(403).json({ error: 'FORBIDDEN_IN_PRODUCTION' })
    }

    const { userId, minutesToAdvance } = req.body as {
      userId?: string
      minutesToAdvance?: number
    }

    const normalizedUserId = typeof userId === 'string' ? userId.trim() : ''
    const minutes = Number(minutesToAdvance)
    if (!normalizedUserId || !Number.isFinite(minutes) || minutes <= 0) {
      return res.status(400).json({
        error: 'userId та minutesToAdvance обовʼязкові',
      })
    }

    const targetTime = new Date(Date.now() - minutes * 60 * 1000)
    const updated = await prisma.notificationJob.updateMany({
      where: {
        status: 'PENDING',
        payload: { path: ['userId'], equals: normalizedUserId },
      },
      data: { runAt: targetTime },
    })

    return res.json({
      success: true,
      updatedJobs: updated.count,
      shiftedTo: targetTime.toISOString(),
      message: `${updated.count} jobs зсунуто на ${minutes} хв назад`,
    })
  } catch (e) {
    const error = e instanceof Error ? e.message : 'Unknown error'
    return res.status(500).json({ success: false, error })
  }
}

export const broadcastBlock9 = async (_req: Request, res: Response) => {
  try {
    if (process.env.NODE_ENV === 'production') {
      return res.status(403).json({ error: 'FORBIDDEN_IN_PRODUCTION' })
    }
    const result = await broadcastBlock9Update(bot)
    return res.json({
      success: true,
      ...result,
      message: `Відправлено: ${result.sent}, помилок: ${result.failed}`,
    })
  } catch (e) {
    const error = e instanceof Error ? e.message : 'Unknown error'
    return res.status(500).json({ success: false, error })
  }
}

export const resetChannelPost = async (_req: Request, res: Response) => {
  try {
    if (process.env.NODE_ENV === 'production') {
      return res.status(403).json({ error: 'FORBIDDEN_IN_PRODUCTION' })
    }
    const deleted = await prisma.zoomChannelPost.deleteMany()
    return res.json({
      success: true,
      deleted: deleted.count,
      message: 'ZoomChannelPost очищено. Наступний syncChannelPost створить новий закріплений пост.',
    })
  } catch (e) {
    const error = e instanceof Error ? e.message : 'Unknown error'
    return res.status(500).json({ success: false, error })
  }
}

export const resetTestProgress = async (req: Request, res: Response) => {
  try {
    if (process.env.NODE_ENV === 'production') {
      return res.status(403).json({ error: 'FORBIDDEN_IN_PRODUCTION' })
    }

    const telegramId = String((req.body as { telegramId?: string | number } | undefined)?.telegramId ?? '').trim()
    if (!telegramId) {
      return res.status(400).json({ error: 'telegramId is required' })
    }

    const user = await prisma.user.findFirst({
      where: {
        OR: [
          { telegramUserId: telegramId },
          { telegramChatId: telegramId },
          { telegramLinks: { some: { chatId: telegramId } } },
        ],
      },
      select: {
        id: true,
        settings: true,
      },
    })

    if (!user) {
      return res.status(404).json({ error: 'USER_NOT_FOUND' })
    }

    const settings = (user.settings ?? {}) as Prisma.JsonObject
    const ui = (settings.ui && typeof settings.ui === 'object' && !Array.isArray(settings.ui))
      ? { ...(settings.ui as Prisma.JsonObject) }
      : {}
    const abTest = (ui.abTest && typeof ui.abTest === 'object' && !Array.isArray(ui.abTest))
      ? { ...(ui.abTest as Prisma.JsonObject) }
      : {}
    delete abTest.focus_opened_at
    delete abTest.result_key
    ui.abTest = abTest

    const nextSettings: Prisma.InputJsonValue = {
      ...settings,
      ui,
    }

    await prisma.user.update({
      where: { id: user.id },
      data: {
        testResultType: null,
        settings: nextSettings,
      },
    })

    const pendingType = resolveNotificationType(NotificationEvent.AB_TEST_FOLLOWUP)
    const pendingJobs = await prisma.notificationJob.findMany({
      where: {
        type: pendingType,
        status: 'PENDING',
      },
      select: { id: true, payload: true },
    })

    const cancellableIds = pendingJobs
      .filter((job) => {
        const payload = job.payload as Prisma.JsonObject | null
        if (!payload || Array.isArray(payload)) return false
        const directUserId = typeof payload.userId === 'string' ? payload.userId : null
        const nestedPayload = (payload.payload && typeof payload.payload === 'object' && !Array.isArray(payload.payload))
          ? (payload.payload as Prisma.JsonObject)
          : null
        const nestedUserId = nestedPayload && typeof nestedPayload.userId === 'string'
          ? nestedPayload.userId
          : null
        return directUserId === user.id || nestedUserId === user.id
      })
      .map((job) => job.id)

    if (cancellableIds.length > 0) {
      await prisma.notificationJob.deleteMany({
        where: { id: { in: cancellableIds } },
      })
    }

    return res.json({
      success: true,
      userId: user.id,
      cancelledJobs: cancellableIds.length,
    })
  } catch (e) {
    const error = e instanceof Error ? e.message : 'Unknown error'
    return res.status(500).json({ success: false, error })
  }
}
