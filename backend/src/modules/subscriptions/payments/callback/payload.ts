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

function parseSerializedPayload(value: unknown): WayForPayPayload | null {
  if (typeof value !== 'string') return null

  const candidates = [value.trim()]
  try {
    const decoded = decodeURIComponent(value).trim()
    if (decoded !== candidates[0]) candidates.push(decoded)
  } catch {
    // Keep the raw provider value when it is not URI-encoded.
  }

  for (const candidate of candidates) {
    const start = candidate.indexOf('{')
    const end = candidate.lastIndexOf('}')
    if (start < 0 || end < start) continue

    try {
      const parsed = JSON.parse(candidate.slice(start, end + 1)) as unknown
      if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
        const payload = parsed as WayForPayPayload
        if (payload.orderReference || payload.order_reference) return payload
      }
    } catch {
      // Try the next raw/decoded candidate.
    }
  }

  return null
}

export function parseWayForPayPayload(body: unknown): WayForPayPayload | null {
  if (body && typeof body === 'object' && !Array.isArray(body)) {
    const payload = body as WayForPayPayload
    if (payload.orderReference || payload.order_reference) {
      return payload
    }
  }

  if (body && typeof body === 'object' && !Array.isArray(body)) {
    const formParsedBody = body as Record<string, unknown>
    for (const [key, value] of Object.entries(formParsedBody)) {
      const parsed = parseSerializedPayload(key) ?? parseSerializedPayload(value)
      if (parsed) return parsed
    }
  }

  return null
}
