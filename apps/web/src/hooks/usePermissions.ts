import { useMemo } from 'react'

import { useAppSelector } from '@/app/hooks'
import { selectCurrentUser } from '@/features/auth/services/auth.slice'

type Role = 'user' | 'expert' | 'admin' | 'superadmin'

export interface Permissions {
  role: Role
  canViewOwnData: boolean
  canViewAllUsers: boolean
  canViewAllStats: boolean
  canEditOwnCycle: boolean
  canEditAnyUserCycle: boolean
  canEditPrompts: boolean
  canViewReports: boolean
  canViewGlobalReports: boolean
  canManageRoles: boolean
  canAccessAdminPanel: boolean
}

function normalizeRole(role?: string | null): Role {
  switch (String(role ?? '').toUpperCase()) {
    case 'SUPERADMIN':
      return 'superadmin'
    case 'ADMIN':
      return 'admin'
    case 'EXPERT':
    case 'MENTOR':
      return 'expert'
    default:
      return 'user'
  }
}

export function usePermissions(): Permissions {
  const user = useAppSelector(selectCurrentUser)
  const role = normalizeRole(user?.role)

  return useMemo(() => ({
    role,
    canViewOwnData: true,
    canViewAllUsers: ['expert', 'admin', 'superadmin'].includes(role),
    canViewAllStats: ['admin', 'superadmin'].includes(role),
    canEditOwnCycle: true,
    canEditAnyUserCycle: ['admin', 'superadmin'].includes(role),
    canEditPrompts: role === 'superadmin',
    canViewReports: true,
    canViewGlobalReports: ['admin', 'superadmin'].includes(role),
    canManageRoles: role === 'superadmin',
    canAccessAdminPanel: ['expert', 'admin', 'superadmin'].includes(role),
  }), [role])
}

export default usePermissions
