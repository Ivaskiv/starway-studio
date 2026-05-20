declare module '@shared/payments' {
  export const PAYMENT_URLS: {
    readonly FOCUS: 'https://secure.wayforpay.com/button/be85c6dcb9587'
    readonly STANKEY: 'https://secure.wayforpay.com/button/be85c6dcb9588'
  }

  export type PaymentProductKey = keyof typeof PAYMENT_URLS

  export function getPaymentUrl(productKey: PaymentProductKey): string
}
