import type { TrackFrontendEventInput } from '@/features/analytics/services/events.api'

import type { PaywallVariant } from './useAB'

type PaywallEventName = 'paywall_view' | 'click_cta' | 'share_click'

export function trackPaywallEvent(input: {
  type: PaywallEventName
  variant: PaywallVariant
  state?: string | null
  payload?: Record<string, unknown>
}): TrackFrontendEventInput {
  return {
    type: input.type,
    source: 'web',
    state: input.state ?? null,
    payload: {
      variant: input.variant,
      ...(input.payload ?? {}),
    },
  }
}
