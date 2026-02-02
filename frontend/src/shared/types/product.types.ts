// /shared/types/product.types.ts

import { Module } from "@/features/modules/module.types";

// ===========================
// ENUMS & TYPES
// ===========================
export type Currency = 'UAH' | 'USD' | 'EUR';

export type ProductType =
  | 'course'
  | 'membership'
  | 'coaching'
  | 'digital_product'
  | 'webinar'
  | 'ebook'
  | 'mini_app'
  | 'telegram_bot'
  | 'service'
  | 'physical_product'
  | 'other';

export type ProductStatus = 'draft' | 'published' | 'archived';
export type ProductFormat = 'web' | 'mini_app' | 'telegram_task' | 'mixed';
export type ProductIntegration = 'telegram' | 'web' | 'future';

// ===========================
// MAIN PRODUCT
// ===========================
export interface Product {
  id: string;
  title: string; // відображення для фронтенду
  name: string; // slug / internal
  description: string;
  creatorId: string;
  creator: { id: string; name: string; avatar?: string };
  type: ProductType;
  status: ProductStatus;
  price: number;
  currency: Currency;

  includesTrial: boolean;
  trialDays: number;
  includesMentorship: boolean;

  format: ProductFormat;
  integration: ProductIntegration;
  thumbnailUrl?: string;

  telegramConfig?: TelegramConfig;
  gamificationConfig?: GamificationConfig;

  modules: Module[];
  goals: string[];
  funnelId: string;

  stats?: { students: number; rating: number; duration: string }; // може бути пустим
  analytics?: ProductAnalytics;

  createdAt: string;
  updatedAt: string;
  publishedAt?: string;

  thumbnail?: string;
  isPremium?: boolean;
}

// ===========================
// TELEGRAM INTEGRATION
// ===========================
export interface TelegramConfig {
  chatEnabled: boolean;
  chatId?: string;
  miniAppEnabled: boolean;
  miniAppUrl?: string;
  botEnabled: boolean;
  botUsername?: string;
  notifications: TelegramNotifications;
  autoPostEnabled: boolean;
  autoPostSchedule?: CronSchedule;
}

export interface TelegramNotifications {
  welcomeMessage: boolean;
  dailyReminders: boolean;
  achievementUnlocked: boolean;
  streakReminders: boolean;
  customMessages: TelegramCustomMessage[];
}

export interface TelegramCustomMessage {
  id: string;
  trigger: 'time' | 'event' | 'achievement';
  condition: string;
  message: string;
  enabled: boolean;
}

export interface CronSchedule {
  timezone: string;
  schedule: string; // cron: "0 9 * * *"
  enabled: boolean;
}

// ===========================
// GAMIFICATION
// ===========================
export interface GamificationConfig {
  enabled: boolean;
  pointsEnabled: boolean;
  pointsRules: PointsRule[];
  levelsEnabled: boolean;
  levels: Level[];
  achievementsEnabled: boolean;
  achievements: Achievement[];
  leaderboardEnabled: boolean;
  leaderboardConfig?: LeaderboardConfig;
  streaksEnabled: boolean;
  streakRewards: StreakReward[];
}

export interface PointsRule {
  id: string;
  action: string;
  points: number;
  description: string;
}
export interface Level {
  id: string;
  level: number;
  name: string;
  pointsRequired: number;
  rewards: string[];
  badge?: string;
}
export interface Achievement {
  id: string;
  name: string;
  description: string;
  icon: string;
  condition: string;
  reward?: number;
  rarity: 'common' | 'rare' | 'epic' | 'legendary';
}
export interface LeaderboardConfig {
  type: 'global' | 'group' | 'friends';
  updateFrequency: 'realtime' | 'hourly' | 'daily';
  showTop: number;
  rewardsEnabled: boolean;
  rewards?: LeaderboardReward[];
}
export interface LeaderboardReward {
  position: number;
  reward: string;
  points?: number;
}
export interface StreakReward {
  days: number;
  reward: string;
  points?: number;
}

// ===========================
// ANALYTICS & STATS
// ===========================
export interface ProductAnalytics {
  totalUsers: number;
  activeUsers: number;
  completionRate: number;
  averageSessionTime: number;
  totalRevenue: number;
  averageRevenuePerUser: number;
  mostPopularLessons: LessonStats[];
  completionByModule: ModuleStats[];
  topPlayers?: PlayerStats[];
  achievementStats?: AchievementStats[];
}

