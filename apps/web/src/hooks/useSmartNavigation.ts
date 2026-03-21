// frontend/src/hooks/useSmartNavigation.ts

import { useCallback, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '@/features/auth/hooks/useAuth';
import { ROUTES, ROUTE_METADATA } from '@/config/routes';
import type { RoutePath } from '@/config/routes';
import { hasPaidAccess } from '@/shared/utils/access.utils';

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
  const { user } = useAuth();

  const [authModalOpen, setAuthModalOpen] = useState(false);
  const [upgradeModalOpen, setUpgradeModalOpen] = useState(false);

  const navigateTo = useCallback(
    (path: RoutePath | string, options: NavigationOptions = {}): boolean => {
      const meta = ROUTE_METADATA[path as RoutePath];

      const isDashboardPath =
        typeof path === 'string' && (path === '/dashboard' || path.startsWith('/dashboard/'));
      const requiresAuth = options.requiresAuth ?? meta?.requiresAuth ?? isDashboardPath;
      const requiresPaid = options.requiresPaid ?? meta?.requiresPaid ?? false;

      // AUTH
      if (requiresAuth && !user) {
        options.onAuthRequired?.() ?? setAuthModalOpen(true);
        return false;
      }

      // PAID
      if (requiresPaid && !hasPaidAccess(user)) {
        // fix code_x: blocked premium routes stay clickable and redirect to subscription/details instead of dead-end modal.
        if (options.onAccessDenied) {
          options.onAccessDenied();
        } else {
          const target = encodeURIComponent(path);
          navigate(`${ROUTES.SUBSCRIPTION}?from=${target}`, { replace: options.replace });
        }
        setUpgradeModalOpen(true);
        return false;
      }

      navigate(path, { replace: options.replace });
      options.onSuccess?.();
      return true;
    },
    [navigate, user],
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
    isAuthenticated: !!user,
    hasPremium: hasPaidAccess(user),
  };
}
