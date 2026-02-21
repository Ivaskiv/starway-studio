// frontend/src/features/auth/utils/abilities.ts
// abilities.ts — контракт для фронтенду
/**
 * Frontend: ТІЛЬКИ типи + строки для перевірки
 *
 * ❌ НЕ логіка
 * ❌ НЕ ролі
 * ✅ Лише декларація всіх abilities, що може питати can()
 *
 * Використовуються у:
 * - useAbility()
 * - AbilityGuard
 * - NavMenu / Sidebar
 * - автокомпліт в IDE
 */

export const ABILITIES = {
  // Dashboard
  DASHBOARD_VIEW: 'dashboard.view',

  // Profile
  PROFILE_VIEW: 'profile.view',
  PROFILE_UPDATE: 'profile.update',
  MENTOR_CORE: 'mentor.core',
  MENTOR_VISION: 'mentor.vision',
  MENTOR_ZOOM: 'mentor.zoom',
  MENTOR_GOALS: 'mentor.goals',
  MENTOR_DECISIONS: 'mentor.decisions',

  // Wheel
  WHEEL_VIEW: 'wheel.view',
  WHEEL_CREATE: 'wheel.create',

  // Progress
  PROGRESS_VIEW: 'progress.view',

  // AI
  AI_USE: 'ai.use',

  // Products (admin)
  PRODUCTS_MANAGE: 'products.manage',

  // Settings
  SETTINGS_MANAGE: 'settings.manage',

  COURSES_VIEW: 'courses.view',
  FUNNEL_MANAGE: 'funnels.manage',
} as const;

/**
 * Union тип усіх abilities
 * Використовується для типізації в AbilityGuard та useAbility
 */
export type Ability = (typeof ABILITIES)[keyof typeof ABILITIES];
