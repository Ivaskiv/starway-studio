//packages/shared/src/payments/wayforpay.urls.ts
import { getPaymentUrl } from './payments.catalog.js'

type PaymentKey = Parameters<typeof getPaymentUrl>[0]

const SOURCE_MAP: Record<string, PaymentKey> = {
  bot1m:   'focus_monthly',
  bot3m:   'focus_quarterly',
  landing: 'focus_landing',
} as const

export type FocusPaymentSource = keyof typeof SOURCE_MAP

export function getFocusPaymentUrl(source: FocusPaymentSource): string {
  return getPaymentUrl(SOURCE_MAP[source])
}
