// frontend/src/features/ai-mentor/types/mentor.types.ts

import { WheelConfigItem } from '@/features/wheel/types/wheel.types';
import { DailyDrain, DailyState } from '@/features/questionsScheduler/types/questions.types';
import { withNormalizer } from '@/shared/utils/apiNormalizer';

/**
 * AI-MENTOR TYPES
 * Об'єднаний та оптимізований варіант
 *
 * МОДУЛІ:
 * A - Колесо балансу
 * B - Щоденний цикл
 * C - Streak + метрики
 * D - Бачення життя (paid)
 * E - Головна ціль (paid)
 * F - Вибір і рішення (paid)
 * G - Дії (paid)
 * H - Daily Tasks & Chat
 */

// ==========================================
// MODULE C: STREAK + МЕТРИКИ
// ==========================================
export interface UserMetrics {
  userId: string;
  currentStreak: number;
  longestStreak: number;
  lastActivityDate: string;
  totalDrains: number;
  drainsThisWeek: number;
  drainsThisMonth: number;
  returnsAfterDrain: number;
  totalSupportsCompleted: number;
  supportsCompletedThisWeek: number;
  updatedAt: string;
}

//! Нормалізатор
export const normalizeUserMetrics = withNormalizer<any, UserMetrics>(api => ({
  userId: String(api.userId),
  currentStreak: api.currentStreak ?? 0,
  longestStreak: api.longestStreak ?? 0,
  lastActivityDate: api.lastActivityDate ?? '',
  totalDrains: api.totalDrains ?? 0,
  drainsThisWeek: api.drainsThisWeek ?? 0,
  drainsThisMonth: api.drainsThisMonth ?? 0,
  returnsAfterDrain: api.returnsAfterDrain ?? 0,
  totalSupportsCompleted: api.totalSupportsCompleted ?? 0,
  supportsCompletedThisWeek: api.supportsCompletedThisWeek ?? 0,
  updatedAt: api.updatedAt ?? '',
}));

// ==========================================
// MODULE D: БАЧЕННЯ ЖИТТЯ (PAID)
// ==========================================
export interface VisionStatement {
  id: string;
  userId: string;
  howIWantToLive: string;
  whatIsNoLongerNormal: string;
  pointB: string;
  createdAt: string;
  updatedAt: string;
}

//! Нормалізатор
export const normalizeVisionStatement = withNormalizer<any, VisionStatement>(api => ({
  id: String(api.id),
  userId: String(api.userId),
  howIWantToLive: api.howIWantToLive ?? '',
  whatIsNoLongerNormal: api.whatIsNoLongerNormal ?? '',
  pointB: api.pointB ?? '',
  createdAt: api.createdAt,
  updatedAt: api.updatedAt,
}));

// ==========================================
// MODULE E: ГОЛОВНА ЦІЛЬ (PAID)
// ==========================================
export interface UserGoal {
  id: string;
  userId: string;
  title: string;
  isPrimary: boolean;
  createdAt: string;
}
//! Нормалізатори
export const normalizeUserGoal = withNormalizer<any, UserGoal>(api => ({
  id: String(api.id),
  userId: String(api.userId),
  title: api.title,
  isPrimary: Boolean(api.isPrimary),
  createdAt: api.createdAt,
}));

export interface GoalsData {
  userId: string;
  goals: UserGoal[];
  primaryGoalId?: string;
}

//! Нормалізатори
export const normalizeGoalsData = withNormalizer<any, GoalsData>(api => ({
  userId: String(api.userId),
  goals: Array.isArray(api.goals) ? api.goals.map(normalizeUserGoal) : [],
  primaryGoalId: api.primaryGoalId,
}));

// ==========================================
// MODULE F: ВИБІР І РІШЕННЯ (PAID)
// ==========================================
export interface DecisionCheck {
  id: string;
  userId: string;
  sessionId: string;
  leadsToGoal: boolean;
  isBetrayingDecision: boolean;
  aiAnalysis: string;
  createdAt: string;
}

//! Нормалізатор
export const normalizeDecisionCheck = withNormalizer<any, DecisionCheck>(api => ({
  id: String(api.id),
  userId: String(api.userId),
  sessionId: String(api.sessionId),
  leadsToGoal: Boolean(api.leadsToGoal),
  isBetrayingDecision: Boolean(api.isBetrayingDecision),
  aiAnalysis: api.aiAnalysis ?? '',
  createdAt: api.createdAt,
}));

// ==========================================
// MODULE G: ДІЇ (PAID)
// ==========================================
export interface UserAction {
  id: string;
  userId: string;
  goalId?: string;
  title: string;
  duration: 7 | 14;
  isDone: boolean;
  createdAt: string;
  completedAt?: string;
  deadline: string;
}

