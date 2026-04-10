const cache = new Map<string, { value: unknown; expiresAt: number }>()

export async function cacheGet<T>(key: string): Promise<T | null> {
  const item = cache.get(key)
  if (!item || Date.now() > item.expiresAt) {
    cache.delete(key)
    return null
  }

  return item.value as T
}

export async function cacheSet(key: string, value: unknown, ttlSeconds = 300) {
  cache.set(key, {
    value,
    expiresAt: Date.now() + ttlSeconds * 1000,
  })
}

export async function cacheDel(key: string) {
  cache.delete(key)
}

export async function cacheDelPattern(prefix: string) {
  for (const key of cache.keys()) {
    if (key.startsWith(prefix)) {
      cache.delete(key)
    }
  }
}
