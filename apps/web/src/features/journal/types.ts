export type JournalEventType = 'AI' | 'REFLECTION' | 'ZOOM' | 'TASK' | 'STREAK' | 'SUBSCRIPTION' | 'TG_REMINDER'

export type JournalEvent = {
  id: string
  type: JournalEventType
  date: string
  title: string
  meta?: Record<string, unknown>
}

export type JournalFilter = 'all' | 'zoom' | 'practices'
