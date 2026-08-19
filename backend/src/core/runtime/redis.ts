import { createClient } from 'redis'

type RuntimeRedisClient = ReturnType<typeof createClient>

let clientPromise: Promise<RuntimeRedisClient | null> | null = null

async function connectRedis(): Promise<RuntimeRedisClient | null> {
  const url = process.env.REDIS_URL?.trim()
  if (!url) return null

  const client = createClient({ url })
  client.on('error', (error) => {
    console.warn('[runtime-redis] connection error', {
      error: error instanceof Error ? error.message : String(error),
    })
  })

  await client.connect().catch(() => null)
  return client.isOpen ? client : null
}

export async function getRuntimeRedisClient(): Promise<RuntimeRedisClient | null> {
  if (!clientPromise) {
    clientPromise = connectRedis()
  }

  const client = await clientPromise.catch(() => null)
  if (!client?.isOpen) {
    clientPromise = null
    return null
  }

  return client
}

export async function runtimeRedisGet<T = string>(key: string): Promise<T | null> {
  const client = await getRuntimeRedisClient()
  if (!client) return null
  const value = await client.get(key).catch(() => null)
  return value as T | null
}

export async function runtimeRedisSet(key: string, value: string, ttlSeconds: number): Promise<boolean> {
  const client = await getRuntimeRedisClient()
  if (!client) return false
  await client.set(key, value, { EX: Math.max(1, ttlSeconds) }).catch(() => undefined)
  return true
}

export async function runtimeRedisSetNx(key: string, value: string, ttlSeconds: number): Promise<boolean> {
  const client = await getRuntimeRedisClient()
  if (!client) return false
  const response = await client.set(key, value, { NX: true, EX: Math.max(1, ttlSeconds) }).catch(() => null)
  return response === 'OK'
}

export async function runtimeRedisDel(key: string): Promise<void> {
  const client = await getRuntimeRedisClient()
  if (!client) return
  await client.del(key).catch(() => undefined)
}

export async function runtimeRedisIncrBy(key: string, ttlSeconds: number, increment = 1): Promise<number | null> {
  const client = await getRuntimeRedisClient()
  if (!client) return null
  const value = await client.incrBy(key, increment).catch(() => null)
  if (value !== null) {
    await client.expire(key, Math.max(1, ttlSeconds)).catch(() => undefined)
  }
  return value
}
