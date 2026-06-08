import type { UserRole } from '@/features/user/types/user.types';

// API contracts mirror the backend JSON payloads (dates stay strings, no Prisma-specific helpers).
export type JsonValue = boolean | number | string | null | JsonValue[] | { [key: string]: JsonValue };
export type AccessPlan = 'free' | 'trial' | 'paid';

export interface SafeUserDTO {
  id: string;
  expertId?: string | null;
  phone?: string | null;
  email: string | null;
  name: string | null;
  firstName: string | null;
  lastName: string | null;
  role: UserRole;
  isAdmin: boolean;
  isSuperAdmin: boolean;
  abilities: string[];
  access: {
    plan: AccessPlan;
    isPaid: boolean;
    isTrial: boolean;
    trialEnd: string | null;
  };
  stats: {
    totalPoints: number;
    completedBlocks: number;
    level: number;
  };
  settings: {
    accentColor: string | null;
    theme: string | null;
    language: string | null;
  };
  lastLoginAt: string | null;
  subscriptionStatus: string;
  subscriptionPlan: string;
  trialEndsAt: string | null;
  isTrialActive: boolean;
}

// Auth success responses reuse SafeUserDTO and include server tokens.

export interface AuthTokensDTO {
  accessToken: string;
  refreshToken?: string;
}

export interface AuthSuccessResponseDTO extends AuthTokensDTO {
  user: SafeUserDTO;
  needsProfile?: boolean;
  needsOnboarding?: boolean;
  expiresIn?: number;
  isNewUser?: boolean;
  needsCompletion?: boolean;
}

export interface SocialAuthResponseDTO extends AuthSuccessResponseDTO {}

export interface RefreshTokenResponseDTO extends AuthTokensDTO {
  user: SafeUserDTO;
}

export interface MeResponseDTO {
  user: SafeUserDTO;
}

export interface LogoutResponseDTO {
  success: true;
}

export interface ForgotPasswordResponseDTO {
  success: true;
  message: string;
  emailSent: boolean;
  resetToken?: string;
  resetUrl?: string;
}

export interface ResetPasswordResponseDTO {
  success: true;
}

export interface UpdateSettingsResponseDTO {
  user: SafeUserDTO;
}

// ================= AI MENTOR =================

export type OnboardingStage = 'ENTRY' | 'VISION' | 'GOAL' | 'CHOICE' | 'ACTIONS' | 'COMPLETED';

export interface MentorSessionDTO {
  id: string;
  mentorId: string;
  userId: string;
  date: string;
  startedAt: string;
  lastMessageAt: string;
  onboardingStage: OnboardingStage | null;
  metadata: { [key: string]: JsonValue } | null;
  createdAt: string;
  updatedAt: string;
}

export interface MentorMessageDTO {
  id: string;
  mentorId: string;
  sessionId: string | null;
  userId: string;
  role: 'USER' | 'MENTOR' | 'SYSTEM';
  text: string;
  metadata: { [key: string]: JsonValue } | null;
  createdAt: string;
}

export interface ChatResponseDTO {
  session: MentorSessionDTO & { messages: MentorMessageDTO[] };
  userMessage: MentorMessageDTO;
  mentorMessage: MentorMessageDTO;
}

export interface SessionWithMessagesDTO extends MentorSessionDTO {
  messages: MentorMessageDTO[];
}

export type ChatHistoryResponseDTO = MentorMessageDTO[];

export interface MorningSessionDTO {
  type: 'morning';
  affirmation: string;
  focus: string;
  energy: string;
  timestamp: string;
}

export interface EveningSessionDTO {
  type: 'evening';
  reflection: string;
  gratitude: string;
  tomorrow: string;
  timestamp: string;
}

export interface DailyAffirmationDTO {
  text: string;
  category: string;
  timestamp: string;
}

export type DailyState = 'NEUTRAL' | 'HAPPY' | 'SAD' | 'ANXIOUS';
export type DailyChoice = 'PENDING' | 'CONFIRMED' | 'SKIPPED' | 'CONFIRMED_OLD';
export type DailyDrain = 'LOW' | 'MEDIUM';

export interface MicroSupportItemDTO {
  id: string;
  action: string;
  durationDays: number;
  completed?: boolean;
}

export interface DailyEntryDTO {
  id: string;
  userId: string;
  expertId: string;
  date: string;
  content: { [key: string]: JsonValue };
  state: DailyState;
  choice: DailyChoice;
  drain: DailyDrain | null;
  dayFact: string;
  aiAnalysis: string | null;
  microSupport: MicroSupportItemDTO[] | null;
  createdAt: string;
  updatedAt: string;
}

export type DailyEntriesResponseDTO = DailyEntryDTO[];

export interface DailyEntryCheckResponseDTO {
  hasEntry: boolean;
}

// ================= AI MENTOR SETUP =================

export type SetupStep = 'wheel' | 'questions' | 'complete';

export interface SetupProgressDTO {
  userId: string;
  wheelCompleted: boolean;
  questionsConfigured: boolean;
  setupCompletedAt?: string;
  currentStep: SetupStep;
}

export interface ConfigureWheelResponseDTO {
  wheelId: string;
  nextStep: string;
}

export interface ConfigureQuestionsResponseDTO {
  setupComplete: boolean;
}

export interface GeneratedQuestionsVariantDTO {
  id: string;
  title: string;
  morningQuestions: string[];
  eveningQuestions: string[];
}

export interface GenerateQuestionsResponseDTO {
  variants: GeneratedQuestionsVariantDTO[];
}

export interface CompleteSetupResponseDTO {
  success: boolean;
}

// ================= SUBSCRIPTIONS =================

export type SubscriptionStatusPrisma = 'TRIAL' | 'ACTIVE' | 'PAST_DUE' | 'CANCELED' | 'EXPIRED';

export interface SubscriptionDTO {
  id: string;
  userId: string;
  expertId: string | null;
  productId: string | null;
  startsAt: string | null;
  status: SubscriptionStatusPrisma;
  planCode: string;
  trialEndsAt: string | null;
  currentPeriodEnd: string | null;
  autoRenew: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface SubscriptionInfoDTO {
  status: 'trial' | 'active' | 'inactive';
  startsAt?: string;
  endsAt?: string;
  autoRenew?: boolean;
  daysLeft?: number;
}

export interface CooldownDTO {
  canFill: boolean;
  daysLeft: number;
}

export interface SubscriptionStatusResponseDTO {
  success: true;
  subscription: SubscriptionInfoDTO;
  cooldown: CooldownDTO;
}

export interface SubscriptionListResponseDTO {
  success: true;
  subscriptions: SubscriptionDTO[];
}

// ================= USER =================

export interface UserRoleUpdateResponseDTO {
  message: string;
  user: {
    id: string;
    email: string | null;
    role: UserRole;
  };
}
// ================= MENTORSHIP =================
// Mentorship — це:

// Довготривалий контракт User ↔ Expert
// який дає системний доступ до вищого рівня можливостей.

// AI — інструмент.
// Subscription — фінансова модель.
// Mentorship — статус взаємодії.

export type MentorshipDTO = {
  id: string
  expertId: string
  status: 'ACTIVE' | 'PENDING' | 'PAUSED' | 'COMPLETED' | 'CANCELLED'
  startsAt: string
  endsAt: string | null
}
