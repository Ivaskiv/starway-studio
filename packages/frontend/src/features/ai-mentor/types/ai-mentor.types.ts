// packages/frontend/src/features/ai-mentor/ai-mentor.types.ts

// ============ WHEEL OF BALANCE ============
export interface WheelCategory {
  id: string;
  name: string;
  nameUk: string;
  icon: string;
  color: string;
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
];

export interface WheelScore {
  categoryId: string;
  score: number; // 1-10
  notes?: string;
  createdAt: string;
}

export interface WheelAssessment {
  id: string;
  userId: string;
  scores: WheelScore[];
  totalScore: number;
  strengths: string[];
  gaps: string[];
  createdAt: string;
}

// ============ USER PROFILE ============
export interface MentorUserProfile {
  id: string;
  telegramId: string;
  name: string;
  timezone: string;
  streakDays: number;
  missedDaysCount: number;
  activityRate: number; // 0-100%
  lastActivityAt: string;
  subscriptionEndDate?: string;
  createdAt: string;
  updatedAt: string;
}

// ============ DAILY SESSIONS ============
export type SessionType = 'morning' | 'evening';
export type MoodTag = 'resourceful' | 'non_resourceful' | 'neutral';
export type SkipReason = 'overload' | 'emotions' | 'plan_issue' | 'external' | 'other';

export interface MorningSessionAnswers {
  currentState: string;        // Як почуваєшся?
  energyLevel: number;         // 1-10
  mainGoalToday: string;       // Головна ціль на сьогодні
  threeActions: string[];      // 3 мікро-дії
  potentialBlocks: string[];   // Потенційні перешкоди
  resources: string[];         // Які ресурси допоможуть?
  focusArea: string;           // Сфера фокусу (з Колеса)
  motivation: string;          // Що мотивує сьогодні?
  affirmation?: string;        // Персональна афірмація
}

export interface EveningSessionAnswers {
  completedActions: string[];  // Що зроблено?
  wins: string[];              // Перемоги дня
  blocksEncountered: string[]; // Які блоки виникли?
  triggers: string[];          // Що спровокувало пропуски?
  lessons: string;             // Головний урок дня
  tomorrowPriority: string;    // Пріоритет на завтра
  gratitude: string[];         // За що вдячний?
  resetNeeded: boolean;        // Чи потрібен ресет?
}

export interface DailySession {
  id: string;
  userId: string;
  type: SessionType;
  date: string;
  answers: MorningSessionAnswers | EveningSessionAnswers;
  moodTag: MoodTag;
  aiGeneratedActions?: SmartMicroAction[];
  aiAffirmation?: string;
  completedAt: string;
}

// ============ SMART MICRO-ACTIONS ============
export interface SmartMicroAction {
  id: string;
  title: string;
  description: string;
  category: string;           // з Колеса балансу
  estimatedMinutes: number;
  specificTime?: string;      // Конкретний час
  expectedResult: string;     // SMART - вимірюваний результат
  isCompleted: boolean;
  completedAt?: string;
  skippedReason?: SkipReason;
}

// ============ GOALS STRATEGY ============
export interface Goal {
  id: string;
  userId: string;
  title: string;
  description: string;
  category: string;           // з Колеса балансу
  deadline: string;
  milestones: Milestone[];
  microActions: SmartMicroAction[];
  progress: number;           // 0-100%
  status: 'active' | 'completed' | 'paused' | 'abandoned';
  createdAt: string;
  updatedAt: string;
}

export interface Milestone {
  id: string;
  title: string;
  deadline: string;
  isCompleted: boolean;
  completedAt?: string;
}

// ============ WEEKLY ANALYSIS ============
export interface WeeklyAnalysis {
  id: string;
  userId: string;
  weekStart: string;
  weekEnd: string;
  completedActions: number;
  totalActions: number;
  completionRate: number;     // %
  topSkillsToImprove: string[];
  patternBlocks: string[];    // top_triggers
  adjustments: string[];      // Корекції на наступний тиждень
  strengths: string[];
  createdAt: string;
}

// ============ MONTHLY AUDIT ============
export interface MonthlyAudit {
  id: string;
  userId: string;
  month: string;              // YYYY-MM
  wheelComparison: {
    previous: WheelScore[];
    current: WheelScore[];
    changes: { categoryId: string; delta: number }[];
  };
  overallProgress: number;
  goalProgress: { goalId: string; progress: number }[];
  recommendedCourses: CourseRecommendation[];
  strategyUpdates: string[];
  zoomSessionNeeded: boolean;
  pdfReportUrl?: string;
  createdAt: string;
}

