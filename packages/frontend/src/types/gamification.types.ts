// /frontend/src/types/gamification.types.ts

export interface Achievement {
  id: string;
  name: string;
  description: string;
  icon: string;
  points: number;
  rarity: 'common' | 'rare' | 'epic' | 'legendary';
  condition: {
    type: 'lessons_completed' | 'streak_days' | 'points_earned' | 'quizzes_passed';
    value: number;
  };
  unlockedAt?: string;
  progress?: number;
}

export interface UserLevel {
  currentLevel: number;
  currentXP: number;
  nextLevelXP: number;
  totalXP: number;
  rewards: {
    level: number;
    reward: string;
    claimed: boolean;
  }[];
}

export interface LeaderboardEntry {
  user_id: string;
  user_name: string;
  avatar?: string;
  points: number;
  level: number;
  rank: number;
}

export interface Streak {
  currentStreak: number;
  longestStreak: number;
  lastActiveDate: string;
  streakMilestones: {
    days: number;
    reward: string;
    claimed: boolean;
  }[];
}

export interface Reward {
  id: string;
  name: string;
  description: string;
  type: 'points' | 'unlock' | 'badge' | 'discount';
  value: any;
  cost: number;
  claimed: boolean;
}

export interface Challenge {
  id: string;
  name: string;
  description: string;
  type: 'daily' | 'weekly' | 'monthly';
  startDate: string;
  endDate: string;
  reward: {
    points: number;
    achievement?: string;
  };
  progress: number;
  target: number;
  completed: boolean;
}

