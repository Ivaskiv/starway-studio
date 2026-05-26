import type { Job } from 'bullmq'
import { executeDnaPipeline } from '@/core/dna/pipelines/dna.pipeline.js'
import { resolveDnaPipelineRoute } from '@/core/dna/routing/dna.router.js'
import { moveToDeadLetter, registerBullMqWorker } from '@/core/dna/queues/dna.queue.bullmq.js'
import type { DnaGenerationJob } from '@/core/dna/queues/dna.queue.contracts.js'
import { emitDnaQueueEvent } from '@/core/dna/queues/dna.queue.events.js'

let booted = false

export async function startDnaGenerationWorker(): Promise<void> {
  if (booted) return

  const worker = await registerBullMqWorker<DnaGenerationJob>('generation', async (job: Job<DnaGenerationJob>) => {
    const startedAt = Date.now()
    const runId = job.data.runId
    const request = job.data.request

    if ((job.attemptsStarted ?? 1) > 1) {
      emitDnaQueueEvent({
        event: 'PROVIDER_RETRY',
        queue: 'dna-generation',
        jobId: String(job.id),
        ts: new Date().toISOString(),
        details: { attemptsStarted: job.attemptsStarted },
      })
    }

    try {
      const route = resolveDnaPipelineRoute({
        contentType: request.type,
        userContext: request.input.userContext,
        userRequest: request.input.userRequest,
        selectedProtocol: request.input.selectedProtocol,
        tone: request.input.tone,
        selectedOutputs: request.input.selectedOutputs,
        transcript: request.input.transcript,
      })
      route.providerOrder = ['claude', 'gpt', 'gemini']
      route.fallbackProviders = ['gpt', 'gemini']

      const result = await executeDnaPipeline({ request, runId, route })

      emitDnaQueueEvent({
        event: 'PIPELINE_COMPLETED',
        queue: 'dna-generation',
        jobId: String(job.id),
        ts: new Date().toISOString(),
        details: {
          runId,
          durationMs: Date.now() - startedAt,
          provider: result.artifacts[0]?.provider ?? null,
          artifacts: result.artifacts.length,
        },
      })

      return result
    } catch (error) {
      const reason = error instanceof Error ? error.message : String(error)
      emitDnaQueueEvent({
        event: 'PIPELINE_FAILED',
        queue: 'dna-generation',
        jobId: String(job.id),
        ts: new Date().toISOString(),
        details: { runId, reason, durationMs: Date.now() - startedAt },
      })

      if (job.attemptsMade >= ((job.opts.attempts ?? 1) - 1)) {
        await moveToDeadLetter({
          sourceQueue: 'dna-generation',
          jobId: String(job.id),
          reason,
          data: {
            runId,
            request,
            attemptsMade: job.attemptsMade,
          },
        })
      }

      throw error
    }
  })

  if (!worker) {
    console.warn('[DNA][queue] generation worker not started (redis unavailable)')
    return
  }

  booted = true
  console.log('[DNA][queue] generation worker started')
}
