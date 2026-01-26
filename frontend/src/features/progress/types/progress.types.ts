import { WheelScore } from "../../wheel"

export interface Progress {
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
  icon: React.ComponentType<{ className?: string }>
  color: string
  unlocked?: boolean
  progress?: number
  unlockedAt?: string
}


export interface ProgressOverview {
  stats: Progress
  weeklyActivity: WeeklyActivityDay[]
  achievements: Achievement[]
  wheel_scores: WheelScore[]
}
