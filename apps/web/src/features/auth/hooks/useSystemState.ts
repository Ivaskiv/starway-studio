import { useAppSelector } from '@/app/hooks'
import { useMemo } from 'react';

import { getCoreAccess } from '@/features/auth/selectors/getCoreAccess';
import { useGetMySystemStateQuery } from '@/features/auth/services/accessApi';

type ModuleId = 'AI_GENERATOR' | 'AI_FUNNEL' | 'AI_MENTOR' | 'WHEEL_OF_BALANCE';

export function useSystemState() {
  const isAuthenticated = useAppSelector(state => state.auth.status === 'authenticated')
  const query = useGetMySystemStateQuery(undefined, {
    skip: !isAuthenticated,
  });
  const state = query.data;

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

  const getModuleAccess = (moduleId: ModuleId) =>
    moduleMap.get(moduleId) || { isLocked: true, accessLevel: 'NONE' as const, lockReason: 'NO_SUBSCRIPTION' as const };

  const { trialActive, subscriptionActive, hasCoreAccess } = getCoreAccess({
    trial: state?.trial,
    subscription: state?.subscription,
    accessControl: state?.accessControl,
  })

  return {
    ...query,
    state,
    counts: {
      ownedProducts: state?.products.owned.length ?? 0,
      subscribedProducts: state?.products.subscribed.length ?? 0,
      templates: state?.products.templates.length ?? 0,
    },
    permissions: state?.permissions,
    ui: state?.ui,
    trial: state?.trial,
    subscription: state?.subscription,
    accessControl: state?.accessControl,
    trialActive,
    subscriptionActive,
    hasCoreAccess,
    getModuleAccess,
  };
}