//! Нормалізатор
export const normalizeUserAction = withNormalizer<any, UserAction>(api => ({
  id: String(api.id),
  userId: String(api.userId),
  goalId: api.goalId,
  title: api.title,
  duration: api.duration,
  isDone: Boolean(api.isDone),
  createdAt: api.createdAt,
  completedAt: api.completedAt,
  deadline: api.deadline,
}));

// ==========================================
// MODULE H: DAILY TASKS & CHAT
// ==========================================
export interface DailyTask {
  id: string;
  title: string;
  description?: string;
  status: 'pending' | 'completed' | 'skipped';
  scheduledTime?: string;
  category?: string;
  priority?: 'low' | 'medium' | 'high';
  created_at: string;
  completed_at?: string;
}

export interface TodayTasks {
  tasks: DailyTask[];
  total: number;
  completed: number;
}

//! Нормалізатор
export const normalizeDailyTask = withNormalizer<any, DailyTask>(api => ({
  id: String(api.id),
  title: api.title,
  description: api.description,
  status: api.status,
  scheduledTime: api.scheduledTime,
  category: api.category,
  priority: api.priority,
  created_at: api.created_at,
  completed_at: api.completed_at,
}));

export const normalizeTodayTasks = withNormalizer<any, TodayTasks>(api => ({
  tasks: Array.isArray(api.tasks) ? api.tasks.map(normalizeDailyTask) : [],
  total: api.total ?? 0,
  completed: api.completed ?? 0,
}));

export interface YearlyGoal {
  id: string;
  title: string;
  progress: number;
  category?: string;
}

//! Нормалізатор
export const normalizeYearlyGoal = withNormalizer<any, YearlyGoal>(api => ({
  id: String(api.id),
  title: api.title,
  progress: api.progress ?? 0,
  category: api.category,
}));

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  created_at: string;
  messages?: ChatMessage[];
}

export interface ChatHistory {
  messages: ChatMessage[];
  total: number;
}

//! Нормалізатори
// export const normalizeChatMessage = withNormalizer<ChatMessage, ChatMessage>(api => ({
//   id: String(api.id),
//   role: api.role,
//   content: api.content ?? '',
//   created_at: api.created_at,
//   messages: Array.isArray(api.messages) ? api.messages.map(normalizeChatMessage) : [],
// }))

// export const normalizeChatHistory = withNormalizer<any, ChatHistory>(api => ({
//   messages: Array.isArray(api.messages) ? api.messages.map(normalizeChatMessage) : [],
//   total: api.total ?? 0,
// }))

export interface MentorStats {
  streak: number;
  goalsCompleted: number;
  xp: number;
  level: number;
  tasksToday: number;
  sessionsThisWeek: number;
}

//! Нормалізатор
export const normalizeMentorStats = withNormalizer<any, MentorStats>(api => ({
  streak: api.streak ?? 0,
  goalsCompleted: api.goalsCompleted ?? 0,
  xp: api.xp ?? 0,
  level: api.level ?? 0,
  tasksToday: api.tasksToday ?? 0,
  sessionsThisWeek: api.sessionsThisWeek ?? 0,
}));

export interface SmartAction {
  action: string;
  time: string;
  duration_min: number;
  result: string;
}

//! Нормалізатор
export const normalizeSmartAction = withNormalizer<any, SmartAction>(api => ({
  action: api.action,
  time: api.time,
  duration_min: api.duration_min ?? 0,
  result: api.result ?? '',
}));

export interface Recommendation {
  id: string;
  code: string;
  title: string;
  description?: string;
}

//! Нормалізатор
export const normalizeRecommendation = withNormalizer<any, Recommendation>(api => ({
  id: api.id,
  code: api.code,
  title: api.title,
  description: api.description,
}));

// ==========================================
// MINI COURSES, ONBOARDING, TELEGRAM, ZOOM, USER PROGRESS
// …
// ==========================================
// MINI COURSES
// ==========================================
export interface MiniCourseOffer {
  id: string;
  userId: string;
  course: string;
  patternDetected: string;
  problemType: string;
  isOffered: boolean;
  isAccepted: boolean;
  createdAt: string;
}

//! Нормалізатор
export const normalizeMiniCourseOffer = withNormalizer<any, MiniCourseOffer>(api => ({
  id: String(api.id),
  userId: String(api.userId),
  course: api.course,
  patternDetected: api.patternDetected ?? '',
  problemType: api.problemType ?? '',
  isOffered: Boolean(api.isOffered),
  isAccepted: Boolean(api.isAccepted),
  createdAt: api.createdAt,
}));

