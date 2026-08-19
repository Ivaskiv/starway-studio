// Single source of truth for WayForPay callback path and URL construction.
// WAYFORPAY_CALLBACK_PATH is the canonical route registered in subscriptions/routes.ts

export const WAYFORPAY_CALLBACK_PATH = '/api/subscriptions/payments/wayforpay/callback'

/**
 * Returns the full WayForPay callback URL.
 *
 * Priority:
 *  1. WAYFORPAY_CALLBACK_URL (full URL, used as-is)
 *  2. PUBLIC_API_URL | APP_URL | TELEGRAM_WEBHOOK_URL + WAYFORPAY_CALLBACK_PATH
 *
 * Throws if no base URL is available — never falls back to localhost in production.
 */
export function getWayForPayCallbackUrl(): string {
  const explicit = process.env.WAYFORPAY_CALLBACK_URL?.trim()
  if (explicit) return explicit

  const base = (
    process.env.PUBLIC_API_URL?.trim()
    || process.env.APP_URL?.trim()
    || process.env.TELEGRAM_WEBHOOK_URL?.trim()
  )?.replace(/\/$/, '')

  if (!base) {
    throw new Error(
      '[WayForPay] Missing PUBLIC_API_URL / APP_URL / WAYFORPAY_CALLBACK_URL — cannot construct callback URL'
    )
  }

  return `${base}${WAYFORPAY_CALLBACK_PATH}`
}
