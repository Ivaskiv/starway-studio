// Single source of truth for all WayForPay payments.
// To add a new hosted payment: add one entry here — nothing else changes.
//
// 'hosted'   — pre-created WayForPay button; URL resolved from env var at call time
// 'checkout' — dynamic checkout form; URL generated per-request by the backend

export type PaymentProvider = 'wayforpay'
export type PaymentType = 'hosted' | 'checkout'

type BaseEntry = {
  readonly paymentKey: string
  readonly provider: PaymentProvider
  readonly productId: string
  readonly planId: string
  readonly amount: number
  readonly currency: string
}

export type HostedPaymentEntry = BaseEntry & {
  readonly type: 'hosted'
  readonly envVar: string
  readonly envVarFallback?: string
}

export type CheckoutPaymentEntry = BaseEntry & {
  readonly type: 'checkout'
}

export type PaymentEntry = HostedPaymentEntry | CheckoutPaymentEntry

export const PAYMENTS = {
  // ─── Focus (pre-created WayForPay hosted buttons) ────────────────────────
  focus_monthly: {
    paymentKey: 'focus_monthly',
    provider: 'wayforpay',
    type: 'hosted',
    productId: 'focus',
    planId: '1month',
    // amount: 780,
    amount: 1,
    currency: 'UAH',
    envVar: 'WAYFORPAY_FOCUS_BOT_1M_URL',
    envVarFallback: 'WAYFORPAY_FOCUS_1M_URL',
  },
  focus_quarterly: {
    paymentKey: 'focus_quarterly',
    provider: 'wayforpay',
    type: 'hosted',
    productId: 'focus',
    planId: '3month',
    // amount: 1990,
        amount: 1,
    currency: 'UAH',
    envVar: 'WAYFORPAY_FOCUS_BOT_3M_URL',
    envVarFallback: 'WAYFORPAY_FOCUS_3M_URL',
  },
  focus_landing: {
    paymentKey: 'focus_landing',
    provider: 'wayforpay',
    type: 'hosted',
    productId: 'focus',
    planId: '1month',
    // amount: 780,
        amount: 1,
    currency: 'UAH',
    envVar: 'WAYFORPAY_FOCUS_LANDING_URL',
  },

  // ─── Platform / absystem_ai (dynamic checkout, generated per-request) ────
  platform_monthly: {
    paymentKey: 'platform_monthly',
    provider: 'wayforpay',
    type: 'checkout',
    productId: 'absystem_ai',
    planId: '1month',
    // amount: 1900,
        amount: 1,
    currency: 'UAH',
  },
  platform_upgrade: {
    paymentKey: 'platform_upgrade',
    provider: 'wayforpay',
    type: 'checkout',
    productId: 'absystem_ai',
    planId: '1month_upgrade',
    // amount: 1120,
        amount: 1,
    currency: 'UAH',
  },
  platform_6month: {
    paymentKey: 'platform_6month',
    provider: 'wayforpay',
    type: 'checkout',
    productId: 'absystem_ai',
    planId: '6month',
    // amount: 9900,
        amount: 1,
    currency: 'UAH',
  },
  platform_yearly: {
    paymentKey: 'platform_yearly',
    provider: 'wayforpay',
    type: 'checkout',
    productId: 'absystem_ai',
    planId: '1year',
    // amount: 18000,
        amount: 1,
    currency: 'UAH',
  },
} satisfies Record<string, PaymentEntry>

export type PaymentKey = keyof typeof PAYMENTS

/** Returns a payment entry. Throws if key is unknown. */
export function getPayment(key: PaymentKey): PaymentEntry {
  const entry = PAYMENTS[key]
  if (!entry) throw new Error(`[PaymentCatalog] Unknown payment key: "${key}"`)
  return entry
}

/**
 * Resolves the WayForPay button URL for a hosted payment from environment.
 * Reads process.env at call time, never at module load.
 * Returns '' if the env var is missing (logs a warning).
 */
export function getPaymentUrl(key: PaymentKey): string {
  const entry = getPayment(key)
  if (entry.type !== 'hosted') {
    throw new Error(`[PaymentCatalog] "${key}" is a checkout payment — no hosted button URL`)
  }
  const url =
    process.env[entry.envVar]?.trim() ||
    (entry.envVarFallback ? process.env[entry.envVarFallback]?.trim() : undefined) ||
    ''
  return url
}

/**
 * Extracts the WayForPay hosted button ID from the resolved URL.
 * e.g. 'https://secure.wayforpay.com/button/abc123' → 'abc123'
 * Returns null if the URL is not set or does not match the expected pattern.
 */
export function getHostedButtonId(key: PaymentKey): string | null {
  const url = getPaymentUrl(key)
  if (!url) return null
  const match = url.match(/\/button\/([^/?#]+)/)
  return match?.[1] ?? null
}

/**
 * Returns the first catalog entry matching the given amount.
 * Used as a last-resort fallback in webhook resolution.
 */
export function findPaymentByAmount(amount: number): PaymentEntry | null {
  return (
    (Object.values(PAYMENTS) as PaymentEntry[]).find(p => p.amount === amount) ?? null
  )
}

/** Returns all hosted payment entries. */
export function getHostedPayments(): HostedPaymentEntry[] {
  return (Object.values(PAYMENTS) as PaymentEntry[]).filter(
    (p): p is HostedPaymentEntry => p.type === 'hosted'
  )
}
