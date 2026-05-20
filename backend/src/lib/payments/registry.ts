// Backend Payment Registry — mirrors packages/shared/src/payments/payments.catalog.ts.
// Keep in sync when adding new payments to the catalog.

export type PaymentKey =
  | 'focus_monthly'
  | 'focus_quarterly'
  | 'focus_landing'
  | 'platform_monthly'
  | 'platform_upgrade'
  | 'platform_6month'
  | 'platform_yearly'

type BaseEntry = {
  readonly paymentKey: PaymentKey
  readonly provider: 'wayforpay'
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

export const PAYMENTS: Record<PaymentKey, PaymentEntry> = {
  focus_monthly: {
    paymentKey: 'focus_monthly',
    provider: 'wayforpay',
    type: 'hosted',
    productId: 'focus',
    planId: '1month',
    amount: 780,
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
    amount: 1990,
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
    amount: 780,
    currency: 'UAH',
    envVar: 'WAYFORPAY_FOCUS_LANDING_URL',
  },
  platform_monthly: {
    paymentKey: 'platform_monthly',
    provider: 'wayforpay',
    type: 'checkout',
    productId: 'absystem_ai',
    planId: '1month',
    amount: 1900,
    currency: 'UAH',
  },
  platform_upgrade: {
    paymentKey: 'platform_upgrade',
    provider: 'wayforpay',
    type: 'checkout',
    productId: 'absystem_ai',
    planId: '1month_upgrade',
    amount: 1120,
    currency: 'UAH',
  },
  platform_6month: {
    paymentKey: 'platform_6month',
    provider: 'wayforpay',
    type: 'checkout',
    productId: 'absystem_ai',
    planId: '6month',
    amount: 9900,
    currency: 'UAH',
  },
  platform_yearly: {
    paymentKey: 'platform_yearly',
    provider: 'wayforpay',
    type: 'checkout',
    productId: 'absystem_ai',
    planId: '1year',
    amount: 18000,
    currency: 'UAH',
  },
}

/** Returns a payment entry. Throws if key is unknown. */
export function getPayment(key: PaymentKey): PaymentEntry {
  const entry = PAYMENTS[key]
  if (!entry) throw new Error(`[PaymentRegistry] Unknown payment key: "${key}"`)
  return entry
}

/**
 * Returns the WayForPay button URL for a hosted payment.
 * Reads process.env at call time (not at module load).
 * Throws if the entry is checkout-type or env var is unset.
 */
export function getPaymentUrl(key: PaymentKey): string {
  const entry = getPayment(key)
  if (entry.type !== 'hosted') {
    throw new Error(`[PaymentRegistry] "${key}" uses checkout flow — no hosted button URL`)
  }
  const url =
    process.env[entry.envVar]?.trim() ||
    (entry.envVarFallback ? process.env[entry.envVarFallback]?.trim() : undefined) ||
    ''
  if (!url) {
    throw new Error(`[PaymentRegistry] Env var "${entry.envVar}" not set for payment "${key}"`)
  }
  return url
}

/** Finds the first catalog entry matching the given amount. Used as a fallback in webhook resolution. */
export function findByAmount(amount: number): PaymentEntry | null {
  return Object.values(PAYMENTS).find(p => p.amount === amount) ?? null
}

/** Returns all hosted payment entries. */
export function getHostedPayments(): HostedPaymentEntry[] {
  return Object.values(PAYMENTS).filter((p): p is HostedPaymentEntry => p.type === 'hosted')
}
