import { useCallback, useState } from 'react'

import { FOCUS_ROUTE } from '@/features/landings/focus/content/constants'
import { POST_PAYMENT_REDIRECT_KEY } from '@/features/paywall/usePaywall'
import { useCreateProductPaymentMutation } from '@/features/subscription/services/billing.api'
import { openExternalPaymentUrl } from '@/features/subscription/utils/openExternalPaymentUrl'

type Options = {
  linkToken?: string | null
  onPending?: () => void
  onTrack?: (eventName: string, payload?: Record<string, unknown>) => void
}

export function useWelcomeTestPayment({ linkToken, onPending, onTrack }: Options = {}) {
  const [createProductPayment, paymentState] = useCreateProductPaymentMutation()
  const [redirectError, setRedirectError] = useState<string | null>(null)

  const startMonthlyPayment = useCallback(async () => {
    onPending?.()
    onTrack?.('welcome_test_payment_clicked', { mode: 'focus_checkout' })

    const returnPath =
      linkToken && typeof window !== 'undefined'
        ? `/welcome-test/${encodeURIComponent(linkToken)}?payment=success`
        : FOCUS_ROUTE

    if (typeof window !== 'undefined') {
      window.localStorage.setItem(POST_PAYMENT_REDIRECT_KEY, returnPath)
    }

    try {
      setRedirectError(null)
      const response = await createProductPayment({
        productId: 'focus',
        planCode: 'monthly',
        linkToken: linkToken ?? undefined,
      }).unwrap()

      const checkoutUrl = response.checkoutUrl ?? response.paymentUrl
      if (!checkoutUrl) throw new Error('missing_checkout_url')

      const opened = openExternalPaymentUrl(checkoutUrl)
      if (!opened) throw new Error('open_failed')

      onTrack?.('welcome_test_payment_redirect_started', {
        mode: 'focus_checkout',
        orderReference: response.orderReference,
      })
      return true
    } catch {
      const message = 'Не вдалося відкрити оплату. Спробуйте ще раз.'
      setRedirectError(message)
      onTrack?.('welcome_test_payment_redirect_failed', { reason: 'checkout_failed' })
      return false
    }
  }, [createProductPayment, linkToken, onPending, onTrack])

  return {
    redirectError,
    isPaying: paymentState.isLoading,
    clearRedirectError: () => setRedirectError(null),
    startMonthlyPayment,
  }
}
