export type DailyQuestion = {
  id: string
  label: string
  hint?: string
  placeholder: string
  type: 'text' | 'textarea'
}

export type DailyDraftState = {
  answers: Record<string, string>
  step: number
  questions?: DailyQuestion[]
}

export type DailyCycleFlowProps = {
  embedded?: boolean
  initialSession?: 'morning' | 'evening'
  initialDateKey?: string
  onClose?: () => void
  onComplete?: () => void
  onOpenMicroTasks?: (dateKey?: string) => void
  onOpenProgress?: () => void
}
