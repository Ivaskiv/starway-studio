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

export type NotificationJobCompletion =
  | { status: 'DONE' }
  | { status: 'PENDING'; runAt: Date; attempts: number; lastError: string }
  | { status: 'FAILED'; attempts: number; lastError: string }

export type NotificationJobLeaseExecutor = ((job: NotificationJob) => Promise<NotificationJobCompletion>) & {
  /** The persisted claim version that is allowed to finalize this delivery. */
  claim: NotificationJob
}

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

  /**
   * NotificationJob has no database-level JSON unique constraint.  Serialize
   * creation on the canonical business key so a repeated command cannot leave
   * two durable deliveries behind.
   */
  async createOnce(
    input: CreateNotificationJobInput,
    idempotencyKey: string,
  ): Promise<NotificationJob> {
    if (!(await ensureNotificationJobTableAvailability())) {
      return buildSyntheticJob(input.type, input.payload, input.runAt)
    }

    return withRetry(() => prisma.$transaction(async (tx) => {
      await tx.$queryRaw`SELECT pg_advisory_xact_lock(hashtext(${`notification-job:${idempotencyKey}`}))`
      const existing = await tx.notificationJob.findFirst({
        where: {
          payload: {
            path: ['payload', 'idempotencyKey'],
            equals: idempotencyKey,
          },
        },
        orderBy: { createdAt: 'desc' },
      })
      if (existing) return existing

      return tx.notificationJob.create({
        data: {
          type: input.type,
          payload: (input.payload ?? {}) as Prisma.JsonObject,
          runAt: input.runAt,
        },
      })
    }))
  }

  async cancelZoomCommercePaymentReminder(requestId: string, keepIdempotencyKey?: string): Promise<number> {
    if (!(await ensureNotificationJobTableAvailability())) {
      return 0
    }

    const pending = await withRetry(() => prisma.notificationJob.findMany({
      where: {
        status: 'PENDING',
        payload: {
          path: ['payload', 'zoomCommerceRequestId'],
          equals: requestId,
        },
      },
      select: { id: true, payload: true },
    }))
    const obsoleteIds = pending
      .filter((job) => {
        if (!keepIdempotencyKey) return true
        const envelope = job.payload as Record<string, unknown>
        const payload = envelope.payload as Record<string, unknown> | undefined
        return payload?.idempotencyKey !== keepIdempotencyKey
      })
      .map((job) => job.id)
    if (obsoleteIds.length === 0) return 0

    const result = await withRetry(() => prisma.notificationJob.deleteMany({
      where: { id: { in: obsoleteIds } },
    }))
    return result.count
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

  /**
   * `updatedAt` is the persisted lease token: claims atomically replace it and
   * PROCESSING rows become reclaimable after STALE_PROCESSING_MS. Delivery is
   * deliberately outside a database transaction. Its completion is fenced by
   * that original token, so an expired worker cannot overwrite a newer claim.
   *
   * This remains at-least-once delivery. If a lease expires while Telegram is
   * accepting an uncertain request, a newer worker may legitimately retry it.
   */
  async executeClaimed(
    jobId: string,
    execute: NotificationJobLeaseExecutor,
  ): Promise<NotificationJobCompletion | null> {
    if (!(await ensureNotificationJobTableAvailability())) {
      return null
    }

    const claim = execute.claim
    if (claim.id !== jobId || claim.status !== 'PROCESSING') {
      return null
    }

    const activeLease = await prisma.notificationJob.findFirst({
      where: {
        id: jobId,
        status: 'PROCESSING',
        updatedAt: claim.updatedAt,
      },
      select: { id: true },
    })
    if (!activeLease) return null

    const completion = await execute(claim)
    const where = {
      id: jobId,
      status: 'PROCESSING' as const,
      updatedAt: claim.updatedAt,
    }
    const result = await (async () => {
      switch (completion.status) {
        case 'DONE':
          return prisma.notificationJob.updateMany({
            where,
            data: { status: 'DONE', lastError: null },
          })
        case 'PENDING':
          return prisma.notificationJob.updateMany({
            where,
            data: {
              status: 'PENDING',
              runAt: completion.runAt,
              attempts: completion.attempts,
              lastError: completion.lastError,
            },
          })
        case 'FAILED':
          return prisma.notificationJob.updateMany({
            where,
            data: {
              status: 'FAILED',
              attempts: completion.attempts,
              lastError: completion.lastError,
            },
          })
      }
    })()

    return result.count === 1 ? completion : null
  }

  async claimDuePendingById(jobId: string): Promise<NotificationJob | null> {
    if (!(await ensureNotificationJobTableAvailability())) {
      return null
    }

    const claimed = await withRetry(() => prisma.$queryRaw<NotificationJob[]>(Prisma.sql`
      WITH claimed AS (
        SELECT id
        FROM "NotificationJob"
        WHERE
          id = ${jobId}
          AND status = 'PENDING'
          AND "runAt" <= NOW()
        FOR UPDATE SKIP LOCKED
      )
      UPDATE "NotificationJob" AS job
      SET
        status = 'PROCESSING',
        "updatedAt" = NOW()
      FROM claimed
      WHERE job.id = claimed.id
      RETURNING job.*
    `))

    return claimed[0] ?? null
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
