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
const STALE_PROCESSING_MS = 15 * 60 * 1000

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

  async claimDuePending(limit = 100) {
    if (!(await ensureNotificationJobTableAvailability())) {
      return []
    }

    const normalizedLimit = Math.max(1, Math.trunc(limit))

    return withRetry(() => prisma.$queryRaw<NotificationJob[]>(Prisma.sql`
      WITH claimed AS (
        SELECT id
        FROM "NotificationJob"
        WHERE
          (status = 'PENDING' AND "runAt" <= NOW())
          OR
          (status = 'PROCESSING' AND "updatedAt" <= NOW() - ${STALE_PROCESSING_MS} * INTERVAL '1 millisecond')
        ORDER BY
          CASE WHEN status = 'PENDING' THEN 0 ELSE 1 END,
          "runAt" ASC,
          "createdAt" ASC
        FOR UPDATE SKIP LOCKED
        LIMIT ${normalizedLimit}
      )
      UPDATE "NotificationJob" AS job
      SET
        status = 'PROCESSING',
        attempts = CASE
          WHEN job.status = 'PROCESSING' THEN job.attempts + 1
          ELSE job.attempts
        END,
        "lastError" = CASE
          WHEN job.status = 'PROCESSING' THEN COALESCE(job."lastError", 'stale_processing_reclaimed')
          ELSE job."lastError"
        END,
        "updatedAt" = NOW()
      FROM claimed
      WHERE job.id = claimed.id
      RETURNING job.*
    `))
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
