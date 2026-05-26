import type { DnaPipelineRunRequest, DnaPipelineRunResult } from '@/core/dna/contracts/dna.contracts.js'
import { enqueueGenerationJob, waitForGenerationJob } from '@/core/dna/queues/dna.queue.bullmq.js'
import type { DnaGenerationJob, DnaQueueWaitResult } from '@/core/dna/queues/dna.queue.contracts.js'
import { DNA_QUEUE_NAMES } from '@/core/dna/queues/dna.queue.contracts.js'
import { isDnaDistributedQueueEnabled } from '@/core/dna/queues/dna.workers.js'

export type DnaQueuedJob = {
  id: string
  createdAt: number
  request: DnaPipelineRunRequest
}

const inMemoryQueue: DnaQueuedJob[] = []

export function enqueueDnaJob(job: DnaQueuedJob): void {
  inMemoryQueue.push(job)
}

export function dequeueDnaJob(): DnaQueuedJob | null {
  return inMemoryQueue.shift() ?? null
}

export function getQueuedDnaJobsCount(): number {
  return inMemoryQueue.length
}

export function peekQueuedDnaJobs(limit = 20): DnaQueuedJob[] {
  return inMemoryQueue.slice(0, limit)
}

export async function enqueueAndWaitDnaGeneration(params: {
  runId: string
  request: DnaPipelineRunRequest
  timeoutMs?: number
}): Promise<DnaQueueWaitResult> {
  if (!isDnaDistributedQueueEnabled()) {
    return { result: null, progress: null, source: 'sync-fallback' }
  }

  const payload: DnaGenerationJob = {
    runId: params.runId,
    request: params.request,
    queuedAt: Date.now(),
    priority: params.request.channel === 'telegram' ? 'HIGH' : params.request.type === 'warmup' ? 'NORMAL' : 'HIGH',
  }

  const job = await enqueueGenerationJob(payload)
  if (!job) {
    return { result: null, progress: null, source: 'sync-fallback' }
  }

  const timeoutMs = params.timeoutMs ?? Number(process.env.DNA_QUEUE_WAIT_TIMEOUT_MS ?? 60_000)
  const result = await waitForGenerationJob(job.id!, timeoutMs).catch(() => null)
  const progress = job.progress ?? null

  return {
    result: (result as DnaPipelineRunResult | null) ?? null,
    progress,
    source: 'bullmq',
  }
}

export function getDnaQueueNames() {
  return DNA_QUEUE_NAMES
}
