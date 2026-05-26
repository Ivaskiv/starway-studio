import type { Job } from 'bullmq'
import { moveToDeadLetter, registerBullMqWorker } from '@/core/dna/queues/dna.queue.bullmq.js'
import type { DnaDistributionJob } from '@/core/dna/queues/dna.queue.contracts.js'
import { emitDnaQueueEvent } from '@/core/dna/queues/dna.queue.events.js'

let booted = false

export async function startDnaDistributionWorker(): Promise<void> {
  if (booted) return

  const worker = await registerBullMqWorker<DnaDistributionJob>('distribution', async (job: Job<DnaDistributionJob>) => {
    const startedAt = Date.now()
    try {
      const result = {
        requestId: job.data.requestId,
        channel: job.data.channel,
        distributed: true,
      }

      emitDnaQueueEvent({
        event: 'JOB_COMPLETED',
        queue: 'dna-distribution',
        jobId: String(job.id),
        ts: new Date().toISOString(),
        details: { durationMs: Date.now() - startedAt, requestId: job.data.requestId },
      })

      return result
    } catch (error) {
      const reason = error instanceof Error ? error.message : String(error)
      if (job.attemptsMade >= ((job.opts.attempts ?? 1) - 1)) {
        await moveToDeadLetter({
          sourceQueue: 'dna-distribution',
          jobId: String(job.id),
          reason,
          data: { requestId: job.data.requestId, channel: job.data.channel },
        })
      }
      throw error
    }
  })

  if (!worker) {
    console.warn('[DNA][queue] distribution worker not started (redis unavailable)')
    return
  }

  booted = true
  console.log('[DNA][queue] distribution worker started')
}
