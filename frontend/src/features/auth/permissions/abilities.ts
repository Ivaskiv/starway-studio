// frontend/src/features/auth/permissions/abilities.ts
/**
 * Canonical ability list shared across auth tooling.
 */
export const ABILITIES = {
  // Dashboard
  DASHBOARD_VIEW:     'dashboard.view',

  // Profile
  PROFILE_VIEW:       'profile.view',
  PROFILE_UPDATE:     'profile.update',
  MENTOR_CORE:        'mentor.core',
  MENTOR_VISION:      'mentor.vision',
  MENTOR_ZOOM:        'mentor.zoom',
  MENTOR_GOALS:       'mentor.goals',
  MENTOR_DECISIONS:   'mentor.decisions',

  // Wheel
  WHEEL_VIEW:         'wheel.view',
  WHEEL_CREATE:       'wheel.create',

  // Progress
  PROGRESS_VIEW:      'progress.view',

  // AI
  AI_USE:             'ai.use',

  // Products (admin)
  PRODUCTS_MANAGE:    'products.manage',

  // Settings
  SETTINGS_MANAGE:    'settings.manage',

  COURSES_VIEW:       'courses.view',
  FUNNEL_MANAGE:      'funnels.manage',

  NOTIFICATIONS_READ: 'notifications.read',
} as const;

type KnownAbility = (typeof ABILITIES)[keyof typeof ABILITIES];

export type Ability = KnownAbility | (string & {});
