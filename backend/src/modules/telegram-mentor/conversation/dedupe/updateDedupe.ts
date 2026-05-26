const UPDATE_TTL_MS = 5 * 60 * 1000

const processedUpdates = new Map<number, number>()

export function isDuplicateUpdate(updateId: number | null): boolean {
  if (!updateId || !Number.isFinite(updateId) || updateId <= 0) return false
  const now = Date.now()
  const existing = processedUpdates.get(updateId)
  if (existing && now - existing < UPDATE_TTL_MS) {
    return true
  }
  processedUpdates.set(updateId, now)
  return false
}

export function cleanupDuplicateUpdates(): void {
  const now = Date.now()
  for (const [updateId, ts] of processedUpdates.entries()) {
    if (now - ts > UPDATE_TTL_MS) {
      processedUpdates.delete(updateId)
    }
  }
}
