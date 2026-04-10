export type JournalEventType =
  | 'AI'
  | 'VOICE'
  | 'REFLECTION'
  | 'ZOOM'
  | 'TASK'
  | 'STREAK'
  | 'SUBSCRIPTION'
  | 'TG_REMINDER'

export interface JournalEvent {
  id: string
  type: JournalEventType
  date: string
  title: string
  meta?: Record<string, unknown>
}

export type ReflectionBlockStatus = 'done' | 'pending' | 'unavailable'
export type TaskBlockStatus = 'active' | 'done' | 'missed' | 'awaiting' | 'empty'
export type ZoomBlockStatus = 'scheduled' | 'done' | 'missed' | 'empty'

export interface ReflectionBlockState {
  status: ReflectionBlockStatus
  event: JournalEvent | null
}

export interface TaskBlockState {
  status: TaskBlockStatus
  items: JournalEvent[]
  activeCount: number
  completedCount: number
  missedCount: number
}

export interface ZoomBlockState {
  status: ZoomBlockStatus
  items: JournalEvent[]
}

export interface JournalSummary {
  xp: number
  completed: number
  pending: number
  missed: number
}

export interface JournalDayState {
  date: string
  dateKey: string
  finalizedAt?: string | null
  finalizedSession?: 'morning' | 'evening' | null
  hasEntry: boolean
  events: JournalEvent[]
  reflection: {
    morning: ReflectionBlockState
    evening: ReflectionBlockState
  }
  microTasks: TaskBlockState
  zoomSessions: ZoomBlockState
  systemSignals: JournalEvent[]
  summary: JournalSummary
}

export interface JournalResponse {
  events: JournalEvent[]
  days: JournalDayState[]
}
