import { useMemo } from 'react'

export interface AffiliateData {
  link: string
  earned: number
}

export function useAffiliateQuery(userId?: string | null) {
  const data = useMemo<AffiliateData>(() => ({ link: 'https://starway.link/U123', earned: 1240 }), [])
  return { data: userId ? data : undefined }
}

export interface CreateAffiliatePayload {
  productId: string
}

export async function createAffiliate(payload: CreateAffiliatePayload) {
  return {
    code: `AFF-${payload.productId}-${Math.floor(Math.random() * 100000)}`,
    expiresAt: new Date(Date.now() + 1000 * 60 * 60 * 24).toISOString(),
    productId: payload.productId,
  }
}

export async function trackClick(code: string) {
  return {
    code,
    clicks: Math.floor(Math.random() * 50) + 1,
  }
}

export async function recordSale(body: { code: string; amount: number }) {
  return {
    code: body.code,
    amount: body.amount,
    recordedAt: new Date().toISOString(),
  }
}
