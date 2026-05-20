// frontend/src/features/auth/hooks/useAccess.ts
import { selectIsAuthenticated } from '@/features/auth/services/auth.slice';
import type { AccessKey } from '@/features/auth/types/auth.types';
import { useSessionOrchestrator } from '@/features/auth/context/SessionOrchestratorContext';
import { useCallback, useMemo } from 'react';
import { useSelector } from 'react-redux';

/**
 * Доступ і план поточного користувача.
 * Вся логіка підписок — в resolvePlan() (shared/subscription.utils).
 */
export function useAccess(options?: { enabled?: boolean }) {
  const isAuthenticated = useSelector(selectIsAuthenticated);
  const { accessData: data, canRunProtectedQueries, isAccessReady } = useSessionOrchestrator();
  const enabled = options?.enabled ?? true;
  const shouldFetchAccess = enabled && isAuthenticated && canRunProtectedQueries;
  const isLoading = shouldFetchAccess && !isAccessReady
  const isFetching = false
  const isError = shouldFetchAccess && !data && isAccessReady
  const isSuccess = shouldFetchAccess && Boolean(data)

  const fallbackFreeAbilities: Record<string, boolean> = useMemo(
    () => ({
      'dashboard.view': true,
      'profile.view': true,
      'wheel.view': true,
      'progress.view': true,
      'settings.manage': true,
      dashboard: true,
      profile: true,
      wheel: true,
      progress: true,
      settings: true,
    }),
    [],
  );

  const can = useCallback((key: AccessKey): boolean => {
    if (data?.abilities) return data.abilities[key] === true;
    if (isError || !shouldFetchAccess) return fallbackFreeAbilities[key] === true;
    return false;
  }, [data?.abilities, fallbackFreeAbilities, isError, shouldFetchAccess]);
  const plan = data?.plan ?? 'free';
  const normalizedRole = data?.role?.toUpperCase();
  const isAdmin = normalizedRole === 'ADMIN' || normalizedRole === 'SUPERADMIN';
  const isPaid = plan === 'paid' || isAdmin;
  const isTrial = plan === 'trial';
  const isFree = plan === 'free' && !isAdmin;
  const trialEnd = data?.trialEnd ?? null;
  const daysLeft = trialEnd
    ? Math.max(0, Math.ceil((new Date(trialEnd).getTime() - Date.now()) / (1000 * 60 * 60 * 24)))
    : null;
  const label = isAdmin ? 'Admin' : isPaid ? 'Premium' : isTrial ? `Trial${daysLeft ? ` · ${daysLeft} д` : ''}` : 'Free';

  return useMemo(() => ({
    can,
    abilities: data?.abilities ?? {},
    plan,
    isPaid,
    isTrial,
    isFree,
    isAdmin,
    daysLeft,
    trialEnd,
    label,
    isLoading,
    isFetching,
    isError,
    isSuccess,
    isAccessReady: !shouldFetchAccess ? true : isAccessReady,
    isAccessEnabled: shouldFetchAccess,
    isAuthenticated,
  }), [
    can,
    data?.abilities,
    daysLeft,
    isAccessReady,
    isAdmin,
    isAuthenticated,
    isError,
    isFetching,
    isFree,
    isLoading,
    isPaid,
    isSuccess,
    isTrial,
    label,
    plan,
    shouldFetchAccess,
    trialEnd,
  ]);
}
