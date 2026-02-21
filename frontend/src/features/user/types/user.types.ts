// frontend/src/features/user/types/user.types.ts
import type { Ability } from '@/features/auth/utils/abilities'
import type { ReactNode } from 'react'

export type UserRole = 'admin' | 'user' | 'mentor'

export interface ProductMember {
  userId: string
  productId: string
  role: UserRole
  joinedAt: string
}

export type PlanType = 'free' | 'trial' | 'paid'

export interface UserAccess {
  plan: PlanType
  isPaid: boolean
  isTrial: boolean
  trialEnd?: string | null
}

export interface UserStats {
  totalPoints: number
  completedBlocks: number
  level: number
}

export interface User {
  id: string
  email: string

  name?: string | null
  firstName?: string | null
  lastName?: string | null
  displayName?: string
  avatar?: string

  role: UserRole
  isAdmin: boolean
  isSuperAdmin: boolean

  productRoles?: ProductMember[]

  access: UserAccess
  abilities: Ability[]
  settings?: {
    accentColor?: string | null
    theme?: string | null
    language?: string | null
  }

  subscriptionStatus?: string | null
  subscriptionPlan?: string | null
  trialEndsAt?: string | null
  isTrialActive?: boolean

  stats?: UserStats
  createdAt?: string
  lastLoginAt?: string | null
}

export interface LoginRequest {
  email: string
  password: string
}

export interface RegisterRequest {
  email: string
  password: string
  name?: string
  role?: UserRole
}

export interface UpdateUserRequest {
  id: string
  firstName?: string
  lastName?: string
  name?: string
  settings?: Record<string, unknown>
}

export const canEditProduct = (user: User, productId: string): boolean => {
  if (user.isSuperAdmin || user.isAdmin) return true
  return (
    user.productRoles?.some(
      (r) => r.productId === productId && r.role === 'admin',
    ) ?? false
  )
}

export const hasPaidAccess = (user: User | null | undefined): boolean => {
  if (!user) return false
  if (!user.access) return false
  return user.access.isPaid || user.access.isTrial
}

export type ToggleOption<T = string> = {
  label: string
  value: T
  disabled?: boolean
}

export type ToggleProps<T = string> = {
  label: string
  icon?: ReactNode
  options: ToggleOption<T>[]
  value: T
  onChange: (value: T) => void
  disabled?: boolean
}
