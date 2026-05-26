import { Queue, QueueEvents, Worker, type JobsOptions, type Processor, type QueueOptions, type WorkerOptions } from 'bullmq'
import { DNA_JOB_PRIORITY, DNA_QUEUE_NAMES, type DnaAnalyticsJob, type DnaDistributionJob, type DnaGenerationJob, type DnaTranscriptionJob } from '@/core/dna/queues/dna.queue.contracts.js'
import { emitDnaQueueEvent } from '@/core/dna/queues/dna.queue.events.js'
import { getDnaRedisConnectionOptions, isDnaRedisHealthy } from '@/core/dna/queues/dna.queue.redis.js'

type DnaQueueKey = keyof typeof DNA_QUEUE_NAMES

type QueueBundle<T> = {
  queue: Queue<T>
  events: QueueEvents
}

const queues = new Map<DnaQueueKey, QueueBundle<unknown>>()
const workers: Worker[] = []

function commonQueueOptions(connection: Record<string, unknown>): QueueOptions {
  return {
    connection,
    defaultJobOptions: {
      attempts: 3,
      removeOnComplete: 100,
      removeOnFail: 300,
      backoff: { type: 'exponential', delay: 1000 },
    },
  }
}

function commonWorkerOptions(connection: Record<string, unknown>): WorkerOptions {
  return {
    connection,
    autorun: true,
    concurrency: Number(process.env.DNA_QUEUE_WORKER_CONCURRENCY ?? 4),
    lockDuration: 30000,
  }
}

async function ensureQueue<T>(key: DnaQueueKey): Promise<QueueBundle<T> | null> {
  const cached = queues.get(key)
  if (cached) return cached as QueueBundle<T>

  const healthy = await isDnaRedisHealthy()
  const connection = getDnaRedisConnectionOptions()
  if (!healthy || !connection) return null

  const name = DNA_QUEUE_NAMES[key]
  const queue = new Queue<T>(name, commonQueueOptions(connection))
  const events = new QueueEvents(name, { connection })

  events.on('active', ({ jobId }) => {
    emitDnaQueueEvent({ event: 'JOB_STARTED', queue: name, jobId: String(jobId), ts: new Date().toISOString() })
  })
  events.on('completed', ({ jobId }) => {
    emitDnaQueueEvent({ event: 'JOB_COMPLETED', queue: name, jobId: String(jobId), ts: new Date().toISOString() })
  })
  events.on('failed', ({ jobId, failedReason }) => {
    emitDnaQueueEvent({ event: 'JOB_FAILED', queue: name, jobId: String(jobId), ts: new Date().toISOString(), details: { failedReason } })
  })
  events.on('stalled', ({ jobId }) => {
    emitDnaQueueEvent({ event: 'JOB_FAILED', queue: name, jobId: String(jobId), ts: new Date().toISOString(), details: { stalled: true } })
  })

  const bundle: QueueBundle<T> = { queue, events }
  queues.set(key, bundle as QueueBundle<unknown>)
  return bundle
}

function priorityValue(priority: keyof typeof DNA_JOB_PRIORITY): number {
  return DNA_JOB_PRIORITY[priority]
}

function baseJobOptions(priority: keyof typeof DNA_JOB_PRIORITY): JobsOptions {
  return {
    priority: priorityValue(priority),
    attempts: 3,
    backoff: { type: 'exponential', delay: 1200 },
  }
}

export async function enqueueGenerationJob(job: DnaGenerationJob) {
  const bundle = await ensureQueue<DnaGenerationJob>('generation')
  if (!bundle) return null
  return bundle.queue.add('DNA_GENERATION', job, baseJobOptions(job.priority))
}

export async function waitForGenerationJob(jobId: string, timeoutMs: number) {
  const bundle = await ensureQueue<DnaGenerationJob>('generation')
  if (!bundle) return null
  const job = await bundle.queue.getJob(jobId)
  if (!job) return null
  return job.waitUntilFinished(bundle.events, timeoutMs)
}

export async function enqueueTranscriptionJob(job: DnaTranscriptionJob) {
  const bundle = await ensureQueue<DnaTranscriptionJob>('transcription')
  if (!bundle) return null
  return bundle.queue.add('DNA_TRANSCRIPTION', job, baseJobOptions(job.priority))
}

export async function enqueueDistributionJob(job: DnaDistributionJob) {
  const bundle = await ensureQueue<DnaDistributionJob>('distribution')
  if (!bundle) return null
  return bundle.queue.add('DNA_DISTRIBUTION', job, baseJobOptions(job.priority))
}

export async function enqueueAnalyticsJob(job: DnaAnalyticsJob) {
  const bundle = await ensureQueue<DnaAnalyticsJob>('analytics')
  if (!bundle) return null
  return bundle.queue.add('DNA_ANALYTICS', job, baseJobOptions(job.priority))
}

export async function moveToDeadLetter(payload: { sourceQueue: string; jobId: string; reason: string; data: Record<string, unknown> }) {
  const bundle = await ensureQueue<Record<string, unknown>>('deadLetter')
  if (!bundle) return null
  return bundle.queue.add('DNA_DEAD_LETTER', payload, {
    priority: priorityValue('LOW'),
    attempts: 1,
    removeOnComplete: 1000,
    removeOnFail: 1000,
  })
}

export async function registerBullMqWorker<T>(key: DnaQueueKey, processor: Processor<T, unknown, string>): Promise<Worker | null> {
  const healthy = await isDnaRedisHealthy()
  const connection = getDnaRedisConnectionOptions()
  if (!healthy || !connection) return null
  const queueName = DNA_QUEUE_NAMES[key]
  const worker = new Worker<T>(queueName, processor, commonWorkerOptions(connection))
  workers.push(worker)
  return worker
}

export async function getDnaQueueStats() {
  const entries = await Promise.all(
    (Object.keys(DNA_QUEUE_NAMES) as DnaQueueKey[]).map(async (key) => {
      const bundle = await ensureQueue(key)
      if (!bundle) {
        return { queue: DNA_QUEUE_NAMES[key], connected: false }
      }
      const [waiting, active, completed, failed, delayed] = await Promise.all([
        bundle.queue.getWaitingCount(),
        bundle.queue.getActiveCount(),
        bundle.queue.getCompletedCount(),
        bundle.queue.getFailedCount(),
        bundle.queue.getDelayedCount(),
      ])
      return {
        queue: DNA_QUEUE_NAMES[key],
        connected: true,
        waiting,
        active,
        completed,
        failed,
        delayed,
      }
    }),
  )

  return entries
}

export async function closeBullMqInfrastructure(): Promise<void> {
  await Promise.all(workers.map((worker) => worker.close().catch(() => undefined)))
  workers.length = 0

  const bundles = Array.from(queues.values())
  queues.clear()
  await Promise.all(
    bundles.flatMap((bundle) => [bundle.events.close().catch(() => undefined), bundle.queue.close().catch(() => undefined)]),
  )
}
