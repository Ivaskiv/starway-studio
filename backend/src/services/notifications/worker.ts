import { notificationService } from './NotificationService.js'
import { notificationJobService } from './services/NotificationJobService.js'

const MAX_RETRIES = 3
const POLL_INTERVAL_MS = 60_000

let workerTimer: NodeJS.Timeout | null = null
let workerRunning = false
let workerStopping = false

export async function processDueNotificationJobs(limit = 100) {
  if (workerRunning || workerStopping) return
  workerRunning = true

  try {
    const jobs = await notificationJobService.getDuePending(limit)
    for (const job of jobs) {
      await notificationJobService.markProcessing(job.id)

      try {
        await notificationService.processJob(job)
        await notificationJobService.markDone(job.id)
      } catch (error) {
        const message = error instanceof Error ? error.message : 'notification_job_failed'
        const nextAttempts = job.attempts + 1

        if (nextAttempts >= MAX_RETRIES) {
          await notificationJobService.markFailed(job.id, message)
          continue
        }

        const retryAt = new Date(Date.now() + nextAttempts * 5 * 60_000)
        await notificationJobService.rescheduleRetry(job.id, nextAttempts, retryAt, message)
      }
    }
  } finally {
    workerRunning = false
  }
}

export function startNotificationWorker() {
  if (workerTimer) return
  workerStopping = false
  workerTimer = setInterval(() => {
    if (workerStopping) return
    void processDueNotificationJobs().catch((error) => {
      console.error('[NotificationWorker] process failed', error)
    })
  }, POLL_INTERVAL_MS)
  workerTimer.unref()
}

export function stopNotificationWorker() {
  workerStopping = true
  if (!workerTimer) return
  clearInterval(workerTimer)
  workerTimer = null
}
