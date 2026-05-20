import { cacheGet, cacheSet } from '../lib/cache/index.js'
import { runGuardedAiTask, stableHash } from './aiGuard.service.js'
import { getAiTaskConfig, type AiTaskType } from '../platform/ai.registry.js'

type AiTaskRunnerDescriptor = {
  userId: string
  payload?: unknown
  payloadHash?: string
  source?: string
  label?: string
  throttleMs?: number
  duplicateWindowMs?: number
  disableCooldownMs?: number
  retries?: number
  baseDelayMs?: number
}

type AiTaskFn<T> = () => Promise<T>
type AiFallbackFn<T> = (error?: unknown) => T | Promise<T>

function buildCacheKey(taskType: AiTaskType, userId: string, payloadHash: string): string {
  return `ai-task:${taskType}:${userId}:${payloadHash}`
}

function logAiTaskEvent(
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

export async function runRegisteredAiTask<T>(
  taskType: AiTaskType,
  descriptor: AiTaskRunnerDescriptor,
  task: AiTaskFn<T>,
  fallback: AiFallbackFn<T>,
): Promise<T> {
  const config = getAiTaskConfig(taskType)
  const payloadHash = descriptor.payloadHash ?? stableHash(descriptor.payload ?? {})
  const cacheKey = buildCacheKey(taskType, descriptor.userId, payloadHash)

  if (config.cachePolicy.enabled && config.cachePolicy.ttlSeconds > 0) {
    const cached = await cacheGet<T>(cacheKey)
    if (cached !== null) {
      logAiTaskEvent('info', '[AI TASK][cache_hit]', {
        taskType,
        label: descriptor.label ?? config.label,
        userId: descriptor.userId,
        tier: config.tier,
      })
      return cached
    }
  }

  const startedAt = Date.now()
  const result = await runGuardedAiTask(
    {
      userId: descriptor.userId,
      source: descriptor.source ?? taskType,
      label: descriptor.label ?? config.label,
      payloadHash,
      payload: descriptor.payload,
      throttleMs: descriptor.throttleMs ?? config.throttleMs,
      duplicateWindowMs: descriptor.duplicateWindowMs ?? Math.max(config.cachePolicy.ttlSeconds * 1000, config.timeoutMs),
      disableCooldownMs: descriptor.disableCooldownMs,
      retries: descriptor.retries ?? config.retryPolicy.retries,
      baseDelayMs: descriptor.baseDelayMs ?? config.retryPolicy.baseDelayMs,
    },
    task,
    fallback,
  )

  const durationMs = Date.now() - startedAt
  if (config.cachePolicy.enabled && config.cachePolicy.ttlSeconds > 0) {
    void cacheSet(cacheKey, result, config.cachePolicy.ttlSeconds).catch(() => undefined)
  }

  if (durationMs > 50) {
    logAiTaskEvent('warn', '[AI TASK][slow]', {
      taskType,
      label: descriptor.label ?? config.label,
      userId: descriptor.userId,
      tier: config.tier,
      durationMs,
      model: config.model,
    })
  } else {
    logAiTaskEvent('info', '[AI TASK][done]', {
      taskType,
      label: descriptor.label ?? config.label,
      userId: descriptor.userId,
      tier: config.tier,
      durationMs,
      model: config.model,
    })
  }

  return result
}
