import type { Job } from 'bullmq'
import { moveToDeadLetter, registerBullMqWorker } from '@/core/dna/queues/dna.queue.bullmq.js'
import type { DnaAnalyticsJob } from '@/core/dna/queues/dna.queue.contracts.js'
import { emitDnaQueueEvent } from '@/core/dna/queues/dna.queue.events.js'

let booted = false

export async function startDnaMemoryWorker(): Promise<void> {
  if (booted) return

  const worker = await registerBullMqWorker<DnaAnalyticsJob>('memory', async (job: Job<DnaAnalyticsJob>) => {
    const startedAt = Date.now()
    try {
      const result = {
        eventId: job.data.eventId,
        source: job.data.source,
        memoryUpdated: true,
      }

      emitDnaQueueEvent({
        event: 'JOB_COMPLETED',
        queue: 'dna-memory',
        jobId: String(job.id),
        ts: new Date().toISOString(),
        details: { durationMs: Date.now() - startedAt, eventId: job.data.eventId },
      })

      return result
    } catch (error) {
      const reason = error instanceof Error ? error.message : String(error)
      if (job.attemptsMade >= ((job.opts.attempts ?? 1) - 1)) {
        await moveToDeadLetter({
          sourceQueue: 'dna-memory',
          jobId: String(job.id),
          reason,
          data: { eventId: job.data.eventId, source: job.data.source },
        })
      }
      throw error
    }
  })

  if (!worker) {
    console.warn('[DNA][queue] memory worker not started (redis unavailable)')
    return
  }

  booted = true
  console.log('[DNA][queue] memory worker started')
}
