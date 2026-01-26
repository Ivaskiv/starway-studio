// frontend/src/features/auth/guards/AbilityGuard.tsx

import { Navigate, Outlet } from 'react-router-dom'
import { Ability } from '@/shared/types/permissions'
import { useAbility } from '@/features/auth/hooks/useAbility'

interface AbilityGuardProps {
  allow: Ability | Ability[]
}

/**
 * AbilityGuard
 *
 * Використовується В ROUTES
 * ❌ не знає про ролі
 * ✅ працює тільки з abilities
 *
 * приклад:
 * <Route element={<AbilityGuard allow="products.manage" />}>
 */
export function AbilityGuard({ allow }: AbilityGuardProps) {
  const can = useAbility()
  const abilities = Array.isArray(allow) ? allow : [allow]

  const isAllowed = abilities.some(ability => can(ability))

  if (!isAllowed) {
    return <Navigate to="/dashboard" replace />
  }

  return <Outlet />
}
