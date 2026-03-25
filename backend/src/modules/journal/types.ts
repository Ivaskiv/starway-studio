export type JournalEventType =
  | 'AI'
  | 'REFLECTION'
  | 'ZOOM'
  | 'TASK'
  | 'STREAK'
  | 'SUBSCRIPTION'

export interface JournalEvent {
  id: string
  type: JournalEventType
  date: string
  title: string
  meta?: Record<string, unknown>
}
