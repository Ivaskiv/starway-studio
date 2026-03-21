// useWheelStatus.ts
import { useGetLatestWheelAssessmentQuery } from '@/features/wheel/api';
import { useMemo } from 'react';

export const useWheelStatus = (userId: string) => {
  const { data: wheel, isLoading, error } = useGetLatestWheelAssessmentQuery(userId);

  const status = useMemo(() => {
    if (!wheel) {
      return { needsWheel: true, reason: 'never' as const, daysSince: null };
    }

    const createdAt = new Date(wheel.createdAt);
    const now = new Date();
    const daysSince = Math.floor((now.getTime() - createdAt.getTime()) / 86400000);

    if (createdAt.getMonth() !== now.getMonth() || createdAt.getFullYear() !== now.getFullYear()) {
      return { needsWheel: true, reason: 'monthly' as const, daysSince };
    }

    if (daysSince >= 14) {
      return { needsWheel: false, reason: 'recommended' as const, daysSince };
    }

    return { needsWheel: false, reason: 'recent' as const, daysSince };
  }, [wheel]);

  return {
    wheel,
    isLoading,
    error,
    hasWheel: !!wheel,
    ...status,
  };
};
