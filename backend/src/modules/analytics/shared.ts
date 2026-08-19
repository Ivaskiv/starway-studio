import type { Prisma } from '@starway/db/prisma-client'
import type { InsightCount, Period, PeriodRange } from './types.js'

export function getPeriodRange(period: Period = '30d'): PeriodRange {
  const now = new Date()
  const days = period === '7d' ? 7 : period === '90d' ? 90 : 30
  const start = new Date(now.getTime() - days * 24 * 60 * 60 * 1000)
  return { now, start }
}

export function round(value: number): number {
  return Math.round(value * 10) / 10
}

export function safeRate(part: number, total: number): number {
  if (total <= 0) {
    return 0
  }

  return round((part / total) * 100)
}

export function countDistinctUserIds(rows: Array<{ userId: string | null }>): number {
  return new Set(rows.map((row) => row.userId).filter((userId): userId is string => Boolean(userId))).size
}

export function isObject(value: Prisma.JsonValue | null): value is Prisma.JsonObject {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value)
}

export function incrementCount(map: Map<string, number>, key: string | null): void {
  if (!key) {
    return
  }

  map.set(key, (map.get(key) ?? 0) + 1)
}

export function toRankedCounts(map: Map<string, number>, limit: number): InsightCount[] {
  return [...map.entries()]
    .sort((left, right) => right[1] - left[1])
    .slice(0, limit)
    .map(([label, count]) => ({ label, count }))
}
