// packages/frontend/src/features/ai-mentor/types/mentor.types.ts

export interface DailyTask {
  id: string
  title: string
  description?: string
  status: 'pending' | 'completed' | 'skipped'
  scheduledTime?: string
  category?: string
  priority?: 'low' | 'medium' | 'high'
  created_at: string
  completed_at?: string
}

export interface TodayTasks {
  tasks: DailyTask[]
  total: number
  completed: number
}

export interface DailySession {
  id: string
  type: 'morning' | 'evening'
  status: 'pending' | 'in_progress' | 'completed'
  answers: Record<string, string>
  aiFeedback?: string
  xpEarned?: number
  created_at: string
  completed_at?: string
}

export interface TodaySessions {
  morning: DailySession | null
  evening: DailySession | null
}

export interface YearlyGoal {
  id: string
  title: string
  progress: number
  category?: string
}

export interface ChatMessage {
  id: string
  role: 'user' | 'assistant'
  content: string
  created_at: string
  messages?: ChatMessage[]
}

export interface ChatHistory {
  messages: ChatMessage[]
  total: number
}

export interface MentorStats {
  streak: number
  goalsCompleted: number
  xp: number
  level: number
  tasksToday: number
  sessionsThisWeek: number
}

export interface SmartAction {
  action: string
  time: string
  duration_min: number
  result: string
}