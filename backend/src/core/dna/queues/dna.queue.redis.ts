import { createClient } from 'redis'

type DnaRedisState = 'up' | 'down'

let healthClientPromise: Promise<ReturnType<typeof createClient> | null> | null = null
let state: DnaRedisState = 'down'

function parseRedisUrl(url: string) {
  const parsed = new URL(url)
  return {
    host: parsed.hostname,
    port: Number(parsed.port || 6379),
    password: parsed.password || undefined,
    username: parsed.username || undefined,
    tls: parsed.protocol === 'rediss:' ? {} : undefined,
  }
}

export function getDnaRedisConnectionOptions() {
  const url = process.env.REDIS_URL?.trim()
  if (!url) return null
  return parseRedisUrl(url)
}

async function connectHealthClient() {
  const url = process.env.REDIS_URL?.trim()
  if (!url) return null

  const client = createClient({ url })
  client.on('error', (error: Error) => {
    state = 'down'
    console.warn('[DNA][redis] health client error', { error: error.message })
  })

  await client.connect().catch(() => null)
  if (!client.isOpen) return null
  state = 'up'
  return client
}

export async function getDnaRedisHealthClient() {
  if (!healthClientPromise) {
    healthClientPromise = connectHealthClient()
  }

  const client = await healthClientPromise.catch(() => null)
  if (!client?.isOpen) {
    healthClientPromise = null
    state = 'down'
    return null
  }

  return client
}

export async function isDnaRedisHealthy(): Promise<boolean> {
  const client = await getDnaRedisHealthClient()
  if (!client) return false
  try {
    const pong = await client.ping()
    const ok = pong === 'PONG'
    state = ok ? 'up' : 'down'
    return ok
  } catch {
    state = 'down'
    return false
  }
}

export function getDnaRedisState(): DnaRedisState {
  return state
}

export async function closeDnaRedisClient(): Promise<void> {
  const currentPromise = healthClientPromise
  const client = currentPromise ? await currentPromise.catch(() => null) : null
  healthClientPromise = null
  if (!client) {
    state = 'down'
    return
  }

  try {
    await client.quit()
  } catch {
    await client.disconnect()
  } finally {
    state = 'down'
  }
}
