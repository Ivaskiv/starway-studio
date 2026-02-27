import type { Request } from 'express'
import type {
  FunnelStage,
  MentorConfig,
  Subscription,
  UserProgress,
} from '../db/generated/prisma/client.js'
import type { Product } from '../modules/products/types.js'

// ======================= ENUMS =======================
export type UserRole = 'SUPERADMIN' | 'EXPERT' | 'USER' | 'ADMIN'

// ======================= USER TYPES =======================
export interface User {
  id: string
  email: string | null
  name: string | null
  firstName: string | null
  lastName: string | null
  role: UserRole
  passwordHash: string | null
  telegramUserId: string | null
  telegramUserName: string | null
  telegramChatId: string | null
  lastLoginAt: Date | null
  createdAt: Date
  updatedAt: Date
}

export interface UserWithSub extends User {
  subscription: Subscription | null
  userProgress: Pick<UserProgress, 'level' | 'totalPoints' | 'completedBlocks'> | null
  mentorConfigs: Array<Pick<MentorConfig, 'config'>>
}

export interface SafeUser {
  id: string
  email: string | null
  name: string | null
  firstName: string | null
  lastName: string | null
  role: UserRole
  isAdmin: boolean
  isSuperAdmin: boolean
  abilities: string[]
  access: {
    plan: 'free' | 'trial' | 'paid'
    isPaid: boolean
    isTrial: boolean
    trialEnd: string | null
  }
  stats: {
    totalPoints: number
    completedBlocks: number
    level: number
  }
  settings: {
    accentColor: string | null
    theme: string | null
    language: string | null
  }
  lastLoginAt: string | null
  subscriptionStatus: string
  subscriptionPlan: string
  trialEndsAt: string | null
  isTrialActive: boolean
}

// ======================= AUTH TYPES =======================
export interface AuthUser extends User {
  id: string;
  role: UserRole;
  email: string | null;
  expertId?: string | null;
  // subscriptionStatus?: string | null;
  // trialEndsAt?: Date | null;
}

export type AuthTokenPayload = {
  id: string;
  role: UserRole;
  email: string | null;
  expertId?: string | null;
};

export interface AuthenticatedRequest extends Request {
  user?: AuthTokenPayload;
}


export interface AuthApiResponse {
  user: SafeUser
  accessToken: string
  refreshToken?: string
  needsProfile?: boolean
  expiresIn?: number
  isNewUser?: boolean
  needsCompletion?: boolean
}

// ======================= FUNNEL TYPES =======================
export interface FunnelInput {
  name: string
  status?: 'draft' | 'active' | 'archived'
}

export interface GenerateAIFunnelInput {
  userPrompt: string
  businessType?: string
  targetAudience?: string
}

export interface AIFunnelStage {
  name: string
  action: string
  headline: string
  cta: string
  emailSequence: string[]
}

export interface AIFunnelProduct {
  name: string
  description: string
  priceCents: number
}

export interface AIFunnelResult {
  concept: string
  stages: AIFunnelStage[]
  aiRecommendations: string[]
  suggestedProducts: AIFunnelProduct[]
}

export interface GenerateAIFunnelResult {
  funnel: FunnelWithStagesAndProducts
  aiResult: AIFunnelResult
}

export interface FunnelWithStagesAndProducts {
  id: string
  name: string
  status: string
  ownerId: string
  stages: FunnelStage[]
  products: Product[]
}
