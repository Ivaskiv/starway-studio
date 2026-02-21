// backend/src/modules/auth/abilities.ts
import type { User } from '@prisma/client'

export const ABILITIES = {
  DASHBOARD_VIEW:    'dashboard.view',
  PROFILE_VIEW:      'profile.view',
  PROFILE_UPDATE:    'profile.update',
  WHEEL_VIEW:        'wheel.view',
  PROGRESS_VIEW:     'progress.view',
  AI_USE:            'ai.use',
  PRODUCTS_MANAGE:   'products.manage',
  SETTINGS_MANAGE:   'settings.manage',
  MENTOR_CORE:       'mentor.core',
  MENTOR_DAILY:      'mentor.daily',
  MENTOR_DECISIONS:  'mentor.decisions',
  MENTOR_WHEEL:      'mentor.wheel',
  MENTOR_VISION:     'mentor.vision',
  MENTOR_GOALS:      'mentor.goals',
  MENTOR_ACTIONS:    'mentor.actions',
  MENTOR_ZOOM:       'mentor.zoom',
  AI_BASIC:          'ai.basic',
  AI_DEEP:           'ai.deep',
} as const

export type Ability = (typeof ABILITIES)[keyof typeof ABILITIES]

// ✅ була відсутня — використовується в access.service.ts
export function getAllAbilities(allTrue: boolean): Record<string, boolean> {
  return Object.fromEntries(
    Object.values(ABILITIES).map(key => [key, allTrue])
  )
}

export function resolveUserAbilities(user: User): Ability[] {
  const abilities: Ability[] = [
    ABILITIES.DASHBOARD_VIEW,
    ABILITIES.PROFILE_VIEW,
    ABILITIES.WHEEL_VIEW,
    ABILITIES.PROGRESS_VIEW,
    ABILITIES.SETTINGS_MANAGE,
  ]

  if (user.role === 'ADMIN' || user.role === 'MENTOR') {
    abilities.push(ABILITIES.AI_USE, ABILITIES.MENTOR_CORE)
  }

  if (user.role === 'ADMIN') {
    abilities.push(ABILITIES.PRODUCTS_MANAGE)
  }

  return [...new Set(abilities)]
}