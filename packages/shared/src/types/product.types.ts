// shared/src/types/product.types.ts

export interface Product {
  id: string;
  name: string;
  description: string;
  type: ProductType;
  price: number;
  currency: string;
  funnelId?: string;
  features: ProductFeature[];
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export enum ProductType {
  AI_MENTOR = 'ai_mentor',
  FUNNEL_BUILDER = 'funnel_builder',
  ANALYTICS = 'analytics',
  TELEGRAM_BOT = 'telegram_bot',
  CUSTOM = 'custom'
}

export interface ProductFeature {
  id: string;
  name: string;
  description: string;
  enabled: boolean;
  limit?: number;
}

// AI Mentor Types
export interface WheelOfLife {
  id: string;
  userId: string;
  date: string;
  categories: WheelCategory[];
  overallScore: number;
  insights: string;
  goals: string[];
  previousId?: string;
}

export interface WheelCategory {
  name: string;
  score: number; // 1-10
  notes?: string;
  color?: string;
}

export interface DailyQuestionnaire {
  id: string;
  userId: string;
  date: string;
  type: 'morning' | 'evening';
  questions: QuestionAnswer[];
  mood: number; // 1-10
  energy: number; // 1-10
  aiAnalysis: string;
  tags: string[];
}

export interface QuestionAnswer {
  question: string;
  answer: string;
  sentiment?: 'positive' | 'neutral' | 'negative';
  score?: number;
}

export interface WeeklyReport {
  userId: string;
  weekStart: string;
  weekEnd: string;
  dailyEntries: DailyQuestionnaire[];
  averageMood: number;
  averageEnergy: number;
  insights: string[];
  recommendations: string[];
}

export interface MonthlyReport {
  userId: string;
  month: string;
  year: number;
  weeklyReports: WeeklyReport[];
  wheelOfLifeComparison?: {
    start: WheelOfLife;
    end: WheelOfLife;
    improvements: string[];
  };
  achievements: Achievement[];
  insights: string[];
}

// Gamification Types
export interface UserGamification {
  userId: string;
  level: number;
  points: number;
  experiencePoints: number;
  nextLevelAt: number;
  badges: Badge[];
  achievements: Achievement[];
  streakDays: number;
  longestStreak: number;
  lastActivityDate: string;
}

export interface Badge {
  id: string;
  name: string;
  description: string;
  icon: string;
  rarity: 'common' | 'rare' | 'epic' | 'legendary';
  earnedAt: string;
  progress?: number;
  maxProgress?: number;
}

export interface Achievement {
  id: string;
  name: string;
  description: string;
  category: AchievementCategory;
  points: number;
  unlockedAt: string;
  criteria: AchievementCriteria;
}

export enum AchievementCategory {
  CONSISTENCY = 'consistency',
  PROGRESS = 'progress',
  MILESTONE = 'milestone',
  SPECIAL = 'special'
}

export interface AchievementCriteria {
  type: 'streak' | 'count' | 'score' | 'custom';
  target: number;
  current: number;
}

export interface Leaderboard {
  period: 'daily' | 'weekly' | 'monthly' | 'allTime';
  entries: LeaderboardEntry[];
  userRank?: number;
}

export interface LeaderboardEntry {
  rank: number;
  userId: string;
  username: string;
  avatar?: string;
  score: number;
  level: number;
}