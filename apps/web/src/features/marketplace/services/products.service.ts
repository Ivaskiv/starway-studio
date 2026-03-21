import { useMemo } from 'react'

export interface MarketplaceProduct {
  id: string
  name: string
  description: string
  price: number
}

export function useProductsQuery(userId?: string | null) {
  const data = useMemo<MarketplaceProduct[]>(() => [
    { id: 'prod_01', name: 'AI Funnel', description: 'Універсальний фановий шаблон', price: 499 },
    { id: 'prod_02', name: 'Marketing Sprint', description: 'Цикл комунікацій для запуску', price: 299 },
  ], [])
  return { data: userId ? data : [] }
}

export async function fetchProducts(): Promise<MarketplaceProduct[]> {
  return Promise.resolve([
    { id: 'prod_01', name: 'AI Funnel', description: 'Універсальний фановий шаблон', price: 499 },
    { id: 'prod_02', name: 'Marketing Sprint', description: 'Цикл комунікацій для запуску', price: 299 },
  ])
}
