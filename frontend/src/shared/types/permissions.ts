// frontend/src/features/auth/types/permissions.ts

/**
 * ABILITY СИСТЕМА
 * 
 * Єдине джерело правди для всіх прав доступу в системі.
 * Використовується у:
 * - AbilityGuard (routes)
 * - useAbility hook
 * - Sidebar (навігація)
 * - UI компонентах (кнопки, блоки)
 */

export const ABILITIES = {
  // Базовий доступ
  DASHBOARD_VIEW: 'dashboard.view',
  PROFILE_VIEW: 'profile.view',
  
  // User features
  PROGRESS_VIEW: 'progress.view',
  WHEEL_VIEW: 'wheel.view',
  AI_USE: 'ai.use',
  
  // Admin features
  PRODUCTS_MANAGE: 'products.manage',
  FUNNELS_MANAGE: 'funnels.manage',
  SETTINGS_MANAGE: 'settings.manage',
  USERS_MANAGE: 'users.manage',
  
  // Super admin
  ROLES_MANAGE: 'roles.manage',
} as const

export type Ability = typeof ABILITIES[keyof typeof ABILITIES]

/**
 * Дефолтні набори прав для кожної ролі
 */
export const ROLE_ABILITIES: Record<string, Ability[]> = {
  user: [
    ABILITIES.DASHBOARD_VIEW,
    ABILITIES.PROFILE_VIEW,
    ABILITIES.PROGRESS_VIEW,
    ABILITIES.WHEEL_VIEW,
    ABILITIES.AI_USE,
  ],
  
  admin: [
    ABILITIES.DASHBOARD_VIEW,
    ABILITIES.PROFILE_VIEW,
    ABILITIES.PROGRESS_VIEW,
    ABILITIES.WHEEL_VIEW,
    ABILITIES.AI_USE,
    ABILITIES.PRODUCTS_MANAGE,
    ABILITIES.FUNNELS_MANAGE,
    ABILITIES.SETTINGS_MANAGE,
    ABILITIES.USERS_MANAGE,
  ],
  
  super_admin: [
    ABILITIES.DASHBOARD_VIEW,
    ABILITIES.PROFILE_VIEW,
    ABILITIES.PROGRESS_VIEW,
    ABILITIES.WHEEL_VIEW,
    ABILITIES.AI_USE,
    ABILITIES.PRODUCTS_MANAGE,
    ABILITIES.FUNNELS_MANAGE,
    ABILITIES.SETTINGS_MANAGE,
    ABILITIES.USERS_MANAGE,
    ABILITIES.ROLES_MANAGE,
  ],
}

/**
 * Helper: отримати abilities для ролі
 */
export function getAbilitiesForRole(role: string): Ability[] {
  return ROLE_ABILITIES[role] || ROLE_ABILITIES.user
}