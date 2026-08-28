import type { Request, Response } from 'express'
import type { Prisma } from '@starway/db/prisma-client'
import { prisma } from '../../db/client.js'
import { bot } from '../../lib/telegram.js'
import { broadcastBlock9Update } from '../../products/ab-system/telegram/service.js'
import { resolveNotificationType } from '../../services/notifications/domain/notificationPolicy.js'
import { NotificationEvent } from '../../services/notifications/NotificationEvent.js'

function normalizeMessageIds(input: unknown): number[] {
  if (!Array.isArray(input)) return []

  return input
    .map((value) => Number(value))
    .filter((value) => Number.isInteger(value) && value > 0)
}

function deleteMessageIdRange(params: {
  centerMessageId: number
  preserveMessageIds?: number[]
  beforeCount: number
  afterCount: number
}): number[] {
  const preserve = new Set(params.preserveMessageIds ?? [])
  const from = Math.max(1, params.centerMessageId - params.beforeCount)
  const to = Math.max(from, params.centerMessageId + params.afterCount)
  const messageIds: number[] = []

  for (let messageId = from; messageId <= to; messageId += 1) {
    if (preserve.has(messageId)) continue
    messageIds.push(messageId)
  }

  return messageIds
}

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

export const postClientTrace = async (req: Request, res: Response) => {
  try {
    if (process.env.NODE_ENV === 'production') {
      return res.status(403).json({ error: 'FORBIDDEN_IN_PRODUCTION' })
    }

    const channel = String(req.body?.channel ?? '').trim()
    const event = String(req.body?.event ?? '').trim()
    const payload = req.body?.payload

    if (!channel || !event || !payload || typeof payload !== 'object' || Array.isArray(payload)) {
      return res.status(400).json({ error: 'channel, event, payload are required' })
    }

    console.info(`[${channel}]`, {
      event,
      ...payload,
    })

    return res.json({ ok: true })
  } catch (e) {
    const error = e instanceof Error ? e.message : 'Unknown error'
    return res.status(500).json({ success: false, error })
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

export const deleteFocusChannelMessages = async (req: Request, res: Response) => {
  try {
    if (process.env.NODE_ENV === 'production') {
      return res.status(403).json({ error: 'FORBIDDEN_IN_PRODUCTION' })
    }

    const channelId = String(process.env.FOCUS_TELEGRAM_CHANNEL_ID ?? '').trim()
    if (!channelId) {
      return res.status(400).json({ error: 'FOCUS_TELEGRAM_CHANNEL_ID_NOT_SET' })
    }

    const rawMessageIds = normalizeMessageIds(req.body?.messageIds)
    const fromMessageId = Number(req.body?.fromMessageId)
    const toMessageId = Number(req.body?.toMessageId)
    const includeNextMessage = req.body?.includeNextMessage === true

    const rangeMessageIds =
      Number.isInteger(fromMessageId) &&
      Number.isInteger(toMessageId) &&
      fromMessageId > 0 &&
      toMessageId >= fromMessageId &&
      toMessageId - fromMessageId <= 100
        ? Array.from(
            { length: toMessageId - fromMessageId + 1 },
            (_, index) => fromMessageId + index,
          )
        : []

    const messageIds = Array.from(
      new Set([
        ...rawMessageIds,
        ...rangeMessageIds,
        ...(includeNextMessage
          ? [...rawMessageIds, ...rangeMessageIds].map((id) => id + 1)
          : []),
      ]),
    ).sort((a, b) => a - b)

    if (messageIds.length === 0) {
      return res.status(400).json({
        error: 'MESSAGE_IDS_REQUIRED',
        message:
          'Передай messageIds: number[] або fromMessageId/toMessageId. Для сервісного повідомлення про pin можна додати includeNextMessage=true.',
      })
    }

    const deleted: number[] = []
    const failed: Array<{ messageId: number; error: string }> = []

    for (const messageId of messageIds) {
      try {
        await bot.telegram.deleteMessage(channelId, messageId)
        deleted.push(messageId)
      } catch (error) {
        failed.push({
          messageId,
          error: error instanceof Error ? error.message : String(error),
        })
      }
    }

    return res.json({
      success: failed.length === 0,
      channelId,
      requested: messageIds,
      deleted,
      failed,
    })
  } catch (e) {
    const error = e instanceof Error ? e.message : 'Unknown error'
    return res.status(500).json({ success: false, error })
  }
}

export const cleanupLatestFocusDuplicates = async (_req: Request, res: Response) => {
  try {
    if (process.env.NODE_ENV === 'production') {
      return res.status(403).json({ error: 'FORBIDDEN_IN_PRODUCTION' })
    }

    const channelId = String(process.env.FOCUS_TELEGRAM_CHANNEL_ID ?? '').trim()
    if (!channelId) {
      return res.status(400).json({ error: 'FOCUS_TELEGRAM_CHANNEL_ID_NOT_SET' })
    }

    const currentPost = await prisma.zoomChannelPost.findFirst({
      orderBy: { updatedAt: 'desc' },
      select: {
        id: true,
        messageId: true,
        chatId: true,
      },
    })

    if (!currentPost) {
      return res.status(404).json({
        error: 'ZOOM_CHANNEL_POST_NOT_FOUND',
        message: 'У БД немає актуального pinned post для cleanup.',
      })
    }

    const preserveMessageIds = [currentPost.messageId]
    const candidateMessageIds = deleteMessageIdRange({
      centerMessageId: currentPost.messageId,
      preserveMessageIds,
      beforeCount: 12,
      afterCount: 4,
    })

    const deleted: number[] = []
    const failed: Array<{ messageId: number; error: string }> = []

    for (const messageId of candidateMessageIds) {
      try {
        await bot.telegram.deleteMessage(channelId, messageId)
        deleted.push(messageId)
      } catch (error) {
        failed.push({
          messageId,
          error: error instanceof Error ? error.message : String(error),
        })
      }
    }

    return res.json({
      success: true,
      channelId,
      keptMessageId: currentPost.messageId,
      requestedDeleteIds: candidateMessageIds,
      deleted,
      failed,
      note: 'Cleanup keeps the current pinned post and removes a small message window around it. Review failed ids if some messages were already gone or not deletable.',
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
