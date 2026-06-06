import {
  type NotificationJob,
  type NotificationJobStatus,
  type NotificationType,
  Prisma,
} from '@starway/db/prisma-client'

import { prisma, withRetry } from '../../../db/client.js'

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
    const rows = await withRetry(() => prisma.$queryRaw<Array<{ exists: boolean }>>`
      SELECT EXISTS (
        SELECT 1
        FROM information_schema.tables
        WHERE table_schema = 'public'
          AND table_name = 'NotificationJob'
      ) AS "exists"
    `)
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

    return withRetry(() => prisma.notificationJob.create({
      data: {
        type: input.type,
        payload: (input.payload ?? {}) as Prisma.JsonObject,
        runAt: input.runAt,
      },
    }))
  }

  async findDuePending(limit = 100) {
    if (!(await ensureNotificationJobTableAvailability())) {
      return []
    }

    return withRetry(() => prisma.notificationJob.findMany({
      where: {
        status: 'PENDING',
        runAt: { lte: new Date() },
      },
      orderBy: { runAt: 'asc' },
      take: limit,
    }))
  }

  async updateStatus(id: string, status: NotificationJobStatus, lastError?: string | null) {
    if (!(await ensureNotificationJobTableAvailability())) {
      return buildSyntheticJob('AI_REMINDER', {}, new Date(), status)
    }

    return withRetry(() => prisma.notificationJob.update({
      where: { id },
      data: {
        status,
        lastError: lastError ?? null,
      },
    }))
  }

  async incrementAttempts(id: string, lastError?: string | null) {
    if (!(await ensureNotificationJobTableAvailability())) {
      return buildSyntheticJob('AI_REMINDER', {}, new Date(), 'FAILED')
    }

    return withRetry(() => prisma.notificationJob.update({
      where: { id },
      data: {
        attempts: { increment: 1 },
        lastError: lastError ?? null,
      },
    }))
  }

  async reschedule(id: string, status: NotificationJobStatus, runAt: Date, attempts: number, lastError?: string | null) {
    if (!(await ensureNotificationJobTableAvailability())) {
      return buildSyntheticJob('AI_REMINDER', {}, runAt, status)
    }

    return withRetry(() => prisma.notificationJob.update({
      where: { id },
      data: {
        status,
        runAt,
        attempts,
        lastError: lastError ?? null,
      },
    }))
  }

  async cancelByUserAndTypes(userId: string, types: NotificationType[]) {
    if (!(await ensureNotificationJobTableAvailability())) {
      return { count: 0 }
    }

    return withRetry(() => prisma.notificationJob.deleteMany({
      where: {
        type: { in: types },
        status: 'PENDING',
        payload: {
          path: ['userId'],
          equals: userId,
        },
      },
    }))
  }
}

export const notificationJobRepository = new NotificationJobRepository()
