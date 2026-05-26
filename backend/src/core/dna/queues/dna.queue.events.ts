import { EventEmitter } from 'node:events'

export const DNA_QUEUE_EVENT = {
  JOB_STARTED: 'JOB_STARTED',
  JOB_COMPLETED: 'JOB_COMPLETED',
  JOB_FAILED: 'JOB_FAILED',
  PIPELINE_COMPLETED: 'PIPELINE_COMPLETED',
  PIPELINE_FAILED: 'PIPELINE_FAILED',
  PROVIDER_RETRY: 'PROVIDER_RETRY',
} as const

export type DnaQueueEventName = keyof typeof DNA_QUEUE_EVENT

export type DnaQueueEventPayload = {
  event: DnaQueueEventName
  queue: string
  jobId: string
  ts: string
  details?: Record<string, unknown>
}

const emitter = new EventEmitter()
emitter.setMaxListeners(100)

export function emitDnaQueueEvent(payload: DnaQueueEventPayload): void {
  emitter.emit(payload.event, payload)
  emitter.emit('any', payload)
}

export function onDnaQueueEvent(event: DnaQueueEventName | 'any', listener: (payload: DnaQueueEventPayload) => void): () => void {
  emitter.on(event, listener)
  return () => emitter.off(event, listener)
}
