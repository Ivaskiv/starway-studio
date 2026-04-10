import type { DailyCycleEntry } from '../types/daily.types'
import type { MicroTask } from '@/features/microTask/types/types'

export type DayStatus = 'completed' | 'completed_late' | 'partial' | 'skipped' | 'active' | 'future'

function getContentObject(content: DailyCycleEntry['content']) {
  return content && typeof content === 'object' && !Array.isArray(content) ? content : null
}

function hasCompletedAt(content: Record<string, unknown> | null, key: 'morningMeta' | 'eveningMeta') {
  const value = content?.[key]
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return false
  }

  return typeof (value as Record<string, unknown>).completedAt === 'string'
}

export function getDayStatus(
  entry: DailyCycleEntry | null,
  date: Date,
  tasks: MicroTask[] = [],
): DayStatus {
  const now = new Date()
  now.setHours(23, 59, 59, 999)
  const todayKey = now.toISOString().slice(0, 10)
  const dateKey = date.toISOString().slice(0, 10)
  if (date > now) return 'future'
  if (!entry) return dateKey === todayKey ? 'active' : 'future'
  if (entry.status === 'COMPLETED_LATE' || typeof entry.lateCompletedAt === 'string') return 'completed_late'
  if (entry.status === 'SKIPPED') return 'skipped'

  const content = getContentObject(entry.content)
  const completedLate = Boolean(
    content?.completedLate === true
    || (
      typeof content?.finalizedAt === 'string'
      && new Date(content.finalizedAt).toISOString().slice(0, 10) !== new Date(entry.date).toISOString().slice(0, 10)
    ),
  )
  const morningDone = hasCompletedAt(content, 'morningMeta')
  const eveningDone = hasCompletedAt(content, 'eveningMeta')
  const analysisDone = Boolean(
    entry.aiAnalysis?.trim()
    || (typeof content?.analysisGeneratedAt === 'string' && content.analysisGeneratedAt),
  )
  const allTasksDone = tasks.length > 0 && tasks.every(task => task.status === 'COMPLETED')

  if (completedLate) return 'completed_late'
  if (morningDone && allTasksDone && eveningDone && analysisDone) return 'completed'
  if (morningDone || eveningDone) return 'partial'
  return dateKey === todayKey ? 'active' : 'future'
}

export const DAY_STATUS_STYLE: Record<DayStatus, string> = {
  completed: 'border-green-500/30 bg-green-500/6',
  completed_late: 'border-amber-300/35 bg-amber-300/10',
  partial: 'border-yellow-500/30 bg-yellow-500/6',
  skipped: 'border-red-500/20 bg-red-500/4',
  active: 'border-blue-400/40 bg-blue-400/8',
  future: 'border-white/8 bg-white/2',
}

export const DAY_STATUS_DOT: Record<DayStatus, string> = {
  completed: 'bg-green-500',
  completed_late: 'bg-amber-300',
  partial: 'bg-yellow-500',
  skipped: 'bg-red-500',
  active: 'bg-blue-400',
  future: 'bg-white/20',
}