// ============ COURSE RECOMMENDATIONS ============
export type CourseCode = 
  | 'state_key'        // Стан — ключ до успіху
  | 'system_21'        // Система 21
  | 'code_changes'     // Код змін
  | 'fears_marathon'   // Марафон Страхи
  | 'power_consciousness'; // Сила свідомості

export interface CourseRecommendation {
  code: CourseCode;
  title: string;
  reason: string;
  priority: 'high' | 'medium' | 'low';
  triggers: string[];
}

export const COURSE_TRIGGERS: Record<CourseCode, { keywords: string[]; title: string }> = {
  state_key: {
    keywords: ['тривога', 'апатія', 'втома', 'вигорання', 'стрес'],
    title: 'Стан — ключ до успіху',
  },
  system_21: {
    keywords: ['не можу почати', 'проблеми з діями', 'прокрастинація', 'не виходить'],
    title: 'Система 21',
  },
  code_changes: {
    keywords: ['не знаю цілей', 'не можу сформувати', 'без напрямку', 'розгублений'],
    title: 'Код змін',
  },
  fears_marathon: {
    keywords: ['страх', 'боюсь', 'невпевненість', 'сумніви'],
    title: 'Марафон Страхи',
  },
  power_consciousness: {
    keywords: ['відкладаю', 'немає рішучості', 'не можу вирішити', 'сумніваюсь'],
    title: 'Сила свідомості',
  },
};

// ============ GAMIFICATION ============
export type BadgeCode = 
  | 'first_session'
  | 'week_streak'
  | 'month_streak'
  | 'goal_achieved'
  | 'wheel_improved'
  | 'perfect_week'
  | 'early_bird'
  | 'night_owl';

export interface Badge {
  code: BadgeCode;
  title: string;
  titleUk: string;
  description: string;
  icon: string;
  unlockedAt?: string;
}

export interface GamificationState {
  userId: string;
  streakDays: number;
  longestStreak: number;
  totalSessions: number;
  badges: Badge[];
  level: number;
  xp: number;
  xpToNextLevel: number;
}

// ============ ANALYTICS & THRESHOLDS ============
export interface UserMetrics {
  userId: string;
  wheelScores: WheelScore[];
  streakDays: number;
  missedDaysCount: number;
  activityRate: number;
  progressByGoal: { goalId: string; progress: number }[];
  topTriggers: string[];
  lastActivityAt: string;
}

export interface ThresholdRule {
  condition: string;
  action: 'soft_message' | 'zoom_offer' | 'auto_plan' | 'course_offer' | 'consultation';
  message: string;
}

export const THRESHOLD_RULES: ThresholdRule[] = [
  {
    condition: 'missedDaysCount >= 2',
    action: 'soft_message',
    message: 'Бачу, що останні дні були складними. Чи все гаразд? 💙',
  },
  {
    condition: 'missedDaysCount >= 4',
    action: 'zoom_offer',
    message: 'Давно не бачились! Може, проведемо коротку сесію для перезавантаження?',
  },
  {
    condition: 'wheelScore <= 4',
    action: 'auto_plan',
    message: 'Бачу, що ця сфера потребує уваги. Ось 3-кроковий план...',
  },
  {
    condition: 'streakDays >= 21',
    action: 'course_offer',
    message: '21 день поспіль — це неймовірно! 🎉 Готовий до наступного рівня?',
  },
  {
    condition: 'progressByGoal < 30% twice',
    action: 'consultation',
    message: 'Бачу, що ціль дається важко. Давай обговоримо стратегію?',
  },
];

// ============ NOTIFICATIONS ============
export type NotificationChannel = 'telegram' | 'push' | 'email';
export type NotificationType = 
  | 'morning_reminder'
  | 'evening_reminder'
  | 'streak_warning'
  | 'subscription_expiring'
  | 'achievement_unlocked'
  | 'course_recommendation';

export interface ScheduledNotification {
  id: string;
  userId: string;
  type: NotificationType;
  channel: NotificationChannel;
  scheduledAt: string;
  message: string;
  sentAt?: string;
  metadata?: Record<string, unknown>;
}

// ============ TELEGRAM MINI-APP ============
export interface TelegramWebAppUser {
  id: number;
  first_name: string;
  last_name?: string;
  username?: string;
  language_code?: string;
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: string;
  metadata?: {
    sessionType?: SessionType;
    actionType?: string;
  };
}