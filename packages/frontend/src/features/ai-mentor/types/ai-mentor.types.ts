// packages/frontend/src/features/ai-mentor/types/ai-mentor.types.ts

import { WheelScore } from "@/features/wheel"


// ============ WHEEL OF BALANCE ============
export interface WheelCategory {
  id: string
  name: string
  nameUk: string
  icon: string
  color: string
}

export const WHEEL_CATEGORIES: WheelCategory[] = [
  { id: 'health', name: 'Health', nameUk: 'Здоров\'я', icon: '💪', color: '#10B981' },
  { id: 'career', name: 'Career', nameUk: 'Кар\'єра', icon: '💼', color: '#3B82F6' },
  { id: 'finance', name: 'Finance', nameUk: 'Фінанси', icon: '💰', color: '#F59E0B' },
  { id: 'relationships', name: 'Relationships', nameUk: 'Стосунки', icon: '❤️', color: '#EF4444' },
  { id: 'personal_growth', name: 'Personal Growth', nameUk: 'Особистий ріст', icon: '🌱', color: '#8B5CF6' },
  { id: 'fun', name: 'Fun & Recreation', nameUk: 'Відпочинок', icon: '🎉', color: '#EC4899' },
  { id: 'environment', name: 'Environment', nameUk: 'Оточення', icon: '🏠', color: '#06B6D4' },
  { id: 'spirituality', name: 'Spirituality', nameUk: 'Духовність', icon: '✨', color: '#A855F7' },
]

export interface WheelAssessment {
  id: string
  user_id: string
  scores: WheelScore[]
  total_score: number
  average_score: number
  strengths: string[] // category_ids
  gaps: string[] // category_ids
  created_at: string
  updated_at?: string
}

// Новий тип: аналіз колеса балансу (результат мутації analyzeWheel)
export interface WheelAnalysis {
  strengths: string[]           // category_ids, які сильно розвинуті
  gaps: string[]                // category_ids, які потребують уваги
  recommendations: string[]     // AI-рекомендації
  focus_area: string             // Найпріоритетніша сфера зараз
  balance_score: number          // Загальний баланс (0-100)
  created_at: string
}

// ============ AFFIRMATION (генерація) ============
export interface Affirmation {
  text: string
  mood: string
  focus_area: string
  created_at: string
  expires_at?: string // наприклад, діє до кінця дня
}

// ============ PATTERN ANALYSIS (аналіз тригерів) ============
export interface PatternAnalysis {
  triggers: string[]            // Найчастіші тригери пропусків
  frequency: Record<string, number> // як часто трапляється кожен тригер
  recommendations: string[]     // Що робити з цими тригерами
  period: 'week' | 'month' | 'year'
  analyzedSessionsCount: number
  created_at: string
}

// ============ GOAL PLAN (генерація плану) ============
export interface GoalPlan {
  milestones: {
    title: string
    deadline: string
    description?: string
  }[]
  micro_actions: {
    title: string
    category: string
    estimated_minutes: number
    specificTime?: string
  }[]
  overallStrategy: string
  generatedAt: string
}

// ============ USER MENTOR PROFILE ============
export interface MentorUserProfile {
  id: string
  telegram_id: string
  name: string
  timezone: string
  birthDate?: string
  gender?: 'male' | 'female' | 'other'
  streak_days: number
  missedDaysCount: number
  activityRate: number // 0-100%
  lastActivityAt: string
  subscriptionEndDate?: string
  created_at: string
  updated_at: string
}

// ============ DAILY SESSIONS ============
export type SessionType = 'morning' | 'evening'

export type MoodTag = 'resourceful' | 'non_resourceful' | 'neutral'

export type SkipReason = 'overload' | 'emotions' | 'plan_issue' | 'external' | 'other'

export interface MorningSessionAnswers {
 current_state: string           // Як почуваєшся?
  energy_level: number            // 1-10
  main_goal_today: string          // Головна ціль на сьогодні
  threeActions: string[]         // 3 мікро-дії
  potential_blocks: string[]      // Потенційні перешкоди
  resources: string[]            // Які ресурси допоможуть?
  focus_area: string              // Сфера фокусу (з Колеса)
  motivation: string             // Що мотивує сьогодні?
  affirmation?: string           // Персональна афірмація
}