// export const normalizeMiniCourseOffers = withNormalizer<any, MiniCourseOffer>(api => normalizeMiniCourseOffer(api))

// ==========================================
// ONBOARDING
// ==========================================
export interface OnboardingStatus {
  userId: string;
  currentStep: string;
  isCompleted: boolean;
  completedSteps: string[];
  paidAt: string;
  updatedAt: string;
}

//! Нормалізатор
export const normalizeOnboardingStatus = withNormalizer<any, OnboardingStatus>(api => ({
  userId: String(api.userId),
  currentStep: api.currentStep ?? '',
  isCompleted: Boolean(api.isCompleted),
  completedSteps: Array.isArray(api.completedSteps) ? api.completedSteps : [],
  paidAt: api.paidAt ?? '',
  updatedAt: api.updatedAt ?? '',
}));

// ==========================================
// TELEGRAM
// ==========================================
export interface TelegramUser {
  userId: string;
  telegramId: string;
  telegramUsername?: string;
  chatId: string;
  morningReminderTime?: string;
  eveningReminderTime?: string;
  reminderTimezone: string;
  isActive: boolean;
  createdAt: string;
}

export interface TelegramMessage {
  id: string;
  userId: string;
  telegramChatId: string;
  type: 'reminder' | 'mirror' | 'offer' | 'consultation' | 'ai_response';
  content: string;
  sentAt: string;
  isRead: boolean;
}

//! Нормалізатори
export const normalizeTelegramUser = withNormalizer<any, TelegramUser>(api => ({
  userId: String(api.userId),
  telegramId: String(api.telegramId),
  telegramUsername: api.telegramUsername,
  chatId: String(api.chatId),
  morningReminderTime: api.morningReminderTime,
  eveningReminderTime: api.eveningReminderTime,
  reminderTimezone: api.reminderTimezone ?? '',
  isActive: Boolean(api.isActive),
  createdAt: api.createdAt,
}));

export const normalizeTelegramMessage = withNormalizer<any, TelegramMessage>(api => ({
  id: String(api.id),
  userId: String(api.userId),
  telegramChatId: String(api.telegramChatId),
  type: api.type,
  content: api.content ?? '',
  sentAt: api.sentAt,
  isRead: Boolean(api.isRead),
}));

// export const normalizeTelegramMessages = withNormalizer<any, TelegramMessage>(api => normalizeTelegramMessage(api))

// ==========================================
// ZOOM
// ==========================================
export interface ZoomSession {
  id: string;
  scheduledAt: string;
  userRequests: { userId: string; request: string }[];
  decisions: { userId: string; decision: string }[];
  status: 'scheduled' | 'completed';
  createdAt: string;
}

//! Нормалізатор
// export const normalizeZoomSession = withNormalizer<any, ZoomSession>(api => ({
//   id: String(api.id),
//   scheduledAt: api.scheduledAt,
//   userRequests: Array.isArray(api.userRequests)
//     ? api.userRequests.map(r => ({ userId: String(r.userId), request: r.request ?? '' }))
//     : [],
//   decisions: Array.isArray(api.decisions)
//     ? api.decisions.map(d => ({ userId: String(d.userId), decision: d.decision ?? '' }))
//     : [],
//   status: api.status,
//   createdAt: api.createdAt,
// }))

// export const normalizeZoomSessions = withNormalizer<any, ZoomSession>(api => normalizeZoomSession(api))

// ==========================================
// USER PROGRESS
// ==========================================
export interface UserProgress {
  userId: string;
  totalDays: number;
  activeDays: number;
  completionRate: number;
  wheelCompletions: number;
  dailySessionsCompleted: number;
  goalsSet: number;
  goalsCompleted: number;
  actionsCompleted: number;
  statesTrend: { state: DailyState; count: number }[];
  drainsTrend: { drain: DailyDrain; count: number }[];
  updatedAt: string;
}

//! Нормалізатор
export const normalizeUserProgress = withNormalizer<any, UserProgress>(api => ({
  userId: String(api.userId),
  totalDays: api.totalDays ?? 0,
  activeDays: api.activeDays ?? 0,
  completionRate: api.completionRate ?? 0,
  wheelCompletions: api.wheelCompletions ?? 0,
  dailySessionsCompleted: api.dailySessionsCompleted ?? 0,
  goalsSet: api.goalsSet ?? 0,
  goalsCompleted: api.goalsCompleted ?? 0,
  actionsCompleted: api.actionsCompleted ?? 0,
  statesTrend: Array.isArray(api.statesTrend) ? api.statesTrend : [],
  drainsTrend: Array.isArray(api.drainsTrend) ? api.drainsTrend : [],
  updatedAt: api.updatedAt ?? '',
}));

