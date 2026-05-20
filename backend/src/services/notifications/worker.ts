import { notificationService } from './NotificationService.js'
import { notificationJobService } from './services/NotificationJobService.js'

const MAX_RETRIES = 3
const POLL_INTERVAL_MS = 60_000
const NOTIFICATION_WORKERS_DISABLED = process.env.DISABLE_NOTIFICATION_WORKERS === 'true'

let workerTimer: NodeJS.Timeout | null = null
let workerRunning = false
let workerStopping = false
let consecutiveErrors = 0

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
  if (NOTIFICATION_WORKERS_DISABLED) {
    console.log('🔕 [runtime] notification workers disabled (DISABLE_NOTIFICATION_WORKERS=true)')
    return
  }

  if (workerTimer) {
    console.log('🔁 [runtime] notification worker already running, skip duplicate startup')
    return
  }

  workerStopping = false
  const runWithBackoff = async () => {
    if (workerStopping) return
    try {
      await processDueNotificationJobs()
      consecutiveErrors = 0
    } catch (error) {
      consecutiveErrors++
      const backoffMs = Math.min(1000 * Math.pow(2, consecutiveErrors), 60_000)
      console.error(`[NotificationWorker] process failed (error #${consecutiveErrors}, backoff ${backoffMs}ms)`, error)
      await new Promise(r => setTimeout(r, backoffMs))
    }
  }

  workerTimer = setInterval(() => {
    void runWithBackoff()
  }, POLL_INTERVAL_MS)
  workerTimer.unref()
  console.log(`🔔 [runtime] notification worker enabled (interval=${POLL_INTERVAL_MS}ms)`)
}

export function stopNotificationWorker() {
  workerStopping = true
  if (!workerTimer) return
  clearInterval(workerTimer)
  workerTimer = null
  console.log('🛑 [runtime] notification worker stopped')
}
