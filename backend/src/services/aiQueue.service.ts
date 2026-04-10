type AiTask<T> = () => Promise<T>

interface QueueEntry<T> {
  task: AiTask<T>
  resolve: (value: any) => void
  reject: (reason: any) => void
  retries: number
  baseDelayMs: number
  label?: string
}

const DEFAULT_MAX_CONCURRENCY = Math.max(
  3,
  Math.min(5, Number(process.env.AI_MAX_CONCURRENCY ?? 4) || 4),
)

const queue: QueueEntry<unknown>[] = []
let activeCount = 0

function isQuotaError(error: unknown) {
  if (!error || typeof error !== 'object') return false
  const record = error as Record<string, unknown>
  return record.code === 'insufficient_quota' || record.status === 429
}

function sleep(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms))
}

async function runWithRetries<T>(
  task: AiTask<T>,
  retries: number,
  baseDelayMs: number,
  label?: string,
): Promise<T> {
  let attempt = 0

  while (true) {
    try {
      return await task()
    } catch (error) {
      if (isQuotaError(error) || attempt >= retries) {
        throw error
      }

      const delayMs = baseDelayMs * (2 ** attempt)
      console.warn('[AI Queue] retrying task', {
        label: label ?? null,
        attempt: attempt + 1,
        delayMs,
      })
      await sleep(delayMs)
      attempt += 1
    }
  }
}

function drainQueue() {
  while (activeCount < DEFAULT_MAX_CONCURRENCY && queue.length > 0) {
    const entry = queue.shift()
    if (!entry) return

    activeCount += 1

    void (async () => {
      try {
        const value = await runWithRetries(
          entry.task,
          entry.retries,
          entry.baseDelayMs,
          entry.label,
        )
        entry.resolve(value)
      } catch (error) {
        entry.reject(error)
      } finally {
        activeCount = Math.max(0, activeCount - 1)
        drainQueue()
      }
    })()
  }
}

export async function runQueuedAiTask<T>(
  task: AiTask<T>,
  options?: {
    retries?: number
    baseDelayMs?: number
    label?: string
  },
): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    queue.push({
      task,
      resolve,
      reject,
      retries: Math.max(0, options?.retries ?? 1),
      baseDelayMs: Math.max(100, options?.baseDelayMs ?? 400),
      label: options?.label,
    })
    drainQueue()
  })
}

export function getAiQueueStatus() {
  return {
    activeCount,
    pendingCount: queue.length,
    maxConcurrency: DEFAULT_MAX_CONCURRENCY,
  }
}
