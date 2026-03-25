// frontend/src/features/auth/types/auth.types.ts
import type { AuthApiResponse } from '@/types/globalTypes'
import type { User, UserRole } from '@/features/user/types/user.types'

export interface LoginInput {
  email: string
  password: string
  expertId?: string
}

export interface CheckUserExistsInput {
  email: string
  expertId?: string
}

export interface CheckUserExistsResponse {
  exists: boolean
}

export interface RegisterInput {
  email: string
  password: string
  name?: string
  role?: UserRole
  expertId?: string
}

export interface ForgotPasswordInput {
  email: string
}

export interface ResetPasswordInput {
  token: string
  password: string
}

export interface SocialAuthApiInput {
  provider: 'google' | 'telegram'
  externalId: string
  email?: string
  name?: string
  username?: string
  expertId?: string
}

export interface TelegramMiniAppAuthInput {
  initData: string
}

export interface UpdateUserSettingsInput {
  email?: string
  firstName?: string
  lastName?: string
  settings?: {
    accentColor?: string
    theme?: string
    language?: string
    notifications?: {
      enabled?: boolean
      morningTime?: string | null
      eveningTime?: string | null
      types?: {
        dailyMorning?: boolean
        dailyEvening?: boolean
        weeklySummary?: boolean
        streakAlert?: boolean
        streakBroken?: boolean
        levelUp?: boolean
      }
    }
  }
}

export type { AuthApiResponse }

export interface ForgotPasswordResponse {
  success: boolean
  message: string
  emailSent?: boolean
  resetToken?: string
  resetUrl?: string
}

export interface ResetPasswordResponse {
  success: boolean
}

export interface SocialAuthResult {
  provider: string
  isNewUser: boolean
  needsCompletion: boolean
  name?: string
  email?: string
}

export type AuthStatus = 'loading' | 'authenticated' | 'guest'

export interface AuthState {
  user: User | null
  role: UserRole | null
  accessToken: string | null
  status: AuthStatus
}

export type AccessKey =
  | 'mentor.core'
  | 'mentor.daily'
  | 'mentor.decisions'
  | 'mentor.wheel'
  | 'mentor.vision'
  | 'mentor.goals'
  | 'mentor.actions'
  | 'mentor.zoom'
  | 'mentor.mentorship'
  | 'ai.basic'
  | 'ai.deep'
  | 'ai.pdf'
  | 'ai.export'
  | 'dashboard.view'
  | 'profile.view'
  | 'wheel.view'
  | 'progress.view'
  | 'products.manage'
  | 'settings.manage'
  | 'dashboard'
  | 'mentor'
  | 'vision'
  | 'goal'
  | 'actions'
  | 'wheel'
  | 'progress'
  | 'products'
  | 'profile'
  | 'settings'

export interface AccessItem {
  key: string
  source: 'trial' | 'purchase' | 'free' | 'admin'
  expiresAt: string | null
  productId?: string
  enrollmentId?: string
}

export interface UserAccessResult {
  abilities: Record<string, boolean>
  items: AccessItem[]
  plan: 'free' | 'trial' | 'paid'
  role: string
  trialEnd: string | null
  accessLevel?: 'GUEST' | 'LEAD' | 'CLIENT'
  currentFlow?: 'lead-magnet' | 'mentor' | null
}
