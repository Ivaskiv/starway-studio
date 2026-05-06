import { useMemo } from 'react'

import { usePaywallStore } from '@/features/paywall/store/usePaywallStore'
import { usePaywall } from '@/features/paywall/usePaywall'

export function usePaywallUI() {
  const {
    isOpen,
    trigger,
    payload,
    selectedPlanId,
    selectPlan,
    close,
    openWithPayload,
  } = usePaywallStore()

  const paywall = usePaywall({
    systemScore: trigger === 'trial_expired' ? 4 : 5,
    weakestArea: 'energy',
    pattern: 'You skip actions',
    trialExpired: trigger === 'trial_expired',
  })

  const selectedPlan = useMemo(
    () => payload?.plans.find((plan) => plan.id === selectedPlanId) ?? null,
    [payload, selectedPlanId],
  )

  return {
    close,
    consequences: paywall.consequences,
    handleContinue: () => paywall.handleContinue(selectedPlan?.id),
    headline: paywall.headline,
    isLoading: paywall.isLoading,
    isOpen,
    openWithPayload,
    payload,
    selectPlan,
    selectedPlan,
    selectedPlanId,
    systemLabel: paywall.systemLabel,
  }
}
