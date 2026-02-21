// frontend/src/features/auth/components/AbilityGuard.tsx
import { useAbility } from '@/features/auth/hooks/useAbility';
import { Ability } from '@/features/auth/utils/abilities';
import { Navigate, Outlet } from 'react-router-dom';

interface AbilityGuardProps {
  allow: Ability | Ability[];
  redirectTo?: string;
  children?: React.ReactNode;
}

export function AbilityGuard({
  allow,
  redirectTo = '/dashboard',
  children,
}: AbilityGuardProps) {
  const { can, isLoading } = useAbility();
  const abilities = Array.isArray(allow) ? allow : [allow];

  if (isLoading) return null;

  const isAllowed = abilities.some(a => can(a));

  if (!isAllowed) {
    return <Navigate to={redirectTo} replace />;
  }

  return children ? <>{children}</> : <Outlet />;
}
