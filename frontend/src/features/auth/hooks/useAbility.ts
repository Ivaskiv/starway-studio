import { PERMISSIONS_MATRIX } from '@/shared/config/permissions.matrix';
import { Ability } from '@/shared/types/permissions';
import { UserRole } from '@/shared/types/user.types';
import { useAuth } from './useAuth';

export function useAbility() {
  const { user } = useAuth();

  return (ability: Ability): boolean => {
    if (!user) return false;

    const role = user.role as UserRole;
    const abilities = PERMISSIONS_MATRIX[role];

    return abilities?.includes(ability) ?? false;
  };
}
