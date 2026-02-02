// frontend/src/features/dashboard/layout/AbilityGuard.tsx

import { useAbility } from '@/features/auth/hooks/useAbility';
import { Ability } from '@/shared/types/permissions';
import { Navigate, Outlet } from 'react-router-dom';

interface AbilityGuardProps {
  allow: Ability | Ability[];
}

/**
 * AbilityGuard - перевіряє permissions для роутів
 * Використовується в App.tsx для захисту сторінок
 */
export function AbilityGuard({ allow }: AbilityGuardProps) {
  const can = useAbility();
  const abilities = Array.isArray(allow) ? allow : [allow];

  // Перевіряємо, чи є хоча б одна з необхідних abilities
  const isAllowed = abilities.some(ability => can(ability));

  if (!isAllowed) {
    return <Navigate to="/dashboard" replace />;
  }

  return <Outlet />;
}
