import { WheelScore } from '@/features/wheel/types/wheel.types';

export interface Progress {
  streakDays: number;
  longestStreak: number;
  totalSessions: number;
  completedGoals: number;
  totalXp: number;
  level: number;
  nextLevelXp: number;
  totalPoints: number;
  completedBlocks: number;
}

export interface WeeklyActivityDay {
  day: string;
  sessions: number;
  completed: boolean;
}

export interface Achievement {
  id: string;
  title: string;
  description: string;
  icon: React.ComponentType<{ className?: string }>;
  color: string;
  unlocked?: boolean;
  progress?: number;
  unlockedAt?: string;
}

export interface ProgressOverview {
  stats: Progress;
  weeklyActivity: WeeklyActivityDay[];
  achievements: Achievement[];
  wheelScores: WheelScore[];
}
