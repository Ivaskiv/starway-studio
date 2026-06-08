// frontend/src/features/user/types/user.types.ts
// ═══════════════════════════════════════════════════════════════
//  ЄДИНЕ ДЖЕРЕЛО ПРАВДИ для User-домену
//  Використовується: auth, profile, settings, products, progress
// ═══════════════════════════════════════════════════════════════

import type { Ability } from '@/features/auth/permissions/abilities'
import type { ReactNode } from 'react'

// ── Roles ──────────────────────────────────────────────────────
export type UserRole = 'SUPERADMIN' | 'ADMIN' | 'EXPERT' | 'USER' | 'MENTOR' | 'PRODUCT_OWNER'

// ── Plan ───────────────────────────────────────────────────────
export type PlanType = 'free' | 'trial' | 'paid'

// ── Subscription ───────────────────────────────────────────────
export type SubscriptionStatus =
  | 'active' | 'canceled' | 'past_due' | 'incomplete'
  | null

// ── Settings ───────────────────────────────────────────────────
export interface UserSettings {
  accentColor?: string | null
  theme?:       string | null
  language?:    string | null
  bgColor?:     string | null
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
      subscription?: boolean
      aiReminders?: boolean
    }
  }
}

// ── Access ─────────────────────────────────────────────────────
export interface UserAccess {
  plan:     PlanType
  isPaid:   boolean
  isTrial:  boolean
  trialEnd?: string | null
}

// ── Stats ──────────────────────────────────────────────────────
export interface UserStats {
  totalPoints:     number
  completedBlocks: number
  level:           number
  xp?:             number
  streakDays?:     number
  sessions?:       number
}

// ── Product membership ─────────────────────────────────────────
export interface ProductMember {
  userId:    string
  productId: string
  role:      UserRole
  joinedAt:  string
}

// ── Core User ──────────────────────────────────────────────────
export interface User {
  id:        string
  expertId?: string | null
  phone?:    string | null
  email:     string | null
  name:      string | null
  firstName: string | null
  lastName:  string | null

  createdAt?: string
  updatedAt?: string

  telegramUserId?: string | null
  telegramUserName?: string | null
  telegramChatId?: string | null
  telegramEnabled?: boolean

  role:            UserRole   // primary/max role
  activeRole:      UserRole   // currently selected context role
  availableRoles?: UserRole[] // all roles this user can switch to
  isAdmin:         boolean
  isSuperAdmin:    boolean

  abilities: Ability[]

  access:    UserAccess
  stats:     UserStats
  settings?: UserSettings

  lastLoginAt: string | null

  subscriptionStatus?: SubscriptionStatus | string | null
  subscriptionPlan?:   PlanType | string | null

  productRoles?: ProductMember[]
}

// ── Requests ───────────────────────────────────────────────────
export interface LoginRequest {
  email:    string
  password: string
}

export interface RegisterRequest {
  email:     string
  password:  string
  name?:     string
  expertId?: string
  role?:     UserRole
}

export interface UpdateUserRequest {
  id:         string
  firstName?: string
  lastName?:  string
  name?:      string
  settings?:  Partial<UserSettings>
}

// ── Helpers ────────────────────────────────────────────────────
export const canEditProduct = (user: User, productId: string): boolean => {
  if (user.isSuperAdmin || user.isAdmin) return true
  return user.productRoles?.some(
    r => r.productId === productId && r.role === 'ADMIN',
  ) ?? false
}

export const hasPaidAccess = (user: User | null): boolean => {
  if (!user) return false
  return user.access?.isPaid === true || user.subscriptionStatus === 'active'
}

export const getUserFullName = (user: Pick<User, 'firstName' | 'lastName'>): string =>
  [user.firstName, user.lastName].filter(Boolean).join(' ').trim()

export const getUserDisplayName = (user: Pick<User, 'firstName' | 'lastName' | 'name' | 'email'>): string =>
  getUserFullName(user) || user.name || user.email?.split('@')[0] || 'User'

// ── Profile tabs ───────────────────────────────────────────────
export type ProfileTab = 'overview' | 'history' | 'badges' | 'settings'

export const PROFILE_TABS: { id: ProfileTab; label: string }[] = [
  { id: 'overview',  label: 'Огляд'         },
  { id: 'history',   label: 'Активність'    },
  { id: 'badges',    label: 'Досягнення'    },
  { id: 'settings',  label: 'Налаштування'  },
]

// ── UI helpers ─────────────────────────────────────────────────
export type ToggleOption<T = string> = {
  label:     string
  value:     T
  disabled?: boolean
}

export type ToggleProps<T = string> = {
  label:     string
  icon?:     ReactNode
  options:   ToggleOption<T>[]
  value:     T
  onChange:  (value: T) => void
  disabled?: boolean
}
