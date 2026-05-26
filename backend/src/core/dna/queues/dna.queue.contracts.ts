import type { JobProgress } from 'bullmq'
import type { DnaPipelineRunRequest, DnaPipelineRunResult } from '@/core/dna/contracts/dna.contracts.js'

export const DNA_QUEUE_NAMES = {
  generation: 'dna-generation',
  transcription: 'dna-transcription',
  telegram: 'dna-telegram',
  distribution: 'dna-distribution',
  memory: 'dna-memory',
  analytics: 'dna-analytics',
  deadLetter: 'dna-dead-letter',
} as const

export const DNA_JOB_PRIORITY = {
  CRITICAL: 1,
  HIGH: 2,
  NORMAL: 5,
  LOW: 8,
} as const

export type DnaQueuePriority = keyof typeof DNA_JOB_PRIORITY

export type DnaGenerationJob = {
  runId: string
  request: DnaPipelineRunRequest
  queuedAt: number
  priority: DnaQueuePriority
}

export type DnaTranscriptionJob = {
  requestId: string
  userId: string
  audioBase64: string
  mimeType: string
  filename: string
  queuedAt: number
  priority: DnaQueuePriority
}

export type DnaDistributionJob = {
  requestId: string
  userId: string
  channel: 'telegram' | 'web' | 'miniapp'
  payload: Record<string, unknown>
  queuedAt: number
  priority: DnaQueuePriority
}

export type DnaAnalyticsJob = {
  eventId: string
  source: string
  payload: Record<string, unknown>
  queuedAt: number
  priority: DnaQueuePriority
}

export type DnaQueueWaitResult = {
  result: DnaPipelineRunResult | null
  progress: JobProgress | null
  source: 'bullmq' | 'sync-fallback'
}
