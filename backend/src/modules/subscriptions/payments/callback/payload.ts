export type WayForPayPayload = {
  order_reference?: string
  orderReference?: string
  transaction_status?: string
  transactionStatus?: string
  amount?: number | string
  currency?: string
  product_name?: unknown[]
  productName?: unknown[]
  product_count?: unknown[]
  productCount?: unknown[]
  product_price?: unknown[]
  productPrice?: unknown[]
  clientAccountId?: string
  client_account_id?: string
  merchant_signature?: string
  merchantSignature?: string
  transaction_id?: string
  transactionId?: string
  reason_code?: string
  reasonCode?: string
}

export function parseWayForPayPayload(body: unknown): WayForPayPayload | null {
  if (body && typeof body === 'object' && !Array.isArray(body)) {
    const payload = body as WayForPayPayload
    if (payload.orderReference || payload.order_reference) {
      return payload
    }
  }

  if (body && typeof body === 'object') {
    const keys = Object.keys(body as object)
    if (keys.length === 1) {
      try {
        const parsed = JSON.parse(keys[0]) as unknown
        if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
          const payload = parsed as WayForPayPayload
          if (payload.orderReference || payload.order_reference) {
            return payload
          }
        }
      } catch {
        // not JSON key payload
      }
    }
  }

  return null
}
