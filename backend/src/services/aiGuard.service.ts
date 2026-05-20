import crypto from 'node:crypto'

import { runQueuedAiTask } from './aiQueue.service.js'
import {
  runtimeRedisDel,
  runtimeRedisGet,
  runtimeRedisSet,
  runtimeRedisSetNx,
} from '../core/runtime/runtimeRedis.js'

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
const REDIS_TTL_PADDING_MS = 15_000

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

function logGuardEvent(
  level: 'info' | 'warn',
  message: string,
  meta: Record<string, unknown>,
) {
  const safeMeta = Object.fromEntries(
    Object.entries(meta)
      .filter(([key]) => !['prompt', 'contextPrompt', 'payload', 'context', 'messages', 'raw', 'memory', 'response', 'token'].includes(key))
      .map(([key, value]) => [key, typeof value === 'string' && value.length > 160 ? `${value.slice(0, 157)}...` : value]),
  )

  if (level === 'warn') {
    console.warn(message, safeMeta)
    return
  }

  console.info(message, safeMeta)
}

async function getRedisNumber(key: string): Promise<number> {
  const raw = await runtimeRedisGet<string>(key).catch(() => null)
  const value = Number(raw ?? 0)
  return Number.isFinite(value) ? value : 0
}

async function isTemporarilyDisabled(userId: string): Promise<number | null> {
  const disabledUntil = await getRedisNumber(`ai:disable:${userId}`)
  return disabledUntil > Date.now() ? disabledUntil : null
}

async function getLastCallAt(userId: string): Promise<number> {
  return getRedisNumber(`ai:lastcall:${userId}`)
}

async function getLastPayload(userId: string, source: string): Promise<{ hash: string; at: number; source: string } | null> {
  const raw = await runtimeRedisGet<string>(`ai:lastpayload:${userId}:${source}`).catch(() => null)
  if (!raw) return null
  const [hash, at] = raw.split('|')
  const parsedAt = Number(at ?? 0)
  if (!hash || !Number.isFinite(parsedAt)) return null
  return { hash, at: parsedAt, source }
}

async function claimAiLock(key: string, ttlMs: number): Promise<boolean> {
  return runtimeRedisSetNx(`ai:lock:${key}`, '1', Math.max(1, Math.ceil(ttlMs / 1000)))
}

async function releaseAiLock(key: string): Promise<void> {
  await runtimeRedisDel(`ai:lock:${key}`)
}

async function setThrottleState(userId: string, source: string, payloadHash: string, timestamp: number, throttleMs: number, duplicateWindowMs: number, disableCooldownMs: number): Promise<void> {
  await Promise.all([
    runtimeRedisSet(`ai:lastcall:${userId}`, String(timestamp), Math.max(1, Math.ceil(disableCooldownMs / 1000))),
    runtimeRedisSet(`ai:lastpayload:${userId}:${source}`, `${payloadHash}|${timestamp}`, Math.max(1, Math.ceil(duplicateWindowMs / 1000))),
    runtimeRedisSet(`ai:disable:${userId}`, String(timestamp + disableCooldownMs), Math.max(1, Math.ceil(disableCooldownMs / 1000))),
  ])
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

  const disabledUntil = await isTemporarilyDisabled(descriptor.userId)
  if (disabledUntil) {
    logGuardEvent('warn', '[AI Guard] skipped (disabled)', {
      userId: descriptor.userId,
      source: descriptor.source,
      label,
      disabledUntil: new Date(disabledUntil).toISOString(),
    })
    return fallback()
  }

  const lastCallAt = await getLastCallAt(descriptor.userId)
  if (now - lastCallAt < throttleMs) {
    logGuardEvent('warn', '[AI Guard] skipped (throttle)', {
      userId: descriptor.userId,
      source: descriptor.source,
      label,
      waitMs: throttleMs - (now - lastCallAt),
    })
    return fallback()
  }

  const lastPayload = await getLastPayload(descriptor.userId, descriptor.source)
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

  const lockAcquired = await claimAiLock(key, duplicateWindowMs + REDIS_TTL_PADDING_MS)
  if (!lockAcquired) {
    logGuardEvent('warn', '[AI Guard] skipped (locked)', {
      userId: descriptor.userId,
      source: descriptor.source,
      label,
    })
    return fallback()
  }

  await setThrottleState(descriptor.userId, descriptor.source, payloadHash, now, throttleMs, duplicateWindowMs, disableCooldownMs)

  try {
    logGuardEvent('info', '[AI Guard] started', {
      userId: descriptor.userId,
      source: descriptor.source,
      label,
      payloadHash,
    })

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
      const until = Date.now() + disableCooldownMs
      await runtimeRedisSet(`ai:disable:${descriptor.userId}`, String(until), Math.max(1, Math.ceil(disableCooldownMs / 1000)))
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
    await releaseAiLock(key)
  }
}

export async function getAiGuardStatus(userId: string) {
  const disabledUntil = await isTemporarilyDisabled(userId)
  return {
    isDisabled: Boolean(disabledUntil),
    lastCallAt: await getLastCallAt(userId),
    hasLock: false,
  }
}
