const MAX_LATENCY_MS = 5 * 60 * 1000

export function getLatencyMs(startedAt: number | null | undefined, now = Date.now()): number | null {
  if (startedAt == null || !Number.isFinite(startedAt)) {
    return null
  }

  const latencyMs = now - startedAt
  if (latencyMs < 0 || latencyMs > MAX_LATENCY_MS) {
    return null
  }

  return Math.round(latencyMs)
}

export const WELCOME_TEST_MAX_LATENCY_MS = MAX_LATENCY_MS
