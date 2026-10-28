import { notificationService } from './NotificationService.js'
import { notificationJobService } from './services/NotificationJobService.js'
import {
  notificationJobRepository,
  type NotificationJobCompletion,
  type NotificationJobLeaseExecutor,
} from './repositories/NotificationJobRepository.js'
import type { NotificationJob } from '@starway/db/prisma-client'

const NOTIFICATION_WORKER_DISABLED = process.env.DISABLE_NOTIFICATION_JOB_WORKER === 'true'
const POLL_INTERVAL_MS = 5_000
const NOTIFICATION_BATCH_LIMIT = 25
const RETRY_DELAY_MS = 30_000
const MAX_DELIVERY_ATTEMPTS = 3

let workerTimer: NodeJS.Timeout | null = null
let workerRunning = false
let workerStopping = false

function describeJob(job: NotificationJob) {
  const persisted = job.payload && typeof job.payload === 'object' && !Array.isArray(job.payload)
    ? job.payload as Record<string, unknown>
    : {}
  const payload = persisted.payload && typeof persisted.payload === 'object' && !Array.isArray(persisted.payload)
    ? persisted.payload as Record<string, unknown>
    : {}

  return {
    jobId: job.id,
    notificationType: job.type,
    userId: typeof persisted.userId === 'string' ? persisted.userId : null,
    sessionId: typeof payload.sessionId === 'string'
      ? payload.sessionId
      : typeof payload.session_id === 'string'
        ? payload.session_id
        : null,
    scheduledAt: typeof payload.scheduledAt === 'string'
      ? payload.scheduledAt
      : job.runAt.toISOString(),
    attempts: job.attempts,
  }
}

type ClaimedNotificationJobResult = 'processed' | 'retry_scheduled' | 'failed' | 'not_claimable'

export type OperatorScopedNotificationJobResult =
  | { status: 'confirmation_required'; jobId: string }
  | { status: 'not_claimable'; jobId: string }
  | { status: ClaimedNotificationJobResult; jobId: string }

async function processClaimedNotificationJob(job: NotificationJob): Promise<ClaimedNotificationJobResult> {
  const jobContext = describeJob(job)
  let result: ClaimedNotificationJobResult = 'processed'
  let errorMessage: string | null = null

  const execute: NotificationJobLeaseExecutor = Object.assign(async (lockedJob: NotificationJob): Promise<NotificationJobCompletion> => {
    try {
      console.info('[NotificationJobWorker] delivery attempt', jobContext)
      await notificationService.processJob(lockedJob)
      return { status: 'DONE' }
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error)
      const nextAttempts = lockedJob.attempts + 1
      errorMessage = message

      if (nextAttempts <= MAX_DELIVERY_ATTEMPTS) {
        const retryAt = new Date(Date.now() + RETRY_DELAY_MS)
        result = 'retry_scheduled'
        return {
          status: 'PENDING',
          runAt: retryAt,
          attempts: nextAttempts,
          lastError: message,
        }
      }

      result = 'failed'
      return { status: 'FAILED', attempts: nextAttempts, lastError: message }
    }
  }, { claim: job })

  const completed = await notificationJobRepository.executeClaimed(job.id, execute)

  if (!completed) {
    return 'not_claimable'
  }

  if (result === 'processed') {
    console.info('[NotificationJobWorker] delivery completed', jobContext)
  } else if (result === 'retry_scheduled') {
    if (completed.status !== 'PENDING') return 'not_claimable'
    console.warn('[NotificationJobWorker] delivery retry scheduled', {
      ...jobContext,
      attempts: completed.attempts,
      retryAt: completed.runAt.toISOString(),
      error: errorMessage,
    })
  } else {
    if (completed.status !== 'FAILED') return 'not_claimable'
    console.error('[NotificationJobWorker] delivery failed permanently', {
      ...jobContext,
      attempts: completed.attempts,
      error: errorMessage,
    })
  }

  return result
}

/**
 * Operator-only recovery entrypoint. It is intentionally not registered with HTTP,
 * Telegram, or the scheduler; an explicit job ID and confirmation are required.
 */
export async function processNotificationJobByIdForOperator(input: {
  jobId: string
  operatorConfirmed: boolean
}): Promise<OperatorScopedNotificationJobResult> {
  const jobId = input.jobId.trim()
  if (!jobId) {
    throw new Error('notification_job_id_required')
  }
  if (input.operatorConfirmed !== true) {
    return { status: 'confirmation_required', jobId }
  }

  const job = await notificationJobService.claimDuePendingById(jobId)
  if (!job) {
    return { status: 'not_claimable', jobId }
  }

  return { status: await processClaimedNotificationJob(job), jobId }
}

export async function processDueNotificationJobs(limit = NOTIFICATION_BATCH_LIMIT) {
  if (workerRunning || workerStopping) return
  workerRunning = true

  try {
    const jobs = await notificationJobService.claimDuePending(limit)
    for (const job of jobs) {
      await processClaimedNotificationJob(job)
    }
  } finally {
    workerRunning = false
  }
}

export function startNotificationJobWorker() {
  if (NOTIFICATION_WORKER_DISABLED) {
    console.log('🔕 [runtime] notification job worker disabled (DISABLE_NOTIFICATION_JOB_WORKER=true)')
    return
  }

  if (workerTimer) {
    console.log('🔁 [runtime] notification job worker already running, skip duplicate startup')
    return
  }

  workerStopping = false
  workerTimer = setInterval(() => {
    if (workerStopping) return
    void processDueNotificationJobs().catch((error) => {
      console.error('[NotificationJobWorker] process failed', error)
    })
  }, POLL_INTERVAL_MS)
  workerTimer.unref()
  console.log(`📨 [runtime] notification job worker enabled (interval=${POLL_INTERVAL_MS}ms)`)
}

export function stopNotificationJobWorker() {
  workerStopping = true
  if (!workerTimer) return
  clearInterval(workerTimer)
  workerTimer = null
  console.log('🛑 [runtime] notification job worker stopped')
}
