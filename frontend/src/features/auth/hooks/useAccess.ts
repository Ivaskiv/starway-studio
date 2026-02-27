// frontend/src/features/auth/hooks/useAccess.ts
import { useGetMyAccessQuery } from '@/shared/access/accessApi';
import type { AccessKey }     from '@/features/auth/types/auth.types';

/**
 * Доступ і план поточного користувача.
 * Вся логіка підписок — в resolvePlan() (shared/subscription.utils).
 */
export function useAccess() {
  const { data, isLoading, isError } = useGetMyAccessQuery();

  // fix code_x: degrade gracefully when /access/me fails to avoid blank dashboard due guard redirects.
  const fallbackFreeAbilities: Record<string, boolean> = {
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
  };

  const can = (key: AccessKey): boolean => {
    if (data?.abilities) return data.abilities[key] === true;
    if (isError) return fallbackFreeAbilities[key] === true;
    return false;
  };
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

  return {
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
    isError,
  };
}
