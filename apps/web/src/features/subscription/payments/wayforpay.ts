export interface PaymentRequestData {
  userId: string
  productId: string
  amount: number
  currency?: string
  payRef: string
  product_name?: string[]
}

export function buildPaymentRequest(data: PaymentRequestData) {
  return {
    ...data,
    currency: data.currency ?? 'EUR',
    product_name: data.product_name ?? [data.productId],
  }
}