export interface EveningSessionAnswers {
  completed_actions: string[]     // Що зроблено?
  wins: string[]                 // Перемоги дня
  blocks_encountered: string[]    // Які блоки виникли?
  triggers: string[]             // Що спровокувало пропуски?
  lessons: string                // Головний урок дня
  tomorrowPriority: string       // Пріоритет на завтра
  gratitude: string[]            // За що вдячний?
  resetNeeded: boolean           // Чи потрібен ресет?
}

export interface DailySession {
  id: string
  user_id: string
  type: SessionType
  date: string
  answers: MorningSessionAnswers | EveningSessionAnswers
  moodTag: MoodTag
  aiGeneratedActions?: SmartAction[]
  aiAffirmation?: Affirmation
  xpEarned?: number
  completed_at?: string
  created_at: string
}

// ============ SMART MICRO-ACTIONS ============
export interface SmartAction {
  id: string
  title: string
  description: string
  category: string              // з Колеса балансу
  estimated_minutes: number
  specificTime?: string         // Конкретний час
  expectedResult: string        // SMART - вимірюваний результат
  isCompleted: boolean
  completed_at?: string
  skippedReason?: SkipReason
}

// ============ GOALS STRATEGY ============
export interface Goal {
  id: string
  user_id: string
  title: string
  description: string
  category: string              // з Колеса балансу
  deadline: string
  milestones: Milestone[]
  micro_actions: SmartAction[]
  progress: number              // 0-100%
  status: 'active' | 'completed' | 'paused' | 'abandoned'
  created_at: string
  updated_at: string
}

export interface Milestone {
  id: string
  title: string
  deadline: string
  isCompleted: boolean
  completed_at?: string
}

// ============ WEEKLY ANALYSIS ============
export interface WeeklyAnalysis {
  id: string
  user_id: string
  weekStart: string
  weekEnd: string
  completed_actions: number
  totalActions: number
  completion_rate: number        // %
  topSkillsToImprove: string[]
  patternBlocks: string[]       // top_triggers
  adjustments: string[]         // Корекції на наступний тиждень
  strengths: string[]
  created_at: string
}

// ============ MONTHLY AUDIT ============
export interface MonthlyAudit {
  id: string
  user_id: string
  month: string                 // YYYY-MM
  wheelComparison: {
    previous: WheelScore[]
    current: WheelScore[]
    changes: { category_id: string; delta: number }[]
  }
  overallProgress: number
  goalProgress: { goalId: string; progress: number }[]
  recommendedCourses: CourseRecommendation[]
  strategyUpdates: string[]
  zoomSessionNeeded: boolean
  pdfReportUrl?: string
  created_at: string
}

// ============ COURSE RECOMMENDATIONS ============
export type CourseCode = 
  | 'state_key'        // Стан — ключ до успіху
  | 'system_21'        // Система 21
  | 'code_changes'     // Код змін
  | 'fears_marathon'   // Марафон Страхи
  | 'power_consciousness' // Сила свідомості

export interface CourseRecommendation {
  code: CourseCode
  title: string
  reason: string
  priority: 'high' | 'medium' | 'low'
  triggers: string[]
}

// ============ GAMIFICATION ============
export type BadgeCode = 
  | 'first_session'
  | 'week_streak'
  | 'month_streak'
  | 'goal_achieved'
  | 'wheel_improved'
  | 'perfect_week'
  | 'early_bird'
  | 'night_owl'

export interface Badge {
  code: BadgeCode
  title: string
  titleUk: string
  description: string
  icon: string
  unlockedAt?: string
}

export interface GamificationState {
  user_id: string
  streak_days: number
  longestStreak: number
  totalSessions: number
  badges: Badge[]
  level: number
  xp: number
  xpToNextLevel: number
}

// ============ ANALYTICS & METRICS ============
export interface UserMetrics {
  user_id: string
  wheel_scores: WheelScore[]
  streak_days: number
  missedDaysCount: number
  activityRate: number
  progressByGoal: { goalId: string; progress: number }[]
  topTriggers: string[]
  lastActivityAt: string
}

// ============ NOTIFICATIONS ============
export type NotificationChannel = 'telegram' | 'push' | 'email'
export type NotificationType = 
  | 'morning_reminder'
  | 'evening_reminder'
  | 'streak_warning'
  | 'subscription_expiring'
  | 'achievement_unlocked'
  | 'course_recommendation'

export interface ScheduledNotification {
  id: string
  user_id: string
  type: NotificationType
  channel: NotificationChannel
  scheduledAt: string
  message: string
  sentAt?: string
  metadata?: Record<string, unknown>
}

