// features/products/types/product.mappers.ts

import type { Product } from './product.types'
import type { ProductMini } from './product.mini'
import type { ProductForAI } from './product.ai'

export const toProductMini = (p: Product): ProductMini => ({
  id: p.id,
  name: p.name,
  price: p.price,
  type: p.type,
})

export const toProductForAI = (p: Product): ProductForAI => ({
  name: p.name,
  price: p.price,
  type: p.type,
  purpose: p.includesMentorship
    ? 'Глибока трансформація з супроводом'
    : 'Швидкий результат без супроводу',
})
