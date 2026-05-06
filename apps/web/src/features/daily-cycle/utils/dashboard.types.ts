import type { MicroTask as MicroTaskItem } from '@/features/microTask/types/types'

export type DashboardUser = {
  id: string
  firstName?: string
  name?: string
  abilities?: string[]
  settings?: {
    accentColor?: string
  }
}

export type RecoveryBlockedIntent = 'active_day' | 'morning' | 'tasks' | 'evening'
export type CurrentFlowStep = 'morning' | 'tasks' | 'evening' | 'analysis'
export type CurrentFlow =
  | { mode: 'blocked'; dateKey: string; step: CurrentFlowStep }
  | { mode: 'recovery'; dateKey: string; step: CurrentFlowStep }
  | { mode: 'today'; dateKey: string; step: CurrentFlowStep }
  | { mode: 'history'; dateKey: string; step: 'analysis' }

export type DailyHistoryEntryLike = {
  id?: string
  date: Date | string
  status?: string
  aiAnalysis?: string | Record<string, unknown> | null
  lateCompletedAt?: string | null
  canCatchUpUntil?: string | null
  content?: unknown
  sourceEntryIds?: string[]
}

export type DailyHistoryProgress = {
  morningDone: boolean
  tasksDone: boolean
  eveningDone: boolean
  analysisDone: boolean
  hasTaskProgress: boolean
  finalizedAt: string | null
  skipped: boolean
  hasProgress: boolean
  completed: boolean
  completedLate: boolean
  unfinishedStepCount: number
  incompleteMicroTaskCount: number
  totalMicroTaskCount: number
}

export type TimelineDayTone = 'active' | 'done' | 'partial' | 'missed' | 'future'

export type TimelineDot = {
  toneClass: string
  content: string
  label: string
  tooltip: string
}

export type TimelineDayPresentation = {
  hasProgress: boolean
  finalizedAt: string | null
  skipped: boolean
  completed: boolean
  completedLate: boolean
  missed: boolean
  partial: boolean
  isRecoveryTargetDay: boolean
  canResumeDay: boolean
  recoverySessionForDay: 'morning' | 'evening' | null
  unfinishedStepCount: number
  incompleteMicroTaskCount: number
  doneCount: number
  dayTone: TimelineDayTone
  dayLabel: string
  dayDots: TimelineDot[]
}

export type TaskDayStepStatus = 'done' | 'active' | 'locked'

export type TaskDayStep = {
  id: 'morning' | 'tasks' | 'evening' | 'analysis'
  label: string
  status: TaskDayStepStatus
}

export type AiMentorDashboardTab =
  | 'session'
  | 'wheel'
  | 'cycle'
  | 'journal'
  | 'microtasks'
  | 'reports'

export type MicrotaskPromptIntent = 'generate' | 'regenerate'
export type MicrotaskPromptStage = 'choice' | 'edit'

export type MicroTaskProgressStats = {
  activeCount: number
  completedCount: number
  message: string | null
}

export type MicroTaskLike = MicroTaskItem
