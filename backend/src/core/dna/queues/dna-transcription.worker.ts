import type { Job } from 'bullmq'
import { moveToDeadLetter, registerBullMqWorker } from '@/core/dna/queues/dna.queue.bullmq.js'
import type { DnaTranscriptionJob } from '@/core/dna/queues/dna.queue.contracts.js'
import { emitDnaQueueEvent } from '@/core/dna/queues/dna.queue.events.js'

let booted = false

export async function startDnaTranscriptionWorker(): Promise<void> {
  if (booted) return

  const worker = await registerBullMqWorker<DnaTranscriptionJob>('transcription', async (job: Job<DnaTranscriptionJob>) => {
    const startedAt = Date.now()
    try {
      const result = {
        requestId: job.data.requestId,
        userId: job.data.userId,
        transcriptQueued: true,
        mimeType: job.data.mimeType,
      }

      emitDnaQueueEvent({
        event: 'JOB_COMPLETED',
        queue: 'dna-transcription',
        jobId: String(job.id),
        ts: new Date().toISOString(),
        details: { durationMs: Date.now() - startedAt, requestId: job.data.requestId },
      })

      return result
    } catch (error) {
      const reason = error instanceof Error ? error.message : String(error)
      if (job.attemptsMade >= ((job.opts.attempts ?? 1) - 1)) {
        await moveToDeadLetter({
          sourceQueue: 'dna-transcription',
          jobId: String(job.id),
          reason,
          data: { requestId: job.data.requestId, userId: job.data.userId },
        })
      }
      throw error
    }
  })

  if (!worker) {
    console.warn('[DNA][queue] transcription worker not started (redis unavailable)')
    return
  }

  booted = true
  console.log('[DNA][queue] transcription worker started')
}
