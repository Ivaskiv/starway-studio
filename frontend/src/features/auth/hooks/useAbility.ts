import { Ability } from '@/shared/types/permissions'
import { PERMISSIONS_MATRIX } from '@/shared/config/permissions.matrix'
import { useAuth } from './useAuth'
import { UserRole } from '@/shared/types/user.types'

export function useAbility() {
  const { user } = useAuth()

  return (ability: Ability): boolean => {
    if (!user) return false

    const role = user.role as UserRole
    const abilities = PERMISSIONS_MATRIX[role]

    return abilities?.includes(ability) ?? false
  }
}
