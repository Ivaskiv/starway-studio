export type JournalEventType = 'AI' | 'REFLECTION' | 'ZOOM' | 'TASK' | 'STREAK' | 'SUBSCRIPTION' | 'TG_REMINDER'

export type JournalEvent = {
  id: string
  type: JournalEventType
  date: string
  title: string
  meta?: Record<string, unknown>
}

export type JournalFilter = 'all' | 'zoom' | 'practices'

export type ReflectionBlockStatus = 'done' | 'pending' | 'unavailable'
export type TaskBlockStatus = 'active' | 'done' | 'missed' | 'awaiting' | 'empty'
export type ZoomBlockStatus = 'scheduled' | 'done' | 'missed' | 'empty'

export type ReflectionBlockState = {
  status: ReflectionBlockStatus
  event: JournalEvent | null
}

export type TaskBlockState = {
  status: TaskBlockStatus
  items: JournalEvent[]
  activeCount: number
  completedCount: number
  missedCount: number
}

export type ZoomBlockState = {
  status: ZoomBlockStatus
  items: JournalEvent[]
}

export type JournalSummary = {
  xp: number
  completed: number
  pending: number
  missed: number
}

export type JournalDayState = {
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

export type JournalResponse = {
  events: JournalEvent[]
  days: JournalDayState[]
}

export interface JournalLayoutProps {
  compact?: boolean;
  month: number;
  year: number;
  errorMessage?: string | null;
  latestIncompleteDay?: string | null;
  events: JournalEvent[];
  dayStatesByDate: Record<string, JournalDayState>;
  filter: JournalFilter;
  isLoading: boolean;
  selectedDay: string;
  selectedDayState: JournalDayState;
  selectedEvents: JournalEvent[];
  onFilterChange: (next: JournalFilter) => void;
  onPrevMonth: () => void;
  onNextMonth: () => void;
  onSelectDay: (day: string) => void;
}
