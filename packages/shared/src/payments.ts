/**
 * Payment URLs configuration for WayForPay buttons
 *
 * Note: Payment URLs should be configured by the consuming application.
 * Import configurePaymentUrls() from this module and call it with your
 * WayForPay button IDs before using getPaymentUrl().
 *
 * Example:
 *   import { configurePaymentUrls, getPaymentUrl } from '@shared/payments'
 *   configurePaymentUrls({
 *     focusButtonId: 'your_focus_button_id',
 *     stankeyButtonId: 'your_stankey_button_id',
 *   })
 */

const WAYFORPAY_BASE_URL = 'https://secure.wayforpay.com/button/'

// Internal state for payment URL configuration
let paymentUrlsConfig: { focusButtonId: string; stankeyButtonId: string } | null = null

/**
 * Configure payment URLs with WayForPay button IDs.
 * Call this function from your app initialization before using getPaymentUrl().
 */
export function configurePaymentUrls(config: {
  focusButtonId: string
  stankeyButtonId: string
}): void {
  paymentUrlsConfig = config
}

export const PAYMENT_URLS = {
  get FOCUS(): string {
    if (paymentUrlsConfig?.focusButtonId) {
      return `${WAYFORPAY_BASE_URL}${paymentUrlsConfig.focusButtonId}`
    }
    return '#payment-config-needed'
  },
  get STANKEY(): string {
    if (paymentUrlsConfig?.stankeyButtonId) {
      return `${WAYFORPAY_BASE_URL}${paymentUrlsConfig.stankeyButtonId}`
    }
    return '#payment-config-needed'
  },
} as const

export type PaymentProductKey = keyof typeof PAYMENT_URLS

export function getPaymentUrl(productKey: PaymentProductKey): string {
  return PAYMENT_URLS[productKey]
}
