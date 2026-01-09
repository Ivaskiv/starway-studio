// features/products/types/product.ai.ts

export interface ProductForAI {
  id: string
  name: string
  format: string
  integration: string
  includesMentorship: boolean
  price: number
  type: 'subscription' | 'one-time'

  goal: 'lead' | 'sale'
  purpose: string
}
