import { onDnaQueueEvent } from '@/core/dna/queues/dna.queue.events.js'
import { getDnaQueueHealthSnapshot } from '@/core/dna/queues/dna.workers.js'

type QueueMetricsSnapshot = {
  queueDepth: number
  activeJobs: number
  failedJobs: number
  avgLatencyMs: number
  providerFailures: number
  retries: number
  stalledJobs: number
  estimatedCostUsd: number
}

const metrics: QueueMetricsSnapshot = {
  queueDepth: 0,
  activeJobs: 0,
  failedJobs: 0,
  avgLatencyMs: 0,
  providerFailures: 0,
  retries: 0,
  stalledJobs: 0,
  estimatedCostUsd: 0,
}

let subscribed = false

export function startDnaQueueTelemetry(): void {
  if (subscribed) return
  subscribed = true

  onDnaQueueEvent('any', (payload) => {
    if (payload.event === 'JOB_STARTED') metrics.activeJobs += 1
    if (payload.event === 'JOB_COMPLETED') metrics.activeJobs = Math.max(0, metrics.activeJobs - 1)
    if (payload.event === 'JOB_FAILED') {
      metrics.activeJobs = Math.max(0, metrics.activeJobs - 1)
      metrics.failedJobs += 1
      if (payload.details?.stalled) metrics.stalledJobs += 1
    }
    if (payload.event === 'PROVIDER_RETRY') metrics.retries += 1
  })
}

export async function getDnaMonitoringSnapshot() {
  const health = await getDnaQueueHealthSnapshot()
  const queueDepth = (health.queues as Array<{ waiting?: number; active?: number; delayed?: number }>).reduce((sum, item) => {
    return sum + (item.waiting ?? 0) + (item.active ?? 0) + (item.delayed ?? 0)
  }, 0)

  metrics.queueDepth = queueDepth

  return {
    ...metrics,
    queueHealth: health,
    timestamp: new Date().toISOString(),
  }
}
