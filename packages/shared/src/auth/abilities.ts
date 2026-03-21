import type { UserRole } from '../types/auth.js'

export const ABILITIES = {
  DASHBOARD_VIEW: 'dashboard.view',
  PROFILE_VIEW: 'profile.view',
  PROFILE_UPDATE: 'profile.update',
  WHEEL_VIEW: 'wheel.view',
  WHEEL_CREATE: 'wheel.create',
  PROGRESS_VIEW: 'progress.view',
  AI_USE: 'ai.use',
  PRODUCTS_MANAGE: 'products.manage',
  SETTINGS_MANAGE: 'settings.manage',
  MENTOR_CORE: 'mentor.core',
  MENTOR_DAILY: 'mentor.daily',
  MENTOR_DECISIONS: 'mentor.decisions',
  MENTOR_WHEEL: 'mentor.wheel',
  MENTOR_VISION: 'mentor.vision',
  MENTOR_GOALS: 'mentor.goals',
  MENTOR_ACTIONS: 'mentor.actions',
  MENTOR_ZOOM: 'mentor.zoom',
  AI_BASIC: 'ai.basic',
  AI_DEEP: 'ai.deep',
  ADMIN_CLIENTS_VIEW: 'admin.clients.view',
  COURSES_VIEW: 'courses.view',
  FUNNEL_MANAGE: 'funnels.manage',
  NOTIFICATIONS_READ: 'notifications.read',
} as const

type KnownAbility = (typeof ABILITIES)[keyof typeof ABILITIES]

export type Ability = KnownAbility | (string & {})

export function getAllAbilities(isSuperAdmin: boolean) {
  const baseAbilities: Record<string, boolean> = {
    'dashboard.view': true,
    'profile.view': true,
    'wheel.view': true,
    'progress.view': true,
    'settings.manage': true,
  }

  if (isSuperAdmin) {
    baseAbilities['mentor.core'] = true
    baseAbilities['products.manage'] = true
    baseAbilities['admin.clients.view'] = true
  }

  return baseAbilities
}

export function resolveUserAbilities(user: { role: UserRole }): Ability[] {
  const abilities: Ability[] = [
    ABILITIES.DASHBOARD_VIEW,
    ABILITIES.PROFILE_VIEW,
    ABILITIES.WHEEL_VIEW,
    ABILITIES.PROGRESS_VIEW,
    ABILITIES.SETTINGS_MANAGE,
  ]

  if (user.role === 'EXPERT' || user.role === 'SUPERADMIN') {
    abilities.push(ABILITIES.AI_USE, ABILITIES.MENTOR_CORE)
  }

  if (user.role === 'SUPERADMIN') {
    abilities.push(ABILITIES.PRODUCTS_MANAGE, ABILITIES.ADMIN_CLIENTS_VIEW)
  }

  return [...new Set(abilities)]
}
