import type { WeeklyReportFull } from '@/features/ai-mentor/services/mentor.api'
import type { DailyCycleEntry } from '@/features/daily-cycle/types/daily.types'
import type { MicroTask } from '@/features/microTask/types/types'

import { STATE_SCORE_MAP } from '@/features/daily-cycle/types/reportsTab.constants'

export function normalizeStringList(value: unknown): string[] {
  if (!Array.isArray(value)) return []
  return value
    .map(item => (typeof item === 'string' ? item.trim() : ''))
    .filter(Boolean)
}

export function formatRange(weekStart: string, weekEnd: string) {
  const start = new Date(weekStart)
  const end = new Date(weekEnd)

  return `${start.toLocaleDateString('uk-UA', { day: 'numeric', month: 'long' })} — ${end.toLocaleDateString('uk-UA', { day: 'numeric', month: 'long' })}`
}

export function formatDateTime(value: string) {
  return new Date(value).toLocaleString('uk-UA', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

export function startOfWindow(days: number) {
  const date = new Date()
  date.setHours(0, 0, 0, 0)
  date.setDate(date.getDate() - days)
  return date
}

export function isSessionCaptured(entry: DailyCycleEntry, session: 'morning' | 'evening') {
  const content = entry.content
  if (!content || typeof content !== 'object' || Array.isArray(content)) return false
  const block = content[session]
  return Boolean(block && typeof block === 'object' && !Array.isArray(block))
}

export function withTimeout<T>(promise: Promise<T>, timeoutMs: number, message: string) {
  return new Promise<T>((resolve, reject) => {
    const timer = window.setTimeout(() => reject(new Error(message)), timeoutMs)
    promise
      .then(value => {
        window.clearTimeout(timer)
        resolve(value)
      })
      .catch(error => {
        window.clearTimeout(timer)
        reject(error)
      })
  })
}

type ReportBucket = {
  weekStart: string
  weekEnd: string
  entries: DailyCycleEntry[]
}

export function groupEntriesByWeek(entries: DailyCycleEntry[]): ReportBucket[] {
  const buckets = new Map<string, DailyCycleEntry[]>()

  entries.forEach(entry => {
    const date = new Date(entry.date)
    const day = date.getDay() || 7
    const monday = new Date(date)
    monday.setDate(date.getDate() - (day - 1))
    monday.setHours(0, 0, 0, 0)
    const sunday = new Date(monday)
    sunday.setDate(monday.getDate() + 6)
    const key = monday.toISOString().slice(0, 10)
    const bucket = buckets.get(key) ?? []
    bucket.push(entry)
    buckets.set(key, bucket)
    if (!buckets.has(`${key}:meta`)) {
      const metaEntry = {
        date: `${monday.toISOString()}|${sunday.toISOString()}`,
      } as unknown as DailyCycleEntry
      buckets.set(`${key}:meta`, [metaEntry])
    }
  })

  return Array.from(buckets.entries())
    .filter(([key]) => !key.endsWith(':meta'))
    .map(([key, bucket]) => {
      const meta = buckets.get(`${key}:meta`)?.[0]
      const [weekStart, weekEnd] = String(meta?.date ?? '').split('|')
      return {
        weekStart,
        weekEnd,
        entries: bucket.slice().sort((left, right) => new Date(left.date).getTime() - new Date(right.date).getTime()),
      }
    })
    .sort((left, right) => new Date(right.weekStart).getTime() - new Date(left.weekStart).getTime())
}

export function buildFallbackWeeklyReport(bucket: ReportBucket, tasks: MicroTask[]): WeeklyReportFull {
  const tasksDone = tasks.filter(task => {
    const createdAt = task.createdAt?.slice(0, 10)
    return createdAt != null
      && createdAt >= bucket.weekStart.slice(0, 10)
      && createdAt <= bucket.weekEnd.slice(0, 10)
      && (task.status ?? 'PENDING') === 'COMPLETED'
  }).length

  const tasksTotal = tasks.filter(task => {
    const createdAt = task.createdAt?.slice(0, 10)
    return createdAt != null
      && createdAt >= bucket.weekStart.slice(0, 10)
      && createdAt <= bucket.weekEnd.slice(0, 10)
  }).length

  const topInsights = bucket.entries
    .map(entry => (typeof entry.aiAnalysis === 'string' ? entry.aiAnalysis.trim() : ''))
    .filter((value): value is string => Boolean(value))
    .slice(0, 3)

  const completionRate = tasksTotal > 0 ? Math.round((tasksDone / tasksTotal) * 100) : 0

  return {
    id: `fallback-${bucket.weekStart}`,
    weekStart: bucket.weekStart,
    weekEnd: bucket.weekEnd,
    topInsights,
    nextWeekTasks: [],
    nextWeekFocus: topInsights[0] ?? 'Тижневий підсумок',
    overallScore: completionRate,
    completionRate,
    streakDays: bucket.entries.length,
    pdfUrl: '',
    metrics: {
      tasksDone,
      tasksTotal,
    },
  } as unknown as WeeklyReportFull
}

type EntryWithState = DailyCycleEntry & { state?: string | null }

export function buildTrendPoints(entries: DailyCycleEntry[]) {
  return entries
    .slice()
    .sort((left, right) => new Date(left.date).getTime() - new Date(right.date).getTime())
    .map(entry => {
      const state = String((entry as EntryWithState).state ?? '')
      const value = STATE_SCORE_MAP[state] ?? 0
      return { date: entry.date, value }
    })
    .filter(point => point.value > 0)
}
