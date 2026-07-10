import { notificationService } from './NotificationService.js'
import { notificationJobService } from './services/NotificationJobService.js'

const NOTIFICATION_WORKER_DISABLED = process.env.DISABLE_NOTIFICATION_JOB_WORKER === 'true'
const POLL_INTERVAL_MS = 5_000
const NOTIFICATION_BATCH_LIMIT = 25

let workerTimer: NodeJS.Timeout | null = null
let workerRunning = false
let workerStopping = false

export async function processDueNotificationJobs(limit = NOTIFICATION_BATCH_LIMIT) {
  if (workerRunning || workerStopping) return
  workerRunning = true

  try {
    const jobs = await notificationJobService.getDuePending(limit)
    for (const job of jobs) {
      try {
        await notificationJobService.markProcessing(job.id)
        await notificationService.processJob(job)
        await notificationJobService.markDone(job.id)
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error)
        await notificationJobService.markFailed(job.id, message).catch(() => undefined)
        console.error('[NotificationJobWorker] job failed', {
          jobId: job.id,
          error: message,
        })
      }
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
