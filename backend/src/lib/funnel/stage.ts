import type { UserFunnelStage } from '@starway/db/prisma-client'

type LifecycleState = 'guest' | 'lead_magnet' | 'onboarding' | 'trial' | 'paid' | 'expired'

export function mapLifecycleToFunnelStage(state: LifecycleState): UserFunnelStage {
  switch (state) {
    case 'trial':
      return 'TRIAL'
    case 'paid':
      return 'PAID'
    case 'expired':
      return 'CHURNED'
    case 'lead_magnet':
    case 'onboarding':
      return 'LEAD'
    case 'guest':
    default:
      return 'ANONYMOUS'
  }
}