export interface LessonStats {
  lessonId: string;
  lessonTitle: string;
  views: number;
  completions: number;
  averageTime: number;
  rating?: number;
}
export interface ModuleStats {
  moduleId: string;
  moduleTitle: string;
  startedUsers: number;
  completedUsers: number;
  completionRate: number;
}
export interface PlayerStats {
  userId: string;
  userName: string;
  points: number;
  level: number;
  achievements: number;
  streak: number;
}
export interface AchievementStats {
  achievementId: string;
  achievementName: string;
  unlockedBy: number;
  unlockRate: number;
}

// ===========================
// MINI PRODUCT FOR LISTS
// ===========================
export interface ProductMini {
  id: string;
  name: string;
  price: number;
  type: 'subscription' | 'one-time';
  format: 'web' | 'mini-app' | 'telegram-task';
  integration: 'telegram' | 'other';
  includesMentorship: boolean;
}

// ===========================
// FORM MAPPERS
// ===========================
export interface ProductFormInputs {
  name: string;
  title: string;
  description: string;
  type: ProductType;
  price: number;
  currency: Currency;
  includesTrial: boolean;
  trialDays: number;
  includesMentorship: boolean;
  format: ProductFormat;
  integration: ProductIntegration;
  status: ProductStatus;
  thumbnailUrl?: string;
  modules: string[]; // Module IDs
  resolvedModules: Module[];
}

// ===========================
// CONVERTERS
// ===========================
const TYPE_MAP: Record<ProductType, ProductMini['type']> = {
  membership: 'subscription',
  coaching: 'subscription',
  course: 'one-time',
  ebook: 'one-time',
  webinar: 'one-time',
  digital_product: 'one-time',
  service: 'one-time',
  physical_product: 'one-time',
  mini_app: 'one-time',
  telegram_bot: 'one-time',
  other: 'one-time',
};

const FORMAT_MAP: Record<ProductFormat, ProductMini['format']> = {
  web: 'web',
  mini_app: 'mini-app',
  telegram_task: 'telegram-task',
  mixed: 'web',
};

const INTEGRATION_MAP: Record<ProductIntegration, ProductMini['integration']> = {
  telegram: 'telegram',
  web: 'other',
  future: 'other',
};

const mapModuleIds = (ids: string[]) => ids.map(id => ({ id }) as Module);

export const toProductMini = (p: Product): ProductMini => ({
  id: p.id,
  name: p.name,
  price: p.price,
  type: TYPE_MAP[p.type],
  format: FORMAT_MAP[p.format],
  integration: INTEGRATION_MAP[p.integration],
  includesMentorship: p.includesMentorship,
});

export const productToForm = (product?: Partial<Product>): ProductFormInputs => ({
  name: product?.name ?? '',
  title: product?.title ?? '',
  description: product?.description ?? '',
  type: product?.type ?? 'membership',
  price: product?.price ?? 0,
  currency: product?.currency ?? 'EUR',
  includesTrial: product?.includesTrial ?? false,
  trialDays: product?.trialDays ?? 7,
  includesMentorship: product?.includesMentorship ?? false,
  format: product?.format ?? 'mini_app',
  integration: product?.integration ?? 'telegram',
  status: product?.status ?? 'draft',
  thumbnailUrl: product?.thumbnailUrl,
  modules: product?.modules?.map(m => m.id) ?? [],
  resolvedModules: product?.modules ?? [],
});

export const formToCreatePayload = (
  form: ProductFormInputs,
  funnelId = '',
  creatorId?: string, // передаємо з фронтенду якщо треба
): Omit<Product, 'id' | 'createdAt' | 'updatedAt' | 'analytics' | 'creator'> & {
  creatorId: string;
} => ({
  creatorId: creatorId || '', // бекенд заповнить, якщо пусто
  name: form.name,
  title: form.title,
  description: form.description,
  type: form.type,
  price: form.price,
  currency: form.currency,
  includesTrial: form.includesTrial,
  trialDays: form.trialDays,
  includesMentorship: form.includesMentorship,
  format: form.format,
  integration: form.integration,
  status: form.status,
  thumbnailUrl: form.thumbnailUrl,
  modules: mapModuleIds(form.modules),
  funnelId,
  goals: [],
});

export const formToUpdatePayload = (form: ProductFormInputs): Partial<Product> => ({
  name: form.name,
  title: form.title,
  description: form.description,
  type: form.type,
  price: form.price,
  currency: form.currency,
  includesTrial: form.includesTrial,
  trialDays: form.trialDays,
  includesMentorship: form.includesMentorship,
  format: form.format,
  integration: form.integration,
  status: form.status,
  thumbnailUrl: form.thumbnailUrl,
  modules: mapModuleIds(form.modules),
});
