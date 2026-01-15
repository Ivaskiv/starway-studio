import { WheelScore } from '@/features/wheel'

export interface ProgressStats {
  streak_days: number
  longestStreak: number
  totalSessions: number
  completedGoals: number
  totalXp: number
  level: number
  nextLevelXp: number
}

export interface WeeklyActivityDay {
  day: string
  sessions: number
  completed: boolean
}

export interface Achievement {
  id: string
  title: string
  description: string
  icon: string
  unlocked: boolean
  progress: number  
}


export interface ProgressOverview {
  stats: ProgressStats
  weeklyActivity: WeeklyActivityDay[]
  achievements: Achievement[]
  wheel_scores: WheelScore[]
}
