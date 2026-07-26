import { useAppSelector } from '@/app/hooks'
import { useSessionOrchestrator } from '@/features/auth/context/SessionOrchestratorContext'
import { useCallback, useMemo } from 'react';

import { getCoreAccess } from '@/features/auth/selectors/getCoreAccess';

type ModuleId = 'AI_GENERATOR' | 'AI_FUNNEL' | 'AI_MENTOR' | 'WHEEL_OF_BALANCE' | 'FOCUS_BATTLES';

export function useSystemState() {
  const isAuthenticated = useAppSelector(state => state.auth.status === 'authenticated')
  const { canRunProtectedQueries, systemStateData: state, isSystemReady } = useSessionOrchestrator()
  const isLoading = isAuthenticated && canRunProtectedQueries && !isSystemReady
  const isFetching = false
  const isError = isAuthenticated && canRunProtectedQueries && !state && isSystemReady

  const moduleMap = useMemo(() => {
    const map = new Map<string, { isLocked: boolean; accessLevel: 'TRIAL' | 'PAID' | 'NONE'; lockReason: 'TRIAL_EXPIRED' | 'NO_SUBSCRIPTION' | null }>();
    (state?.aiModules || []).forEach((item) => {
      map.set(item.moduleId, {
        isLocked: item.isLocked,
        accessLevel: item.accessLevel,
        lockReason: item.lockReason,
      });
    });
    return map;
  }, [state?.aiModules]);

  const { trialActive, subscriptionActive, hasCoreAccess } = getCoreAccess({
    trial: state?.trial,
    subscription: state?.subscription,
    accessControl: state?.accessControl,
  })

  const getModuleAccess = useCallback((moduleId: ModuleId) => {
    if (moduleId === 'FOCUS_BATTLES') {
      return subscriptionActive
        ? { isLocked: false, accessLevel: 'PAID' as const, lockReason: null }
        : { isLocked: true, accessLevel: 'NONE' as const, lockReason: 'NO_SUBSCRIPTION' as const }
    }

    return moduleMap.get(moduleId) || { isLocked: true, accessLevel: 'NONE' as const, lockReason: 'NO_SUBSCRIPTION' as const }
  }, [moduleMap, subscriptionActive]);

  return useMemo(() => ({
    state,
    data: state,
    isLoading,
    isFetching,
    isError,
    isSuccess: Boolean(state),
    counts: {
      ownedProducts: state?.products.owned.length ?? 0,
      subscribedProducts: state?.products.subscribed.length ?? 0,
      templates: state?.products.templates.length ?? 0,
    },
    permissions: state?.permissions,
    ui: state?.ui,
    trial: state?.trial,
    subscription: state?.subscription,
    zoomAccess: state?.zoomAccess,
    accessControl: state?.accessControl,
    trialActive,
    subscriptionActive,
    hasCoreAccess,
    getModuleAccess,
  }), [
    getModuleAccess,
    hasCoreAccess,
    isAuthenticated,
    isError,
    isFetching,
    isLoading,
    isSystemReady,
    state,
    subscriptionActive,
    trialActive,
  ]);
}
