import { startDnaGenerationWorker } from '@/core/dna/queues/dna-generation.worker.js'
import { startDnaTranscriptionWorker } from '@/core/dna/queues/dna-transcription.worker.js'
import { startDnaDistributionWorker } from '@/core/dna/queues/dna-distribution.worker.js'
import { startDnaMemoryWorker } from '@/core/dna/queues/dna-memory.worker.js'
import { startDnaAnalyticsWorker } from '@/core/dna/queues/dna-analytics.worker.js'
import { closeBullMqInfrastructure, getDnaQueueStats } from '@/core/dna/queues/dna.queue.bullmq.js'
import { closeDnaRedisClient, getDnaRedisState, isDnaRedisHealthy } from '@/core/dna/queues/dna.queue.redis.js'

let started = false

export function isDnaDistributedQueueEnabled(): boolean {
  return process.env.DNA_DISTRIBUTED_QUEUE_ENABLED === 'true'
}

export async function startDnaQueueWorkers(): Promise<void> {
  if (started || !isDnaDistributedQueueEnabled()) return

  const healthy = await isDnaRedisHealthy()
  if (!healthy) {
    console.warn('[DNA][queue] redis unavailable, distributed workers skipped; sync fallback remains active')
    return
  }

  await startDnaGenerationWorker()
  await startDnaTranscriptionWorker()
  await startDnaDistributionWorker()
  await startDnaMemoryWorker()
  await startDnaAnalyticsWorker()

  started = true
  console.log('[DNA][queue] distributed workers started')
}

export async function stopDnaQueueWorkers(): Promise<void> {
  if (!started) {
    await closeDnaRedisClient().catch(() => undefined)
    return
  }

  await closeBullMqInfrastructure().catch(() => undefined)
  await closeDnaRedisClient().catch(() => undefined)
  started = false
  console.log('[DNA][queue] distributed workers stopped')
}

export async function getDnaQueueHealthSnapshot() {
  return {
    enabled: isDnaDistributedQueueEnabled(),
    redisState: getDnaRedisState(),
    redisHealthy: await isDnaRedisHealthy(),
    queues: await getDnaQueueStats().catch(() => []),
    memoryUsage: process.memoryUsage(),
  }
}
