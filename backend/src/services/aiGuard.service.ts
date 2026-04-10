import crypto from 'node:crypto'
import { runQueuedAiTask } from './aiQueue.service.js'

export interface AiGuardDescriptor {
  userId: string
  source: string
  label?: string
  payload?: unknown
  payloadHash?: string
  throttleMs?: number
  duplicateWindowMs?: number
  disableCooldownMs?: number
  retries?: number
  baseDelayMs?: number
}

type AiTask<T> = () => Promise<T>
type FallbackFactory<T> = (error?: unknown) => T | Promise<T>

const DEFAULT_THROTTLE_MS = 60_000
const DEFAULT_DUPLICATE_WINDOW_MS = 10 * 60_000
const DEFAULT_DISABLE_COOLDOWN_MS = 60 * 60_000

const lastCallAtByUser = new Map<string, number>()
const lastPayloadByUser = new Map<string, { hash: string; at: number; source: string }>()
const disabledUntilByUser = new Map<string, number>()
const activeLocksByUser = new Set<string>()
const inflightByKey = new Map<string, Promise<unknown>>()

function stableSerialize(value: unknown): string {
  if (value === null || value === undefined) return 'null'
  if (typeof value === 'number' || typeof value === 'boolean') return JSON.stringify(value)
  if (typeof value === 'string') return JSON.stringify(value)
  if (value instanceof Date) return JSON.stringify(value.toISOString())
  if (Array.isArray(value)) {
    return `[${value.map(item => stableSerialize(item)).join(',')}]`
  }
  if (typeof value === 'object') {
    const record = value as Record<string, unknown>
    const keys = Object.keys(record).sort()
    return `{${keys.map(key => `${JSON.stringify(key)}:${stableSerialize(record[key])}`).join(',')}}`
  }

  return JSON.stringify(String(value))
}

export function stableHash(value: unknown): string {
  return crypto.createHash('sha256').update(stableSerialize(value)).digest('hex')
}

export function isOpenAIQuotaError(error: unknown) {
  if (!error || typeof error !== 'object') return false
  const record = error as Record<string, unknown>
  return record.code === 'insufficient_quota' || record.status === 429
}

function disableAiForUser(userId: string, ttlMs = DEFAULT_DISABLE_COOLDOWN_MS) {
  const disabledUntil = Date.now() + ttlMs
  disabledUntilByUser.set(userId, disabledUntil)
  return disabledUntil
}

function isTemporarilyDisabled(userId: string) {
  const disabledUntil = disabledUntilByUser.get(userId) ?? 0
  return disabledUntil > Date.now() ? disabledUntil : null
}

function logGuardEvent(
  level: 'info' | 'warn',
  message: string,
  meta: Record<string, unknown>,
) {
  if (level === 'warn') {
    console.warn(message, meta)
    return
  }

  console.info(message, meta)
}

export async function runGuardedAiTask<T>(
  descriptor: AiGuardDescriptor,
  task: AiTask<T>,
  fallback: FallbackFactory<T>,
): Promise<T> {
  const payloadHash = descriptor.payloadHash ?? stableHash(descriptor.payload ?? {})
  const key = `${descriptor.userId}:${descriptor.source}:${payloadHash}`
  const throttleMs = Math.max(1_000, descriptor.throttleMs ?? DEFAULT_THROTTLE_MS)
  const duplicateWindowMs = Math.max(throttleMs, descriptor.duplicateWindowMs ?? DEFAULT_DUPLICATE_WINDOW_MS)
  const disableCooldownMs = Math.max(throttleMs, descriptor.disableCooldownMs ?? DEFAULT_DISABLE_COOLDOWN_MS)
  const label = descriptor.label ?? descriptor.source
  const now = Date.now()

  const disabledUntil = isTemporarilyDisabled(descriptor.userId)
  if (disabledUntil) {
    logGuardEvent('warn', '[AI Guard] skipped (disabled)', {
      userId: descriptor.userId,
      source: descriptor.source,
      label,
      disabledUntil: new Date(disabledUntil).toISOString(),
    })
    return fallback()
  }

  const lastCallAt = lastCallAtByUser.get(descriptor.userId) ?? 0
  if (now - lastCallAt < throttleMs) {
    logGuardEvent('warn', '[AI Guard] skipped (throttle)', {
      userId: descriptor.userId,
      source: descriptor.source,
      label,
      waitMs: throttleMs - (now - lastCallAt),
    })
    return fallback()
  }

  const lastPayload = lastPayloadByUser.get(descriptor.userId)
  if (
    lastPayload
    && lastPayload.source === descriptor.source
    && lastPayload.hash === payloadHash
    && now - lastPayload.at < duplicateWindowMs
  ) {
    logGuardEvent('warn', '[AI Guard] skipped (duplicate payload)', {
      userId: descriptor.userId,
      source: descriptor.source,
      label,
      ageMs: now - lastPayload.at,
    })
    return fallback()
  }

  const existing = inflightByKey.get(key)
  if (existing) {
    logGuardEvent('warn', '[AI Guard] skipped (duplicate in-flight)', {
      userId: descriptor.userId,
      source: descriptor.source,
      label,
    })
    return existing as Promise<T>
  }

  if (activeLocksByUser.has(descriptor.userId)) {
    logGuardEvent('warn', '[AI Guard] skipped (user locked)', {
      userId: descriptor.userId,
      source: descriptor.source,
      label,
    })
    return fallback()
  }

  lastCallAtByUser.set(descriptor.userId, now)
  lastPayloadByUser.set(descriptor.userId, {
    hash: payloadHash,
    at: now,
    source: descriptor.source,
  })

  activeLocksByUser.add(descriptor.userId)

  const promise = (async () => {
    logGuardEvent('info', '[AI Guard] started', {
      userId: descriptor.userId,
      source: descriptor.source,
      label,
      payloadHash,
    })

    try {
      const result = await runQueuedAiTask(task, {
        label,
        retries: descriptor.retries ?? 1,
        baseDelayMs: descriptor.baseDelayMs ?? 500,
      })

      logGuardEvent('info', '[AI Guard] finished', {
        userId: descriptor.userId,
        source: descriptor.source,
        label,
      })

      return result
    } catch (error) {
      if (isOpenAIQuotaError(error)) {
        const until = disableAiForUser(descriptor.userId, disableCooldownMs)
        logGuardEvent('warn', '[AI Guard] quota disabled', {
          userId: descriptor.userId,
          source: descriptor.source,
          label,
          disabledUntil: new Date(until).toISOString(),
        })
      } else {
        logGuardEvent('warn', '[AI Guard] failed, using fallback', {
          userId: descriptor.userId,
          source: descriptor.source,
          label,
          error: error instanceof Error ? error.message : String(error),
        })
      }

      return fallback(error)
    } finally {
      activeLocksByUser.delete(descriptor.userId)
      inflightByKey.delete(key)
    }
  })()

  inflightByKey.set(key, promise)
  return promise
}

export function getAiGuardStatus(userId: string) {
  return {
    isDisabled: Boolean(isTemporarilyDisabled(userId)),
    lastCallAt: lastCallAtByUser.get(userId) ?? null,
    hasLock: activeLocksByUser.has(userId),
  }
}
