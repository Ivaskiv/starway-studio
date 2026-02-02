// /features/analytics/hooks/useFunnelConversion.ts

import { calculateConversion } from '@/lib/calculate';

export const useFunnelConversion = (stats: FunnelStats | null) => {
  if (!stats) {
    return {
      conversion: null,
    };
  }

  return {
    conversion: calculateConversion(stats.visitors, stats.buyers),
  };
};
