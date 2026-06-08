import type { Request } from 'express'
import type {
  FunnelStage,
  MentorConfig,
  NotificationPreference,
  Subscription,
  UserProgress,
} from '@starway/db/prisma-client'; 
import type { Product } from '../modules/products/types.js'
import type { AccessControlState } from '../modules/access/types.js'

export type UserRole = 'SUPERADMIN' | 'EXPERT' | 'USER' | 'ADMIN' | 'MENTOR' | 'PRODUCT_OWNER'

export interface User {
  id: string
  expertId?: string | null
  phone?: string | null
  email: string | null
  name?: string | null
  firstName: string | null
  lastName: string | null
  role: UserRole
  activeRole: UserRole
  passwordHash: string | null
  telegramUserId: string | null
  telegramUserName: string | null
  telegramChatId: string | null
  telegramEnabled?: boolean
  lastLoginAt: Date | null
  createdAt: Date
  updatedAt: Date
  uiSettings?: Record<string, unknown> | null
}

export interface UserWithSub extends User {
  subscription: Subscription | null
  userProgress: Pick<UserProgress, 'level' | 'totalPoints' | 'completedBlocks'> | null
  mentorConfigs: Array<Pick<MentorConfig, 'config'>>
  notificationPreference: NotificationPreference | null
}

export interface SafeUser {
  id: string
  expertId?: string | null
  phone?: string | null
  email: string | null
  name: string | null
  firstName: string | null
  lastName: string | null
  telegramUserId: string | null
  telegramUserName: string | null
  telegramChatId: string | null
  telegramEnabled?: boolean
  role: UserRole // primary/max role
  activeRole: UserRole // currently selected context role
  availableRoles: UserRole[] // all roles this user can switch to
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
    accentColor: string | null // ✅ ЗМІНЕНО: null замість undefined
    theme: string | null
    language: string | null
    notifications?: Record<string, unknown>
  }
  lastLoginAt: string | null
  subscriptionStatus: 'active' | 'canceled' | 'past_due' | 'incomplete' | null
  subscriptionPlan: 'free' | 'trial' | 'paid' | null
  trialEndsAt: string | null
  isTrialActive: boolean
}

// ✅ Мінімальний тип для JWT
export interface AuthUser {
  id: string
  role: UserRole
  activeRole: UserRole
  email: string | null
  expertId?: string | null
}

// ✅ ВИДАЛЕНО: declare global для Request.user (створював конфлікт)
export interface AuthenticatedRequest extends Request {
  user?: AuthUser
  accessControl?: AccessControlState
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
