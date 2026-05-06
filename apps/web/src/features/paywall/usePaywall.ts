import { useCallback, useEffect, useMemo } from 'react'

import { useTrackFrontendEventMutation } from '@/features/analytics/services/events.api'
import { useCreatePaymentMutation } from '@/features/subscription/services/billing.api'
import { submitWayForPayForm } from '@/features/subscription/utils/wayforpayCheckout'
import { ROUTES } from '@/config/routes'

import { trackPaywallEvent } from './trackEvent'
import { useAB } from './useAB'
import { usePaywallStore } from './store/usePaywallStore'

type UsePaywallInput = {
  systemScore: number
  weakestArea: string
  pattern: string
  trialExpired?: boolean
  redirectPathAfterPayment?: string
}

export const POST_PAYMENT_REDIRECT_KEY = 'post_payment_redirect_v1'

type BillingPlan = 'monthly' | 'yearly'

const PLAN_TO_BILLING: Record<string, BillingPlan> = {
  entry: 'monthly',
  growth: 'yearly',
  architect: 'yearly',
}

export function consumePostPaymentRedirect() {
  if (typeof window === 'undefined') return null
  const value = window.localStorage.getItem(POST_PAYMENT_REDIRECT_KEY)
  if (!value) return ROUTES.CYCLE
  window.localStorage.removeItem(POST_PAYMENT_REDIRECT_KEY)
  return value
}

export function usePaywall(input: UsePaywallInput) {
  const variant = useAB()
  const [trackFrontendEvent] = useTrackFrontendEventMutation()
  const [createPayment, paymentState] = useCreatePaymentMutation()
  const { isOpen, trigger, open } = usePaywallStore()

  const headline = useMemo(
    () => (variant === 'A' ? `System unstable (${input.systemScore}/10)` : 'You are losing progress'),
    [input.systemScore, variant],
  )

  const consequences = useMemo(
    () => [
      `${input.pattern} → no progress`,
      `${input.weakestArea} low → blocks all growth`,
    ],
    [input.pattern, input.weakestArea],
  )

  useEffect(() => {
    if (!isOpen) return
    void trackFrontendEvent(trackPaywallEvent({
      type: 'paywall_view',
      variant,
      state: trigger,
      payload: { systemScore: input.systemScore, weakestArea: input.weakestArea },
    }))
  }, [input.systemScore, input.weakestArea, isOpen, trackFrontendEvent, trigger, variant])

  const handleContinue = useCallback(async (selectedPlanId?: string) => {
    const billingPlan = selectedPlanId ? PLAN_TO_BILLING[selectedPlanId] ?? 'monthly' : 'monthly'

    void trackFrontendEvent(trackPaywallEvent({
      type: 'click_cta',
      variant,
      state: trigger,
      payload: {
        defaultPlan: billingPlan,
        selectedPlanId,
      },
    }))
    if (typeof window !== 'undefined') {
      window.localStorage.setItem(
        POST_PAYMENT_REDIRECT_KEY,
        input.redirectPathAfterPayment ?? ROUTES.CYCLE
      )
    }
    const response = await createPayment({ plan: billingPlan, variant }).unwrap()
    submitWayForPayForm(response.paymentUrl, response.payment)
  }, [createPayment, input.redirectPathAfterPayment, trackFrontendEvent, trigger, variant])

  return {
    consequences,
    handleContinue,
    headline,
    isLoading: paymentState.isLoading,
    open,
    systemLabel: `Ми ловимо момент зливу в сфері «${input.weakestArea}»`,
  }
}
