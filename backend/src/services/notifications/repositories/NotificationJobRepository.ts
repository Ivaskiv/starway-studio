import {
  type NotificationJob,
  type NotificationJobStatus,
  type NotificationType,
  Prisma,
} from '@starway/db/prisma-client'

import { prisma } from '../../../db/client.js'

export interface CreateNotificationJobInput {
  type: NotificationType
  payload?: Record<string, unknown>
  runAt: Date
}

let notificationJobTableAvailable: boolean | undefined
let hasWarnedAboutMissingNotificationJobTable = false

async function ensureNotificationJobTableAvailability(): Promise<boolean> {
  if (typeof notificationJobTableAvailable !== 'undefined') {
    return notificationJobTableAvailable
  }

  try {
    const rows = await prisma.$queryRaw<Array<{ exists: boolean }>>`
      SELECT EXISTS (
        SELECT 1
        FROM information_schema.tables
        WHERE table_schema = 'public'
          AND table_name = 'NotificationJob'
      ) AS "exists"
    `
    notificationJobTableAvailable = rows[0]?.exists === true
  } catch (error) {
    throw error
  }

  if (!notificationJobTableAvailable) {
    if (!hasWarnedAboutMissingNotificationJobTable) {
      hasWarnedAboutMissingNotificationJobTable = true
      console.warn('[notifications] NotificationJob table missing; queue persistence is disabled until migration is applied')
    }
    return false
  }

  return notificationJobTableAvailable
}

function buildSyntheticJob(
  type: NotificationType,
  payload: Record<string, unknown> | undefined,
  runAt: Date,
  status: NotificationJobStatus = 'PENDING',
): NotificationJob {
  const now = new Date()
  return {
    id: `missing-notification-job-table:${type}:${now.getTime()}`,
    type,
    payload: (payload ?? {}) as Prisma.JsonObject,
    runAt,
    status,
    attempts: 0,
    lastError: 'notification_job_table_missing',
    createdAt: now,
    updatedAt: now,
  }
}

export class NotificationJobRepository {
  async isAvailable() {
    return ensureNotificationJobTableAvailability()
  }

  async create(input: CreateNotificationJobInput) {
    if (!(await ensureNotificationJobTableAvailability())) {
      return buildSyntheticJob(input.type, input.payload, input.runAt)
    }

    return prisma.notificationJob.create({
      data: {
        type: input.type,
        payload: (input.payload ?? {}) as Prisma.JsonObject,
        runAt: input.runAt,
      },
    })
  }

  async findDuePending(limit = 100) {
    if (!(await ensureNotificationJobTableAvailability())) {
      return []
    }

    return prisma.notificationJob.findMany({
      where: {
        status: 'PENDING',
        runAt: { lte: new Date() },
      },
      orderBy: { runAt: 'asc' },
      take: limit,
    })
  }

  async updateStatus(id: string, status: NotificationJobStatus, lastError?: string | null) {
    if (!(await ensureNotificationJobTableAvailability())) {
      return buildSyntheticJob('AI_REMINDER', {}, new Date(), status)
    }

    return prisma.notificationJob.update({
      where: { id },
      data: {
        status,
        lastError: lastError ?? null,
      },
    })
  }

  async incrementAttempts(id: string, lastError?: string | null) {
    if (!(await ensureNotificationJobTableAvailability())) {
      return buildSyntheticJob('AI_REMINDER', {}, new Date(), 'FAILED')
    }

    return prisma.notificationJob.update({
      where: { id },
      data: {
        attempts: { increment: 1 },
        lastError: lastError ?? null,
      },
    })
  }

  async reschedule(id: string, status: NotificationJobStatus, runAt: Date, attempts: number, lastError?: string | null) {
    if (!(await ensureNotificationJobTableAvailability())) {
      return buildSyntheticJob('AI_REMINDER', {}, runAt, status)
    }

    return prisma.notificationJob.update({
      where: { id },
      data: {
        status,
        runAt,
        attempts,
        lastError: lastError ?? null,
      },
    })
  }
}

export const notificationJobRepository = new NotificationJobRepository()
