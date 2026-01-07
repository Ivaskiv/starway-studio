import { calculateConversion } from '@/utils/calculate'
import { FunnelStats } from '@/types'

export const useFunnelConversion = (
  stats: FunnelStats | null
) => {
  if (!stats) {
    return {
      conversion: null
    }
  }

  return {
    conversion: calculateConversion(
      stats.visitors,
      stats.buyers
    )
  }
}
