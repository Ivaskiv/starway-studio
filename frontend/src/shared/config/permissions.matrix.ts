import { UserRole } from '@/shared/types/user.types'
import { Ability } from '@/shared/types/permissions'

export const PERMISSIONS_MATRIX: Record<UserRole, Ability[]> = {

  user: [
    'dashboard.view',
    'profile.view',
    'profile.edit',
    'progress.view',
    'ai.use',
  ],

  admin: [
    'dashboard.view',
    'products.manage',
    'users.manage',
    'funnels.manage',
    'analytics.view',
    'settings.manage',
  ],

  super_admin: [
    'dashboard.view',
    'products.manage',
    'users.manage',
    'funnels.manage',
    'analytics.view',
    'settings.manage',
    'system.manage',
  ],
}
