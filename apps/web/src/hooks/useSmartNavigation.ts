// frontend/src/hooks/useSmartNavigation.ts

import { useCallback, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useSessionOrchestrator } from '@/features/auth/context/SessionOrchestratorContext';
import { useAuth } from '@/features/auth/hooks/useAuth';
import { useAuthRestoreStatus } from '@/features/auth/context/AuthRestoreContext';
import { ROUTES, ROUTE_METADATA, normalizeDashboardRoutePath } from '@/config/routes';
import type { RoutePath } from '@/config/routes';
import { hasPaidAccess } from '@/features/auth/utils/access.utils';

interface NavigationOptions {
  requiresAuth?: boolean;
  requiresPaid?: boolean;
  onSuccess?: () => void;
  onAuthRequired?: () => void;
  onAccessDenied?: () => void;
  replace?: boolean;
}

export function useSmartNavigation() {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, isLoading } = useAuth();
  const authRestoreStatus = useAuthRestoreStatus();
  const orchestrator = useSessionOrchestrator();

  const [authModalOpen, setAuthModalOpen] = useState(false);
  const [upgradeModalOpen, setUpgradeModalOpen] = useState(false);

  const navigateTo = useCallback(
    (path: RoutePath | string, options: NavigationOptions = {}): boolean => {
      const meta = ROUTE_METADATA[path as RoutePath];
      const normalizedPath = typeof path === 'string' ? normalizeDashboardRoutePath(path) : path

      const isDashboardPath =
        typeof normalizedPath === 'string' && (normalizedPath === '/dashboard' || normalizedPath.startsWith('/dashboard/'));
      const requiresAuth = options.requiresAuth ?? meta?.requiresAuth ?? isDashboardPath;
      const requiresPaid = options.requiresPaid ?? meta?.requiresPaid ?? false;
      const authPending =
        isLoading ||
        authRestoreStatus === 'idle' ||
        authRestoreStatus === 'restoring' ||
        orchestrator.isNavigationLocked

      if (requiresAuth && authPending) {
        orchestrator.beginProtectedNavigation({ path: String(path), replace: options.replace }, { queue: true })

        if (authRestoreStatus !== 'restoring') {
          void orchestrator.restoreSession('navigation')
        }

        return false
      }

      // AUTH
      if (requiresAuth && !user) {
        orchestrator.beginProtectedNavigation({ path: String(path), replace: options.replace }, { queue: true })
        if (options.onAuthRequired) {
          options.onAuthRequired();
        } else if (!requiresAuth || location.pathname === '/') {
          setAuthModalOpen(true);
        } else {
          orchestrator.openAuthModal({
            mode: 'login',
            reason: 'protected_route',
          });
        }
        return false;
      }

      // PAID
      if (requiresPaid && !hasPaidAccess(user)) {
        if (options.onAccessDenied) {
          options.onAccessDenied();
        } else {
          orchestrator.openProtectedAccessModal({
            title: 'Потрібен активний доступ',
            message: 'Для цього модуля потрібна підписка або завершення обовʼязкових кроків профілю.',
            ctaLabel: 'Відкрити підписку',
            ctaPath: `${ROUTES.SUBSCRIPTION}?from=${encodeURIComponent(String(path))}`,
          })
        }
        setUpgradeModalOpen(true);
        return false;
      }

      if (requiresAuth) {
        orchestrator.beginProtectedNavigation({ path: String(path), replace: options.replace })
      }

      navigate(path, { replace: options.replace });
      options.onSuccess?.();
      return true;
    },
    [authRestoreStatus, isLoading, location.pathname, navigate, orchestrator, user],
  );

  return {
    navigateTo,
    isActive: (path: string) =>
      path === '/' ? location.pathname === '/' : location.pathname.startsWith(path),

    authModalOpen,
    upgradeModalOpen,

    openAuthModal: () => setAuthModalOpen(true),
    closeAuthModal: () => setAuthModalOpen(false),

    openUpgradeModal: () => setUpgradeModalOpen(true),
    closeUpgradeModal: () => setUpgradeModalOpen(false),

    user,
    isNavigationLocked: orchestrator.isNavigationLocked,
    isAuthenticated: !!user,
    hasPremium: hasPaidAccess(user),
  };
}