export interface TrialStatus {
  isActive: boolean;
  endsAt: string;
}
export function normalizeTrialStatus(api: any): TrialStatus {
  return {
    isActive: !!api.is_active,
    endsAt: api.ends_at,
  };
}
export interface MirrorReport {
  id: string;
  type: string;
  analysis: string;
  createdAt: string;
  updatedAt: string;
}
export function normalizeMirrorReport(api: any): MirrorReport {
  return {
    id: String(api.id),
    type: api.type,
    analysis: api.analysis,
    createdAt: api.created_at,
    updatedAt: api.updated_at,
  };
}

export function normalizeMirrorReports(apiList: any[]): MirrorReport[] {
  return apiList?.map(normalizeMirrorReport) || [];
}

export interface ConsultationRequest {
  id: string;
  status: string;
  createdAt: string;
  updatedAt: string;
}
export function normalizeConsultationRequest(api: any): ConsultationRequest {
  return {
    id: String(api.id),
    status: api.status,
    createdAt: api.created_at,
    updatedAt: api.updated_at,
  };
}
export interface MiniAppSession {
  id: string;
  userId: string;
  currentModule: string;
  data: any; // TODO: define type
  createdAt: string;
  updatedAt: string;
}
export function normalizeMiniAppSession(api: any): MiniAppSession {
  return {
    id: String(api.id),
    userId: String(api.user_id),
    currentModule: api.current_module,
    data: api.data,
    createdAt: api.created_at,
    updatedAt: api.updated_at,
  };
}
export interface UserSubscription {
  id: string;
  userId: string;
  planId: string;
  status: string;
  startDate: string;
  endDate: string;
  autoRenew: boolean;
}
export function normalizeUserSubscription(api: any): UserSubscription {
  return {
    id: String(api.id),
    userId: String(api.user_id),
    planId: api.plan_id,
    status: api.status,
    startDate: api.start_date,
    endDate: api.end_date,
    autoRenew: !!api.auto_renew,
  };
}
export interface UserAchievement {
  id: string;
  title: string;
  description: string;
  isUnlocked: boolean;
  unlockedAt: string;
  createdAt: string;
}
export function normalizeUserAchievement(api: any): UserAchievement {
  return {
    id: String(api.id),
    title: api.title,
    description: api.description,
    isUnlocked: !!api.is_unlocked,
    unlockedAt: api.unlocked_at,
    createdAt: api.created_at,
  };
}

export function normalizeUserAchievements(apiList: any[]): UserAchievement[] {
  return apiList?.map(normalizeUserAchievement) || [];
}
export interface UserLevel {
  id: string;
  level: number;
  experience: number;
  nextLevelExperience: number;
  createdAt: string;
  updatedAt: string;
}
export function normalizeUserLevel(api: any): UserLevel {
  return { ...api };
}
export interface CronJobConfig {
  id: string;
  userId: string;
  planId: string;
  status: string;
  startDate: string;
  endDate: string;
  autoRenew: boolean;
}

export function normalizeCronJobConfig(api: any): CronJobConfig {
  return { ...api };
}

export interface MentorQuestion {
  id: string;
  text: string;
  // question: string;
  // answer: string;
  type: 'text' | 'choice' | 'scale';
  options?: string[];
}
export function normalizeMentorQuestion(api: any): MentorQuestion {
  return { ...api };
}

export interface LandingConfig {
  heroTitle: string;
  heroSubtitle: string;
  ctaText: string;
  features: string[];
  testimonials: { name: string; text: string; avatar?: string }[];
}
export function normalizeLandingConfig(api: any): LandingConfig {
  return { ...api };
}
export interface MentorTemplate {
  id?: string;
  name: string;
  creatorId?: string;
  wheelConfig: WheelConfigItem[];
  morningQuestions: MentorQuestion[];
  eveningQuestions: MentorQuestion[];
  landingConfig: LandingConfig;
  createdAt?: string;
  updatedAt?: string;
}
export function normalizeMentorTemplate(api: any): MentorTemplate {
  return { ...api };
}

export interface DailySessions {
  id: string;
  type: 'morning' | 'evening';
  status: 'pending' | 'in_progress' | 'completed';
  answers: Record<string, string>;
  aiFeedback?: string;
  xpEarned?: number;
  created_at: string;
  completed_at?: string;
}

export interface TodaySessions {
  morning: DailySessions | null;
  evening: DailySessions | null;
}
export interface MentorWheelScore {
  sphere: string
  score: number
  comment: string
}
