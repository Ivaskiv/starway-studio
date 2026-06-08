export type UserRole =
  | 'SUPERADMIN'
  | 'EXPERT'
  | 'USER'
  | 'ADMIN'
  | 'MENTOR'
  | 'PRODUCT_OWNER'

export interface SafeUser {
  id: string
  phone?: string | null
  email: string | null
  name: string | null
  firstName: string | null
  lastName: string | null
  role: UserRole
  activeRole: UserRole
  availableRoles: UserRole[]
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
  subscriptionStatus: 'active' | 'canceled' | 'past_due' | 'incomplete' | null
  subscriptionPlan: 'free' | 'trial' | 'paid' | null
  trialEndsAt: string | null
  isTrialActive: boolean
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
