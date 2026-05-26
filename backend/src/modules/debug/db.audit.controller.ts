import type { Request, Response } from 'express'
import { prisma } from '../../db/client.js'

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
